# Routine Timeline

A Notion-style timeline for your daily routine, inside Obsidian: colored task bars on an hour axis, groups and filters, drag-to-connect dependency arrows, and an inline block you can embed in any note.

> **Status: early release (v0.2.0).** It type-checks and bundles cleanly, but it has not been fully tested inside Obsidian yet. Please open an issue if something misbehaves, especially dragging inside a note in Live Preview.

## Install

### Manual

1. Download `main.js`, `manifest.json` and `styles.css` from this repo.
2. Put them in `<your vault>/.obsidian/plugins/routine-timeline/`.
3. In Obsidian, go to **Settings → Community plugins**, enable **Routine Timeline**.
4. Open it from the ribbon icon, or run the command **Open routine timeline**.

Requires Obsidian 1.4.0 or newer. Works on desktop and mobile.

## Features

- **Hour axis** across the top, one row per task, and a **+ New** row at the bottom
- **Day navigation**: previous, Today, next
- **Red current-time line** with a dot at the top, updated every minute on today's view
- **Colorful rounded bars**: nine Notion-style colors, chosen per task, with matching light and dark theme tints
- **Move and resize**: drag a bar to move it earlier or later, drag either edge to change the start or end. Snaps to 15 minutes
- **Dependency arrows**: drag from the small dot at the end of a bar onto another bar. A task can have several arrows into it. Tap an arrow to select it, then tap the ✕ to remove it
  - If a task starts before the one it follows ends, the arrow turns **red and dashed**
- **Daily routines**: tasks can repeat every day, with a done checkbox tracked separately for each day
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

## Data

Tasks are stored in the plugin's own data (`.obsidian/plugins/routine-timeline/data.json`), not in your notes. This keeps it simple and works on mobile. Moving a daily-routine task changes its time for every day.

## Limitations

- Shows one day at a time, with no zoom
- No ← → buttons for bars outside the visible area (the current-time line, dragging and resizing cover most of that)
- Inline embedding in Live Preview is the least tested part

## License

[MIT](LICENSE)
