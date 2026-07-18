# Vision: Yutian Immigration AI Newsroom

An AI-powered editorial workflow that continuously collects, filters, analyzes, and organizes immigration-related news for Chinese audiences, helping generate one high-quality YouTube video every week.

## Project Vision

As a YouTube creator focusing on immigration and overseas life for Chinese audiences ("雨田在海外"), maintaining a sustainable pipeline of valuable video topics is a major challenge. Because a creator cannot travel around the world to collect first-hand material, this project leverages IT, AI, and workflow automation to build a personal AI Editorial Desk.

The core vision is:
> Every day, automatically discover the few immigration stories that Chinese audiences are most likely to care about, and prepare them for video creation.

This system is not an RSS reader or CMS, but an AI Editorial Command Center.

## Target Users

The content generated from this system is intended for:
- Chinese people currently living in Mainland China.
- Overseas Chinese and families planning to immigrate.
- Chinese students and skilled workers.
- Parents, investors, and retirees.
- Hong Kong talent scheme/identity holders.
- Anyone interested in immigration policies worldwide.

*Relevance to the Chinese audience is the primary filter, taking precedence over global news importance.*

## User Problems

- **Topic Sustainability**: Generating fresh, valuable, and engaging video topics every week without first-hand, boots-on-the-ground source gathering.
- **Information Overload**: Spending 1-2 hours daily manually scouring multiple search engines, news feeds, government portals, and social media for immigration updates.
- **Low Signal-to-Noise Ratio**: High volumes of repetitive articles, low-priority news, or stories irrelevant to the specific interests of the target audience.

## Product Goals

- **Automated Curation**: Continuously ingest, de-duplicate, translate, analyze, and score immigration news.
- **Efficiency**: Reduce the daily curation and topic selection time down to under 10 minutes.
- **Focused Output**: Surface only the top stories and high-scoring video candidates for the weekly YouTube video.

## Core Capabilities

- **Multi-Source Collection**: Ingest news from Google Alerts RSS, government websites, news agencies (Reuters, AP, BBC, etc.), and law firms.
- **Language Detection & Translation**: Automatically detect original languages and maintain three parallel translation fields (Original, English, Chinese).
- **Intelligent De-duplication**: Group identical or similar stories using URL matching, canonical URL comparison, title similarity, and semantic AI clustering.
- **LLM Analysis & Metadata Generation**: Generate summaries, keywords, country tags, topic tags, target audience tags, and multi-dimensional scores.
- **Command Center Dashboard**: An elegant UI showcasing the top stories, featuring powerful filtering (country, topic, audience), saved video candidates, and a detail drawer for in-depth view without page refreshes.

## Success Metrics

- **Morning Review Time**: Opening the Dashboard takes less than 10 minutes to identify worthwhile video stories.
- **De-duplication Rate**: More than 90% of duplicate news is filtered out automatically.
- **Target Audience Alignment**: The system consistently highlights stories highly relevant to Chinese audiences.
- **Curation Overhead Reduction**: Reduces manual news tracking and sorting by at least 80%.

## Out-of-Scope

- **Full Text Archiving**: Original article bodies, full HTML, images, and attachments are not stored.
- **General CMS/Feed Reader**: The dashboard is not designed for general-purpose RSS reading or publishing content directly.

## Future Direction

- **Notifications & Digests**: Email daily digests and integrations with WeChat, Telegram, and Slack.
- **Advanced AI Outputs**: Automatic YouTube script drafting, thumbnail text prompt generation, and AI podcast outlines.
- **Analytics & Trends**: Weekly/monthly immigration trend reports, chart visualizations, and source reliability statistics.
- **Interactive Knowledge**: Semantic search and RAG assistant queryable over the 14-day news metadata corpus.
- **Collaborative Features**: Manual tag editing, personal notes for news items, and multi-user configurations.
