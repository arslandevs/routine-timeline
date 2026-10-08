# Dev plan: view tabs, Calendar layout, Google Calendar

Status: plan only, not built yet. Everything below is feasible in an Obsidian plugin. The only real risk is Google sign-in (see Phase 3).

## 0. Where we are
- `main.js` is hand-edited plain JS (no TS source). One global `store.ui` (layout, zoom, group, filters) drives every view.
- `occurs(task, date)` already answers "does this task happen on this day?", including repeats. A calendar view can reuse it unchanged.

## Phase 1: View tabs bar (like Notion)
Goal: tabs above the toolbar: `Default view | Timeline | All tasks | +`.

1. **Data model.** Replace the single `store.ui` with `store.views = [{ id, name, layout, zoom, groupBy, hideDone, groups }]` plus `store.activeView`. Migrate the old `ui` into one view named "Default view".
2. **Tab bar UI.** Render tabs at the top of `TimelineBoard`. Click = switch. `+` = new view (name prompt, copies the current view's settings). Right-click or `...` on a tab = Rename, Duplicate, Delete (keep at least one view).
3. **Layout in view settings** now changes only the active view's `layout` (Table / Board / Timeline / Calendar). Remove the layout switch from the old place if it feels duplicated.
4. **Embedded blocks:** add `view: <name>` to the code block options. Without it, use the active view.
5. **Done when:** two views with different layouts keep their own zoom, filters and grouping after reload.

Effort: about 1 day.

## Phase 2: Calendar layout (local tasks only)
Goal: Day / Week / Month grid, same data as the other views.

1. New layout `calendar` with its own toolbar: `Day | Week | Month` dropdown, Today, prev/next, month title (reuse `shift()` and `spanInfo()` ideas).
2. **Month grid:** 6x7 cells, task chips from `occurs()`, colored by task color, click a chip to edit, click an empty day to add a task on that date. `+N more` when a cell overflows.
3. **Week and Day:** 24h time grid. Place chips by `start`/`end`. Reuse the 15-minute snap for drag and resize.
4. **Left sidebar (collapsible, closed by default on narrow panes):** mini month calendar for jumping to a date, plus a "Calendars" list with a toggle per source (Local tasks, later Google accounts). Keep it one column and collapsible so the view does not get cluttered.
5. **Done when:** a task repeating Tue/Thu shows on every Tue/Thu in the month grid and week grid at its time.

Effort: 2 to 3 days.

## Phase 3: Google Calendar (read-only first)
Two ways. Build A first, B second.

### A. ICS feed (no sign-in, works on mobile)
- Google Calendar > Settings > the calendar > "Secret address in iCal format". The user pastes that URL in plugin settings.
- Fetch with Obsidian's `requestUrl` (avoids CORS). Parse with `ical.js` (also expands recurring events). Cache the parsed events in the plugin data and refresh every 15 to 30 minutes.
- Limits: read-only, and Google refreshes ICS feeds slowly (hours). Treat the URL as a secret and store it only in plugin data.
- Effort: 1 to 2 days.

### B. Google OAuth (live, optional write-back later)
- Create a Google Cloud project, enable Calendar API, make an **OAuth client** (Desktop app type). The user enters their own client ID/secret in settings, so we never ship one.
- Flow on desktop: OAuth 2.0 with PKCE. Open the consent URL in the browser, receive the code on a temporary loopback server `http://127.0.0.1:<port>` (Node `http` is available in Obsidian desktop), exchange it with `requestUrl`.
- **Mobile cannot use the loopback**; use option A there.
- Scope: `https://www.googleapis.com/auth/calendar.readonly` first. Add `calendar.events` only if we later let users create events from tasks.
- Calls: `calendarList.list` (calendars and colors), `events.list` with `singleEvents=true`, `timeMin/timeMax` for the visible range, and `syncToken` for cheap refreshes.
- **Token trap:** while the OAuth consent screen is in "Testing", Google expires the refresh token after 7 days. Set the app to "In production" (unverified is fine for personal use, with a warning screen) or re-authenticate weekly.
- Store tokens in plugin data and mark that file as sensitive (it must not be synced publicly). Multiple accounts = an array of `{ email, tokens, calendars[] }`.
- Effort: 3 to 4 days including refresh handling and error states.

### Showing Google events
- Event model: `{ id, source, title, start, end, allDay, color, url }`, never mixed into `store.tasks`. Keep them read-only (no drag) and visually lighter than tasks.
- Show them in the Calendar layout and as an optional overlay row in the Timeline (toggle per calendar in the sidebar).
- Clicking an event opens it in Google Calendar (`htmlLink`).

## Phase 4: polish
- Error states (offline, revoked access, expired token) with a "Reconnect" button.
- Settings: refresh interval, which calendars to show, default view.
- Tests: extend the headless smoke tests with fixture ICS and fixture API JSON; keep the existing layout and repeat tests.

## Suggested order
Phase 1 -> Phase 2 -> Phase 3A -> Phase 3B (only if live sync or write-back is needed).
