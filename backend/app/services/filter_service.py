"""Filter service for tag aggregation."""

from collections import Counter
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import NewsItem
from app.schemas import FilterItem, FiltersResponse


async def get_active_filters(db: AsyncSession) -> FiltersResponse:
    """Get aggregated filter tag counts for primary news items."""
    query = select(NewsItem.country_tags, NewsItem.topic_tags, NewsItem.audience_tags).where(
        NewsItem.parent_id.is_(None)
    )
    result = await db.execute(query)
    
    country_counter = Counter()
    topic_counter = Counter()
    audience_counter = Counter()
    
    for c_tags, t_tags, a_tags in result.tuples():
        # Handle SQLite JSON string fallback
        if isinstance(c_tags, str):
            c_tags = json.loads(c_tags)
        if isinstance(t_tags, str):
            t_tags = json.loads(t_tags)
        if isinstance(a_tags, str):
            a_tags = json.loads(a_tags)
            
        country_counter.update(c_tags or [])
        topic_counter.update(t_tags or [])
        audience_counter.update(a_tags or [])
        
    return FiltersResponse(
        countries=[
            FilterItem(tag=tag, count=count) 
            for tag, count in country_counter.most_common()
        ],
        topics=[
            FilterItem(tag=tag, count=count) 
            for tag, count in topic_counter.most_common()
        ],
        audiences=[
            FilterItem(tag=tag, count=count) 
            for tag, count in audience_counter.most_common()
        ]
    )
