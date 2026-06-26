# ImmiPulse - Functional Test Cases

## 1. Landing Dashboard Feed (FLDF)

### FLDF-01: Guest User Global Feed Verification
- **Feature**: Landing Dashboard Feed
- **Preconditions**: User is not logged in (Unregistered state).
- **Steps**:
  1. Access the main web portal URL.
  2. Observe the navigation bar and sidebar status.
  3. Observe the contents of the feed.
- **Expected Result**:
  - Feed loads and displays exactly the 10 latest articles globally.
  - The Active Filters badge bar is empty.
  - The preferences sidebar is blurred/locked with a prominent registration CTA card.
  - Navigation bar displays "Login" and "Register" buttons.
- **Priority**: Critical

### FLDF-02: User-Specific Feed Customization (Basic Tier)
- **Feature**: Landing Dashboard Feed
- **Preconditions**: User is logged in as a Basic User with preferred jurisdictions set to `US` and `CA`, and preferred tags set to `Retirement`.
- **Steps**:
  1. Login with Basic user credentials.
  2. Observe the main feed dashboard.
- **Expected Result**:
  - The dashboard feed displays only articles originating from `US` or `CA` that match the `Retirement` tag.
  - Active filter badges display "US", "CA", and "Retirement".
  - Preference sidebar is fully active and editable.
- **Priority**: Critical

### FLDF-03: Diversity Algorithm Enforcement
- **Feature**: Diversity Algorithm
- **Preconditions**: Database contains 5 new articles for Canada (CA) and 1 for Germany (DE) matching the user's active preferences, all published today.
- **Steps**:
  1. Access the personalized dashboard.
  2. Count the number of CA articles displayed in the 10-item feed.
- **Expected Result**:
  - Feed displays a maximum of 2 articles from Canada.
  - The remaining slots are filled by other matching jurisdictions or left blank if no other updates exist (enforcing the diversity rule).
- **Priority**: High

### FLDF-04: Loading and Empty Feed UI States
- **Feature**: Feed UX States
- **Preconditions**: Network connection speed is simulated as slow, and database contains zero entries matching user preferences.
- **Steps**:
  1. Log in and load the feed.
  2. Observe the loading state.
  3. Wait for the data fetch to complete and observe the final state.
- **Expected Result**:
  - While loading, the dashboard renders skeleton card shapes.
  - When loading finishes, a friendly empty-state illustration displays: "No updates match your selections. Try expanding your target jurisdictions or tags!"
- **Priority**: Medium

---

## 2. User Preferences Settings (FPS)

### FPS-01: Change and Save Preferences
- **Feature**: Preference Management
- **Preconditions**: User is logged in. Current preferences are empty.
- **Steps**:
  1. Navigate to the Settings screen.
  2. Check the checkboxes for `Canada` and `United Kingdom`.
  3. Check the checkbox for tag `Education`.
  4. Select digest frequency: `Weekly`.
  5. Click the "Save Preferences" button.
- **Expected Result**:
  - The "Save Preferences" button shows a loading spinner during the PUT request.
  - Upon success, a toast notification appears: "Preferences saved successfully!"
  - User is redirected to the dashboard, and the feed displays updates matching CA and UK with the Education tag.
- **Priority**: High

### FPS-02: Reset to Global Feed
- **Feature**: Preference Management
- **Preconditions**: User is logged in. Preferences contain filtered jurisdictions.
- **Steps**:
  1. Navigate to the Settings screen.
  2. Click the link "Reset to Global Feed".
- **Expected Result**:
  - All checkboxes are cleared/reset.
  - User is returned to the dashboard, which now displays the global feed (10 items, unfiltered).
- **Priority**: Medium

---

## 3. Premium Alarms Setup (FPA)

### FPA-01: Create Valid Keyword Alarm
- **Feature**: Keyword Alerts
- **Preconditions**: User is logged in as a Premium tier subscriber.
- **Steps**:
  1. Navigate to the Alerts screen.
  2. Select `Australia` from the Jurisdiction dropdown list.
  3. Type `points draw` in the Keyword field.
  4. Click "Create Alarm".
- **Expected Result**:
  - The alarm is created and appears in the "Active Alarms" list.
  - A success toast notification is displayed.
- **Priority**: High

### FPA-02: Duplicate Alarm Validation
- **Feature**: Keyword Alerts
- **Preconditions**: User has an active alarm configured for Jurisdiction `Canada` and Keyword `express entry`.
- **Steps**:
  1. Navigate to the Alerts screen.
  2. Select `Canada` from the dropdown list.
  3. Type `express entry` in the Keyword input.
  4. Click "Create Alarm".
- **Expected Result**:
  - Form validation triggers. The input fields are highlighted in red.
  - An inline error displays: "You already have an alarm configured for this keyword in this jurisdiction."
  - No duplicate API request is dispatched.
- **Priority**: High

### FPA-03: Delete Active Alarm
- **Feature**: Keyword Alerts
- **Preconditions**: User has an active alarm in their list.
- **Steps**:
  1. Navigate to the Alerts screen.
  2. Click the trash can icon beside the active alarm.
- **Expected Result**:
  - The alarm card is removed from the active list.
  - A toast notification confirms: "Alert deleted successfully."
- **Priority**: Medium
