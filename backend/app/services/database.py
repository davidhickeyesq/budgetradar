from sqlalchemy import create_engine, select, desc
from sqlalchemy.orm import sessionmaker, Session
from functools import lru_cache
import numpy as np
from typing import Optional

from app.config import get_settings
from app.models.schemas import HillParameters
from app.models.db_models import Base, DailyMetric, MMMModel


@lru_cache
def get_engine():
    settings = get_settings()
    return create_engine(settings.database_url)


def get_session() -> Session:
    engine = get_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def init_db():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)


def fetch_daily_metrics(
    account_id: str,
    channel_name: str,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Fetch daily spend and revenue for a channel, ordered by date.
    Returns (spend_array, revenue_array)
    """
    session = get_session()
    try:
        stmt = (
            select(DailyMetric.spend, DailyMetric.revenue)
            .where(DailyMetric.account_id == account_id)
            .where(DailyMetric.channel_name == channel_name)
            .order_by(DailyMetric.date)
        )
        result = session.execute(stmt).all()
        
        if not result:
            return np.array([]), np.array([])
        
        # result is list of tuples (spend, revenue)
        spend = np.array([float(row[0] or 0) for row in result])
        revenue = np.array([float(row[1] or 0) for row in result])
        
        return spend, revenue
    finally:
        session.close()


def fetch_channels_for_account(account_id: str) -> list[str]:
    """Get all unique channel names for an account."""
    session = get_session()
    try:
        stmt = (
            select(DailyMetric.channel_name)
            .where(DailyMetric.account_id == account_id)
            .distinct()
        )
        result = session.execute(stmt).scalars().all()
        return list(result)
    finally:
        session.close()


def get_current_spend(account_id: str, channel_name: str) -> float:
    """Get the most recent day's spend for a channel."""
    session = get_session()
    try:
        stmt = (
            select(DailyMetric.spend)
            .where(DailyMetric.account_id == account_id)
            .where(DailyMetric.channel_name == channel_name)
            .order_by(desc(DailyMetric.date))
            .limit(1)
        )
        result = session.execute(stmt).scalar_one_or_none()
        return float(result or 0)
    finally:
        session.close()


def save_model_params(
    account_id: str,
    channel_name: str,
    params: HillParameters,
) -> None:
    """Save or update model parameters in mmm_models table."""
    session = get_session()
    try:
        # Check if model exists
        stmt = (
            select(MMMModel)
            .where(MMMModel.account_id == account_id)
            .where(MMMModel.channel_name == channel_name)
        )
        existing_model = session.execute(stmt).scalar_one_or_none()
        
        if existing_model:
            # Update
            existing_model.alpha = params.alpha
            existing_model.beta = params.beta
            existing_model.kappa = params.kappa
            existing_model.max_yield = params.max_yield
            existing_model.r_squared = params.r_squared
        else:
            # Insert
            new_model = MMMModel(
                account_id=account_id,
                channel_name=channel_name,
                alpha=params.alpha,
                beta=params.beta,
                kappa=params.kappa,
                max_yield=params.max_yield,
                r_squared=params.r_squared,
            )
            session.add(new_model)
        
        session.commit()
    finally:
        session.close()


def get_model_params(
    account_id: str,
    channel_name: str,
) -> Optional[HillParameters]:
    """Fetch existing model parameters from mmm_models table."""
    session = get_session()
    try:
        stmt = (
            select(MMMModel)
            .where(MMMModel.account_id == account_id)
            .where(MMMModel.channel_name == channel_name)
        )
        model = session.execute(stmt).scalar_one_or_none()
        
        if not model:
            return None
        
        return HillParameters(
            alpha=float(model.alpha),
            beta=float(model.beta),
            kappa=float(model.kappa),
            max_yield=float(model.max_yield),
            r_squared=float(model.r_squared),
        )
    finally:
        session.close()
