# Routine Timeline

A Notion-style task and routine planner for Obsidian. One set of tasks, four layouts (Table, Board, Timeline, Calendar), saved views in a tab bar, repeating tasks, a Google Calendar feed, and an inline block you can drop into any note.

> **Status: early release (v0.11.2).** Every layout, zoom, editor and menu is covered by a headless DOM test, but it has not been fully tested inside Obsidian yet. Please open an issue if something misbehaves, especially dragging inside a note in Live Preview.

## Install

### From a release (easiest)

1. Open the [latest release](https://github.com/arslandevs/routine-timeline/releases/latest) and download `main.js`, `manifest.json` and `styles.css`
2. Put the three files in `<your vault>/.obsidian/plugins/routine-timeline/` (create the folder if needed)
3. In Obsidian, go to **Settings → Community plugins** and enable **Routine Timeline**
4. Open it from the ribbon icon, or run the command **Open timeline view**

### With BRAT (auto-updates)

Install the **BRAT** community plugin, choose **Add beta plugin**, and enter `arslandevs/routine-timeline`. BRAT installs the latest release and keeps it updated.

Requires Obsidian 1.4.0 or newer (a recent version is recommended for the contrast styling). Works on desktop and mobile, with a few desktop-only drag interactions noted below.

## Views

### Tab bar

Saved views sit in a tab bar at the top, like Notion: *Default view | Calendar | Board | +*. The tab bar also shows inside an embedded note block, where clicking a tab copies that view's settings into the block.

- **Click a tab** to switch. **Click the active tab** for its menu: Rename, Display as (Table, Board, Timeline, Calendar), Edit view, Duplicate view, Delete view
- **+** adds a Table, Board, Timeline or Calendar view
- **Double-click** a tab to rename it, or right-click for the menu
- **Drag a tab** left or right to reorder
- Each view keeps its own layout, zoom, filters and grouping. There is always at least one view

### Table

Edit it like a spreadsheet.

- **Click a cell** to select it, then **type** to replace its value. **Enter** or double-click edits the current value, **Enter** saves, **Esc** cancels, and the **arrow keys** move between cells
- **Status** is a colored chip. Click it to change the status
- **OPEN**: hover a row's name and click **OPEN** to open the task in a side panel with every field plus a **Notes** box. Click anywhere outside the panel to close it. Valid edits are saved automatically
- **Select rows** with the checkbox (hover a row to see it, or use the header box for all). A floating bar shows **N selected**, a trash icon and a **⋯** menu: *Mark as* any status, *Edit group & color*, *Duplicate*, *Delete*. Right-click a row for the same menu. Deleting asks you to confirm and removes any arrows pointing at the deleted tasks
- **Drag a column header** to move that column. A blue line shows where it will land. Name always stays first

### Board

- Always shows the status columns **Not started**, **In progress** and **Done**, even when a column is empty, and each column has its own **+ New** button
- Click a column title to rename it (Enter saves, Esc cancels). The **⋯** menu renames, recolors or deletes a column, and **Add column** creates more. The Done column can be renamed but not deleted
- Drag a card to another column, or pick the **Status** in the task editor. Ticking a card's checkbox moves it to Done
- Status is tracked per day, so a repeating task can be Done today and Not started tomorrow
- Each status has its own color (Not started gray, In progress blue, Done green). The color also shows on the table's status chip

### Timeline

- Hour axis across the top, one row per task, and a **+ New** row at the bottom
- **Zoom dropdown**: Hours, Day, Week, Bi-week, Month, Quarter, Year, 5 Years. **Day** fits all 24 hours without scrolling, **Hours** zooms in
- **Week and larger** show one column per day. A repeating task appears only on the days it repeats: at its start time inside the day column in Week and Bi-week, and as a mark per day (consecutive days merge) in Month and larger. These zooms are read-only: click a bar to edit it
- **Move and resize**: drag a bar to move it, drag either edge to change the start or end. Snaps to 15 minutes
- **Dependency arrows**: drag from the small dot at the end of a bar onto another bar. If a task starts before the one it follows ends, the arrow turns **red and dashed**. Tap an arrow, then its ✕, to remove it
- A **red current-time line** with a dot, updated every minute on today's view
- Previous / Today / next steps by the current zoom (a day, a week, a month, and so on)

### Calendar

- **Day, Week and Month** grids (dropdown next to the date). Tasks appear on every day they occur, including repeats
- Click an empty day or hour to add a task there. Click a chip to edit it
- The Week view scrolls sideways and up and down, with the time column and day headers staying put
- The current time shows as a thin line across the week, a bolder line on today, and a time label in the margin
- A collapsible **left sidebar** has a mini month calendar, a list of calendars with show/hide eyes, and **Add calendar**

## Google Calendar and other calendars

Read-only, through iCal feeds, so it needs no sign-in and works on mobile.

1. In Google Calendar open *Settings → your calendar → Secret address in iCal format* and copy it
2. In Obsidian, use **Add calendar** in the Calendar sidebar (or **Settings → Routine Timeline**)

Events appear next to your tasks as solid colored cards, including repeating and all-day events, and refresh every 30 minutes. Click an event for its details. See *Privacy* below.

## Tasks

- **Repeat**: *Does not repeat*, *Every day* or *On specific days of the week* (for example only Tue and Thu). Choose when it **starts** and how long it lasts: **never ends**, **after a number of times** (for example 10) or **on a date**
- A done checkbox and the status are tracked separately for each day
- **New tasks** start at the time you pick and default to **25 minutes**. Changing the start moves the end with it until you set the end yourself
- **Notes** are plain text, saved with the task, and available in the editor and the side panel
- Opens with five example routine tasks you can edit or delete

## Properties

Open **View settings** (the sliders icon) → **Properties**.

- **Rename**, show or hide (eye), **reorder** (arrows or drag the table headers) and **add** properties
- **System properties** (Name, Status, Date, Start, End, Duration (min), Group, Repeat, Comes after) can be renamed, reordered and hidden, but **not deleted**. Name is always first
- **Add property** creates your own: text, number, checkbox, select or date. These can be deleted. Set their values in the task editor. They show as table columns
- Names apply to the table headers, the task editor and the group menu in every view

## Groups and filters

A search box, a Filter menu (hide completed, pick groups) and a Group menu (none, by group, by status). Group headers collapse when clicked. The Group menu does not apply to the Board layout, which always groups by status.

## Embed in a note

Run the command **Insert timeline into note**, or type a code block with the language `routine-timeline`:

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
| `height` | Height of the embedded block in pixels |
| `layout` | `timeline` (default), `table`, `board` or `calendar` |
| `zoom` | For the timeline: `hours`, `day` (default), `week`, `biweek`, `month`, `quarter`, `year` or `5years` |
| `calendar` | For `layout: calendar`: `day`, `week` or `month` (default) |
| `group` | Group rows by `group` or `status` |
| `hideDone` | `true` hides completed tasks |
| `filter` | Comma-separated group names to show |
| `view` | Use the settings of a saved view by name, for example `view: Timeline` |

## Mobile

- Tap a timeline bar once to select it. Its edges and connector dot appear, then drag
- Tap a selected bar again to open the editor, where you can type exact times
- Normal scrolling still works because dragging only starts from the bar's grip, edges or connector dot
- Dragging tabs, table columns and board cards uses the browser's drag events, so it works on desktop but not by touch. On mobile, reorder properties with the arrows in View settings, and change a task's status in the editor

## Look

Lines, headers and side panels are drawn a few shades darker than the page, and task bars, cards and calendar chips take a stronger version of their color with a visible edge, so they stand out on beige and other low-contrast themes. This uses `color-mix`; older Obsidian versions fall back to the theme's own border colors.

## Data

Tasks, views, statuses, properties and calendar feed addresses are stored in the plugin's own data (`.obsidian/plugins/routine-timeline/data.json`), not in your notes. Moving a repeating task changes its time for every day it repeats.

## Network use and privacy

- The plugin makes **no network requests unless you add a calendar**. It then fetches only the iCal address you pasted (for example your Google Calendar secret address), every 30 minutes and when you press refresh
- No telemetry, analytics, ads, accounts or payments. No data is sent anywhere else
- Events are kept in memory only. Your tasks, views and calendar addresses are stored locally in this plugin's `data.json`
- The secret iCal address of a calendar lets anyone who has it read that calendar. Treat `data.json` like a password file: do not commit or share it

## Limitations

- Calendar events are read-only and come from iCal feeds. Google refreshes those feeds every few hours, so a brand-new event can take a while to appear. Signing in with Google (OAuth) for live updates and creating events is not built yet; see [`docs/dev-plan-views-and-calendar.md`](docs/dev-plan-views-and-calendar.md)
- Calendar events show in the Calendar layout only, not in the Timeline
- Repeats are every day or chosen weekdays, with an optional start, count or end date. There is no monthly repeat or per-day exception yet
- In the Calendar week view a short block is stretched to a readable minimum, but it always starts at the task's start time
- Week, Bi-week, Month, Quarter, Year and 5 Years timeline zooms are read-only, and dependency arrows are only drawn in Hours and Day
- No ← → buttons for bars outside the visible area (the current-time line, dragging and resizing cover most of that)
- Inline embedding in Live Preview is the least tested part

## License

[MIT](LICENSE)
