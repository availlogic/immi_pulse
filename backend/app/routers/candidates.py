"""Router for candidates."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    CandidateNotesUpdate,
    CandidatesResponse,
    StarResponse,
)
from app.services import candidate_service


router = APIRouter(prefix="/api/candidates", tags=["Candidates"])


@router.get("", response_model=CandidatesResponse)
async def get_candidates(
    db: Annotated[AsyncSession, Depends(get_db)],
    sort_by: str = Query("video_score", pattern="^(video_score|starred_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
):
    """Get all starred candidates."""
    return await candidate_service.get_candidates(
        db=db, sort_by=sort_by, sort_order=sort_order
    )


@router.post("/{id}/star", response_model=StarResponse, status_code=status.HTTP_201_CREATED)
async def star_news_item(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Star a news item."""
    result = await candidate_service.star_item(db, id)
    if not result:
        raise HTTPException(status_code=404, detail="News item not found")
    if result.message == "News item already starred.":
        raise HTTPException(status_code=409, detail="News item already starred")
    return result


@router.delete("/{id}/unstar", status_code=status.HTTP_200_OK)
async def unstar_news_item(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Unstar a news item."""
    success = await candidate_service.unstar_item(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "News item successfully unstarred."}


@router.patch("/{id}/notes")
async def update_notes(
    id: uuid.UUID,
    notes_update: CandidateNotesUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update custom title, outline, and notes for a candidate."""
    result = await candidate_service.update_notes(db, id, notes_update)
    if not result:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Return updated fields
    return {
        "custom_title": result.custom_title,
        "custom_outline": result.custom_outline,
        "notes": result.notes,
    }
