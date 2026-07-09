"""Router for filters."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import FiltersResponse
from app.services import filter_service


router = APIRouter(prefix="/api/filters", tags=["Filters"])


@router.get("", response_model=FiltersResponse)
async def get_filters(
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Get aggregated filter tag counts for active primary news items."""
    return await filter_service.get_active_filters(db)
