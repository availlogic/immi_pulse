# API Specification: Yutian Immigration AI Newsroom

This document specifies the REST API endpoints, request/response payloads, and authentication schema for the **Yutian Immigration AI Newsroom** FastAPI backend.

---

## 1. Authentication & Security

All API routes require authentication. The Next.js frontend must include the custom API token in the HTTP authorization headers:

```http
Authorization: Bearer <DASHBOARD_API_TOKEN>
```

* Failed authentication attempts (invalid or missing token) return `401 Unauthorized`.
* External access is blocked; FastAPI binds to `127.0.0.1:8000` and is exposed only via Cloudflare Tunnel.

---

## 2. Shared Data Schemas

### 2.1 API Response Envelopes
To maintain uniformity, successful paginated responses use the metadata wrapper:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total_records": 105,
    "total_pages": 5
  }
}
```

### 2.2 Scores Model
```json
{
  "importance": 75,
  "chinese_relevance": 82,
  "video": 85,
  "evergreen": 90
}
```

---

## 3. Endpoints

### 3.1 Get News Feed (`GET /api/news`)
Retrieve a paginated list of processed primary news items. Only items without a parent (`parent_id IS NULL`) are returned in this feed.

#### Query Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | Integer | `1` | Pagination page number. |
| `limit` | Integer | `25` | Number of items per page. |
| `countries` | String | `null` | Comma-separated list of countries (e.g. `USA,Canada`). |
| `topics` | String | `null` | Comma-separated list of topics (e.g. `Work Visa,PR`). |
| `audiences` | String | `null` | Comma-separated list of audiences (e.g. `Students`). |
| `search` | String | `null` | Full-text query on titles/summaries (Chinese and English fields). |
| `min_video_score` | Integer | `null` | Filter items with a video score greater than or equal to this. |
| `show_low_relevance` | Boolean | `false` | If `true`, returns all items. If `false`, filters out items where `chinese_relevance_score < 60`. |
| `sort_by` | String | `published_at` | Sort field: `published_at`, `video_score`, `chinese_relevance_score`, or `evergreen_score`. |
| `sort_order` | String | `desc` | Sort order: `asc` or `desc`. |

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": "e5b8d963-c793-4b67-a84f-dc9407339d67",
      "title_zh": "日本政府放宽针对IT和初创企业高技术人才的积分签证政策",
      "title_en": "Japan eases points-based visa policies for IT and startup talent",
      "source_name": "Nikkei Asia",
      "published_at": "2026-07-09T05:30:00Z",
      "country_tags": ["Japan"],
      "topic_tags": ["Work Visa", "PR"],
      "audience_tags": ["Skilled Workers", "Investors"],
      "scores": {
        "importance": 70,
        "chinese_relevance": 85,
        "video": 80,
        "evergreen": 75
      },
      "is_starred": true,
      "duplicate_count": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 1,
    "total_records": 1,
    "total_pages": 1
  }
}
```

---

### 3.2 Get News Detail (`GET /api/news/{id}`)
Retrieve detailed translations, AI analysis, recommended titles, and duplicate source list for a single news item.

#### Path Parameters
* `id` (UUID): Unique ID of the news item.

#### Response (`200 OK`)
```json
{
  "id": "e5b8d963-c793-4b67-a84f-dc9407339d67",
  "languages": {
    "original": "ja",
    "detected": "ja"
  },
  "titles": {
    "original": "政府、IT・スタートアップ分野の高度専門職ポイント要件を緩和",
    "en": "Japan eases points-based visa policies for IT and startup talent",
    "zh": "日本政府放宽针对IT和初创企业高技术人才的积分签证政策"
  },
  "summaries": {
    "original": "日本政府はITおよびスタートアップ分野での高度人材獲得を促すため、ポイント制優遇制度の算定基準を大幅に緩和することを決定した...",
    "en": "The Japanese government has decided to significantly ease scoring criteria for highly skilled foreign professionals in IT and startup industries to accelerate foreign talent acquisition...",
    "zh": "日本政府决定大幅放宽IT和初创行业中高技术外国专业人员的积分优惠评估标准，以加速吸引海外高技术人才..."
  },
  "ai_analysis": "此次政策放宽直接降低了IT工程师和创业者申请日本高度人才签证（积分制）的门槛。对于计划通过技术或创业途径赴日的中国中产专业人士与留学生而言，获取高度人才身份并快速转日本永住（最快1年）的确定性显著增加。视频切入点可集中在积分计算器新规则解析和申请攻略上。",
  "scores": {
    "importance": 70,
    "chinese_relevance": 85,
    "video": 80,
    "evergreen": 75
  },
  "metadata": {
    "source_name": "Nikkei Asia",
    "source_url": "https://asia.nikkei.com/japan-visa-change",
    "published_at": "2026-07-09T05:30:00Z",
    "received_at": "2026-07-09T05:32:15Z",
    "official_source": true
  },
  "tags": {
    "countries": ["Japan"],
    "topics": ["Work Visa", "PR"],
    "audiences": ["Skilled Workers", "Investors"]
  },
  "keywords": ["日本积分签证", "高度人才", "IT创业者", "快速永住"],
  "youtube_suggestions": {
    "titles": [
      "日本高度人才签证大放水！IT专才最快1年拿永住？",
      "【新政解析】门槛大幅降低！普通程序员也能躺拿日本绿卡？"
    ],
    "thumbnail_prompt": "日本国旗与粉色樱花背景下，并排摆放高管工作证与永住权卡片，突出醒目的文字‘最快1年转永住’"
  },
  "duplicates": [
    {
      "source_name": "Yahoo Japan News",
      "source_url": "https://news.yahoo.co.jp/articles/sample1"
    },
    {
      "source_name": "Japan Times",
      "source_url": "https://japantimes.co.jp/japan-visa-update"
    }
  ],
  "is_starred": false,
  "candidate_notes": null
}

```
#### Response (`404 Not Found`)
```json
{
  "detail": "News item with ID e5b8d963-c793-4b67-a84f-dc9407339d67 not found."
}
```

---

### 3.3 Get Filter Metadata (`GET /api/filters`)
Retrieve currently active tags in the database to build sidebar filter checkboxes dynamically.

#### Response (`200 OK`)
```json
{
  "countries": [
    { "tag": "Japan", "count": 24 },
    { "tag": "Canada", "count": 18 },
    { "tag": "USA", "count": 15 }
  ],
  "topics": [
    { "tag": "Work Visa", "count": 32 },
    { "tag": "PR", "count": 28 },
    { "tag": "Golden Visa", "count": 12 }
  ],
  "audiences": [
    { "tag": "Skilled Workers", "count": 45 },
    { "tag": "Students", "count": 31 },
    { "tag": "Investors", "count": 14 }
  ]
}
```

---

### 3.4 Get Starred Candidates (`GET /api/candidates`)
Retrieve all starred news items designated as video candidates, sorted by video score descending.

#### Query Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `sort_by` | String | `video_score` | Sort field: `video_score` or `starred_at`. |
| `sort_order` | String | `desc` | Sort order: `asc` or `desc`. |

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "candidate_id": "c1a2e3f4-5678-1234-abcd-ef0123456789",
      "news_item_id": "e5b8d963-c793-4b67-a84f-dc9407339d67",
      "title_zh": "日本政府放宽针对IT和初创企业高技术人才的积分签证政策",
      "source_name": "Nikkei Asia",
      "video_score": 80,
      "starred_at": "2026-07-09T06:00:00Z",
      "custom_title": "日本高度人才大放水！普通程序员的最快拿永住通道？",
      "custom_outline": "1. 引入新政策背景与抢人动机\n2. 算分制新规前后对比\n3. IT/创业人才具体降了多少分\n4. 实操落地步骤与申请要点",
      "notes": "下周视频选题备选，本周五收集具体积分对照表。"
    }
  ]
}
```

---

### 3.5 Star News Item (`POST /api/candidates/{id}/star`)
Add a news item to the candidate pool (stars it).

#### Path Parameters
* `id` (UUID): Unique ID of the news item.

#### Response (`201 Created`)
```json
{
  "message": "News item successfully starred.",
  "candidate_id": "c1a2e3f4-5678-1234-abcd-ef0123456789",
  "starred_at": "2026-07-09T06:00:00Z"
}
```

#### Response (`404 Not Found`)
```json
{
  "detail": "News item with ID e5b8d963-c793-4b67-a84f-dc9407339d67 not found."
}
```

---

### 3.6 Unstar News Item (`DELETE /api/candidates/{id}/unstar`)
Remove a news item from the candidate pool (unstars it).

#### Path Parameters
* `id` (UUID): Unique ID of the news item.

#### Response (`200 OK`)
```json
{
  "message": "News item successfully unstarred."
}
```

#### Response (`404 Not Found`)
```json
{
  "detail": "Candidate not found."
}
```

---

### 3.7 Update Candidate Annotations (`PATCH /api/candidates/{id}/notes`)
Modify custom editor titles, scripting outlines, and research notes on a starred candidate.

#### Path Parameters
* `id` (UUID): The news item ID matching the candidate.

#### Request Body (`application/json`)
```json
{
  "custom_title": "日本高度人才签证大水！IT工程师绿卡最快路径",
  "custom_outline": "一、政策剧变背景...",
  "notes": "已经验证，该放宽政策将于下月开始实施。"
}
```

#### Response (`200 OK`)
```json
{
  "message": "Candidate annotations successfully updated.",
  "candidate_id": "c1a2e3f4-5678-1234-abcd-ef0123456789",
  "custom_title": "日本高度人才签证大水！IT工程师绿卡最快路径",
  "custom_outline": "一、政策剧变背景...",
  "notes": "已经验证，该放宽政策将于下月开始实施。"
}
```

#### Response (`422 Unprocessable Entity`)
```json
{
  "detail": [
    {
      "loc": ["body", "custom_title"],
      "msg": "String length must not exceed 200 characters.",
      "type": "value_error.any_str.max_length"
    }
  ]
}
```
