from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


DATABASE_PATH = Path(os.getenv("DIGIMIRROR_DATABASE_PATH", Path(__file__).resolve().parents[1] / "data" / "digimirror.db"))
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class AccountORM(Base):
    __tablename__ = "accounts"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    threat_profile: Mapped[str] = mapped_column(String(40), default="everyday")
    retention_days: Mapped[int] = mapped_column(Integer, default=90)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    analysis_runs: Mapped[list["AnalysisRunORM"]] = relationship(back_populates="account", cascade="all, delete-orphan")


class AnalysisRunORM(Base):
    __tablename__ = "analysis_runs"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="completed")
    overall_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[str] = mapped_column(String(20), default="low")
    import_type: Mapped[str] = mapped_column(String(50), default="normalized")
    model_version: Mapped[str] = mapped_column(String(80), default="unknown")
    raw_values_stored: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    account: Mapped[AccountORM] = relationship(back_populates="analysis_runs")
    findings: Mapped[list["FindingORM"]] = relationship(cascade="all, delete-orphan")
    actions: Mapped[list["ActionORM"]] = relationship(cascade="all, delete-orphan")
    trails: Mapped[list["ExposureTrailORM"]] = relationship(cascade="all, delete-orphan")


class FindingORM(Base):
    __tablename__ = "findings"
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("analysis_runs.id", ondelete="CASCADE"), index=True)
    field_key: Mapped[str] = mapped_column(String(80), default="unknown")
    finding_type: Mapped[str] = mapped_column(String(80), default="unknown")
    source: Mapped[str] = mapped_column(String(200), default="unknown")
    severity: Mapped[str] = mapped_column(String(20), default="low")
    confidence_score: Mapped[int] = mapped_column(Integer, default=0)
    evidence_hash: Mapped[str] = mapped_column(String(128), default="")
    redacted_preview: Mapped[str] = mapped_column(String(160), default="[redacted]")
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")


class ExposureTrailORM(Base):
    __tablename__ = "exposure_trails"
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("analysis_runs.id", ondelete="CASCADE"), index=True)
    finding_id: Mapped[str] = mapped_column(String(120), default="")
    origin: Mapped[str] = mapped_column(String(200), default="unknown")
    action: Mapped[str] = mapped_column(String(500), default="")
    recipient: Mapped[str] = mapped_column(String(500), default="")


class ActionORM(Base):
    __tablename__ = "actions"
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("analysis_runs.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str] = mapped_column(String(1000), default="")
    settings_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    estimated_reduction: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="open")


class WatcherSnapshotORM(Base):
    __tablename__ = "watcher_snapshots"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("analysis_runs.id", ondelete="CASCADE"))
    score: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class AuditLogORM(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(60))
    run_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    details_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class CanaryTokenORM(Base):
    __tablename__ = "canary_tokens"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True)
    token_type: Mapped[str] = mapped_column(String(30), default="email")
    service: Mapped[str] = mapped_column(String(120), default="unknown")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


def initialize_relational_schema() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
