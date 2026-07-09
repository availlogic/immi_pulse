# Screen Specifications: Yutian Immigration AI Newsroom

This document defines the functional and UI specifications for the individual screens and key interactive components of the Yutian Immigration AI Newsroom (ImmiPulse).

---

## 1. Global Layout & Shell

All screens are wrapped in the global layout shell which provides navigation and basic utilities.

- **Desktop/Tablet Layout:** Persistent left navigation sidebar.
- **Mobile Layout:** Bottom navigation bar.
- **Header:** Contains the current workspace title, search input (for the feed), and status indicator (Online/Sync Status).

---

## 2. Screen: Dashboard (Main News Feed)

### 2.1 Overview
- **Screen Name:** Dashboard Feed
- **Purpose:** Provide an enriched, de-duplicated overview of collected global immigration news.
- **User Goals:** Quickly filter, view scores, evaluate relevance to Chinese audiences, and identify video candidate leads.

### 2.2 Layout & Hierarchy
1. **Header Section:** Workspace Title, Search Input, Global Sync Status.
2. **Filters Panel (Sidebar on Desktop, Floating overlay/drawer on mobile):**
   - Toggle to "Show Low Relevance" (< 60 Chinese Relevance).
   - Country multi-select filter tags.
   - Topic multi-select filter tags.
   - Audience multi-select filter tags.
3. **Primary News Grid:**
   - Multi-column card layout (1 column on mobile, 2 on tablet, 3 on desktop).
   - Sorted by: Publication Date (default) or Video Score, or Chinese Relevance.

### 2.3 Key Components

#### 2.3.1 News Story Card
- **Purpose:** Show aggregated summary data for a news item/duplicate group.
- **Visual & Content Elements:**
  - Primary country tag (e.g., `Canada`, `Japan`).
  - Recommended YouTube Title (Chinese) or Chinese Title.
  - Quick summary text (max 120 chars).
  - Main metrics badges:
    - **Video Score (VS):** Numerical value (0-100) inside a color-coded circular badge.
    - **Chinese Relevance (CR):** Numerical value (0-100) inside a color-coded badge.
  - Meta info: Source name, publication date (humanized, e.g., "3 hours ago"), duplicate count indicator (e.g., "+3 sources" if grouped).
  - Star Candidate Button (⭐).
- **Interactions:**
  - Hovering a card applies a warm lift elevation shadow and scale effect.
  - Clicking any part of the card (except the star button) triggers the Detail Drawer to slide open.
  - Clicking the Star button toggles candidate status in the DB (sends `POST /api/candidates/{id}/star` or `DELETE /api/candidates/{id}/unstar`).

#### 2.3.2 Filter Toggle: "Show Low Relevance"
- **Purpose:** Allow showing stories with `chinese_relevance_score` < 60 (hidden by default).
- **Behavior:** Switch control. On toggle, the API query parameter is updated and the news grid updates instantly (<200ms).

### 2.4 State Specifications
- **Loading State:** Display a skeleton grid of 6 cards with subtle shimmering animation.
- **Empty State:** Display a warm, styled graphic saying: *"No news found matching your filters. Try clearing some selections."*
- **Populated State:** Show the news grid. Grouped duplicate items are nested under the primary card.
- **System Error State:** Display a banner toast: *"Failed to load feed. [Retry Button]"*.
- **Offline State:** Banner warning: *"You are viewing cached offline data. Reconnecting..."*.

### 2.5 Navigation
- **Next Destination:** Clicking a card opens the **Detail Drawer**.
- **Sidebar Destination:** Click `/candidates` to go to the Saved Candidates screen.

---

## 3. Component: News Detail Drawer

The Detail Drawer is an interactive overlay sliding in from the right (desktop) or sliding up from the bottom as a sheet (mobile). It prevents scroll position loss.

### 3.1 Overview
- **Screen Name:** Detail Drawer
- **Purpose:** Review deep metadata, AI analyses, translations, suggested titles, and write annotations.
- **User Goals:** Perform complete editorial due diligence on a specific story candidate.

### 3.2 Layout & Hierarchy
- **Header Section:**
  - Close button (`X`).
  - Star candidate toggle button.
  - Main recommendation tag (displays *"High Recommendation"* badge if `video_score` >= 70 and `chinese_relevance_score` >= 70).
- **Tab Panel (Language Switcher):** Tabs for `Chinese`, `English`, `Original`.
- **Main Scrollable Content:**
  - Title (in active tab language).
  - Multi-Dimensional Metrics Section (4 progress bars: Video Suitability, Chinese Relevance, Global Importance, Evergreen Score).
  - AI Summary Box (Chinese/English translation summary).
  - AI Demographic Impact Analysis: Insights on how this change directly affects Chinese applicants (skilled, students, investors).
  - Suggested YouTube Titles List: Bullets of recommended attention-grabbing titles in Chinese.
  - Thumbnail Text Prompt Idea: Suggested visual text overlay for YouTube thumbnail designers.
  - Custom Editorial Notes Box: A text area for Yutian to input annotations and draft video outlines.
  - Source Verification Section: External clickable links showing all duplicate article origins (e.g., Reuters, USCIS portal).

### 3.3 Key Components

#### 3.3.1 Language Switcher Tabs
- **Behavior:** Switch layout fields instantly between Chinese, English, and the source original text (e.g. Japanese or Spanish).

#### 3.3.2 Metrics Progress Bars
- **Behavior:** Dynamic colored tracks displaying scores. Warm color scheme:
  - Score >= 70: Sunny gold/amber indicator (`#F59E0B` to `#FBBF24`).
  - Score 50-69: Warm orange indicator (`#F97316`).
  - Score < 50: Soft cream/gray indicator.

#### 3.3.3 Custom Notes Text Area (Annotation Mode)
- **Behavior:** Rich text box for typing notes.
- **Auto-Save Mechanism:** Auto-saves the notes on blur (when clicking away or shifting focus).
- **Visual Indicators:**
  - When typing: Display soft text *"Saving changes..."* in the bottom right.
  - When saved: Transition text to a green-check pill *"Saved to desk"* that fades out after 2 seconds.
- **Validation Rules:**
  - Input limit: 4000 characters. If exceeded, stop input and display warning outline: *"Character limit exceeded (4000 max)"*.

### 3.4 State Specifications
- **Loading State:** Loading spinner inside drawer.
- **Success State:** Note successfully synchronized to the database.
- **Validation Error:** Highlights the outline of notes text area in warm orange and shows an error banner.

---

## 4. Screen: Saved Candidates (Content Workspace)

### 4.1 Overview
- **Screen Name:** Saved Candidates
- **Purpose:** Weekly planning board to select topics, edit script outlines, and export content.
- **User Goals:** Finalize the week's chosen YouTube topic, flesh out script outlines, and copy notes to the scripting app.

### 4.2 Layout & Hierarchy
- **Header Section:** Page Title (*"Video Candidates Desk"*), Total candidates count.
- **Main List View:** Vertical stack of starred candidates sorted by `video_score` (descending) by default.
  - Layout is two-pane on Desktop: Left pane contains the card list; selecting a card populates the Right pane with the **Outline Editor** directly, avoiding a drawer overlap.
  - Layout is single-pane on Mobile: Clicking a card opens the Detail drawer bottom-sheet.

### 4.3 Key Components

#### 4.3.1 Outline Editor
- **Purpose:** Workspace dedicated to writing scripting outlines.
- **Features:**
  - Display AI-recommended Chinese YouTube video titles.
  - Text area for personal script outline notes.
  - **Copy Outline to Clipboard Button:** A primary action button. When clicked, it copies the structured outline Markdown text:
    ```markdown
    # Video Topic: [Selected Title]
    
    ## AI Demographic Impact Analysis
    [AI Impact Paragraph]
    
    ## Creator Script Outline
    [User Custom Notes]
    
    ## Reference Sources
    - Source 1: [Link]
    - Source 2: [Link]
    ```
- **Interactions:**
  - Clicking "Copy" triggers a toast banner: *"Outline Copied! Ready to paste into scripting editor."*

### 4.4 State & Validation Specs
- **Empty State:** Large graphic showing: *"No candidates starred yet. Go to the feed to star some high-value topics."*
- **Validation:**
  - Notes auto-saved on blur.
