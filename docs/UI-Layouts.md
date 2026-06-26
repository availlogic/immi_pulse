# ImmiPulse - UI Layouts & Wireframes

## 1. Grid & Responsive Layout Regions

### 1.1 Desktop Layout (Viewport >= 1200px)
- **Top Header**: Fixed height (`72px`), spans full width. Consists of navigation links and auth buttons.
- **Sidebar**: Fixed width (`320px`), sticky positioning on the left/right. Contains quick tags, statistics, and filters.
- **Main Container**: Fluid width, containing active filter badges at the top, and the vertical grid feed in the center.

### 1.2 Mobile Layout (Viewport < 768px)
- **Top Header**: Minimal height (`60px`). Displays logo and a hamburger menu trigger on the left, login status on the right.
- **Main Scroll Area**: Spans full screen width. Filters are collapsed behind a floating action button (FAB) labeled "Filters".
- **Navigation Bar**: Optional bottom nav bar with tabs for Dashboard, Settings, and Alerts.

---

## 2. Desktop Dashboard Wireframe (ASCII)

```
+-----------------------------------------------------------------------------------+
|  LOGO      [Dashboard]  [Settings]  [Alerts]              (Login / Register Button) |
+-----------------------------------------------------------------------------------+
|  Active Filters: [Canada x] [Retirement x] [Vacation x]                           |
+-----------------------------------------------------------------------------------+
|                                                  |  SUBSCRIBED JURISDICTIONS      |
|  +--------------------------------------------+  |  [ ] United States             |
|  | ARTICLE CARD (Title, Summary, Date, Tags)  |  |  [x] Canada                    |
|  | Authority: [Gov (5)]                       |  |  [ ] United Kingdom            |
|  | Badges: [CA] [Retirement] [Vacation]       |  |  [ ] Australia                 |
|  +--------------------------------------------+  |                                |
|                                                  |  SUBSCRIBED FEATURE TAGS       |
|  +--------------------------------------------+  |  [ ] Raising a Family          |
|  | ARTICLE CARD (Title, Summary, Date, Tags)  |  |  [ ] Education                 |
|  | Authority: [Law Firm (3)]                  |  |  [x] Retirement                |
|  | Badges: [US] [Corporate Sponsorship]       |  |  [x] Vacation                  |
|  +--------------------------------------------+  |  [ ] Culture Inclusion         |
|                                                  |                                |
|  +--------------------------------------------+  |  [Save Preferences Button]     |
|  | ARTICLE CARD (Title, Summary, Date, Tags)  |  |                                |
|  +--------------------------------------------+  |  (Preferences disabled/blurred |
|                                                  |   for Unregistered guests)     |
+-----------------------------------------------------------------------------------+
|  Footer: Legal Disclaimer | Terms of Use | Contact Support                        |
+-----------------------------------------------------------------------------------+
```

---

## 3. Mobile Dashboard Wireframe (ASCII)

```
+--------------------------------------------------+
|  [Hamburger]             LOGO            [Login] |
+--------------------------------------------------+
|  Active Filters: [Canada x]                      |
+--------------------------------------------------+
|                                                  |
|  +--------------------------------------------+  |
|  | ARTICLE CARD                               |  |
|  | [CA] [Retirement]                          |  |
|  | Publication Date                           |  |
|  +--------------------------------------------+  |
|                                                  |
|  +--------------------------------------------+  |
|  | ARTICLE CARD                               |  |
|  | [US] [Corporate]                           |  |
|  +--------------------------------------------+  |
|                                                  |
|                   [ Floating FAB: Filters ]      |
|                                                  |
+--------------------------------------------------+
|  [Dashboard Tab]    [Settings Tab]  [Alerts Tab] |
+--------------------------------------------------+
```

---

## 4. Settings Screen Wireframe (Basic & Premium)

```
+-----------------------------------------------------------------------------------+
|  LOGO      [Dashboard]  [Settings]  [Alerts]                              [Logout] |
+-----------------------------------------------------------------------------------+
|  h1: Preferences & Subscription Settings                                          |
|                                                                                   |
|  Select Jurisdictions:                                                            |
|  [x] United States   [ ] Canada         [ ] United Kingdom   [ ] Australia        |
|  [ ] New Zealand     [ ] Singapore      [ ] Germany          [ ] France           |
|  [ ] Spain           [ ] Ireland        [ ] Japan            [ ] South Korea      |
|  [ ] Malaysia        [ ] Thailand       [ ] UAE              [ ] Brazil           |
|                                                                                   |
|  Select Feature Tags:                                                             |
|  [x] Raising a Family   [x] Education   [ ] Retirement   [ ] Vacation             |
|  [ ] Culture Inclusion  [ ] Corporate Sponsorship                                 |
|                                                                                   |
|  Digest Frequency:                                                                |
|  (Dropdown: Daily / Weekly / None) [ Daily      ]                                 |
|                                                                                   |
|  [ Save Preferences Button ]        ( Reset to Global Feed )                      |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 5. Alarms Screen Wireframe (Premium Only)

```
+-----------------------------------------------------------------------------------+
|  LOGO      [Dashboard]  [Settings]  [Alerts]                              [Logout] |
+-----------------------------------------------------------------------------------+
|  h1: Configure Keyword Alerts                                                     |
|                                                                                   |
|  Add New Alert rule:                                                              |
|  Jurisdiction: [ Select Dropdown... ]   Keyword: [ Enter word... ] [ Create Alarm ]|
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  Active Alarms:                                                                   |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |  Jurisdiction: United Kingdom  |  Keyword: salary threshold  |  (Delete)    |  |
|  +-----------------------------------------------------------------------------+  |
|  |  Jurisdiction: Canada          |  Keyword: express entry     |  (Delete)    |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
