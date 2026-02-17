from sqlalchemy import Column, String, Numeric, Date, DateTime, Integer, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


class Account(Base):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    channel_name = Column(String, nullable=False)
    spend = Column(Numeric(10, 2), nullable=False)
    revenue = Column(Numeric(10, 2), nullable=False)
    impressions = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('account_id', 'date', 'channel_name', name='uix_account_date_channel'),
    )


class MMMModel(Base):
    __tablename__ = "mmm_models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)
    channel_name = Column(String, nullable=False)
    alpha = Column(Numeric(10, 4), nullable=False)
    beta = Column(Numeric(10, 4), nullable=False)
    kappa = Column(Numeric(10, 2), nullable=False)
    max_yield = Column(Numeric(10, 2), nullable=False)
    r_squared = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('account_id', 'channel_name', name='uix_mmm_model_account_channel'),
    )


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    budget_allocation = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
