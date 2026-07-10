"""News service for querying the news_items table."""

import uuid
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Candidate, NewsItem
from app.schemas import (
    DuplicateSource,
    LanguagesResponse,
    MetadataResponse,
    NewsDetailResponse,
    NewsListItem,
    PaginatedNewsResponse,
    PaginationInfo,
    ScoresResponse,
    SummariesResponse,
    TagsResponse,
    TitlesResponse,
    YoutubeSuggestionsResponse,
)


async def get_news_list(
    db: AsyncSession,
    page: int = 1,
    limit: int = 25,
    countries: list[str] | None = None,
    topics: list[str] | None = None,
    audiences: list[str] | None = None,
    search: str | None = None,
    min_video_score: int | None = None,
    show_low_relevance: bool = False,
    sort_by: str = "published_at",
    sort_order: str = "desc",
) -> PaginatedNewsResponse:
    """Get paginated news feed with filters and sorting."""
    # Base query for parent items
    query = select(NewsItem).where(NewsItem.parent_id.is_(None))

    # Apply filters (with SQLite fallback for tests)
    dialect = db.get_bind().dialect.name
    
    if countries:
        if dialect == "postgresql":
            query = query.where(NewsItem.country_tags.op("&&")(countries))
        else:
            from sqlalchemy import String, cast
            query = query.where(or_(*[cast(NewsItem.country_tags, String).like(f"%{c}%") for c in countries]))
    if topics:
        if dialect == "postgresql":
            query = query.where(NewsItem.topic_tags.op("&&")(topics))
        else:
            from sqlalchemy import String, cast
            query = query.where(or_(*[cast(NewsItem.topic_tags, String).like(f"%{t}%") for t in topics]))
    if audiences:
        if dialect == "postgresql":
            query = query.where(NewsItem.audience_tags.op("&&")(audiences))
        else:
            from sqlalchemy import String, cast
            query = query.where(or_(*[cast(NewsItem.audience_tags, String).like(f"%{a}%") for a in audiences]))
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                NewsItem.title_zh.ilike(search_term),
                NewsItem.title_en.ilike(search_term),
            )
        )
    if min_video_score is not None:
        query = query.where(NewsItem.video_score >= min_video_score)
    if not show_low_relevance:
        query = query.where(NewsItem.chinese_relevance_score >= 60)

    # Count total records for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_records = await db.scalar(count_query) or 0
    total_pages = (total_records + limit - 1) // limit if limit > 0 else 0

    # Sorting
    order_col = getattr(NewsItem, sort_by, NewsItem.published_at)
    if sort_order.lower() == "desc":
        order_col = order_col.desc()
    else:
        order_col = order_col.asc()
    
    query = query.order_by(order_col)

    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    # Eager load relationships needed for computed fields
    query = query.options(
        selectinload(NewsItem.candidate),
        selectinload(NewsItem.children)
    )

    result = await db.execute(query)
    items = result.scalars().all()

    # Map to schema
    data = []
    for item in items:
        # Check arrays, handle empty/malformed
        c_tags = item.country_tags if isinstance(item.country_tags, list) else []
        t_tags = item.topic_tags if isinstance(item.topic_tags, list) else []
        a_tags = item.audience_tags if isinstance(item.audience_tags, list) else []
        
        data.append(
            NewsListItem(
                id=item.id,
                title_zh=item.title_zh,
                title_en=item.title_en,
                source_name=item.source_name,
                published_at=item.published_at,
                country_tags=c_tags,
                topic_tags=t_tags,
                audience_tags=a_tags,
                scores=ScoresResponse(
                    importance=item.importance_score,
                    chinese_relevance=item.chinese_relevance_score,
                    video=item.video_score,
                    evergreen=item.evergreen_score,
                ),
                is_starred=item.candidate is not None,
                duplicate_count=len(item.children),
            )
        )

    return PaginatedNewsResponse(
        data=data,
        pagination=PaginationInfo(
            page=page,
            limit=limit,
            total_records=total_records,
            total_pages=total_pages,
        ),
    )


async def get_news_detail(
    db: AsyncSession, news_id: uuid.UUID
) -> NewsDetailResponse | None:
    """Get full details for a single news item, including duplicates."""
    query = select(NewsItem).where(NewsItem.id == news_id).options(
        selectinload(NewsItem.children),
        selectinload(NewsItem.candidate),
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()

    if not item:
        return None

    # Determine original language if missing from JSON (detected)
    detected = item.original_language
    
    # Format Youtube suggestions
    yt = item.youtube_suggestions
    if isinstance(yt, str):
        import json
        try:
            yt = json.loads(yt)
        except json.JSONDecodeError:
            yt = {}
    elif yt is None:
        yt = {}
        
    yt_titles = yt.get("titles", [])
    yt_thumb = yt.get("thumbnail_prompt", "")

    # Arrays
    c_tags = item.country_tags if isinstance(item.country_tags, list) else []
    t_tags = item.topic_tags if isinstance(item.topic_tags, list) else []
    a_tags = item.audience_tags if isinstance(item.audience_tags, list) else []
    k_tags = item.keywords if isinstance(item.keywords, list) else []

    # Get duplicates (from children or self and parent)
    duplicates = []
    # If this is a parent, children are duplicates
    for child in item.children:
        duplicates.append(
            DuplicateSource(
                source_name=child.source_name, source_url=child.source_url
            )
        )
    # If this is a child, get parent and siblings
    if item.parent_id:
        # Get parent
        parent_query = select(NewsItem).where(NewsItem.id == item.parent_id).options(selectinload(NewsItem.children))
        parent_result = await db.execute(parent_query)
        parent = parent_result.scalar_one_or_none()
        if parent:
            duplicates.append(
                DuplicateSource(
                    source_name=parent.source_name, source_url=parent.source_url
                )
            )
            for sibling in parent.children:
                if sibling.id != item.id:
                    duplicates.append(
                        DuplicateSource(
                            source_name=sibling.source_name, source_url=sibling.source_url
                        )
                    )

    return NewsDetailResponse(
        id=item.id,
        languages=LanguagesResponse(original=item.original_language, detected=detected),
        titles=TitlesResponse(
            original=item.title_original, en=item.title_en, zh=item.title_zh
        ),
        summaries=SummariesResponse(
            original=item.summary_original, en=item.summary_en, zh=item.summary_zh
        ),
        ai_analysis=item.ai_analysis,
        scores=ScoresResponse(
            importance=item.importance_score,
            chinese_relevance=item.chinese_relevance_score,
            video=item.video_score,
            evergreen=item.evergreen_score,
        ),
        metadata=MetadataResponse(
            source_name=item.source_name,
            source_url=item.source_url,
            published_at=item.published_at,
            received_at=item.received_at,
            official_source=item.official_source,
        ),
        tags=TagsResponse(
            countries=c_tags,
            topics=t_tags,
            audiences=a_tags,
        ),
        keywords=k_tags,
        youtube_suggestions=YoutubeSuggestionsResponse(
            titles=yt_titles, thumbnail_prompt=yt_thumb
        ),
        duplicates=duplicates,
        is_starred=item.candidate is not None,
        candidate_notes=item.candidate.notes if item.candidate else None,
    )
