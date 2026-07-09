# Visual Guidelines: Yutian Immigration AI Newsroom

This document defines the design philosophy, typography, layout systems, component specs, and accessibility rules for the Yutian Immigration AI Newsroom (ImmiPulse). 

---

## 1. Design Philosophy & Visual Tone

Immigration is a journey toward new opportunities, planning for the future, and chasing a bright, hopeful horizon. Thus, the visual tone is explicitly **optimistic, bright, warm, and professional** (avoiding dark modes or sterile greys).

- **Visual Theme:** Light-mode-first, clean, warm, and sunny.
- **Brand Personality:** Trustworthy (professional editorial feel), Hopeful (sunny and warm), and Efficient (uncluttered layouts, focus on content).
- **Core Principles:**
  - *Horizons:* Plentiful white space, clean grids, and soft margins.
  - *Optimism:* Warm sunlight highlights, gold/amber accents, and sky blue bases.
  - *Clarity:* High text-to-background contrast, clean sans-serif typography.

---

## 2. Color System (Sunny Horizon Palette)

A cohesive HSL-based color palette is established to maintain consistency.

| Color Token | Hue/Sat/Light | CSS Variable | Purpose |
| :--- | :--- | :--- | :--- |
| **Sky Blue (Primary)** | `hsl(205, 85%, 45%)` | `--color-blue-primary` | Main branding, primary buttons, active states, global headers. Represents horizons and pathways. |
| **Sky Blue Light** | `hsl(205, 90%, 95%)` | `--color-blue-light` | Hover states, active background fills, selected sidebar items. |
| **Sunrise Amber (Accent)** | `hsl(38, 95%, 52%)` | `--color-amber-accent` | Highlights, starred candidates, top recommendation flags, custom notes edit states. Represents warmth and future success. |
| **Amber Soft** | `hsl(38, 100%, 96%)` | `--color-amber-soft` | Background highlighting, notice boxes, custom drawer panels. |
| **Warm Sand (Bg Base)** | `hsl(35, 20%, 98%)` | `--color-bg-base` | Main application backdrop. A warm, creamy off-white that reduces eye strain. |
| **Pure White** | `hsl(0, 0%, 100%)` | `--color-bg-surface` | Card surfaces, detail drawer, sidebar, and container backdrops. |
| **Charcoal Gray (Text)** | `hsl(210, 24%, 16%)` | `--color-text-main` | Primary headings, body copy, and navigation labels. |
| **Slate Gray (Subtext)** | `hsl(210, 16%, 46%)` | `--color-text-muted` | Captions, metadata, feed source names, and dates. |
| **Sage Green (Success)** | `hsl(142, 60%, 40%)` | `--color-success` | High video scores (>=70), successful note sync status, candidate confirm indicators. |
| **Warm Peach (Warning)** | `hsl(20, 85%, 55%)` | `--color-warning` | Low video/relevance scores (<50), warnings, remove actions. |

### Contrast Rules
- Text on `--color-bg-surface` must use `--color-text-main` (Contrast Ratio > 7:1, exceeds WCAG AAA).
- Primary white text on `--color-blue-primary` buttons must satisfy WCAG AA (Contrast Ratio > 4.5:1).

---

## 3. Typography

The layout uses **Outfit** for headings (modern, friendly, geometric) and **Inter** for body text and numbers (excellent legibility and weight support).

- **Headings Font:** `Outfit, system-ui, sans-serif`
- **Body Font:** `Inter, system-ui, sans-serif`

| Token Name | Weight | Size | Line Height | CSS Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **Heading 1 (H1)** | Bold (700) | `1.75rem` (28px) | `1.2` | Page Titles (e.g., Editorial Feed) |
| **Heading 2 (H2)** | SemiBold (600) | `1.25rem` (20px) | `1.3` | Section Headers (e.g., Details, Outline) |
| **Heading 3 (H3)** | Medium (500) | `1.1rem` (17px) | `1.4` | Story Card Title |
| **Body (Default)** | Regular (400) | `0.95rem` (15px) | `1.5` | Summaries, AI analysis, Notes editor |
| **Label / Button** | SemiBold (600) | `0.85rem` (13.5px)| `1.2` | Filter Tags, Buttons, Tab labels |
| **Caption / Meta** | Regular (400) | `0.8rem` (12.8px) | `1.4` | Published times, sources, duplicate count |

---

## 4. Spacing & Layout Principles

### 4.1 Spacing Scale
A strict 8px grid system is used to ensure aligned components:
- `4px` (xs), `8px` (sm), `16px` (md), `24px` (lg), `32px` (xl), `48px` (xxl).

### 4.2 Grid & Alignment
- **Global Page Margins:** 24px padding on desktop, 16px on mobile.
- **Card Grids:** CSS Grid with `gap: 20px`.
- **Card Border Radius:** 12px for modern, soft contours.
- **Drawer Border Radius:** 16px (top-left and bottom-left on desktop drawer; top-left and top-right on mobile bottom-sheet).

---

## 5. Component Patterns & Styling

### 5.1 Buttons
- **Primary Button (e.g. "Copy Outline"):** Sky Blue fill (`--color-blue-primary`), white text. Focus outline: 2px Sky Blue light ring.
- **Secondary Button (e.g. "Filter reset"):** Thin Sky Blue border, Sky Blue text, `--color-bg-surface` background.
- **Icon Button (e.g. Star Candidate ⭐):**
  - Unstarred: Slate grey outline.
  - Starred: Golden-yellow fill (`--color-amber-accent`) with a mild pulse animation when triggered.

### 5.2 Cards
- Outlined with 1px border (`hsl(210, 20%, 90%)`) and no shadow when static.
- On hover: Border color fades, subtle warm shadow is applied (`box-shadow: 0 4px 12px rgba(245, 158, 11, 0.08)`), and card lifts up by 2px (`transform: translateY(-2px)`).

### 5.3 Badges
- **Country Badge:** Light Sky Blue background (`--color-blue-light`), dark blue text (`hsl(205, 90%, 25%)`).
- **Topic/Audience Badge:** Light neutral grey-cream background, dark slate text.
- **Metric Badges (VS / CR):** Rounded pills.
  - Green Pill (Score 70-100): Sage Green background (`hsl(142, 60%, 94%)`), green text.
  - Orange Pill (Score 50-69): Soft Amber background (`--color-amber-soft`), orange text.
  - Red/Grey Pill (Score <50): Warm Peach background (`hsl(20, 85%, 96%)`), warm grey text.

---

## 6. Accessibility

To guarantee a professional-grade user experience, the interface adheres to the following accessibility requirements:

- **WCAG AA Compliance:** Text and interactive indicators must meet or exceed WCAG AA guidelines for color contrast.
- **Focus Indicators:** Interactive components (buttons, links, text areas) must display a clear, high-contrast, rounded outline ring (`2px solid var(--color-blue-primary)`) when focused via keyboard.
- **Touch Target Size:** Interactive elements (filter pills, navigation tabs, buttons, close controls) must occupy a minimum dimension of **48px x 48px** to allow ease of tapping on mobile/tablet devices.
- **Keyboard Shortcuts:**
  - `Esc`: Instantly close detail drawer or floating overlays.
  - `Tab`: Sequential, logical focus navigation (Sidebar -> Main Grid -> Cards -> Drawer).
- **Screen Reader Fills:**
  - Interactive icons (like the star button or detail drawer close) must contain descriptive `aria-label` tags (e.g. `aria-label="Star this news story as a video candidate"`).
