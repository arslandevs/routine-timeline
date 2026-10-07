# Routine Timeline

A Notion-style timeline for your daily routine, inside Obsidian: colored task bars on an hour axis, groups and filters, drag-to-connect dependency arrows, and an inline block you can embed in any note.

> **Status: early release (v0.4.0).** It renders correctly in a headless DOM smoke test across every layout and zoom, but it has not been fully tested inside Obsidian yet. Please open an issue if something misbehaves, especially dragging inside a note in Live Preview.

## Install

### Manual

1. Download `main.js`, `manifest.json` and `styles.css` from this repo.
2. Put them in `<your vault>/.obsidian/plugins/routine-timeline/`.
3. In Obsidian, go to **Settings → Community plugins**, enable **Routine Timeline**.
4. Open it from the ribbon icon, or run the command **Open routine timeline**.

Requires Obsidian 1.4.0 or newer. Works on desktop and mobile.

## Features

- **Three layouts**: Table, Board and Timeline. Click the sliders icon (**View settings**) in the toolbar and pick one under **Layout**. Same tasks, same filters, different view
  - **Table**: one row per task (done, name, start, end, group, repeat, comes after). Click a row to edit
  - **Board**: columns by status (To do / Done), or by group when grouping is set to Group. Drag a card to another column to change its status or group
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
- **Repeating tasks**: set **Repeat** in the task editor to *Does not repeat*, *Every day* or *On specific days of the week* (for example only Tue and Thu). A done checkbox is tracked separately for each day
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

## Data

Tasks are stored in the plugin's own data (`.obsidian/plugins/routine-timeline/data.json`), not in your notes. This keeps it simple and works on mobile. Moving a repeating task changes its time for every day it repeats.

## Limitations

- Repeats are every day or chosen weekdays. There is no monthly repeat, end date or per-day exception yet
- In Week view a short bar is stretched to a readable minimum width, but it always starts at the task's start time. Bars late in the evening are cut at the end of the day column
- Week, Bi-week, Month, Quarter, Year and 5 Years zooms are read-only, and dependency arrows are only drawn in Hours and Day
- Board drag and drop uses the browser's drag events, so it works on desktop but not by touch (use the checkbox or the editor on mobile)
- No ← → buttons for bars outside the visible area (the current-time line, dragging and resizing cover most of that)
- Inline embedding in Live Preview is the least tested part

## License

[MIT](LICENSE)
