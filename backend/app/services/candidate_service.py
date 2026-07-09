"""Candidate service for starring, unstarring, updating notes, and purging."""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Candidate, NewsItem
from app.schemas import (
    CandidateListItem,
    CandidateNotesUpdate,
    CandidatesResponse,
    StarResponse,
)


async def star_item(
    db: AsyncSession, news_id: uuid.UUID
) -> StarResponse | None:
    """Star a news item. Returns None if news_id doesn't exist.
    If already starred, simply returns existing info."""
    
    # Check if news item exists
    query = select(NewsItem).where(NewsItem.id == news_id).options(selectinload(NewsItem.candidate))
    result = await db.execute(query)
    news_item = result.scalar_one_or_none()
    
    if not news_item:
        return None
        
    if news_item.candidate:
        return StarResponse(
            message="News item already starred.",
            candidate_id=news_item.candidate.id,
            starred_at=news_item.candidate.starred_at,
        )
        
    candidate = Candidate(news_item_id=news_id)
    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)
    
    return StarResponse(
        candidate_id=candidate.id,
        starred_at=candidate.starred_at,
    )


async def unstar_item(db: AsyncSession, news_id: uuid.UUID) -> bool:
    """Unstar a news item. Returns True if deleted, False if not found."""
    query = select(Candidate).where(Candidate.news_item_id == news_id)
    result = await db.execute(query)
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        return False
        
    await db.delete(candidate)
    await db.commit()
    return True


async def update_notes(
    db: AsyncSession, news_id: uuid.UUID, update_data: CandidateNotesUpdate
) -> Candidate | None:
    """Update custom title, outline, and notes for a candidate."""
    query = select(Candidate).where(Candidate.news_item_id == news_id)
    result = await db.execute(query)
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        return None
        
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(candidate, key, value)
        
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def get_candidates(
    db: AsyncSession, sort_by: str = "video_score", sort_order: str = "desc"
) -> CandidatesResponse:
    """Get all starred candidates."""
    query = select(Candidate).options(selectinload(Candidate.news_item))
    
    # Join to sort by news_item video_score if requested
    query = query.join(NewsItem)
    
    if sort_by == "video_score":
        order_col = NewsItem.video_score
    else:
        order_col = Candidate.starred_at
        
    if sort_order.lower() == "desc":
        order_col = order_col.desc()
    else:
        order_col = order_col.asc()
        
    query = query.order_by(order_col)
    
    result = await db.execute(query)
    candidates = result.scalars().all()
    
    data = []
    for cand in candidates:
        data.append(
            CandidateListItem(
                candidate_id=cand.id,
                news_item_id=cand.news_item_id,
                title_zh=cand.news_item.title_zh,
                source_name=cand.news_item.source_name,
                video_score=cand.news_item.video_score,
                starred_at=cand.starred_at,
                custom_title=cand.custom_title,
                custom_outline=cand.custom_outline,
                notes=cand.notes,
            )
        )
        
    return CandidatesResponse(data=data)


async def purge_old_items(db: AsyncSession, retention_days: int) -> int:
    """Purge old unstarred news items to manage database size."""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
    
    # Get all candidate IDs (to preserve them)
    candidate_query = select(Candidate.news_item_id)
    candidate_result = await db.execute(candidate_query)
    candidate_news_ids = [row[0] for row in candidate_result.all()]
    
    # Also get parents of candidate children (to preserve them)
    parent_query = select(NewsItem.parent_id).where(
        NewsItem.id.in_(candidate_news_ids) & NewsItem.parent_id.isnot(None)
    ).distinct()
    parent_result = await db.execute(parent_query)
    parent_ids = [row[0] for row in parent_result.all() if row[0] is not None]
    
    preserve_ids = set(candidate_news_ids + parent_ids)
    
    # Delete where older than cutoff and not in preserve list
    delete_query = delete(NewsItem).where(
        NewsItem.published_at < cutoff_date
    ).execution_options(synchronize_session=False)
    
    if preserve_ids:
        delete_query = delete_query.where(NewsItem.id.not_in(preserve_ids))
        
    result = await db.execute(delete_query)
    await db.commit()
    
    return result.rowcount
