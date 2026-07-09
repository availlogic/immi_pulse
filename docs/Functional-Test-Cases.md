# Functional Test Cases: Yutian Immigration AI Newsroom (ImmiPulse)

This document specifies the UI and feature-level functional test cases to verify the dashboard feed, detail drawer, saved candidates board, filters, search, and validation states of the **Yutian Immigration AI Newsroom**.

---

## 1. Dashboard Feed & Grid View (FT-001)

### FT-001-TC-001: News Grid Rendering (Populated State)
* **Feature Name**: Dashboard Grid View
* **Preconditions**:
  * The user is authenticated (`DASHBOARD_API_TOKEN` is loaded).
  * The database contains at least 5 news items with `parent_id IS NULL` and `chinese_relevance_score >= 60`.
* **Steps**:
  1. Open the dashboard home page (`/`).
  2. Observe the grid layout.
* **Expected Result**:
  * Page loads and displays 5 primary news cards in a responsive grid layout (1 column on mobile, 2 on tablet, 3 on desktop).
  * Each card displays the primary country tag, recommended Chinese title, snippet summary, video score, Chinese relevance score, source name, and humanized published date.
* **Priority**: Critical
* **Traceability**: [PRD: FR-4.1](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L145), [Screen-Specs: 2.3.1](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L37)

### FT-001-TC-002: Card Hover Elevation
* **Feature Name**: Dashboard Grid View
* **Preconditions**:
  * News grid is rendered.
  * Desktop viewport size >= 1024px.
* **Steps**:
  1. Hover the cursor over a news story card.
* **Expected Result**:
  * Card translates vertically upwards by 2px (`transform: translateY(-2px)`).
  * Border color fades and a warm amber shadow is applied (`box-shadow: 0 4px 12px rgba(245, 158, 11, 0.08)`).
* **Priority**: Low
* **Traceability**: [Visual-Guidelines: 5.2](file:///Users/victorxu/projects/immi_pulse/docs/Visual-Guidelines.md#L84), [Screen-Specs: 2.3.1](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L48)

### FT-001-TC-003: Metric Score Badge Color-Coding
* **Feature Name**: Metric Badges
* **Preconditions**:
  * Database contains three news items with different video scores: Card A (score: 82), Card B (score: 55), Card C (score: 42).
* **Steps**:
  1. Load the dashboard (`/`).
  2. Observe the color code on Card A, Card B, and Card C's score badges.
* **Expected Result**:
  * Card A displays a green circular badge (Sage Green: `hsl(142, 60%, 94%)` background, dark green text) since score is >= 70.
  * Card B displays an orange circular badge (Soft Amber: `--color-amber-soft` background, orange text) since score is between 50-69.
  * Card C displays a red/grey circular badge (Warm Peach: `hsl(20, 85%, 96%)` background, warm grey text) since score is < 50.
* **Priority**: Medium
* **Traceability**: [Visual-Guidelines: 5.3](file:///Users/victorxu/projects/immi_pulse/docs/Visual-Guidelines.md#L88), [Screen-Specs: 3.3.2](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L100)

---

## 2. Quick Filters & Search (FT-002)

### FT-002-TC-001: Tag Filtering (Country, Topic, Audience)
* **Feature Name**: Sidebar Quick Filters
* **Preconditions**:
  * The feed is displayed.
  * Sidebar filters contain counts (e.g. `Canada (18)`, `Work Visa (32)`, `Students (31)`).
* **Steps**:
  1. Click the country checkbox filter for `Canada`.
  2. Click the topic checkbox filter for `Work Visa`.
* **Expected Result**:
  * The cards grid updates instantly (<200ms) to display only items containing BOTH `Canada` in `country_tags` and `Work Visa` in `topic_tags`.
  * The URL search params are updated dynamically (e.g., `/?countries=Canada&topics=Work+Visa`).
* **Priority**: High
* **Traceability**: [PRD: FR-4.2](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L146), [Screen-Specs: 2.3.2](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L53)

### FT-002-TC-002: Low Relevance Toggle Behavior
* **Feature Name**: Relevance Filter Gate
* **Preconditions**:
  * Database contains 2 news items with relevance >= 60 and 3 items with relevance < 60.
* **Steps**:
  1. Open the dashboard (`/`). Verify only 2 cards are shown by default.
  2. Toggle the "Show Low Relevance" switch to "On".
* **Expected Result**:
  * Feed updates instantly (<200ms) to display all 5 news items.
  * The query parameter `show_low_relevance=true` is sent to the backend.
* **Priority**: High
* **Traceability**: [PRD: Section 13](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L170), [Screen-Specs: 2.3.2](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L53)

### FT-002-TC-003: Full-Text Search
* **Feature Name**: Text Search Input
* **Preconditions**:
  * Database contains Card A ("Canada Express Entry Update") and Card B ("Japan Points Allocation Shift").
* **Steps**:
  1. Type "Express" into the Search Input field.
* **Expected Result**:
  * Feed updates instantly (<200ms) showing only Card A.
  * Typing "Japan" updates the list showing only Card B.
* **Priority**: High
  * **Traceability**: [PRD: US-6](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L104), [Screen-Specs: 2.1](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L13)

---

## 3. Detail Drawer View (FT-003)

### FT-003-TC-001: Drawer Animation & Overlay (Desktop)
* **Feature Name**: Detail Drawer Navigation
* **Preconditions**:
  * Grid feed is rendered. Desktop viewport size >= 1024px.
* **Steps**:
  1. Click on Card A.
* **Expected Result**:
  * Detail Drawer slides in smoothly from the right (transition completes under 100ms).
  * Main feed background remains visible (drawer overlays on the right side).
  * Scroll position of the news grid is preserved.
* **Priority**: Critical
* **Traceability**: [PRD: FR-4.3](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L147), [User-Flows: 3.1](file:///Users/victorxu/projects/immi_pulse/docs/User-Flows.md#L117)

### FT-003-TC-002: Language Matrix Tabs Switching
* **Feature Name**: Translation Matrix
* **Preconditions**:
  * Detail drawer is open for a news item whose original language was Japanese (`ja`).
* **Steps**:
  1. Verify the active tab is `Chinese` by default. Observe titles and summaries are in Chinese.
  2. Click the `English` tab.
  3. Click the `Original` tab.
* **Expected Result**:
  * Chinese tab displays `title_zh` and `summary_zh`.
  * English tab displays `title_en` and `summary_en` instantly.
  * Original tab displays Japanese `title_original` and `summary_original` instantly.
* **Priority**: High
* **Traceability**: [PRD: US-3](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L102), [Screen-Specs: 3.3.1](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L97)

### FT-003-TC-003: Drawer Closing Interactions
* **Feature Name**: Detail Drawer Dismissal
* **Preconditions**:
  * Detail drawer is open.
* **Steps**:
  1. Press the `Esc` key on the keyboard.
  2. Re-open drawer. Click the backdrop area to the left of the drawer.
  3. Re-open drawer. Click the `X` button in the drawer header.
* **Expected Result**:
  * In all three actions, the drawer slides back to the right and disappears.
  * News grid focus, search filters, and list scroll offsets are completely preserved.
* **Priority**: High
* **Traceability**: [User-Flows: 2.1](file:///Users/victorxu/projects/immi_pulse/docs/User-Flows.md#L45), [Screen-Specs: 3.2](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L80)

### FT-003-TC-004: Notes Character Limit & Auto-Save
* **Feature Name**: Custom Notes Annotations
* **Preconditions**:
  * Card A is starred as a candidate, and its detail drawer is open.
  * The focus is in the custom notes text area.
* **Steps**:
  1. Type 100 characters in the text box. Check UI indicator status.
  2. Focus out of the text box (click anywhere else in the drawer).
  3. Paste a block of text containing exactly 4005 characters.
* **Expected Result**:
  * During step 1, UI displays "Saving changes..." in the bottom right corner.
  * In step 2, once focus shifts, UI changes message to a green-check pill "Saved to desk" which fades out after 2 seconds. Note is persisted in DB.
  * In step 3, input truncates/stops at 4000 characters. Text area border highlights in warning orange/amber and displays label: "Character limit exceeded (4000 max)".
* **Priority**: Critical
* **Traceability**: [Screen-Specs: 3.3.3](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L106), [Test-Strategy: Issue 5.2](file:///Users/victorxu/projects/immi_pulse/docs/Test-Strategy.md#L125)

---

## 4. Saved Candidates Board (FT-004)

### FT-004-TC-001: Split Double-Pane Layout (Desktop)
* **Feature Name**: Saved Candidates Page
* **Preconditions**:
  * Viewport is desktop (>= 1024px).
  * 3 news items are starred (candidates exist).
* **Steps**:
  1. Click the "Candidates" tab in the left sidebar.
  2. Select the first candidate card in the list.
* **Expected Result**:
  * Page loads using a split double-pane layout (no overlay drawer).
  * Left pane contains the list of 3 candidate cards sorted by `video_score` (descending).
  * Right pane is immediately populated with the Custom Outline Editor for the selected card.
* **Priority**: High
* **Traceability**: [UI-Layouts: Section 4](file:///Users/victorxu/projects/immi_pulse/docs/UI-Layouts.md#L103), [Screen-Specs: 4.2](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L129)

### FT-004-TC-002: Copy Outline to Clipboard
* **Feature Name**: Outline Export
* **Preconditions**:
  * Saved Candidates page is open, and a candidate is active.
  * Candidate notes contain: "Hook: Canada draw shift. Point 1: score analysis."
* **Steps**:
  1. Click the "Copy Outline to Clipboard" button in the outline editor pane.
  2. Paste clipboard contents into a text editor.
* **Expected Result**:
  * A success toast banner appears: "Outline Copied! Ready to paste into scripting editor."
  * Pasted content displays structured Markdown:
    ```markdown
    # Video Topic: [Selected Title]
    
    ## AI Demographic Impact Analysis
    [AI Impact Paragraph]
    
    ## Creator Script Outline
    Hook: Canada draw shift. Point 1: score analysis.
    
    ## Reference Sources
    - Source 1: [Source URL]
    ```
* **Priority**: High
* **Traceability**: [Screen-Specs: 4.3.1](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L137), [User-Flows: 2.2](file:///Users/victorxu/projects/immi_pulse/docs/User-Flows.md#L83)

### FT-004-TC-003: Unstar & Undo Behavior
* **Feature Name**: Candidate Starring
* **Preconditions**:
  * Card A is starred and visible in the candidates list.
* **Steps**:
  1. Click the star icon (⭐) on Card A in the list.
  2. Observe the list updates.
  3. Click "Undo" in the toast banner that appears at the bottom.
* **Expected Result**:
  * In step 2, Card A immediately disappears from the candidates list.
  * A toast banner displays: "Candidate removed. [Undo]"
  * In step 3, clicking "Undo" restores Card A back to the list in its original position.
* **Priority**: High
* **Traceability**: [User-Flows: 2.2](file:///Users/victorxu/projects/immi_pulse/docs/User-Flows.md#L88)

---

## 5. UI Interaction States (FT-005)

### FT-005-TC-001: Ingestion/Loading Skeleton Animation
* **Feature Name**: UI Loading States
* **Preconditions**:
  * Backend responses are artificially delayed (e.g. by 2 seconds).
* **Steps**:
  1. Navigate to `/`.
* **Expected Result**:
  * Displays a skeleton grid of 6 cards with subtle shimmering animation.
  * Left filter panel displays loading skeletons.
  * Once API returns, skeletons are replaced instantly by actual cards.
* **Priority**: Medium
* **Traceability**: [Screen-Specs: 2.4](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L57)

### FT-005-TC-002: Empty States
* **Feature Name**: UI Empty States
* **Preconditions**:
  * The database is empty or filters return zero items.
* **Steps**:
  1. Navigate to `/`.
  2. Search for a string with no matches: "xyz123abc".
* **Expected Result**:
  * News card grid is hidden.
  * Displays a warm, styled graphic saying: "No news found matching your filters. Try clearing some selections."
* **Priority**: Medium
* **Traceability**: [Screen-Specs: 2.4](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L58)

### FT-005-TC-003: System Error State (Offline/Failures)
* **Feature Name**: Error Handling
* **Preconditions**:
  * The backend API server is offline, or returning `500 Internal Server Error`.
* **Steps**:
  1. Refresh the dashboard (`/`).
* **Expected Result**:
  * Displays a banner toast: "Failed to load feed. [Retry]"
  * Grid feed shows empty state or cached values (if offline support enabled).
* **Priority**: High
* **Traceability**: [Screen-Specs: 2.4](file:///Users/victorxu/projects/immi_pulse/docs/Screen-Specs.md#L60), [User-Flows: 2.1](file:///Users/victorxu/projects/immi_pulse/docs/User-Flows.md#L47)
