"""SQLAlchemy models mapped onto the phase-prefixed Supabase/PostgreSQL schema.

See project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md (Task 2) and the
authoritative schema in supabase/migrations/202608100001_fresh_phase_prefixed_foundation.sql
(table names carry an additional terra_space_ prefix on the live database -- see that migration's
sibling 2026-08-11 rename migrations).

Python class/attribute names are kept where existing service code already depends on them (e.g.
`Document.content`, `Location.country`), aliased to their real, differently-named database column
via `mapped_column("db_column_name", ...)`. Genuinely new columns (cleaned text, human-authority
fields, etc.) get their own, real names -- there is no SQLite-side equivalent to preserve.

Two structural simplifications fell out of the real schema, not an SQLite habit carried over:
- There is no `Source` table in Postgres. `phase3_event_sources` links an event directly to the
  `phase1_source_id` (== `Document.id`) it came from, so the old `Source` indirection is gone.
- There is no `ExtractionLogEntry` equivalent. That per-stage audit trail belonged to the retired
  staged-classifier pipeline; Phase 3's own `phase3_event_runs` (pipeline-owned, not written by
  this application) is its replacement. `extraction_incomplete`/`extraction_incomplete_stages`
  have no backing column for a phase3_events-backed Event and are always False/[] going forward --
  matching the convention the read-only bridge's own `_to_event_read` already established.
"""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Plain JSON on SQLite (unit tests only); the real jsonb column type on PostgreSQL.
JsonVariant = JSON().with_variant(JSONB(), "postgresql")

# Every id/foreign-key column on the live database is a native `uuid` type (except
# terra_space_app_settings.id, which is plain text). Without this, SQLAlchemy infers a generic
# String/VARCHAR type from the `Mapped[str]` annotation alone, and psycopg3 then sends an
# explicit ::VARCHAR cast that PostgreSQL refuses against a uuid column
# ("column is of type uuid but expression is of type character varying"). `as_uuid=False` keeps
# every id a plain Python str everywhere in this app (matching `new_id()`), rather than a
# `uuid.UUID` object.
UuidStr = Uuid(as_uuid=False)


def new_id() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


event_locations = Table(
    "terra_space_phase3_event_locations",
    Base.metadata,
    Column(
        "event_id",
        UuidStr,
        ForeignKey("terra_space_phase3_events.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "location_id",
        UuidStr,
        ForeignKey("terra_space_phase3_locations.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)


class TimestampedModel:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class AppSettings(TimestampedModel, Base):
    __tablename__ = "terra_space_app_settings"

    # Plain text on the live table (not uuid) -- the check constraint requires this to be
    # literally "default" (see services/settings.py's SETTINGS_ID), not the old SQLite
    # "app-settings".
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    lm_studio_base_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    lm_studio_model: Mapped[str | None] = mapped_column(Text, nullable=True)
    lm_studio_extraction_timeout_seconds: Mapped[int] = mapped_column(Integer, default=300)


class Document(TimestampedModel, Base):
    """Maps onto `terra_space_phase1_sources` -- a Phase 1 collected source article."""

    __tablename__ = "terra_space_phase1_sources"

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column("raw_content_text", Text)
    cleaned_content_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    publication_date: Mapped[str] = mapped_column(Text)
    source_domain: Mapped[str] = mapped_column(Text, default="")
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    author: Mapped[str] = mapped_column(Text, default="")
    collection_source: Mapped[str] = mapped_column(Text, default="terra_space_ui")
    processing_status: Mapped[str] = mapped_column(Text, default="draft")
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    # passive_deletes=True: phase1_source_id is part of EventSource's composite primary key and
    # the live FK is ON DELETE RESTRICT (see EventSource below), so the ORM must never try to
    # null it out itself on a Document delete -- that leaves the DB's own RESTRICT constraint as
    # the single source of truth for this protection, instead of the ORM tripping over a
    # can't-blank-a-primary-key assertion before the DELETE even reaches PostgreSQL.
    event_sources: Mapped[list["EventSource"]] = relationship(
        back_populates="source", passive_deletes=True
    )

    @property
    def input_date(self) -> datetime:
        """Compatibility with the old SQLite `input_date` column: phase1_sources has no
        separate "input date" -- the row's own `created_at` already means exactly that."""

        return self.created_at


class Attachment(TimestampedModel, Base):
    __tablename__ = "terra_space_phase1_attachments"

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(
        "phase1_source_id",
        UuidStr,
        ForeignKey("terra_space_phase1_sources.id", ondelete="CASCADE"),
    )
    relative_path: Mapped[str] = mapped_column(Text, unique=True)
    original_name: Mapped[str] = mapped_column(Text)
    media_type: Mapped[str] = mapped_column(Text)
    size_bytes: Mapped[int] = mapped_column(Integer)
    checksum: Mapped[str] = mapped_column(Text)

    document: Mapped[Document] = relationship(back_populates="attachments")


class EventType(TimestampedModel, Base):
    __tablename__ = "terra_space_phase3_event_types"

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(Text, unique=True)
    # Not nullable on the live table (unlike the old SQLite column) -- a fresh Postgres start has
    # no legacy blank-description rows to accommodate, so every Event Type always has one.
    description: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    events: Mapped[list["Event"]] = relationship(back_populates="event_type")
    taxonomy_node: Mapped["TaxonomyNode | None"] = relationship(back_populates="event_type")


class TaxonomyNode(TimestampedModel, Base):
    __tablename__ = "terra_space_phase3_taxonomy_nodes"

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    level: Mapped[str] = mapped_column(Text)
    parent_id: Mapped[str | None] = mapped_column(
        UuidStr,
        ForeignKey("terra_space_phase3_taxonomy_nodes.id", ondelete="RESTRICT"),
        nullable=True,
    )
    event_type_id: Mapped[str | None] = mapped_column(
        UuidStr,
        ForeignKey("terra_space_phase3_event_types.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
    )
    # New column on the live table (every level, not just leaves). The service layer still only
    # exposes toggling this for event_type-level (leaf) nodes -- see events.py -- so this is a
    # schema-completeness addition, not a new feature for domain/category/subcategory nodes.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    parent: Mapped["TaxonomyNode | None"] = relationship(
        back_populates="children", remote_side="TaxonomyNode.id"
    )
    children: Mapped[list["TaxonomyNode"]] = relationship(back_populates="parent")
    event_type: Mapped[EventType | None] = relationship(back_populates="taxonomy_node")


class Actor(TimestampedModel, Base):
    __tablename__ = "terra_space_phase3_actors"

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(Text, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    event_actors: Mapped[list["EventActor"]] = relationship(back_populates="actor")
    aliases: Mapped[list["ActorAlias"]] = relationship(
        back_populates="actor", cascade="all, delete-orphan"
    )


class ActorAlias(TimestampedModel, Base):
    __tablename__ = "terra_space_phase3_actor_aliases"
    __table_args__ = (UniqueConstraint("actor_id", "alias", name="phase3_actor_aliases_unique_alias"),)

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_id)
    actor_id: Mapped[str] = mapped_column(
        UuidStr, ForeignKey("terra_space_phase3_actors.id", ondelete="CASCADE"), index=True
    )
    alias: Mapped[str] = mapped_column(Text)

    actor: Mapped[Actor] = relationship(back_populates="aliases")


class Location(TimestampedModel, Base):
    """Maps onto `terra_space_phase3_locations`.

    Unlike the old SQLite `locations` table, this table dedupes globally: a unique index on the
    normalized (country_iso3, admin1, city_regency) triple means two events at the same place
    share one row. Service code that creates/updates a Location must find-or-create by that same
    normalized key rather than always inserting a fresh row -- see services/locations.py.
    """

    __tablename__ = "terra_space_phase3_locations"

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_id)
    country: Mapped[str | None] = mapped_column("country_iso3", String(3), nullable=True)
    admin1: Mapped[str | None] = mapped_column(Text, nullable=True)
    city_regency: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    coordinate_precision: Mapped[str | None] = mapped_column(Text, nullable=True)

    events: Mapped[list["Event"]] = relationship(secondary=event_locations, back_populates="locations")


class Event(TimestampedModel, Base):
    """Maps onto `terra_space_phase3_events` -- the single authoritative event table.

    This replaces the old draft/approved/rejected/merged `review_status` model entirely with
    `dashboard_status` (published/hidden/rejected/archived/merged) plus a separate
    `pipeline_outcome` (FINAL/EXCEPTION/None) and `origin` (pipeline/manual). See
    decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md and
    decisions/Automatic-Event-Visibility-With-Manual-Filtering.md.
    """

    __tablename__ = "terra_space_phase3_events"

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_id)
    candidate_key: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    phase1_source_id: Mapped[str | None] = mapped_column(
        UuidStr, ForeignKey("terra_space_phase1_sources.id", ondelete="RESTRICT"), nullable=True
    )
    origin: Mapped[str] = mapped_column(Text, default="manual")
    pipeline_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    dashboard_status: Mapped[str] = mapped_column(Text, default="hidden")
    event_type_id: Mapped[str | None] = mapped_column(
        UuidStr,
        ForeignKey("terra_space_phase3_event_types.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text)
    event_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_date_precision: Mapped[str | None] = mapped_column(Text, nullable=True)
    epistemic_status: Mapped[str] = mapped_column(Text)
    pipeline_candidate: Mapped[dict | None] = mapped_column(JsonVariant, nullable=True)
    pipeline_event_snapshot: Mapped[dict | None] = mapped_column(JsonVariant, nullable=True)
    pipeline_first_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    human_modified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    human_modified_fields: Mapped[list] = mapped_column(JsonVariant, default=list)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    event_type: Mapped[EventType | None] = relationship(back_populates="events")
    event_actors: Mapped[list["EventActor"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    locations: Mapped[list[Location]] = relationship(
        secondary=event_locations, back_populates="events"
    )
    event_sources: Mapped[list["EventSource"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    duplicate_flags: Mapped[list["DuplicateFlag"]] = relationship(
        foreign_keys="DuplicateFlag.event_id",
        back_populates="event",
        cascade="all, delete-orphan",
    )

    # No backing column on phase3_events -- see the module docstring. Kept as a plain attribute
    # (not a mapped column) so existing code/schemas reading `event.extraction_incomplete` and
    # `event.extraction_incomplete_stages` keep working without special-casing every call site.
    extraction_incomplete: bool = False
    extraction_incomplete_stages: list[str] = []  # noqa: RUF012 -- read-only constant, never mutated


class EventActor(Base):
    __tablename__ = "terra_space_phase3_event_actors"

    event_id: Mapped[str] = mapped_column(
        UuidStr, ForeignKey("terra_space_phase3_events.id", ondelete="CASCADE"), primary_key=True
    )
    actor_id: Mapped[str] = mapped_column(
        UuidStr, ForeignKey("terra_space_phase3_actors.id", ondelete="RESTRICT"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(16), primary_key=True)

    event: Mapped[Event] = relationship(back_populates="event_actors")
    actor: Mapped[Actor] = relationship(back_populates="event_actors")


class EventSource(Base):
    __tablename__ = "terra_space_phase3_event_sources"

    event_id: Mapped[str] = mapped_column(
        UuidStr, ForeignKey("terra_space_phase3_events.id", ondelete="CASCADE"), primary_key=True
    )
    # The old `sources.id` indirection is gone -- this links directly to the Phase 1 source
    # (== Document.id) the evidence came from.
    source_id: Mapped[str] = mapped_column(
        "phase1_source_id",
        UuidStr,
        ForeignKey("terra_space_phase1_sources.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    reference_label: Mapped[str] = mapped_column(Text, default="")
    evidence_quote: Mapped[str | None] = mapped_column(Text, nullable=True)

    event: Mapped[Event] = relationship(back_populates="event_sources")
    source: Mapped[Document] = relationship(back_populates="event_sources")


class DuplicateFlag(TimestampedModel, Base):
    __tablename__ = "terra_space_phase3_duplicate_flags"
    __table_args__ = (
        UniqueConstraint(
            "event_id", "matched_event_id", name="phase3_duplicate_flags_unique_pair"
        ),
    )

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_id)
    # Renamed from the old SQLite `draft_event_id`: the new authority model has no "draft" status
    # (a fresh event starts `hidden` or `published`, never a `review_status` of "draft"), and the
    # live column is literally named `event_id`.
    event_id: Mapped[str] = mapped_column(
        UuidStr, ForeignKey("terra_space_phase3_events.id", ondelete="CASCADE")
    )
    # Note: on delete RESTRICT, unlike the old SQLite cascade -- deleting an event that is another
    # event's matched_event_id is blocked at the database level until that flag is removed. See
    # events.py's protected-deletion handling.
    matched_event_id: Mapped[str] = mapped_column(
        UuidStr, ForeignKey("terra_space_phase3_events.id", ondelete="RESTRICT")
    )
    matched_reason: Mapped[str] = mapped_column(Text)
    resolution: Mapped[str] = mapped_column(Text, default="pending")
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    event: Mapped[Event] = relationship(foreign_keys=[event_id], back_populates="duplicate_flags")
    matched_event: Mapped[Event] = relationship(foreign_keys=[matched_event_id])


class PipelineEventRun(Base):
    """Read-only in this application. `phase3_event_runs` is pipeline-owned append-only audit
    history that n8n writes, not this app -- mapped only so `services/events.py` can look up the
    latest attempt's safeguard reasons for an EXCEPTION event's `exception_reason`, the same way
    the read-only bridge's own query already does. Never inserted/updated/deleted here."""

    __tablename__ = "terra_space_phase3_event_runs"

    run_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    candidate_key: Mapped[str] = mapped_column(Text)
    safeguard_reasons: Mapped[dict | list | None] = mapped_column(JsonVariant, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
