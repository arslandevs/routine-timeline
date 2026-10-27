

export const VIEW_TYPE = "routine-timeline";
export const HOURS_W = 140;
export const MIN_HOUR_W = 22;
export const ROW_H = 44;
export const HEAD_H = 34;
export const SNAP = 15;
export const DAY = 1440;
export const SVG_NS = "http://www.w3.org/2000/svg";
export const COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
export const ZOOMS = ["hours", "day", "week", "biweek", "month", "quarter", "year", "5years"];
export const ZOOM_LABEL = { hours: "Hours", day: "Day", week: "Week", biweek: "Bi-week", month: "Month", quarter: "Quarter", year: "Year", "5years": "5 Years" };
export const ZOOM_MIN_DAY_W = { week: 90, biweek: 56, month: 28, quarter: 8, year: 2.4, "5years": 0.7 };
export const LAYOUTS = ["table", "board", "timeline", "calendar"];
export const LAYOUT_LABEL = { table: "Table", board: "Board", timeline: "Timeline", calendar: "Calendar" };
export const CAL_VIEWS = ["day", "week", "month"];
export const CAL_LABEL = { day: "Day", week: "Week", month: "Month" };
export const HOUR_H = 44;
export const LAYOUT_ICON = { table: "table", board: "layout-dashboard", timeline: "gantt-chart", calendar: "calendar" };
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const hhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const parseHHMM = (s) => {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
};
export const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
export const hourLabelShort = (h) => `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;
export const clockLabel = (min) => `${Math.floor(min / 60) % 12 || 12}:${String(min % 60).padStart(2, "0")} ${min % 1440 < 720 ? "AM" : "PM"}`;
// A task may run past midnight: its end is then stored as minutes after the start of its own day
// (e.g. 23:00\u201303:00 is start 1380, end 1620). Time inputs show the end as a clock time, and an
// end clock earlier than the start means "the next day".
export const endClock = (m) => hhmm(m % 1440);
export const overnightEnd = (start, clock) => clock < start ? clock + 1440 : clock;
export const dayIndex = (d, start) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start.getTime()) / 864e5);
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DEFAULT_LEN = 25;
// "1h 05m" / "45m" for tracked time.
export const fmtDur = (m) => m >= 60 ? `${Math.floor(m / 60)}h ${pad(m % 60)}m` : `${m}m`;
export const nthCache = /* @__PURE__ */ new Map();
export const effUntil = (t) => {
  if (!t.count || !t.from) return t.until || null;
  const sig = `${t.from}|${(t.days || []).join("")}|${t.count}`;
  const hit = nthCache.get(t.id);
  let last;
  if (hit && hit.sig === sig) last = hit.last;
  else {
    last = null;
    let d = parseYmd(t.from);
    let n = 0;
    for (let i = 0; i < 4e3 && n < t.count; i++) {
      if (!t.days || t.days.includes(d.getDay())) {
        n++;
        last = ymd(d);
      }
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }
    nthCache.set(t.id, { sig, last });
  }
  return last && t.until ? last < t.until ? last : t.until : last || t.until || null;
};
export const occurs = (t, d) => {
  if (t.date !== null) return t.date === ymd(d);
  if (t.days && !t.days.includes(d.getDay())) return false;
  const s = ymd(d);
  if (t.from && s < t.from) return false;
  const u = effUntil(t);
  return !(u && s > u);
};
export const repeatLabel = (t) => {
  if (t.date !== null) return "Once";
  const base = !t.days || t.days.length === 7 ? "Every day" : [...t.days].sort((a, b) => a - b).map((n) => DOW[n]).join(", ");
  const end = t.count ? `, ${t.count}\xD7` : t.until ? `, until ${t.until}` : "";
  return base + end;
};
export const STATUS_COLORS = { "not-started": "gray", "in-progress": "blue", done: "green" };
export const EXTRA_STATUS_COLORS = ["purple", "orange", "pink", "yellow", "brown", "red"];
export const defaultStatuses = () => [
  { id: "not-started", name: "Not started", done: false, color: "gray" },
  { id: "in-progress", name: "In progress", done: false, color: "blue" },
  { id: "done", name: "Done", done: true, color: "green" }
];
export const cleanStatuses = (v) => {
  const seen = /* @__PURE__ */ new Set();
  const list = Array.isArray(v) ? v.filter((s) => s && typeof s.id === "string" && typeof s.name === "string" && s.name.trim() && !seen.has(s.id) && seen.add(s.id)).map((s, i) => ({ id: s.id, name: s.name.trim(), done: !!s.done, color: COLORS.includes(s.color) ? s.color : STATUS_COLORS[s.id] || EXTRA_STATUS_COLORS[i % EXTRA_STATUS_COLORS.length] })) : [];
  if (list.length === 0) return defaultStatuses();
  if (!list.some((s) => s.done)) list[list.length - 1].done = true;
  return list;
};
export const PROP_KEYS = ["name", "status", "date", "start", "end", "duration", "actual", "group", "repeat", "after"];
export const defaultProps = () => ({
  name: { label: "Name", visible: true },
  status: { label: "Status", visible: true },
  date: { label: "Date", visible: true },
  start: { label: "Start", visible: true },
  end: { label: "End", visible: true },
  duration: { label: "Duration (min)", visible: true },
  actual: { label: "Actual (min)", visible: true },
  group: { label: "Group", visible: true },
  repeat: { label: "Repeat", visible: true },
  after: { label: "Comes after", visible: true }
});
export const CUSTOM_TYPES = ["text", "number", "checkbox", "select", "date"];
export const CUSTOM_LABEL = { text: "Text", number: "Number", checkbox: "Checkbox", select: "Select", date: "Date" };
// Column header icons, Notion-style: one per property type so the column's kind of value is
// recognizable at a glance.
export const CUSTOM_TYPE_ICON = { text: "text", number: "hash", checkbox: "check-square", select: "tags", date: "calendar" };
export const PROP_ICON = { name: "text", status: "circle-dot", date: "calendar", start: "clock", end: "clock", duration: "timer", actual: "play", group: "layers", repeat: "repeat", after: "link" };
export const cleanProps = (v, order) => {
  const props = defaultProps();
  if (v && typeof v === "object") {
    for (const k of Object.keys(v)) {
      const s = v[k];
      if (!s || typeof s !== "object") continue;
      if (PROP_KEYS.includes(k)) {
        if (typeof s.label === "string" && s.label.trim()) props[k].label = s.label.trim();
        if (k !== "name" && s.visible === false) props[k].visible = false;
      } else if (/^c_[a-z0-9]+$/i.test(k) && CUSTOM_TYPES.includes(s.type) && typeof s.label === "string" && s.label.trim()) {
        props[k] = { label: s.label.trim(), visible: s.visible !== false, type: s.type, custom: true };
      }
    }
  }
  let list = Array.isArray(order) ? order.filter((k, i, arr) => props[k] && arr.indexOf(k) === i) : [...PROP_KEYS, ...Object.keys(props).filter((k) => props[k].custom)];
  list = ["name", ...list.filter((k) => k !== "name")];
  if (Array.isArray(order)) {
    for (const k of PROP_KEYS) {
      if (!list.includes(k)) {
        list.push(k);
        props[k].visible = true;
      }
    }
  }
  return { props, order: list };
};
export const doneStatus = (sts) => sts.find((s) => s.done) || sts[sts.length - 1];
export const statusOf = (t, date, sts) => {
  const id = t.st && t.st[date];
  const hit = id ? sts.find((s) => s.id === id) : null;
  if (hit) return hit;
  return t.doneDates.includes(date) ? doneStatus(sts) : sts[0];
};
export const withStatus = (t, date, status, sts) => {
  t.st = { ...t.st || {}, [date]: status.id };
  const done = status.done;
  t.doneDates = done ? t.doneDates.includes(date) ? t.doneDates : [...t.doneDates, date] : t.doneDates.filter((d) => d !== date);
};
export const cleanDays = (v) => {
  const days = Array.isArray(v) ? [...new Set(v.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))] : [];
  return days.length > 0 && days.length < 7 ? days : null;
};
export const parseYmd = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const fmt = (min) => {
  const h = Math.floor(min / 60) % 24;
  return `${h % 12 || 12}:${pad(min % 60)} ${h < 12 ? "AM" : "PM"}`;
};
export const groupLabel = (t) => t.group || "No group";
export const curve = (x1, y1, x2, y2) => {
  const dx = Math.max(24, Math.abs(x2 - x1) * 0.5);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
};
export const COLOR_OPS = ["eq", "neq", "contains", "empty", "notEmpty", "gt", "lt", "checked", "unchecked"];
export const cleanColorRules = (v) => Array.isArray(v) ? v.filter((r) => r && typeof r === "object" && typeof r.key === "string" && r.key && COLOR_OPS.includes(r.op) && COLORS.includes(r.color)).map((r) => ({ id: typeof r.id === "string" && r.id ? r.id : uid(), key: r.key, op: r.op, value: typeof r.value === "string" ? r.value : "", color: r.color })) : [];
export const CALC_OPS = ["countAll", "countValues", "countUnique", "countEmpty", "countNotEmpty", "percentEmpty", "percentNotEmpty", "sum", "average", "median", "min", "max", "range"];
export const CALC_LABEL = { countAll: "Count all", countValues: "Count values", countUnique: "Count unique values", countEmpty: "Count empty", countNotEmpty: "Count not empty", percentEmpty: "Percent empty", percentNotEmpty: "Percent not empty", sum: "Sum", average: "Average", median: "Median", min: "Min", max: "Max", range: "Range" };
export const cleanCalc = (v): Record<string, string> => v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([, op]) => CALC_OPS.includes(op as string))) as Record<string, string> : {};
export const defaultUi = (): any => ({ groupBy: "none", hideDone: false, groups: [], layout: "timeline", zoom: "day", cal: "month", sidebar: true, showTasks: true, sortKey: null, sortDir: "asc", colFilters: {}, frozenKey: null, wrapKeys: [], colorRules: [], calc: {} });
export const cleanView = (v, fallbackName?): any => ({
  id: typeof v.id === "string" && v.id ? v.id : uid(),
  name: typeof v.name === "string" && v.name.trim() ? v.name.trim() : fallbackName || "View",
  layout: LAYOUTS.includes(v.layout) ? v.layout : "timeline",
  zoom: ZOOMS.includes(v.zoom) ? v.zoom : "day",
  cal: CAL_VIEWS.includes(v.cal) ? v.cal : "month",
  groupBy: ["none", "group", "status"].includes(v.groupBy) ? v.groupBy : "none",
  hideDone: !!v.hideDone,
  groups: Array.isArray(v.groups) ? v.groups.filter((g) => typeof g === "string") : [],
  sidebar: v.sidebar !== false,
  showTasks: v.showTasks !== false,
  // Table-only: column sort, per-column text filters, a frozen (sticky) column, and columns that wrap.
  sortKey: typeof v.sortKey === "string" && v.sortKey ? v.sortKey : null,
  sortDir: v.sortDir === "desc" ? "desc" : "asc",
  colFilters: (v.colFilters && typeof v.colFilters === "object" ? Object.fromEntries(Object.entries(v.colFilters).filter(([, s]) => typeof s === "string" && s.trim())) : {}) as Record<string, string>,
  frozenKey: typeof v.frozenKey === "string" && v.frozenKey ? v.frozenKey : null,
  wrapKeys: Array.isArray(v.wrapKeys) ? v.wrapKeys.filter((k) => typeof k === "string") : [],
  // Highlight a row/bar by color when a property matches a rule. First matching rule wins.
  colorRules: cleanColorRules(v.colorRules),
  // Table-only: a calculation (sum, average, count, ...) shown in the footer under each column.
  calc: cleanCalc(v.calc)
});
// A feed's address (a secret iCal URL) stays in this device's local data and is never written to
// the synced vault file, so a feed that arrived through sync has no url until it is set here too.
export const cleanFeeds = (v) => Array.isArray(v) ? v.filter((f) => f && typeof f === "object" && (typeof f.url === "string" && f.url.trim() || typeof f.id === "string" && f.id)).map((f) => ({
  id: typeof f.id === "string" && f.id ? f.id : uid(),
  name: typeof f.name === "string" && f.name.trim() ? f.name.trim() : "Calendar",
  url: typeof f.url === "string" ? f.url.trim() : "",
  color: COLORS.includes(f.color) ? f.color : "green",
  visible: f.visible !== false
})) : [];
// Tombstones: id -> when it was deleted, so a merge doesn't bring a deleted task back from the
// other device. Dropped after 90 days.
export const TOMBSTONE_MS = 90 * 864e5;
export const cleanStamps = (v) => {
  const out = {};
  if (!v || typeof v !== "object") return out;
  for (const k of Object.keys(v).sort()) if (Number.isFinite(v[k]) && v[k] > 0) out[k] = v[k];
  return out;
};
export const cleanLog = (v) => {
  const out = {};
  if (!v || typeof v !== "object") return out;
  for (const k of Object.keys(v).sort()) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(v[k]) && v[k] > 0) out[k] = Math.round(v[k]);
  return out;
};
export const defaultStore = (tasks) => {
  const v = cleanView({ name: "Default view" }, "Default view");
  return { tasks, views: [v], activeView: v.id, statuses: defaultStatuses(), props: defaultProps(), propOrder: [...PROP_KEYS], feeds: [], deleted: {}, updatedAt: 0 };
};
export function seedTasks() {
  const mk = (title, start, end, group, color, deps = []) => ({ id: uid(), title, start, end, date: null, days: null, from: null, until: null, count: null, custom: {}, notes: "", deps, group, color, doneDates: [], st: {}, log: {}, updatedAt: 0 });
  const plan = mk("Morning plan", 7 * 60, 7 * 60 + 30, "Morning", "yellow");
  const deep = mk("Deep work", 9 * 60, 12 * 60, "Work", "blue", [plan.id]);
  return [
    plan,
    deep,
    mk("Lunch and walk", 13 * 60, 14 * 60, "Health", "green"),
    mk("Gym", 18 * 60, 19 * 60, "Health", "orange"),
    mk("Evening review", 21 * 60, 21 * 60 + 30, "Evening", "purple")
  ];
}
export function normalize(raw) {
  var _a, _b, _c, _d, _e;
  const s = raw;
  if (!s || !Array.isArray(s.tasks)) return null;
  const tasks = s.tasks.map((t) => {
    var _a2, _b2, _c2, _d2, _e2, _f;
    return {
      id: (_a2 = t.id) != null ? _a2 : uid(),
      title: (_b2 = t.title) != null ? _b2 : "",
      start: (_c2 = t.start) != null ? _c2 : 540,
      end: (_d2 = t.end) != null ? _d2 : 600,
      date: (_e2 = t.date) != null ? _e2 : null,
      days: cleanDays(t.days),
      from: typeof t.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.from) ? t.from : null,
      until: typeof t.until === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.until) ? t.until : null,
      count: Number.isInteger(t.count) && t.count > 0 ? t.count : null,
      custom: t.custom && typeof t.custom === "object" && !Array.isArray(t.custom) ? { ...t.custom } : {},
      notes: typeof t.notes === "string" ? t.notes : "",
      deps: Array.isArray(t.deps) ? t.deps : t.after ? [t.after] : [],
      group: (_f = t.group) != null ? _f : "",
      color: COLORS.includes(t.color) ? t.color : "blue",
      doneDates: Array.isArray(t.doneDates) ? t.doneDates : [],
      st: t.st && typeof t.st === "object" && !Array.isArray(t.st) ? { ...t.st } : {},
      // Actual minutes spent, per day (time tracking).
      log: cleanLog(t.log),
      // When this task last changed on any device, so two devices' edits can be merged.
      updatedAt: Number.isFinite(t.updatedAt) ? t.updatedAt : 0
    };
  });
  let views = Array.isArray(s.views) ? s.views.filter((v) => v && typeof v === "object").map((v, i) => cleanView(v, `View ${i + 1}`)) : [];
  if (views.length === 0) views = [cleanView({ ...s.ui || {}, name: "Default view" }, "Default view")];
  const activeView = views.some((v) => v.id === s.activeView) ? s.activeView : views[0].id;
  const pp = cleanProps(s.props, s.propOrder);
  return { tasks, views, activeView, statuses: cleanStatuses(s.statuses), props: pp.props, propOrder: pp.order, feeds: cleanFeeds(s.feeds), deleted: cleanStamps(s.deleted), updatedAt: Number.isFinite(s.updatedAt) ? s.updatedAt : 0 };
}
// A vault can hold several independent task databases ("bases"), each with its own tasks,
// properties, statuses and saved views - like separate Notion databases. The plugin's saved data
// is now a list of bases plus which one is active; `normalizeAppData` also upgrades data saved by
// older single-database versions of the plugin into a single base named "Routine".
export function normalizeAppData(raw) {
  if (raw && Array.isArray(raw.bases) && raw.bases.length > 0) {
    const bases = raw.bases.filter((b) => b && typeof b === "object").map((b, i) => ({
      id: typeof b.id === "string" && b.id ? b.id : uid(),
      name: typeof b.name === "string" && b.name.trim() ? b.name.trim() : `Base ${i + 1}`,
      updatedAt: Number.isFinite(b.updatedAt) ? b.updatedAt : 0,
      store: normalize(b.store) || defaultStore([])
    }));
    if (bases.length === 0) return null;
    const activeBaseId = bases.some((b) => b.id === raw.activeBaseId) ? raw.activeBaseId : bases[0].id;
    return { bases, activeBaseId, deletedBases: cleanStamps(raw.deletedBases) };
  }
  const legacy = normalize(raw);
  if (!legacy) return null;
  const id = uid();
  return { bases: [{ id, name: "Routine", store: legacy, updatedAt: 0 }], activeBaseId: id, deletedBases: {} };
}
// ---- merging two copies of the data (this device's and the synced file's) ---------------
// Tasks merge one by one: the copy edited most recently wins, and a task missing on one side is
// kept unless the other side deleted it after its last edit. Views, statuses, properties and feeds
// come from whichever side changed them last. Local wins ties, so both devices settle on the same
// result and stop writing.
export function mergeStore(a, b) {
  const now = Date.now();
  const deleted = {};
  for (const src of [a.deleted, b.deleted]) for (const id of Object.keys(src)) if (now - src[id] < TOMBSTONE_MS) deleted[id] = Math.max(deleted[id] || 0, src[id]);
  const bNewer = b.updatedAt > a.updatedAt;
  const [first, second] = bNewer ? [b, a] : [a, b];
  const byId = /* @__PURE__ */ new Map();
  const tasks = [];
  const pick = (t, other, otherWinsTie) => {
    const o = other.tasks.find((x) => x.id === t.id);
    if (o) return o.updatedAt > t.updatedAt || otherWinsTie && o.updatedAt === t.updatedAt ? o : t;
    const gone = deleted[t.id];
    return gone && gone > t.updatedAt ? null : t;
  };
  for (const t of first.tasks) {
    const k = pick(t, second, bNewer);
    if (k && !byId.has(k.id)) {
      byId.set(k.id, k);
      tasks.push(k);
    }
  }
  for (const t of second.tasks) {
    if (byId.has(t.id)) continue;
    const k = pick(t, first, !bNewer);
    if (k) {
      byId.set(k.id, k);
      tasks.push(k);
    }
  }
  const rest = bNewer ? b : a;
  return { ...rest, tasks, deleted: cleanStamps(deleted), updatedAt: Math.max(a.updatedAt, b.updatedAt) };
}
export function mergeAppData(local, remote) {
  const now = Date.now();
  const deletedBases = {};
  for (const src of [local.deletedBases, remote.deletedBases]) for (const id of Object.keys(src)) if (now - src[id] < TOMBSTONE_MS) deletedBases[id] = Math.max(deletedBases[id] || 0, src[id]);
  const stamp = (b) => Math.max(b.updatedAt, b.store.updatedAt, ...b.store.tasks.map((t) => t.updatedAt));
  const bases = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [mine, theirs] of [[local, remote], [remote, local]]) {
    for (const b of mine.bases) {
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      const o = theirs.bases.find((x) => x.id === b.id);
      if (!o) {
        const gone = deletedBases[b.id];
        if (!(gone && gone > stamp(b))) bases.push(b);
        continue;
      }
      const [l, r] = mine === local ? [b, o] : [o, b];
      bases.push({ id: b.id, name: r.updatedAt > l.updatedAt ? r.name : l.name, updatedAt: Math.max(l.updatedAt, r.updatedAt), store: mergeStore(l.store, r.store) });
    }
  }
  const activeBaseId = bases.some((b) => b.id === local.activeBaseId) ? local.activeBaseId : bases[0].id;
  return { bases, activeBaseId, deletedBases: cleanStamps(deletedBases) };
}
// Task data lives in a regular vault file (not the hidden .obsidian folder) so sync tools that
// only sync notes - LiveSync, Remotely Save, Obsidian Sync - carry it to every device.
export const DEFAULT_SYNC_PATH = "Routine Timeline/routine-timeline.json";
// Reminders are per device (kept in the plugin's local data, not the synced file), so each
// device decides whether it nags you.
export const NOTIFY_SOUNDS = { system: "System default", chime: "Chime", bell: "Bell", ding: "Ding", pop: "Soft pop", none: "No sound" };
export const NOTIFY_LEADS = [0, 5, 10, 15, 30];
export const defaultNotify = () => ({ enabled: true, lead: 0, atStart: true, sound: "system" });
export function cleanNotify(v) {
  const d = defaultNotify();
  if (!v || typeof v !== "object") return d;
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : d.enabled,
    lead: NOTIFY_LEADS.includes(v.lead) ? v.lead : d.lead,
    atStart: typeof v.atStart === "boolean" ? v.atStart : d.atStart,
    sound: v.sound in NOTIFY_SOUNDS ? v.sound : d.sound
  };
}
export const TONES = {
  chime: [[880, 0, 0.5], [1318.5, 0.18, 0.7]],
  bell: [[659.3, 0, 1.2], [1318.5, 0, 0.9], [1975.5, 0, 0.5]],
  ding: [[1568, 0, 0.6]],
  pop: [[523.3, 0, 0.12], [784, 0.09, 0.16]]
};
export let toneCtx = null;
export function playTone(name) {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  const notes = TONES[name];
  if (!AC || !notes) return;
  try {
    toneCtx = toneCtx || new AC();
    if (toneCtx.state === "suspended") void toneCtx.resume();
    const t0 = toneCtx.currentTime + 0.02;
    for (const [freq, at, len] of notes) {
      const osc = toneCtx.createOscillator();
      const gain = toneCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(1e-4, t0 + at);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(1e-4, t0 + at + len);
      osc.connect(gain).connect(toneCtx.destination);
      osc.start(t0 + at);
      osc.stop(t0 + at + len + 0.05);
    }
  } catch (e) {
    console.error("Routine Timeline: could not play sound", e);
  }
}
export function cleanSyncPath(v) {
  let p = typeof v === "string" ? v.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/") : "";
  if (!p) return DEFAULT_SYNC_PATH;
  if (!/\.json$/i.test(p)) p += ".json";
  return p;
}
// The untouched sample data a fresh install creates. A device holding only this must never push
// it over the real synced file.
export function isPristineSeed(appData) {
  if (!appData || appData.bases.length !== 1) return false;
  const tasks = appData.bases[0].store.tasks;
  const seed = seedTasks().map((t) => t.title);
  return tasks.length === seed.length && tasks.every((t, i) => t.title === seed[i] && t.doneDates.length === 0 && !t.notes);
}
export function parseOpts(src) {
  const o = { height: 420, groupBy: "none", hideDone: false, groups: [], layout: "timeline", zoom: "day", cal: "month", view: "" };
  for (const line of src.split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (k === "height") o.height = clamp(Number(v) || 420, 200, 1200);
    else if (k === "group" && (v === "group" || v === "status" || v === "none")) o.groupBy = v;
    else if (k === "hidedone") o.hideDone = v === "true";
    else if (k === "filter") o.groups = v.split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "layout" && LAYOUTS.includes(v.toLowerCase())) o.layout = v.toLowerCase();
    else if (k === "view") o.view = v;
    else if (k === "calendar" && CAL_VIEWS.includes(v.toLowerCase())) o.cal = v.toLowerCase();
    else if (k === "zoom") {
      const z = v.toLowerCase().replace(/[\s-]/g, "");
      if (ZOOMS.includes(z)) o.zoom = z;
    }
  }
  return o;
}
