# ImmiPulse - End-to-End (E2E) Test Scenarios

## E2E-01: Anonymous Guest Browse Journey
- **Description**: Verifies that unregistered visitors can view the global feed and read summaries without account blocks, but are restricted from custom preferences or alerts.
- **Scenario Steps**:
  1. Open the application landing page (`/`).
  2. Verify the page displays a header with "Login" and "Sign Up" links.
  3. Verify the main section displays a list of article cards (exactly 10 items).
  4. Verify the active filter badge section is empty.
  5. Scroll to the preferences sidebar. Verify all filters (checkboxes) are disabled and a blur overlay is present with the text "Register to customize your feed".
  6. Click on the first article card.
  7. Verify the **Article Modal** opens displaying: Title, Summary, Jurisdiction, Tags, and a button labeled "Open Verified Source".
  8. Click the "Open Verified Source" button. Verify it opens the correct government portal URL in a new tab.
  9. Close the modal by clicking the backdrop.
- **Traceability**: Derived from [User-Flows.md](file:///Users/victorxu/projects/immi_pulse/docs/User-Flows.md) Section 3.1.
- **Priority**: High

---

## E2E-02: New User Registration & Feed Personalization Journey
- **Description**: Verifies that a visitor can sign up, select preferred jurisdictions/tags, opt-in to digests, and immediately see their feed update to reflect those choices.
- **Scenario Steps**:
  1. Open the landing page (`/`). Click the "Sign Up" button in the header.
  2. Fill in the email input with a unique generated address (`e2e_user@example.com`) and password (`Pass1234!`). Click "Register".
  3. Verify the browser redirects to the **User Settings Screen** (`/settings`).
  4. Verify a welcome message is displayed.
  5. Check target jurisdictions: `Canada` and `Singapore`.
  6. Check feature tags: `Education` and `Vacation` (verify `Language` is not present in the options).
  7. Select digest frequency: `Daily`.
  8. Click "Save Preferences".
  9. Verify the page displays a success banner and redirects back to the **Dashboard Feed** (`/dashboard`).
  10. Verify the dashboard displays the filter badges: `Canada`, `Singapore`, `Education`, `Vacation`.
  11. Verify the feed displays only articles tagged with `CA` or `SG` containing at least one of the selected feature tags.
  12. Verify the feed contains a maximum of 10 articles, and no more than 2 articles from Canada are listed (enforcing the diversity limit).
- **Traceability**: Derived from [User-Flows.md](file:///Users/victorxu/projects/immi_pulse/docs/User-Flows.md) Section 3.2.
- **Priority**: Critical

---

## E2E-03: Premium Upgrade and Keyword Alert Lifecycle
- **Description**: Verifies that a premium subscriber can configure keyword rules, receives real-time notifications on match, and can delete the rules.
- **Scenario Steps**:
  1. Log in with user credentials of a Premium subscriber (`premium@example.com`).
  2. Verify the header displays an "Alerts" navigation link. Click "Alerts".
  3. Verify the page renders the **Alarms Screen** (`/alerts`).
  4. Select `United Kingdom` from the Jurisdiction list.
  5. Type `salary threshold` in the Keyword field.
  6. Click "Create Alarm".
  7. Verify the new alert "United Kingdom: salary threshold" is added to the active alarms list.
  8. Simulate ingestion of an article: `Origin Jurisdiction = UK`, `Title = UK increases salary threshold for sponsor visa`, containing `salary threshold` in the body.
  9. Access the user's mock email client; verify an email is received immediately containing the article title, summary, and direct link.
  10. Return to the `/alerts` screen in the browser.
  11. Click the "Delete" trash can icon next to the "United Kingdom: salary threshold" alert.
  12. Verify the alert card disappears from the active list.
  13. Simulate ingestion of another matching article; verify no email is sent to the user this time.
- **Traceability**: Derived from [User-Flows.md](file:///Users/victorxu/projects/immi_pulse/docs/User-Flows.md) Section 3.3.
- **Priority**: High
