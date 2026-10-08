# Routine Timeline

A Notion-style timeline for your daily routine, inside Obsidian: colored task bars on an hour axis, groups and filters, drag-to-connect dependency arrows, and an inline block you can embed in any note.

> **Status: early release (v0.9.1).** It renders correctly in a headless DOM smoke test across every layout and zoom, but it has not been fully tested inside Obsidian yet. Please open an issue if something misbehaves, especially dragging inside a note in Live Preview.

## Install

### Manual

1. Download `main.js`, `manifest.json` and `styles.css` from this repo.
2. Put them in `<your vault>/.obsidian/plugins/routine-timeline/`.
3. In Obsidian, go to **Settings → Community plugins**, enable **Routine Timeline**.
4. Open it from the ribbon icon, or run the command **Open routine timeline**.

Requires Obsidian 1.4.0 or newer. Works on desktop and mobile.

## Features

- **View tabs** across the top, like Notion: *Default view | Timeline | … | +*. Click a tab to switch, **+** to add a Table, Board, Timeline or Calendar view, double-click a tab to rename it, right-click for Rename, Duplicate and Delete. Each view keeps its own layout, zoom, filters and grouping. **View settings → Layout** changes the layout of the current view
- **Four layouts**: Table, Board, Timeline and Calendar. Same tasks, same filters, different view
  - **Table**: one row per task. Click a row to edit it. Hover a row (or select any) to show its checkbox
    - **Selecting**: tick one or more rows, or the header box for all. A floating bar shows **N selected**, a trash icon, a **⋯** menu and a clear button, like Notion. Right-click a row for the same menu
    - **⋯ menu**: *Mark as* any status, *Edit group & color* for all selected, *Duplicate*, and *Delete*. Delete asks you to confirm and removes any arrows pointing at the deleted tasks
    - **Status**: click a status chip in a row to change it
  - **Board**: always shows the status columns **Not started**, **In progress** and **Done**, even when a column is empty, and every column has its own **+ New** button
    - Click a column title to rename it (Enter saves, Escape cancels). The **⋯** menu renames or deletes a column, and **Add column** creates more. The Done column can be renamed but not deleted
    - Drag a card to another column, or pick the **Status** in the task editor (works on mobile). Ticking a task's checkbox moves it to Done, and unticking moves it back to the first column
    - Status is tracked per day, so a repeating task can be Done today and Not started tomorrow
- **Properties** (View settings → Properties): rename, show or hide, **reorder** (arrows) and **add** properties
  - **System properties** (Name, Status, Date, Start, End, Duration (min), Group, Repeat, Comes after) can be renamed, reordered and hidden with the eye, but **not deleted**. Any that were deleted in an earlier version come back automatically
  - **Add property** creates your own: text, number, checkbox, select or date. These can be deleted. Set their values in the task editor. They show as table columns
  - Names apply to the table headers, the task editor and the group menu in every view
  - **Calendar**: Day, Week and Month grids (dropdown next to the date). Tasks appear on every day they occur, including repeats. Click an empty day or hour to add a task there, click a chip to edit it. The Week view scrolls sideways and up and down, with the time column and day headers staying put. The current time shows as a thin line across the week, a bolder line on today, and a time label in the margin (updated every minute). Calendar events are solid colored cards A collapsible left sidebar has a mini month calendar, a list of calendars with show/hide eyes, and **Add calendar**
- **Google Calendar and other calendars** (read-only, via iCal feeds): in Google Calendar open *Settings → your calendar → Secret address in iCal format*, then in Obsidian use **Add calendar** (Calendar sidebar or Settings → Routine Timeline). Events show next to your tasks, including repeating ones and all-day events, and refresh every 30 minutes. Click an event for its details. See the privacy note below
- **Zoom dropdown** (Timeline): Hours, Day, Week, Bi-week, Month, Quarter, Year, 5 Years
  - **Day** fits all 24 hours in the view without scrolling. **Hours** zooms in so you can scroll through the day
  - **Week and larger** show one column per day. A repeating task appears only on the days it repeats: at its start time inside the day column in Week and Bi-week, and as a mark per day (consecutive days merge) in Month and larger. These views are read-only: click a bar to edit it
- **Hour axis** across the top, one row per task, and a **+ New** row at the bottom
- **Navigation**: previous, Today, next. It steps by the current zoom (a day, a week, a month, and so on)
- **Red current-time line** with a dot at the top, updated every minute on today's view
- **Colorful rounded bars**: nine Notion-style colors, chosen per task, with matching light and dark theme tints
- **Move and resize**: drag a bar to move it earlier or later, drag either edge to change the start or end. Snaps to 15 minutes
- **Dependency arrows**: drag from the small dot at the end of a bar onto another bar. A task can have several arrows into it. Tap an arrow to select it, then tap the ✕ to remove it
  - If a task starts before the one it follows ends, the arrow turns **red and dashed**
- **Repeating tasks**: set **Repeat** in the task editor to *Does not repeat*, *Every day* or *On specific days of the week* (for example only Tue and Thu). Choose when it **starts** and how long it lasts: **never ends**, **after a number of times** (e.g. 10 occurrences) or **on a date**. A done checkbox is tracked separately for each day
- **New tasks** start at the time you pick and default to **25 minutes** long. Changing the start moves the end with it until you set the end yourself
- **Groups and filters**: search box, a Filter menu (hide completed, pick groups) and a Group menu (none, by group, by status). Group headers collapse when tapped
- **Inline in a note** (see below)
- Opens with five example routine tasks you can edit or delete

## Mobile

- Tap a bar once to select it. Its edges and connector dot appear, then drag
- Tap a selected bar again to open the editor, where you can type exact times
- Normal scrolling still works because dragging only starts from the bar's grip, edges or connector dot

## Embed in a note

Run the command **Insert routine timeline into note**, or type a code block with the language `routine-timeline`:

````markdown
```routine-timeline
height: 420
group: group
hideDone: true
filter: Work, Health
```
````

All lines are optional:

| Option | Meaning |
| --- | --- |
| `height` | Height of the embedded timeline in pixels |
| `group` | Group rows by `group` or `status` |
| `hideDone` | `true` hides completed tasks |
| `filter` | Comma-separated group names to show |
| `layout` | `timeline` (default), `table` or `board` |
| `zoom` | `hours`, `day` (default), `week`, `biweek`, `month`, `quarter`, `year` or `5years` |
| `calendar` | For `layout: calendar`: `day`, `week` or `month` (default) |
| `view` | Use the settings of a saved view by name, e.g. `view: Timeline` |

## Data

Tasks are stored in the plugin's own data (`.obsidian/plugins/routine-timeline/data.json`), not in your notes. This keeps it simple and works on mobile. Moving a repeating task changes its time for every day it repeats.

## Privacy

The secret iCal address of a calendar lets anyone who has it read that calendar. It is stored in this plugin's `data.json`, so do not commit or share that file. Events are fetched directly from Google and are kept in memory only.

## Limitations

- Calendar events are read-only and come from iCal feeds. Google refreshes those feeds every few hours, so a brand-new event can take a while to appear. Signing in with Google (OAuth) for live updates and creating events is not built yet; see `docs/dev-plan-views-and-calendar.md`
- Calendar events show in the Calendar layout only, not in the Timeline

- Repeats are every day or chosen weekdays, with an optional start, count or end date. There is no monthly repeat or per-day exception yet
- In Week view a short bar is stretched to a readable minimum width, but it always starts at the task's start time. Bars late in the evening are cut at the end of the day column
- Week, Bi-week, Month, Quarter, Year and 5 Years zooms are read-only, and dependency arrows are only drawn in Hours and Day
- Board drag and drop uses the browser's drag events, so it works on desktop but not by touch (use the checkbox or the Status field in the editor on mobile)
- The Group menu does not apply to the Board layout, which always groups by status
- No ← → buttons for bars outside the visible area (the current-time line, dragging and resizing cover most of that)
- Inline embedding in Live Preview is the least tested part

## License

[MIT](LICENSE)
