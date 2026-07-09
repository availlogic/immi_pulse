# E2E Test Scenarios: Yutian Immigration AI Newsroom (ImmiPulse)

This document specifies the end-to-end (E2E) testing scenarios for **ImmiPulse**, simulating real user behaviors across screen transitions, API requests, database mutations, and external actions.

---

## E2E-001: Daily News Review Journey

### Objectives
Verify that the creator can review daily ingested news, apply filters, examine specific policy updates in the detail drawer, click to verify official sources, star the story as a candidate, and write initial notes.

### Prerequisites
- FastAPI backend, PostgreSQL, local TEI container, and Next.js frontend are running.
- Ingestion pipeline has recently loaded 10 new articles into the database:
  - 2 articles on Canada (one with relevance 85, one with relevance 45).
  - 1 article on Japan (relevance 80).
  - 7 other global articles.

### Test Steps & Assertions

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Yutian (User)
    participant UI as Next.js Dashboard
    participant API as FastAPI Backend
    participant DB as PostgreSQL DB
    
    Creator->>UI: Open Dashboard (/)
    UI->>API: GET /api/news?show_low_relevance=false
    API->>DB: Query primary news items (Relevance >= 60)
    DB-->>API: Return 9 news items
    API-->>UI: Return 9 news items
    UI-->>Creator: Render news grid (Canada relevance 45 is hidden)
    
    Creator->>UI: Select "Canada" in Country Filters
    UI->>API: GET /api/news?countries=Canada&show_low_relevance=false
    API-->>UI: Return 1 news item (Canada relevance 85)
    UI-->>Creator: Render grid containing only Canada Card
    
    Creator->>UI: Click Card (Canada Express Entry)
    UI->>API: GET /api/news/{id}
    API-->>UI: Return full translations, AI Analysis & source list
    UI-->>Creator: Drawer slides open from right (renders details)
    
    Creator->>UI: Click "Original" translation tab
    UI-->>Creator: Renders summary in original language (English)
    
    Creator->>UI: Click Star Candidate (⭐) Button
    UI->>API: POST /api/candidates/{id}/star
    API->>DB: INSERT INTO candidates (news_item_id)
    DB-->>API: Row inserted successfully
    API-->>UI: Return 201 Created (candidate_id)
    UI-->>Creator: Star button transitions to gold fill (starred state)
    
    Creator->>UI: Write notes in text box ("Verify draw stats tomorrow")
    Creator->>UI: Blur focus out of text box
    UI->>API: PATCH /api/candidates/{id}/notes {"notes": "Verify..."}
    API->>DB: UPDATE candidates SET notes = "Verify..."
    DB-->>API: Notes updated
    API-->>UI: Return 200 OK
    UI-->>Creator: Displays "Saved to desk" check pill
```

### Validation & Verification
1. **Traceability check**:
   - Verify that `is_starred` matches true in database.
   - Verify that the card grid scroll position was preserved throughout transitions.
   - Verify clicking the original link opened a new browser tab without losing state.
2. **Error Recovery Branch**:
   - If the note PATCH fails (e.g. timeout), verify a warning toast shows: "Sync Failed. Retrying...". Clicking retry successfully repeats the step.

- **Traceability**: [User-Flows: Section 2.1](file:///Users/victorxu/projects/immi_pulse/docs/User-Flows.md#L26), [PRD: US-5, US-7, US-8](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L103)

---

## E2E-002: Weekly Planning & Script Drafting Journey

### Objectives
Verify that the creator can review the accumulated starred pool, select the optimal topic, draft and flesh out the script outline in the double-pane workspace, export the content to the clipboard, and clean up unstarred candidates.

### Prerequisites
- Candidates table contains 4 starred items:
  - Canada Express Entry Draw (Video Score: 82)
  - Japan highly skilled visas (Video Score: 75)
  - UK student visa updates (Video Score: 60)
  - Spain Nomad updates (Video Score: 55)

### Test Steps & Assertions

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Yutian (User)
    participant UI as Next.js Dashboard
    participant API as FastAPI Backend
    participant DB as PostgreSQL DB
    
    Creator->>UI: Click "Candidates" in Navigation Sidebar
    UI->>API: GET /api/candidates
    API->>DB: Query candidates table JOIN news_items
    DB-->>API: Return 4 candidates
    API-->>UI: Return 4 candidates sorted by video_score desc
    UI-->>Creator: Renders Candidates split double-pane layout
    
    Creator->>UI: Select first item (Canada Draw) in left list
    UI-->>Creator: Populates right pane with Outline Editor
    
    Creator->>UI: Type script hooks in custom outline block
    Creator->>UI: Focus out of custom outline block
    UI->>API: PATCH /api/candidates/{id}/notes
    API->>DB: UPDATE candidates SET custom_outline = "..."
    API-->>UI: Return 200 OK
    UI-->>Creator: Displays "Saved to desk" feedback indicator
    
    Creator->>UI: Click "Copy Outline to Clipboard" button
    UI-->>Creator: Shows toast "Outline Copied!" & copies markdown text
    
    Creator->>UI: Click Star icon (⭐) on Japan candidate card in list
    UI->>API: DELETE /api/candidates/{id}/unstar
    API->>DB: DELETE FROM candidates WHERE news_item_id = id
    DB-->>API: Row deleted
    API-->>UI: Return 200 OK
    UI-->>Creator: Card disappears from list, shows Undo banner toast
    
    Creator->>UI: Click "Undo" in the bottom banner
    UI->>API: POST /api/candidates/{id}/star
    API-->>UI: Return 201 Created
    UI-->>Creator: Card is restored to candidates list
```

### Validation & Verification
1. **Clipboard content formatting**:
   - Read clipboard buffer and assert contents match the standard format:
     ```markdown
     # Video Topic: [Selected Custom Title]
     
     ## AI Demographic Impact Analysis
     [AI Analysis Text]
     
     ## Creator Script Outline
     [Custom Creator Outline Text]
     
     ## Reference Sources
     - Source 1: [URL]
     ```
2. **Transition/Collapse check**:
   - Resize viewport to mobile (<768px). Assert layout changes from split double-pane to single vertical card stack, and clicking a card slides the outline editor up as a bottom sheet.

- **Traceability**: [User-Flows: Section 2.2](file:///Users/victorxu/projects/immi_pulse/docs/User-Flows.md#L76), [PRD: US-8](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L107), [UI-Layouts: Section 4](file:///Users/victorxu/projects/immi_pulse/docs/UI-Layouts.md#L103)
