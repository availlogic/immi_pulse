# UI Layouts Spec: Yutian Immigration AI Newsroom

This document defines the interface layout structure, responsive grids, and structural wireframes for the Yutian Immigration AI Newsroom (ImmiPulse).

---

## 1. Global Navigation & Layout Architecture

The application is structured around a single-page app layout with a main viewing container and an overlay detail drawer.

### 1.1 Responsive Shell Structure
- **Desktop (>= 1024px):** Persistent left sidebar navigation (240px wide). Main content area takes up the remaining viewport width.
- **Tablet (768px - 1023px):** Collapsed left sidebar navigation (72px wide, icon-only). Main content area takes up the remaining viewport width.
- **Mobile (< 768px):** Bottom navigation bar (56px high). Header bar (56px high) with toggle filters. Main content area sits in the middle.

---

## 2. Desktop Dashboard Wireframe (Grid View)

Below is an ASCII layout of the main dashboard on desktop, showing the Sidebar, Header, Filter panel, Card Grid, and the Detail Drawer sliding overlay.

```
+-----------------------------------------------------------------------------------------+
|                                  YUTIAN IMMIGRATION NEWSROOM                             |
+=========================================================================================+
| [LOGO] ImmiPulse     | Search Stories... [Q]                       [Online Indicator]   |
+----------------------+------------------------------------------------------------------+
| (D) Feed             | Country Filters:                                                 |
|                      | [USA x] [Canada x] [Japan] [UK] [Australia]   [+ Country]        |
| (⭐) Candidates      |                                                                  |
|                      | Topics: [Work Visa] [PR] [Golden Visa]                           |
|                      |                                                                  |
| [Settings]           | Show Low Relevance: [o] Off (Scores < 60 hidden)                 |
|                      | Sort: [Newest | Video Score | Chinese Relevance]                 |
|                      +------------------------------------------------------------------+
|                      | NEWS ITEMS FEED                                | DETAIL DRAWER    |
|                      | +------------------------+ +-----------------+ | (X) Close        |
|                      | | CANADA | VS: 82  CR: 90 | | JAPAN  | VS: 75 | | Star [⭐ Starred]|
|                      | | Express Entry Draws... | | Skilled Visa... | |                  |
|                      | | Reuters | 2 hrs ago    | | BBC | 4 hrs ago | | [Chinese] [EN]  |
|                      | | +2 sources             | |                 | |                  |
|                      | +------------------------+ +-----------------+ | Title (ZH):      |
|                      | +------------------------+ +-----------------+ | 加拿大快速通道...|
|                      | | USA | VS: 68   CR: 72  | | UK | VS: 55     | |                  |
|                      | | USCIS H1-B Cap Met     | | Policy Shift    | | Scores:          |
|                      | | USCIS | 6 hrs ago      | | Guardian        | | VS: ====== [82]  |
|                      | +------------------------+ +-----------------+ | CR: ======= [90] |
|                      | +------------------------+ +-----------------+ |                  |
|                      | | MALAYSIA | VS: 42 (LR) | | NZ | VS: 80     | | AI Analysis:   |
|                      | | MM2H Updates           | | PR Cap Set      | | 本次政策调整...|
|                      | | Star | 1 day ago       | | DHA | 1 day ago | |                  |
|                      | +------------------------+ +-----------------+ | Editor Notes:    |
|                      |                                                | [Write notes...] |
|                      |                                                | [Auto-saved pill]|
+----------------------+------------------------------------------------------------------+
```

---

## 3. Mobile Feed Layout (Detail Drawer as Bottom Sheet)

On mobile, the interface collapses:
- Sidebar disappears; navigation goes to the bottom.
- Columns collapse to a single list stack.
- Filter panels become collapsible accordions or floating toggles.
- Detail drawer opens as a full-width slide-up bottom sheet.

```
+-----------------------------------+
|  [Q] Search stories...      (===) | <-- Header Bar (Search & Filter toggle)
+-----------------------------------+
|  Active Filters: [Canada] [PR]    |
+-----------------------------------+
|  [ CANADA | VS: 82 | CR: 90 ]     |
|  Express Entry Draw Update        |
|  Reuters | 2 hrs ago              |
+-----------------------------------+
|  [ JAPAN | VS: 75 | CR: 80 ]      |
|  New Point Allocation Policy      |
|  BBC | 4 hrs ago                  |
+-----------------------------------+
|  [ USA | VS: 68 | CR: 72 ]        |
|  H1B Visa Program Caps Adjusted   |
|  USCIS | 6 hrs ago                |
+-----------------------------------+
|                                   |
|                                   |
|    +-------------------------+    |
|    | BOTTOM DETAIL SHEET     |    | <-- Slide up bottom sheet on card tap
|    | (=== Drag Bar)  (X)     |    |
|    | Title (ZH): 加拿大更新   |    |
|    | VS Badge: [ 82 ]        |    |
|    | AI Analysis: ...        |    |
|    | Notes: [ Write notes. ] |    |
|    +-------------------------+    |
+-----------------------------------+
|  (Feed)     (⭐ Candidates) (Settings) <-- Bottom Navigation Bar (56px)
+-----------------------------------+
```

---

## 4. Screen: Saved Candidates Layout (Desktop Workspace)

On desktop, the Saved Candidates screen uses a **split double-pane layout** rather than an overlay drawer. This allows Yutian to review his planning board on the left and write out the scripting outlines on the right simultaneously.

```
+-----------------------------------------------------------------------------------------+
|                                  YUTIAN IMMIGRATION NEWSROOM                             |
+=========================================================================================+
| [LOGO] ImmiPulse     | Candidates Desk (5 Stories Starred)         [Online Indicator]   |
+----------------------+---------------------------------+--------------------------------+
| (D) Feed             | CANDIDATE LIST                  | EDITORIAL SCRIPTING OUTLINE    |
|                      | +-----------------------------+ | Selected Topic: Canada EE Draw |
| (⭐) Candidates      | | CANADA | VS: 82  CR: 90     | | Suggested Video Titles (ZH):   |
|                      | | Express Entry Draws...      | | 1. 2026加拿大快速通道暴跌!    |
|                      | | Starred: Today at 9:00 AM   | | 2. 移民新规速递：PR门槛调整  |
| [Settings]           | +-----------------------------+ |                                |
|                      | +-----------------------------+ | AI Demographic Impact:         |
|                      | | JAPAN  | VS: 75   CR: 80    | | 对IT及工程类背景人才有利...  |
|                      | | Points allocation change    | |                                |
|                      | | Starred: Yesterday          | | Creator Script Outline:       |
|                      | +-----------------------------+ | +----------------------------+ |
|                      | +-----------------------------+ | | Hook: 昨晚移民局突然...     |
|                      | | NZ | VS: 80      CR: 85     | | | Point 1: 政策分数变化      |
|                      | | Active PR Cap Set           | | | Point 2: 申请人策略应对    |
|                      | | Starred: 2 days ago         | | +----------------------------+ |
|                      | +-----------------------------+ | [Checkmark] Outline Auto-saved |
|                      |                                 | [ COPY OUTLINE TO CLIPBOARD ]  |
+----------------------+---------------------------------+--------------------------------+
```

---

## 5. Layout Alignment Matrix

| Layout Region | Desktop Viewport | Tablet Viewport | Mobile Viewport |
| :--- | :--- | :--- | :--- |
| **Global Navigation** | Left Sidebar (240px) | Left Sidebar Collapsed (72px) | Bottom Tab Bar (56px) |
| **Workspace Layout** | Split-pane/Drawer Overlay | Drawer Overlay | Full-width Grid / Vertical list |
| **Detail Drawer** | Slide-in Drawer from Right (500px wide) | Slide-in Drawer from Right (450px wide) | Slide-up Bottom Sheet (100% viewport width) |
| **Filters Panel** | Left Filter Column (under Nav or header) | Collapsible Header Toolbar | Floating Filter Toggle Modal |
| **Candidates Pane** | 2-Pane Split (List on left, outline editor on right) | 2-Pane Split | Vertical card stack (Drawer opens on tap) |
