"""Router for news feed and detail."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import NewsDetailResponse, PaginatedNewsResponse
from app.services import news_service


router = APIRouter(prefix="/api/news", tags=["News"])


@router.get("", response_model=PaginatedNewsResponse)
async def get_news_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    countries: str | None = None,
    topics: str | None = None,
    audiences: str | None = None,
    search: str | None = None,
    min_video_score: int | None = None,
    show_low_relevance: bool = False,
    sort_by: str = Query("published_at", pattern="^(published_at|video_score|chinese_relevance_score|evergreen_score)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
):
    """Get paginated news feed."""
    
    countries_list = [c.strip() for c in countries.split(",")] if countries else None
    topics_list = [t.strip() for t in topics.split(",")] if topics else None
    audiences_list = [a.strip() for a in audiences.split(",")] if audiences else None
    
    return await news_service.get_news_list(
        db=db,
        page=page,
        limit=limit,
        countries=countries_list,
        topics=topics_list,
        audiences=audiences_list,
        search=search,
        min_video_score=min_video_score,
        show_low_relevance=show_low_relevance,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{id}", response_model=NewsDetailResponse)
async def get_news_detail(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get full details for a single news item."""
    item = await news_service.get_news_detail(db, id)
    if not item:
        raise HTTPException(status_code=404, detail="News item not found")
    return item
