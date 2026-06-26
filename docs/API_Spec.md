# ImmiPulse - API Specification

## 1. Authentication & Protocols
- **Protocol**: HTTPS
- **Base URL**: `https://api.immipulse.com/api/v1` (or local via Cloudflare Tunnel)
- **Format**: JSON
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>` (Required for all endpoints except public auth and guest feed routes)

---

## 2. Authentication Endpoints

### 2.1 User Registration
- **Endpoint**: `POST /auth/signup`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "status": "success",
    "message": "User registered successfully",
    "data": {
      "user_id": "usr_9a8b7c6d",
      "email": "user@example.com",
      "user_tier": "basic"
    }
  }
  ```

### 2.2 User Login
- **Endpoint**: `POST /auth/login`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user_tier": "basic"
    }
  }
  ```

---

## 3. User Preferences & Configuration

### 3.1 Fetch Subscription Preferences
- **Endpoint**: `GET /user/preferences`
- **Authentication**: JWT Required (Basic, Premium)
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": {
      "preferred_jurisdictions": ["US", "CA", "DE"],
      "preferred_tags": ["Education", "Corporate Sponsorship"],
      "digest_frequency": "daily"
    }
  }
  ```

### 3.2 Update Subscription Preferences
- **Endpoint**: `PUT /user/preferences`
- **Authentication**: JWT Required (Basic, Premium)
- **Request Body**:
  ```json
  {
    "preferred_jurisdictions": ["US", "CA", "DE", "SG"],
    "preferred_tags": ["Education", "Retirement", "Corporate Sponsorship"],
    "digest_frequency": "weekly"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Preferences updated successfully"
  }
  ```

---

## 4. News Feed Endpoints

### 4.1 Get Curated Feed
- **Endpoint**: `GET /feed`
- **Authentication**: Optional
  - *Unregistered (Guest)*: No header. Returns the global (unfiltered) feed of the latest 10 items.
  - *Basic / Premium*: JWT Header. Returns a personalized feed filtered by user preferences and diversity constraints.
- **Query Parameters**:
  - `limit` (integer, optional, defaults to 10, max 10)
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": {
      "articles": [
        {
          "article_id": "art_112233",
          "title": "Canada Express Entry Cut-Off Score Drops to 490",
          "summary": "Immigration, Refugees and Citizenship Canada (IRCC) issued invitations to apply for permanent residence in a new general draw, dropping the score to 490.",
          "publication_date": "2026-06-25T14:30:00Z",
          "source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/news.html",
          "origin_jurisdiction": "CA",
          "tags": ["Education"],
          "is_analysis": false,
          "alternative_sources": [
            "https://www.fragomen.com/insights/canada-express-entry-draw.html"
          ]
        }
      ]
    }
  }
  ```

---

## 5. Premium Keyword Alarms (Premium Users Only)

### 5.1 Fetch Active Keyword Alarms
- **Endpoint**: `GET /user/alerts`
- **Authentication**: JWT Required (Premium)
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": {
      "alerts": [
        {
          "alert_id": "alt_8899",
          "target_jurisdiction": "United Kingdom",
          "keyword": "salary threshold",
          "created_at": "2026-06-25T20:10:00Z"
        }
      ]
    }
  }
  ```

### 5.2 Create Keyword Alarm
- **Endpoint**: `POST /user/alerts`
- **Authentication**: JWT Required (Premium)
- **Request Body**:
  ```json
  {
    "target_jurisdiction": "United Kingdom",
    "keyword": "salary threshold"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "status": "success",
    "message": "Alert created successfully",
    "data": {
      "alert_id": "alt_8899"
    }
  }
  ```

### 5.3 Delete Keyword Alarm
- **Endpoint**: `DELETE /user/alerts/{alert_id}`
- **Authentication**: JWT Required (Premium)
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Alert deleted successfully"
  }
  ```

---

## 6. Admin & Health Endpoints

### 6.1 Get Scraper Health
- **Endpoint**: `GET /admin/health`
- **Authentication**: JWT Required (Admin tier / Internal service key)
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": {
      "scrapers": [
        {
          "scraper_name": "US_Federal_Register",
          "status": "healthy",
          "last_execution": "2026-06-25T16:00:00Z",
          "failures_in_24h": 0
        },
        {
          "scraper_name": "Canada_Gazette",
          "status": "unhealthy",
          "last_execution": "2026-06-24T16:00:00Z",
          "failures_in_24h": 3,
          "last_error": "Timeout occurred fetching target HTML page"
        }
      ]
    }
  }
  ```
