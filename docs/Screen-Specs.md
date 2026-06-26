# ImmiPulse - Screen Specifications

## 1. Landing / Dashboard Feed Screen

### 1.1 Overview
The primary interface showing the news feed. For guest users, it displays the unfiltered global feed. For registered users, it displays their personalized, filtered feed.

### 1.2 Layout & Sections
- **Header**: Contains the logo, navigation links (Dashboard, Settings, Alerts), login status, and action buttons (Login / Sign Up or Logout).
- **Control Bar**: Displays the active filters (selected jurisdictions and tags) as badges. Includes a toggle to switch between "Personalized" and "Global" feed (for registered users).
- **Main Feed Area**: A vertical grid displaying news cards.
- **Preferences Sidebar (Desktop)**: A sticky panel showing target jurisdictions and tags. Disabled/locked for unregistered users.
- **Footer**: Branding, legal disclaimers (e.g. "not legal advice"), and copyright.

### 1.3 Components & Interactions
- **Article Card**:
  - *Details*: Title, summary snippet, primary jurisdiction badge, tag badges, publication date, authority score indicator.
  - *Interaction*: Clicking anywhere on the card triggers the Article Modal.
- **Article Modal**:
  - *Details*: Full title, clean formatted summary/takeaways, list of tags, publication timestamp, and a prominent, highlighted verified source button.
  - *Interaction*: Clicking the verified source button opens the original official URL in a new browser tab.
  - *Close*: Clicking the 'X' button or overlay backdrop closes the modal.
- **Locked Sidebar Overlay**:
  - *Details*: Visible only to Unregistered users. Displays a blurred preference list with a "Lock" icon and a sign-up CTA button.

---

## 2. User Settings Screen (Basic & Premium)

### 2.1 Overview
Allows registered users to edit their subscription criteria and email digest frequency.

### 2.2 Layout & Sections
- **Jurisdiction Grid**: A multi-column checkbox group categorized by region (North America, Europe/EEA, Oceania, Asia, Latin America/Middle East).
- **Tag Grid**: A list of checkboxes representing feature tags (`Raising a Family`, `Education`, `Retirement`, `Vacation`, `Culture Inclusion`, `Corporate Sponsorship`).
- **Notification Preferences**: A dropdown selector for email digest frequency (`None`, `Daily`, `Weekly`).
- **Form Actions**: "Save Preferences" button and "Reset to Global" link.

### 2.3 Component Behaviors
- **Save Button**: Sends a PUT request to `/user/preferences`. Enters a loading spinner state during dispatch. Displays a success notification card on completion.

---

## 3. Alarms Screen (Premium Only)

### 3.1 Overview
Allows Premium subscribers to manage high-priority keyword notifications.

### 3.2 Layout & Sections
- **Alarm Creation Form**:
  - Jurisdiction dropdown (select from 22+ jurisdictions).
  - Keyword text input.
  - "Create Alarm" button.
- **Active Alarms List**: A clean grid of active alarms.
  - Displays jurisdiction name, keyword, creation timestamp.
  - Displays a "Delete" button (trash can icon) beside each alert.

### 3.3 Form Validation
- **Keyword Input**: Must be non-empty and consist of alphanumeric characters/spaces. Maximum 50 characters.
- **Duplicate Rule**: If the keyword and jurisdiction combination already exists, highlight fields in red and display a warning message: "You already have an alarm configured for this keyword in this jurisdiction."

---

## 4. UI States Specification

- **Loading State**: Displays skeleton screens replacing article cards to indicate progress. Header and sidebars are fully interactive.
- **Empty Feed State**: Displays a friendly illustration with the text: "No updates match your selections. Try expanding your target jurisdictions or tags!"
- **Populated State**: Displays up to 10 news cards. Enforces the Diversity Algorithm (max 2 cards from the same jurisdiction).
- **Error State**: Displays a banner alert: "Unable to retrieve updates. Please check your connection and try again."
- **Validation Error**: Input field is highlighted with a vivid red border, accompanied by inline helper text.
- **Success State**: Displays a toast notification in the top-right corner that fades out after 3 seconds.
