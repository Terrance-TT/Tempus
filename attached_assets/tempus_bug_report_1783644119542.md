# Tempus Bug Report

**URL:** https://tempus-yungyungadam.replit.app  
**Date:** 2026-07-10  
**Scope:** Landing page, guest create flow (Steps 1-3), Integrations, Focus Guard, Settings, Feedback

---

## Summary

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 1 | Broken navigation (404 page) |
| Moderate | 2 | Missing form validation, UX issues |
| Minor | 5 | Data quality, UI polish, missing feedback |

---

## 1. CRITICAL: /plans Page Returns 404

**Severity:** Critical  
**Impact:** Users cannot access the Plans page linked from the sidebar navigation.

### Description
The sidebar navigation includes a "Plans" link that points to `/plans`. Visiting this URL results in a 404 error page with the message "Did you forget to add the page to the router?"

### Steps to Reproduce
1. Navigate to the app (e.g., `/create`, `/integrations`, `/focus-guard`, or `/settings`)
2. Click the "Plans" link in the left sidebar
3. Observe the 404 error page

### Expected Behavior
Either the Plans page should exist and display the user's saved schedules, or the link should be removed/hidden from the sidebar.

### Screenshot
![404 Page](https://tempus-yungyungadam.replit.app/plans)

---

## 2. MODERATE: Step 3 Preferences Not Validated

**Severity:** Moderate  
**Impact:** Schedule generated with no study preferences selected, potentially producing suboptimal results.

### Description
On Step 3 ("One last thing"), users can click "Daily Plan" or "Weekly Plan" without selecting:
- Preferred study time (Morning/Afternoon/Evening)
- Focus duration (25 min/45 min/1 hour/90 min)

The app proceeds to generate a schedule without these preference inputs.

### Steps to Reproduce
1. Go through Steps 1 and 2 (enter schedule and tasks)
2. On Step 3, do NOT select any preference buttons
3. Click "Daily Plan" or "Weekly Plan"
4. The app proceeds to "Your schedule is ready!" screen

### Expected Behavior
- Require at least one preference selection (preferred time AND focus duration)
- Show a validation message if the user tries to proceed without selecting preferences
- OR default selections should be visibly pre-selected

---

## 3. MODERATE: Step 1 Continue Button Enabled Without Input

**Severity:** Moderate  
**Impact:** Users can proceed through the schedule creation flow without entering any schedule data.

### Description
On Step 1 ("Tell us your week"), the Continue button is enabled even when no text is entered and no image is uploaded. Clicking it with empty fields proceeds to Step 2 without parsing any commitments.

### Steps to Reproduce
1. Navigate to `/create`
2. Do NOT enter any text or upload an image
3. Click the "Continue" button
4. The app proceeds to Step 2 ("What's due?") with zero parsed commitments

### Expected Behavior
- The Continue button should be disabled until valid input is provided
- OR a validation message should appear when clicking Continue with empty input

---

## 4. MINOR: Duplicate Blocked Sites Silently Ignored

**Severity:** Minor  
**Impact:** User gets no feedback when trying to add a site that's already blocked.

### Description
When adding a site to the Focus Guard blocked sites list that already exists, the app silently ignores the duplicate. No toast, message, or visual feedback is shown.

### Steps to Reproduce
1. Go to `/focus-guard`
2. Add "example.com" to the blocked sites list
3. Try to add "example.com" again
4. The input clears but no feedback is given

### Expected Behavior
Show a brief toast or inline message: "example.com is already in your blocked sites list."

---

## 5. MINOR: Redundant Blocked Sites Defaults

**Severity:** Minor  
**Impact:** Slightly confusing data; both domains resolve to the same platform.

### Description
The default blocked sites list includes both `x.com` and `twitter.com`. Since Twitter was rebranded to X in 2023, these are the same platform. Having both is redundant.

### Current Default List
```
youtube.com, instagram.com, snapchat.com, tiktok.com, x.com, twitter.com,
reddit.com, facebook.com, twitch.tv, netflix.com, discord.com, pinterest.com
```

### Expected Behavior
Remove `twitter.com` from the defaults (users who manually added it pre-rebrand can keep their custom entry).

---

## 6. MINOR: Feedback "Send Bug Report" Button Not Visible Without Input

**Severity:** Minor  
**Impact:** Users may be confused about how to submit a bug report.

### Description
In the Feedback modal > "Report a bug" flow, the "Send bug report" button is hidden/unavailable when the textarea is empty. The button only appears after typing something. This could confuse users who open the form and don't immediately see a submit button.

### Expected Behavior
Show the button in a disabled state (grayed out) rather than hiding it entirely, with a tooltip or helper text explaining that description is required.

---

## 7. MINOR: "Chrome Extension Settings" Shows "Coming Soon"

**Severity:** Minor  
**Impact:** Dead link / promised feature that doesn't exist yet.

### Description
On the Settings page (`/settings`), the "Browser extension" section has a "Chrome extension settings" link labeled "Coming soon". Clicking it does nothing.

### Expected Behavior
Either implement the feature, hide the section until it's ready, or make the "Coming soon" label non-interactive.

---

## 8. LOW: Focus Guard Code Not Masked for Signed-Out Users

**Severity:** Low  
**Impact:** Minimal - the code is session-based.

### Description
The Focus Guard connection code is generated and displayed even for guest (not signed in) users. While the code appears to be session-based, it's worth verifying that these guest codes are properly scoped and invalidated appropriately.

---

## Features That Work Well

The following features were tested and work correctly:

| Feature | Status | Notes |
|---------|--------|-------|
| Guest create flow (Steps 1-3) | Works | Smooth progression, state persistence across steps |
| Text-based schedule parsing | Works | Correctly parsed "School 8am-3pm Monday to Friday, soccer practice Tuesdays and Thursdays 4-5:30, piano lesson Wednesday at 6" into 3 commitments |
| Task creation with validation | Works | Required fields (Task Title, Due Date) properly validated |
| Task list display & delete | Works | Tasks display with delete button; deletion works |
| Canvas integration form | Works | Form validates required fields, provides helpful instructions |
| Canvas/Google Classroom redirect | Works | Correctly redirects to Integrations page when not connected |
| Focus Guard toggles | Works | All switches (blocking, hide switch, show clock) toggle correctly |
| Focus Guard connection code | Works | Generates JWT-style token, supports regeneration, copy button works |
| Blocked sites CRUD | Works | Add and remove sites work correctly (except duplicate feedback) |
| Settings - Theme toggle | Works | Light/Dark mode switch functional |
| Settings - Accent color picker | Works | 5 color options (Sage, Ocean, Sunset, Berry, Slate) |
| Feedback modal | Works | Opens/closes correctly, two flows available (bug report, share thoughts) |
| Columbia Student flow | Works | Pre-loads Entrepreneurship schedule with Daniel, prompts for CourseWorks2 connection |
| Toast notifications | Works | Success toasts appear and auto-dismiss |
| "Start over" button | Works | Resets the wizard to Step 1 |
| Back button navigation | Works | "Back to tasks" and back arrow work correctly |

---

## Recommendations (Priority Order)

1. **Fix the /plans 404** - Either create the Plans page or remove the sidebar link
2. **Add validation to Step 3** - Require at least one preference selection before generating schedule
3. **Disable Continue on Step 1** when no input is provided
4. **Add duplicate-site feedback** in Focus Guard
5. **Remove twitter.com** from default blocked sites
6. **Show disabled state** for the Send Bug Report button instead of hiding it
7. **Hide or disable** the "Chrome extension settings" Coming Soon link
