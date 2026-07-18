# Idea.md

# Yutian Immigration AI Newsroom

> An AI-powered editorial workflow that continuously collects, filters, analyses and organises immigration-related news for Chinese audiences, helping generate one high-quality YouTube video every week.

---

# 1. Project Vision

## Background

As a YouTube creator focusing on immigration and overseas life for Chinese audiences, one of the biggest challenges is maintaining a sustainable pipeline of valuable topics.

Unlike travel vloggers or journalists, it is impossible to continuously travel around the world collecting first-hand material.

Instead, this project aims to leverage IT, AI and workflow automation to build a personal AI Editorial Desk.

The goal is **not** to build another RSS reader.

The goal is:

> Every day, automatically discover the few immigration stories that Chinese audiences are most likely to care about, and prepare them for video creation.

---

# 2. Objectives

The system should automatically:

- Collect immigration-related news from multiple sources.
- Remove duplicate stories.
- Translate non-English content.
- Analyse every article using an LLM.
- Classify every article.
- Score every article.
- Present only the most valuable stories.
- Keep only recent news (default: 14 days).
- Provide an elegant dashboard for daily review.

The system should save approximately **1~2 hours every day** that would otherwise be spent manually searching for news.

---

# 3. Target Audience

The content generated from this system is intended for:

- Chinese people currently living in Mainland China
- Overseas Chinese
- Families planning to immigrate
- Chinese students
- Skilled workers
- Parents
- Investors
- Retirees
- Hong Kong identity holders
- People interested in immigration policies worldwide

Therefore,

**Chinese audience relevance is more important than global news importance.**

---

# 4. Overall Architecture

```
News Sources
        │
        ▼
     n8n Workflow
        │
        ▼
Language Detection
        │
        ▼
Translation
        │
        ▼
Duplicate Detection
        │
        ▼
LLM Analysis
        │
        ▼
Metadata Database
        │
        ▼
FastAPI Backend
        │
        ▼
Next.js Dashboard
```

---

# 5. Technology Stack

## Workflow

- n8n (Self-hosted)

Reason:

- Mature workflow engine
- Native RSS support
- HTTP support
- Scheduling
- Database integration
- AI integration
- Docker deployment

---

## LLM

Anthropic-compatible LLM

Compatible with Anthropic API.

Responsibilities:

- Summarisation
- Translation
- Classification
- Tag generation
- Video scoring
- Chinese audience relevance analysis
- Keyword extraction
- Video title generation
- AI analysis

---

## Backend

FastAPI

Responsibilities:

- REST APIs
- Dashboard data
- Filtering
- Search
- Statistics

---

## Database

PostgreSQL

Only metadata is stored.

Original articles are NOT stored.

---

## Frontend

Next.js

Reasons:

- Modern UI
- Fast
- Responsive
- Excellent filtering
- Server-side rendering if required

---

## Deployment

Ubuntu Server

Docker Compose

Components:

- n8n
- PostgreSQL
- FastAPI
- Next.js
- LLM API integration
- Reverse Proxy (Caddy or Nginx)

---

# 6. News Sources

Google Alerts RSS

Examples:

- US Immigration
- Canada Immigration
- UK Immigration
- Ireland Immigration
- Portugal Citizenship
- Spain Immigration
- Hong Kong Talent Scheme
- Dual Citizenship
- Overseas Retirement
- Digital Nomad Visa
- Golden Visa
- Skilled Worker Visa

---

Additional RSS sources

Government

- USCIS
- IRCC
- UK Home Office
- Ireland Department of Justice
- Australian DHA
- Immigration New Zealand
- Portugal Government
- Spain Government
- EU Commission

News

- Reuters
- AP
- BBC
- Guardian
- Euronews

Others

- Google News RSS
- Legal firms (selected)
- Immigration organisations

Google Alerts is only one data source.

---

# 7. Workflow

## Step 1

Collect RSS

↓

Store temporary raw feed.

---

## Step 2

Detect language.

Possible values:

- English
- Chinese
- Spanish
- Portuguese
- German
- French
- Italian
- Dutch
- Japanese
- Korean
- Others

---

## Step 3

Translation

Always produce:

Original

English

Chinese

Example

```
Original:
España modifica...

English:
Spain changes...

Chinese:
西班牙修改...
```

If original language is English:

English == Original

Chinese is generated.

If original language is Chinese:

Chinese == Original

English is generated.

---

## Step 4

Duplicate Detection

Methods

- URL
- Canonical URL
- Title similarity
- AI semantic similarity

Duplicate stories belong to one Duplicate Group.

---

## Step 5

LLM Analysis

Configured LLM analyses every article.

Outputs:

- Summary
- Keywords
- Country
- Topic
- Audience
- Importance
- Chinese relevance
- Video score
- Evergreen score
- AI analysis
- Suggested titles
- Thumbnail text

---

## Step 6

Store Metadata

Only metadata is stored.

Retention:

14 days (configurable).

Expired records are automatically deleted.

---

# 8. Database Design

## Metadata Fields

```
id

title_original
title_en
title_zh

summary_original
summary_en
summary_zh

original_language

source_name
source_type
source_url

published_at
received_at

country_tags
topic_tags
audience_tags

importance_score
video_score
chinese_relevance_score
evergreen_score

duplicate_group

keywords

ai_analysis

official_source

source_priority

processing_version
workflow_version
```

No article body.

No HTML.

No images.

No attachments.

---

# 9. Scoring System

## Importance Score

How important globally.

0~100

---

## Chinese Relevance Score

How interesting for Chinese audiences.

0~100

---

## Video Score

How suitable for a YouTube video.

0~100

Evaluation includes:

- Policy changes
- Public interest
- Controversy
- Search demand
- Practical impact
- Educational value

---

## Evergreen Score

Long-term value.

Examples

High

- Citizenship law
- PR requirements
- Tax rules

Low

- Weekly Express Entry draw
- Temporary visa announcements

This helps distinguish:

News

vs

Long-lasting educational content.

---

# 10. Dashboard Design

Purpose

The Dashboard is **not** a CMS.

It is **not** an RSS Reader.

It is an AI Editorial Command Centre.

Question answered every day:

> What should I make my next video about?

---

## Homepage

Displays

Top 10 stories.

Each card includes

- Country
- Title
- Chinese summary
- Video Score
- Chinese Relevance
- Importance
- Tags
- Source
- Published Time
- Received Time

---

## Sidebar

Dashboard

Latest

Top Stories

Countries

Topics

Audience

Saved

Search

Settings

---

## Country Filters

Examples

- USA
- Canada
- UK
- Ireland
- Portugal
- Spain
- Germany
- France
- Italy
- Greece
- Malta
- Australia
- New Zealand
- Hong Kong
- EU

---

## Topic Filters

Examples

- Work Visa
- PR
- Citizenship
- Family Reunion
- Digital Nomad
- Golden Visa
- Healthcare
- Education
- Tax
- Housing

---

## Audience Filters

Examples

- Parents
- Students
- Skilled Workers
- Investors
- Retirees
- Hong Kong Applicants
- Overseas Chinese

---

## News Detail Drawer

Clicking a story opens a side drawer.

Contents

- Original Title
- English Title
- Chinese Title
- Original Summary
- English Summary
- Chinese Summary
- AI Analysis
- Tags
- Scores
- Timeline
- Related News
- Original Link

No page refresh.

---

# 11. Search

Search by

- Country
- Topic
- Keyword
- Audience
- Source

Instant filtering.

---

# 12. Saved Candidates

Every card includes

⭐ Candidate

Clicking it saves the story.

Dedicated page:

Video Candidates

Displays

- Video Score
- Suggested Titles
- AI Summary
- Notes

This becomes the weekly content planning board.

---

# 13. Configuration

Environment variables

```
NEWS_RETENTION_DAYS=14

TOP_STORIES_COUNT=10

MIN_VIDEO_SCORE=70

MIN_CHINESE_RELEVANCE=60

DATABASE_URL=...

LLM_API_KEY=...
LLM_API_URL=...
LLM_MODEL=...
WORKFLOW_VERSION=1.0.0
```

---

# 14. Design Principles

## Metadata First

Store metadata only.

Never store entire articles.

---

## Chinese Audience First

Chinese audience interest always has higher priority than global popularity.

---

## Human in the Loop

AI recommends.

Human decides.

---

## Lightweight

Only recent news.

No unnecessary storage.

---

## Local First

Everything runs on self-hosted infrastructure.

No cloud dependency except the LLM API.

---

# 15. Future Enhancements

- Email daily digest
- WeChat notification
- Telegram notification
- Slack integration
- AI-generated weekly report
- AI-generated monthly immigration trends
- Trend charts
- Source reliability statistics
- Automatic YouTube script generation
- Thumbnail generation prompt
- AI podcast outline
- Semantic search
- RAG over the 14-day news corpus
- AI Q&A assistant
- Personal notes for each news item
- Manual tag editing
- Multi-user support

---

# 16. Success Criteria

The project is successful if:

- Every morning, opening the Dashboard takes less than 10 minutes to identify worthwhile stories.
- More than 90% of duplicate news is removed automatically.
- The Dashboard consistently surfaces stories that matter to Chinese audiences.
- Weekly YouTube topic selection becomes effortless.
- The system reduces manual news collection by at least 80%.
- It becomes the primary editorial workspace for the "雨田在海外" channel.

---

# 17. Project Motto

> **Don't build a news reader. Build an AI editorial desk that helps Chinese audiences understand global immigration.**
