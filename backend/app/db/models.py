from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def new_id() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


event_actors = Table(
    "event_actors",
    Base.metadata,
    Column("event_id", ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
    Column("actor_id", ForeignKey("actors.id", ondelete="CASCADE"), primary_key=True),
)

event_locations = Table(
    "event_locations",
    Base.metadata,
    Column("event_id", ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
    Column("location_id", ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True),
)

event_sources = Table(
    "event_sources",
    Base.metadata,
    Column("event_id", ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
    Column("source_id", ForeignKey("sources.id", ondelete="RESTRICT"), primary_key=True),
)


class TimestampedModel:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class Document(TimestampedModel, Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    publication_date: Mapped[str] = mapped_column(String(10))
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    input_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    processing_status: Mapped[str] = mapped_column(String(32), default="draft")

    attachments: Mapped[list["Attachment"]] = relationship(back_populates="document")
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

    events: Mapped[list["Event"]] = relationship(secondary=event_actors, back_populates="actors")


class Location(TimestampedModel, Base):
    __tablename__ = "locations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    admin1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city_regency: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[str | None] = mapped_column(String(32), nullable=True)
    longitude: Mapped[str | None] = mapped_column(String(32), nullable=True)

    events: Mapped[list["Event"]] = relationship(secondary=event_locations, back_populates="locations")


class Source(TimestampedModel, Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    document_id: Mapped[str | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    reference_label: Mapped[str] = mapped_column(String(500))

    document: Mapped[Document | None] = relationship(back_populates="sources")
    events: Mapped[list["Event"]] = relationship(secondary=event_sources, back_populates="sources")


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

    event_type: Mapped[EventType | None] = relationship(back_populates="events")
    actors: Mapped[list[Actor]] = relationship(secondary=event_actors, back_populates="events")
    locations: Mapped[list[Location]] = relationship(
        secondary=event_locations, back_populates="events"
    )
    sources: Mapped[list[Source]] = relationship(secondary=event_sources, back_populates="events")
