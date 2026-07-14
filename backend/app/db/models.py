from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def new_id() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


event_locations = Table(
    "event_locations",
    Base.metadata,
    Column("event_id", ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
    Column("location_id", ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True),
)


class TimestampedModel:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class AppSettings(TimestampedModel, Base):
    __tablename__ = "app_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    lm_studio_base_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    lm_studio_model: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Document(TimestampedModel, Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    document_date: Mapped[str] = mapped_column(String(10))
    publication_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    input_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    processing_status: Mapped[str] = mapped_column(String(32), default="draft")
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    sources: Mapped[list["Source"]] = relationship(back_populates="document")


class Attachment(TimestampedModel, Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"))
    relative_path: Mapped[str] = mapped_column(String(1024), unique=True)
    original_name: Mapped[str] = mapped_column(String(512))
    media_type: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int] = mapped_column(Integer)
    checksum: Mapped[str] = mapped_column(String(128))

    document: Mapped[Document] = relationship(back_populates="attachments")


class EventType(TimestampedModel, Base):
    __tablename__ = "event_types"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    events: Mapped[list["Event"]] = relationship(back_populates="event_type")


class Actor(TimestampedModel, Base):
    __tablename__ = "actors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(500), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    event_actors: Mapped[list["EventActor"]] = relationship(back_populates="actor")


class Location(TimestampedModel, Base):
    __tablename__ = "locations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    admin1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city_regency: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    coordinate_precision: Mapped[str | None] = mapped_column(String(16), nullable=True)

    events: Mapped[list["Event"]] = relationship(secondary=event_locations, back_populates="locations")


class Source(TimestampedModel, Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    document_id: Mapped[str | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    reference_label: Mapped[str] = mapped_column(String(500))

    document: Mapped[Document | None] = relationship(back_populates="sources")
    event_sources: Mapped[list["EventSource"]] = relationship(back_populates="source")


class Event(TimestampedModel, Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    event_type_id: Mapped[str | None] = mapped_column(
        ForeignKey("event_types.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(500))
    summary: Mapped[str] = mapped_column(Text)
    start_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    start_date_precision: Mapped[str | None] = mapped_column(String(16), nullable=True)
    end_date_precision: Mapped[str | None] = mapped_column(String(16), nullable=True)
    epistemic_status: Mapped[str] = mapped_column(String(32))
    review_status: Mapped[str] = mapped_column(String(32), default="draft")
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    event_type: Mapped[EventType | None] = relationship(back_populates="events")
    event_actors: Mapped[list["EventActor"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    locations: Mapped[list[Location]] = relationship(
        secondary=event_locations, back_populates="events"
    )
    event_sources: Mapped[list["EventSource"]] = relationship(back_populates="event")
    duplicate_flags: Mapped[list["DuplicateFlag"]] = relationship(
        foreign_keys="DuplicateFlag.draft_event_id", back_populates="draft_event"
    )


class EventActor(Base):
    __tablename__ = "event_actors"

    event_id: Mapped[str] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    actor_id: Mapped[str] = mapped_column(
        ForeignKey("actors.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(16), primary_key=True)

    event: Mapped[Event] = relationship(back_populates="event_actors")
    actor: Mapped[Actor] = relationship(back_populates="event_actors")


class EventSource(Base):
    __tablename__ = "event_sources"

    event_id: Mapped[str] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    source_id: Mapped[str] = mapped_column(
        ForeignKey("sources.id", ondelete="RESTRICT"), primary_key=True
    )
    evidence_quote: Mapped[str | None] = mapped_column(Text, nullable=True)

    event: Mapped[Event] = relationship(back_populates="event_sources")
    source: Mapped[Source] = relationship(back_populates="event_sources")


class DuplicateFlag(TimestampedModel, Base):
    __tablename__ = "duplicate_flags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    draft_event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    matched_event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    matched_reason: Mapped[str] = mapped_column(Text)
    resolution: Mapped[str] = mapped_column(String(32), default="pending")
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    draft_event: Mapped[Event] = relationship(
        foreign_keys=[draft_event_id], back_populates="duplicate_flags"
    )
    matched_event: Mapped[Event] = relationship(foreign_keys=[matched_event_id])
