# ImmiPulse - Visual Guidelines

## 1. Design Philosophy & Visual Tone
ImmiPulse focuses on making immigration and global mobility news accessible, transparent, and trustworthy. The visual tone must be:
- **Bright, Vivid, and Attractive**: Using a bright color palette to evoke positivity, hope, and new beginnings associated with migration.
- **Clean and Ad-Free**: Promoting clarity and high readability with generous spacing, avoiding visual clutter.
- **Professional and Authoritative**: High-contrast typography and clear layout hierarchies to build user confidence in our verified source data.

---

## 2. Color System (Light-Mode First)

The system does not support dark-mode. It enforces a high-vibrancy light theme:

| Color Token | Hex / Value | Description |
| :--- | :--- | :--- |
| **Primary (Brand Blue)** | `#1E40AF` / HSL(220, 70%, 40%) | Trust, stability, and global travel. Used for primary buttons, active states, and logos. |
| **Primary Hover** | `#1D4ED8` / HSL(220, 75%, 48%) | Slightly brighter blue for hover triggers. |
| **Accent (Vivid Orange)** | `#EA580C` / HSL(20, 85%, 48%) | Energy, alerts, and calls-to-action. Used for alarms, warnings, and notifications. |
| **Background Main** | `#F9FAFB` / HSL(210, 20%, 98%) | Soft neutral light grey to reduce eye strain. |
| **Background Card** | `#FFFFFF` / HSL(0, 0%, 100%) | Crisp white for article cards and modal layers. |
| **Text Primary** | `#111827` / HSL(220, 40%, 11%) | High-contrast dark charcoal for body copy and headings. |
| **Text Secondary** | `#4B5563` / HSL(215, 15%, 35%) | Slate grey for summaries, dates, and labels. |
| **Border / Divider** | `#E5E7EB` / HSL(220, 15%, 92%) | Subtle light grey for containment borders and grids. |
| **Semantic Success** | `#10B981` / HSL(160, 84%, 39%) | Green for successful saves, verified ticks, and status. |
| **Semantic Error** | `#EF4444` / HSL(0, 84%, 60%) | Red for delete triggers, failed inputs, and alerts. |

---

## 3. Typography
- **Headings Font**: **Outfit** (Modern, clean geometric sans-serif for UI titles and headers).
- **Body & Controls Font**: **Inter** (Highly legible sans-serif optimized for reading paragraphs on screen sizes).

### Typography Scale
- `h1` (Page Title): `2.25rem` / `36px` - Bold, Line-height: `1.2`
- `h2` (Section Header): `1.5rem` / `24px` - Semi-Bold, Line-height: `1.3`
- `h3` (Component Header): `1.25rem` / `20px` - Medium, Line-height: `1.4`
- `body` (Article Snippet): `1.0rem` / `16px` - Regular, Line-height: `1.6`
- `caption` (Dates / Tags): `0.875rem` / `14px` - Medium, Line-height: `1.5`

---

## 4. Spacing & Layout
- **Spacing Scale**: Base-8 grid system (`8px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- **Border Radius**:
  - `4px` for checkboxes, mini-badges.
  - `8px` for buttons, input fields.
  - `16px` for cards, modals, and dropdown overlays.
- **Grids**:
  - **Desktop**: 12-column grid layout, `1200px` max-width container, `24px` gutters.
  - **Mobile**: Single-column vertical scroll, `16px` gutters.

---

## 5. UI Component Specifications

### 5.1 Buttons
- **Primary Button**: Solid Brand Blue with white text. Transition: `background-color 0.2s ease`.
- **Secondary Button**: Outlined border (Brand Blue) with Blue text. White background.
- **Warning Button**: Solid Semantic Error Red with white text. Used for alert deletion.

### 5.2 Badges & Tags
- **Jurisdiction Badge**: Light blue background (`#EFF6FF`), dark blue text (`#1E40AF`). Bold, uppercase.
- **Feature Tag**: Light grey background (`#F3F4F6`), slate text (`#374151`). Semi-bold, small.

### 5.3 Cards
- White background, thin grey border (`1px solid #E5E7EB`).
- Hover state: Slight raise shadow (`box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05)`) and micro-translation up by `2px`.

---

## 6. Accessibility & Usability (WCAG AA)
- **Contrast**: Text elements must maintain a minimum contrast ratio of `4.5:1` against their backgrounds.
- **Touch Targets**: All interactive elements (buttons, checks, navigation links) must meet a minimum size of `44px x 44px`.
- **Focus States**: Focused interactive components must show a visible, bright focus outline (`2px solid #EA580C`) to assist keyboard navigation.
- **Screen Readers**: All icons (e.g. settings gears, trash cans) must be accompanied by appropriate `aria-label` tags.
