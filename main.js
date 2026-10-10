"use strict";
const __defProp = Object.defineProperty;
const __getOwnPropDesc = Object.getOwnPropertyDescriptor;
const __getOwnPropNames = Object.getOwnPropertyNames;
const __hasOwnProp = Object.prototype.hasOwnProperty;
const __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
const __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
const __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
const main_exports = {};
__export(main_exports, {
  default: () => RoutineTimelinePlugin
});
module.exports = __toCommonJS(main_exports);
const import_obsidian = require("obsidian");
const VIEW_TYPE = "routine-timeline";
const HOURS_W = 140;
const MIN_HOUR_W = 22;
const ROW_H = 44;
const HEAD_H = 34;
const SNAP = 15;
const DAY = 1440;
const SVG_NS = "http://www.w3.org/2000/svg";
const COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
const ZOOMS = ["hours", "day", "week", "biweek", "month", "quarter", "year", "5years"];
const ZOOM_LABEL = { hours: "Hours", day: "Day", week: "Week", biweek: "Bi-week", month: "Month", quarter: "Quarter", year: "Year", "5years": "5 Years" };
const ZOOM_MIN_DAY_W = { week: 90, biweek: 56, month: 28, quarter: 8, year: 2.4, "5years": 0.7 };
const LAYOUTS = ["table", "board", "timeline", "calendar"];
const LAYOUT_LABEL = { table: "Table", board: "Board", timeline: "Timeline", calendar: "Calendar" };
const CAL_VIEWS = ["day", "week", "month"];
const CAL_LABEL = { day: "Day", week: "Week", month: "Month" };
const HOUR_H = 44;
const LAYOUT_ICON = { table: "table", board: "layout-dashboard", timeline: "gantt-chart", calendar: "calendar" };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const hhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const parseHHMM = (s) => {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
};
const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
const hourLabelShort = (h) => `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;
const clockLabel = (min) => `${Math.floor(min / 60) % 12 || 12}:${String(min % 60).padStart(2, "0")} ${min < 720 ? "AM" : "PM"}`;
const dayIndex = (d, start) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start.getTime()) / 864e5);
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_LEN = 25;
const nthCache = /* @__PURE__ */ new Map();
const effUntil = (t) => {
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
const occurs = (t, d) => {
  if (t.date !== null) return t.date === ymd(d);
  if (t.days && !t.days.includes(d.getDay())) return false;
  const s = ymd(d);
  if (t.from && s < t.from) return false;
  const u = effUntil(t);
  return !(u && s > u);
};
const repeatLabel = (t) => {
  if (t.date !== null) return "Once";
  const base = !t.days || t.days.length === 7 ? "Every day" : [...t.days].sort((a, b) => a - b).map((n) => DOW[n]).join(", ");
  const end = t.count ? `, ${t.count}\xD7` : t.until ? `, until ${t.until}` : "";
  return base + end;
};
const STATUS_COLORS = { "not-started": "gray", "in-progress": "blue", done: "green" };
const EXTRA_STATUS_COLORS = ["purple", "orange", "pink", "yellow", "brown", "red"];
const defaultStatuses = () => [
  { id: "not-started", name: "Not started", done: false, color: "gray" },
  { id: "in-progress", name: "In progress", done: false, color: "blue" },
  { id: "done", name: "Done", done: true, color: "green" }
];
const cleanStatuses = (v) => {
  const seen = /* @__PURE__ */ new Set();
  const list = Array.isArray(v) ? v.filter((s) => s && typeof s.id === "string" && typeof s.name === "string" && s.name.trim() && !seen.has(s.id) && seen.add(s.id)).map((s, i) => ({ id: s.id, name: s.name.trim(), done: !!s.done, color: COLORS.includes(s.color) ? s.color : STATUS_COLORS[s.id] || EXTRA_STATUS_COLORS[i % EXTRA_STATUS_COLORS.length] })) : [];
  if (list.length === 0) return defaultStatuses();
  if (!list.some((s) => s.done)) list[list.length - 1].done = true;
  return list;
};
const PROP_KEYS = ["name", "status", "date", "start", "end", "duration", "group", "repeat", "after"];
const defaultProps = () => ({
  name: { label: "Name", visible: true },
  status: { label: "Status", visible: true },
  date: { label: "Date", visible: true },
  start: { label: "Start", visible: true },
  end: { label: "End", visible: true },
  duration: { label: "Duration (min)", visible: true },
  group: { label: "Group", visible: true },
  repeat: { label: "Repeat", visible: true },
  after: { label: "Comes after", visible: true }
});
const CUSTOM_TYPES = ["text", "number", "checkbox", "select", "date"];
const CUSTOM_LABEL = { text: "Text", number: "Number", checkbox: "Checkbox", select: "Select", date: "Date" };
const cleanProps = (v, order) => {
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
const doneStatus = (sts) => sts.find((s) => s.done) || sts[sts.length - 1];
const statusOf = (t, date, sts) => {
  const id = t.st && t.st[date];
  const hit = id ? sts.find((s) => s.id === id) : null;
  if (hit) return hit;
  return t.doneDates.includes(date) ? doneStatus(sts) : sts[0];
};
const withStatus = (t, date, status, sts) => {
  t.st = { ...t.st || {}, [date]: status.id };
  const done = status.done;
  t.doneDates = done ? t.doneDates.includes(date) ? t.doneDates : [...t.doneDates, date] : t.doneDates.filter((d) => d !== date);
};
const cleanDays = (v) => {
  const days = Array.isArray(v) ? [...new Set(v.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))] : [];
  return days.length > 0 && days.length < 7 ? days : null;
};
const parseYmd = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (min) => {
  const h = Math.floor(min / 60) % 24;
  return `${h % 12 || 12}:${pad(min % 60)} ${h < 12 ? "AM" : "PM"}`;
};
const groupLabel = (t) => t.group || "No group";
const curve = (x1, y1, x2, y2) => {
  const dx = Math.max(24, Math.abs(x2 - x1) * 0.5);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
};
const COLOR_OPS = ["eq", "neq", "contains", "empty", "notEmpty", "gt", "lt", "checked", "unchecked"];
const cleanColorRules = (v) => Array.isArray(v) ? v.filter((r) => r && typeof r === "object" && typeof r.key === "string" && r.key && COLOR_OPS.includes(r.op) && COLORS.includes(r.color)).map((r) => ({ id: typeof r.id === "string" && r.id ? r.id : uid(), key: r.key, op: r.op, value: typeof r.value === "string" ? r.value : "", color: r.color })) : [];
const CALC_OPS = ["countAll", "countValues", "countUnique", "countEmpty", "countNotEmpty", "percentEmpty", "percentNotEmpty", "sum", "average", "median", "min", "max", "range"];
const CALC_LABEL = { countAll: "Count all", countValues: "Count values", countUnique: "Count unique values", countEmpty: "Count empty", countNotEmpty: "Count not empty", percentEmpty: "Percent empty", percentNotEmpty: "Percent not empty", sum: "Sum", average: "Average", median: "Median", min: "Min", max: "Max", range: "Range" };
const cleanCalc = (v) => v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([, op]) => CALC_OPS.includes(op))) : {};
const defaultUi = () => ({ groupBy: "none", hideDone: false, groups: [], layout: "timeline", zoom: "day", cal: "month", sidebar: true, showTasks: true, sortKey: null, sortDir: "asc", colFilters: {}, frozenKey: null, wrapKeys: [], colorRules: [], calc: {} });
const cleanView = (v, fallbackName) => ({
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
  colFilters: v.colFilters && typeof v.colFilters === "object" ? Object.fromEntries(Object.entries(v.colFilters).filter(([, s]) => typeof s === "string" && s.trim())) : {},
  frozenKey: typeof v.frozenKey === "string" && v.frozenKey ? v.frozenKey : null,
  wrapKeys: Array.isArray(v.wrapKeys) ? v.wrapKeys.filter((k) => typeof k === "string") : [],
  // Highlight a row/bar by color when a property matches a rule. First matching rule wins.
  colorRules: cleanColorRules(v.colorRules),
  // Table-only: a calculation (sum, average, count, ...) shown in the footer under each column.
  calc: cleanCalc(v.calc)
});
const cleanFeeds = (v) => Array.isArray(v) ? v.filter((f) => f && typeof f.url === "string" && f.url.trim()).map((f) => ({
  id: typeof f.id === "string" && f.id ? f.id : uid(),
  name: typeof f.name === "string" && f.name.trim() ? f.name.trim() : "Calendar",
  url: f.url.trim(),
  color: COLORS.includes(f.color) ? f.color : "green",
  visible: f.visible !== false
})) : [];
const defaultStore = (tasks) => {
  const v = cleanView({ name: "Default view" }, "Default view");
  return { tasks, views: [v], activeView: v.id, statuses: defaultStatuses(), props: defaultProps(), propOrder: [...PROP_KEYS], feeds: [] };
};
function seedTasks() {
  const mk = (title, start, end, group, color, deps = []) => ({ id: uid(), title, start, end, date: null, days: null, from: null, until: null, count: null, custom: {}, notes: "", deps, group, color, doneDates: [], st: {} });
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
function normalize(raw) {
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
      st: t.st && typeof t.st === "object" && !Array.isArray(t.st) ? { ...t.st } : {}
    };
  });
  let views = Array.isArray(s.views) ? s.views.filter((v) => v && typeof v === "object").map((v, i) => cleanView(v, `View ${i + 1}`)) : [];
  if (views.length === 0) views = [cleanView({ ...s.ui || {}, name: "Default view" }, "Default view")];
  const activeView = views.some((v) => v.id === s.activeView) ? s.activeView : views[0].id;
  const pp = cleanProps(s.props, s.propOrder);
  return { tasks, views, activeView, statuses: cleanStatuses(s.statuses), props: pp.props, propOrder: pp.order, feeds: cleanFeeds(s.feeds) };
}
// A vault can hold several independent task databases ("bases"), each with its own tasks,
// properties, statuses and saved views - like separate Notion databases. The plugin's saved data
// is now a list of bases plus which one is active; `normalizeAppData` also upgrades data saved by
// older single-database versions of the plugin into a single base named "Routine".
function normalizeAppData(raw) {
  if (raw && Array.isArray(raw.bases) && raw.bases.length > 0) {
    const bases = raw.bases.filter((b) => b && typeof b === "object").map((b, i) => ({
      id: typeof b.id === "string" && b.id ? b.id : uid(),
      name: typeof b.name === "string" && b.name.trim() ? b.name.trim() : `Base ${i + 1}`,
      store: normalize(b.store) || defaultStore([])
    }));
    if (bases.length === 0) return null;
    const activeBaseId = bases.some((b) => b.id === raw.activeBaseId) ? raw.activeBaseId : bases[0].id;
    return { bases, activeBaseId };
  }
  const legacy = normalize(raw);
  if (!legacy) return null;
  const id = uid();
  return { bases: [{ id, name: "Routine", store: legacy }], activeBaseId: id };
}
function parseOpts(src) {
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
// ---- iCalendar (.ics) parsing and recurrence expansion for read-only calendar feeds
const icsUnfold = (text) => text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
const icsText = (s) => s.replace(/\\[nN]/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
function icsSplit(line) {
  let q = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') q = !q;
    else if (c === ":" && !q) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = [];
  let cur = "";
  q = false;
  for (const c of head) {
    if (c === '"') q = !q;
    if (c === ";" && !q) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  parts.push(cur);
  const params = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/"/g, "");
  }
  return { name: parts[0].toUpperCase(), params, value };
}
function tzOffsetMs(ms, tz) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const o = {};
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second) - Math.floor(ms / 1e3) * 1e3;
}
function wallToMs(w, kind, tz) {
  if (kind === "utc") return Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s);
  if (kind === "tz") {
    try {
      const guess = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s);
      const off = tzOffsetMs(guess, tz);
      let ms = guess - off;
      const off2 = tzOffsetMs(ms, tz);
      if (off2 !== off) ms = guess - off2;
      return ms;
    } catch (e) {
    }
  }
  return new Date(w.y, w.m - 1, w.d, w.h, w.mi, w.s).getTime();
}
function icsWhen(value, params) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/.exec(value.trim());
  if (!m) return null;
  const w = { y: +m[1], m: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0), s: +(m[6] || 0) };
  const allDay = params.VALUE === "DATE" || m[4] === void 0;
  const kind = allDay ? "local" : m[7] ? "utc" : params.TZID ? "tz" : "local";
  return { w, kind, tz: params.TZID, allDay, ms: wallToMs(w, kind, params.TZID) };
}
function parseIcs(text) {
  const events = [];
  let cur = null;
  for (const raw of icsUnfold(text)) {
    const line = raw.trim() === "" ? null : icsSplit(raw);
    if (!line) continue;
    if (line.name === "BEGIN" && line.value === "VEVENT") cur = { ex: [] };
    else if (line.name === "END" && line.value === "VEVENT") {
      if (cur && cur.start) events.push(cur);
      cur = null;
    } else if (cur) {
      const v = line.value;
      if (line.name === "UID") cur.uid = v;
      else if (line.name === "SUMMARY") cur.title = icsText(v);
      else if (line.name === "DESCRIPTION") cur.desc = icsText(v);
      else if (line.name === "LOCATION") cur.location = icsText(v);
      else if (line.name === "URL") cur.url = v;
      else if (line.name === "STATUS") cur.status = v.toUpperCase();
      else if (line.name === "DTSTART") cur.start = icsWhen(v, line.params);
      else if (line.name === "DTEND") cur.end = icsWhen(v, line.params);
      else if (line.name === "DURATION") cur.duration = v;
      else if (line.name === "RRULE") cur.rrule = v;
      else if (line.name === "RECURRENCE-ID") cur.recId = icsWhen(v, line.params);
      else if (line.name === "EXDATE") for (const x of v.split(",")) {
        const w = icsWhen(x, line.params);
        if (w) cur.ex.push(w.ms);
      }
    }
  }
  return events;
}
const WD = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
function icsDurationMs(s) {
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(s || "");
  if (!m) return 0;
  return (((+m[1] || 0) * 7 + (+m[2] || 0)) * 24 * 60 * 60 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60 + (+m[5] || 0)) * 1e3;
}
function parseRule(str) {
  const r = { byday: [], bymonthday: [], bymonth: [], interval: 1 };
  for (const part of str.split(";")) {
    const [k, v] = part.split("=");
    if (!v) continue;
    const K = k.toUpperCase();
    if (K === "FREQ") r.freq = v.toUpperCase();
    else if (K === "INTERVAL") r.interval = Math.max(1, parseInt(v, 10) || 1);
    else if (K === "COUNT") r.count = parseInt(v, 10);
    else if (K === "UNTIL") r.until = icsWhen(v, {});
    else if (K === "BYDAY") r.byday = v.split(",").map((x) => {
      const m = /^([+-]?\d+)?([A-Z]{2})$/.exec(x.toUpperCase());
      return m ? { n: m[1] ? parseInt(m[1], 10) : 0, wd: WD.indexOf(m[2]) } : null;
    }).filter((x) => x && x.wd >= 0);
    else if (K === "BYMONTHDAY") r.bymonthday = v.split(",").map((x) => parseInt(x, 10)).filter((x) => x);
    else if (K === "BYMONTH") r.bymonth = v.split(",").map((x) => parseInt(x, 10));
    else if (K === "WKST") r.wkst = WD.indexOf(v.toUpperCase());
  }
  return r;
}
const DAY_MS = 864e5;
const utcDay = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
const dayToYmd = (n) => {
  const d = new Date(n * DAY_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
};
const dowOfDay = (n) => (n % 7 + 11) % 7;
function monthDays(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function nthWeekday(y, m, wd, n) {
  const dim = monthDays(y, m);
  if (n > 0) {
    const first = dowOfDay(utcDay(y, m, 1));
    const d = 1 + (wd - first + 7) % 7 + (n - 1) * 7;
    return d <= dim ? d : null;
  }
  const last = dowOfDay(utcDay(y, m, dim));
  const d = dim - (last - wd + 7) % 7 + (n + 1) * 7;
  return d >= 1 ? d : null;
}
function ruleDays(ev, rule, fromDay, toDay, cap) {
  const s = ev.start.w;
  const startDay = utcDay(s.y, s.m, s.d);
  const out = [];
  const push = (n) => {
    if (n >= startDay) out.push(n);
  };
  const monthOk = (n) => !rule.bymonth.length || rule.bymonth.includes(dayToYmd(n).m);
  const limit = Math.min(toDay, rule.until ? utcDay(rule.until.w.y, rule.until.w.m, rule.until.w.d) : toDay);
  if (rule.freq === "DAILY") {
    for (let n = startDay, i = 0; n <= limit && i < cap; n += rule.interval, i++) {
      if ((!rule.byday.length || rule.byday.some((b) => b.wd === dowOfDay(n))) && monthOk(n)) push(n);
    }
  } else if (rule.freq === "WEEKLY") {
    const wkst = rule.wkst === void 0 || rule.wkst < 0 ? 1 : rule.wkst;
    const weekStart = startDay - (dowOfDay(startDay) - wkst + 7) % 7;
    const wds = rule.byday.length ? rule.byday.map((b) => b.wd) : [dowOfDay(startDay)];
    for (let w = weekStart, i = 0; w <= limit && i < cap; w += 7 * rule.interval, i++) {
      for (const wd of wds.map((x) => (x - wkst + 7) % 7).sort((a, b) => a - b)) {
        const n = w + wd;
        if (monthOk(n)) push(n);
      }
    }
  } else if (rule.freq === "MONTHLY" || rule.freq === "YEARLY") {
    const yearly = rule.freq === "YEARLY";
    const step = yearly ? 12 * rule.interval : rule.interval;
    let y = s.y;
    let m = s.m;
    for (let i = 0; i < cap; i++) {
      const months = yearly && rule.bymonth.length ? rule.bymonth : [m];
      const days = [];
      for (const mm of months) {
        if (rule.byday.length) {
          for (const b of rule.byday) {
            if (b.n) {
              const d = nthWeekday(y, mm, b.wd, b.n);
              if (d) days.push(utcDay(y, mm, d));
            } else {
              for (let d = 1; d <= monthDays(y, mm); d++) if (dowOfDay(utcDay(y, mm, d)) === b.wd) days.push(utcDay(y, mm, d));
            }
          }
        } else {
          const ds = rule.bymonthday.length ? rule.bymonthday : [s.d];
          for (const d of ds) {
            const dd = d < 0 ? monthDays(y, mm) + d + 1 : d;
            if (dd >= 1 && dd <= monthDays(y, mm)) days.push(utcDay(y, mm, dd));
          }
        }
      }
      let past = false;
      for (const n of days.sort((a, b) => a - b)) {
        if (n > limit) past = true;
        else push(n);
      }
      if (past || utcDay(y, m, 1) > limit) break;
      const tot = (y * 12 + (m - 1)) + step;
      y = Math.floor(tot / 12);
      m = tot % 12 + 1;
    }
  }
  return out;
}
function expandIcs(events, fromMs, toMs) {
  const out = [];
  const overrides = /* @__PURE__ */ new Map();
  for (const e of events) if (e.recId) overrides.set(`${e.uid}|${e.recId.ms}`, e);
  const mk = (e, startMs, endMs) => ({
    id: `${e.uid || e.title}|${startMs}`,
    title: e.title || "(no title)",
    start: startMs,
    end: endMs,
    allDay: e.start.allDay,
    location: e.location || "",
    desc: e.desc || "",
    url: e.url || ""
  });
  for (const e of events) {
    if (e.status === "CANCELLED") continue;
    const base = e.start;
    const dur = e.end ? Math.max(0, e.end.ms - base.ms) : e.duration ? icsDurationMs(e.duration) : base.allDay ? DAY_MS : 0;
    if (!e.rrule || e.recId) {
      if (base.ms < toMs && base.ms + Math.max(dur, 1) > fromMs) out.push(mk(e, base.ms, base.ms + dur));
      continue;
    }
    const rule = parseRule(e.rrule);
    const startDay = utcDay(base.w.y, base.w.m, base.w.d);
    const toDay = Math.floor(toMs / DAY_MS) + 2;
    let days = ruleDays(e, rule, 0, rule.count ? startDay + 3650 : toDay, 4e3);
    if (rule.count) days = days.slice(0, rule.count);
    for (const n of days) {
      if (n > toDay) break;
      const ymd2 = dayToYmd(n);
      const w = { ...base.w, y: ymd2.y, m: ymd2.m, d: ymd2.d };
      const startMs = wallToMs(w, base.kind, base.tz);
      if (e.ex.includes(startMs)) continue;
      if (rule.until && !base.allDay && startMs > rule.until.ms) continue;
      const ov = overrides.get(`${e.uid}|${startMs}`);
      if (ov) continue;
      if (startMs < toMs && startMs + Math.max(dur, 1) > fromMs) out.push(mk(e, startMs, startMs + dur));
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

const RoutineTimelinePlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    const id = uid();
    this.appData = { bases: [{ id, name: "Routine", store: defaultStore([]) }], activeBaseId: id };
    this.boards = /* @__PURE__ */ new Set();
    this.feedData = /* @__PURE__ */ new Map();
    this.expandCache = /* @__PURE__ */ new Map();
  }
  // `store` always reads/writes the currently active base, so the rest of the plugin (which reads
  // and writes `this.plugin.store.*` everywhere) doesn't need to know bases exist at all.
  get store() {
    const b = this.appData.bases.find((x) => x.id === this.appData.activeBaseId);
    return (b || this.appData.bases[0]).store;
  }
  set store(v) {
    const b = this.appData.bases.find((x) => x.id === this.appData.activeBaseId);
    (b || this.appData.bases[0]).store = v;
  }
  async onload() {
    const migrated = normalizeAppData(await this.loadData());
    if (migrated) {
      this.appData = migrated;
    } else {
      const id = uid();
      this.appData = { bases: [{ id, name: "Routine", store: defaultStore(seedTasks()) }], activeBaseId: id };
      await this.saveData(this.appData);
    }
    this.registerView(VIEW_TYPE, (leaf) => new TimelineView(leaf, this));
    this.addRibbonIcon("gantt-chart", "Open timeline view", () => void this.openView());
    this.addCommand({
      id: "open-view",
      name: "Open timeline view",
      callback: () => void this.openView()
    });
    this.addCommand({
      id: "switch-base",
      name: "Switch database",
      callback: () => new BaseSwitcherModal(this.app, this).open()
    });
    this.addCommand({
      id: "insert-block",
      name: "Insert timeline into note",
      editorCallback: (editor) => editor.replaceSelection("```routine-timeline\n```\n")
    });
    this.registerMarkdownCodeBlockProcessor("routine-timeline", (source, el, ctx) => {
      ctx.addChild(new BoardChild(el, this, parseOpts(source)));
    });
    this.addSettingTab(new RoutineSettingTab(this.app, this));
    window.setTimeout(() => void this.refreshFeeds(), 1500);
    this.registerInterval(window.setInterval(() => void this.refreshFeeds(), 30 * 60 * 1e3));
  }
  // ---- saved views (the tab bar) --------------------------------------------------
  activeView() {
    const s = this.store;
    return s.views.find((v) => v.id === s.activeView) || s.views[0];
  }
  uniqueViewName(base) {
    const names = new Set(this.store.views.map((v) => v.name.toLowerCase()));
    if (!names.has(base.toLowerCase())) return base;
    for (let i = 2; ; i++) if (!names.has(`${base} ${i}`.toLowerCase())) return `${base} ${i}`;
  }
  async setActiveView(id) {
    if (!this.store.views.some((v) => v.id === id)) return;
    this.store.activeView = id;
    for (const b of this.boards) {
      if (!b.opts.embedded) {
        b.initialScroll = true;
        b.selected.clear();
      }
    }
    await this.save();
  }
  async addView(layout) {
    const v = cleanView({ layout, name: this.uniqueViewName(LAYOUT_LABEL[layout]) });
    this.store.views.push(v);
    await this.setActiveView(v.id);
    return v;
  }
  async duplicateView(id) {
    const src = this.store.views.find((v) => v.id === id);
    if (!src) return;
    const v = cleanView({ ...src, id: "", name: this.uniqueViewName(`${src.name} copy`) });
    this.store.views.splice(this.store.views.indexOf(src) + 1, 0, v);
    await this.setActiveView(v.id);
  }
  async deleteView(id) {
    if (this.store.views.length <= 1) return;
    this.store.views = this.store.views.filter((v) => v.id !== id);
    if (this.store.activeView === id) this.store.activeView = this.store.views[0].id;
    for (const b of this.boards) if (b.embedViewId === id) b.embedViewId = null;
    await this.save();
  }
  async moveView(id, targetId, after) {
    const vs = this.store.views;
    const from = vs.findIndex((v) => v.id === id);
    if (from < 0 || id === targetId) return;
    const [m] = vs.splice(from, 1);
    let to = vs.findIndex((v) => v.id === targetId);
    if (to < 0) to = vs.length;
    vs.splice(after ? to + 1 : to, 0, m);
    await this.save();
  }
  // Move a table column (property) before or after another; Name always stays first.
  async moveProp(key, targetKey, after) {
    if (key === "name" || key === targetKey) return;
    const order = this.store.propOrder;
    const from = order.indexOf(key);
    if (from < 0) return;
    order.splice(from, 1);
    let to = order.indexOf(targetKey);
    if (to < 0) to = order.length;
    let at = after ? to + 1 : to;
    if (at < 1) at = 1;
    order.splice(at, 0, key);
    await this.save();
  }
  async renameView(id, name) {
    const v = this.store.views.find((x) => x.id === id);
    const n = name.trim();
    if (v && n) v.name = n;
    await this.save();
  }
  // ---- calendar feeds (read-only .ics, e.g. Google Calendar's secret iCal address) --
  async fetchFeed(feed) {
    const prev = this.feedData.get(feed.id);
    try {
      const res = await (0, import_obsidian.requestUrl)({ url: feed.url.replace(/^webcal:/i, "https:"), method: "GET" });
      this.feedData.set(feed.id, { events: parseIcs(res.text), fetched: Date.now(), error: "" });
    } catch (e) {
      this.feedData.set(feed.id, { events: prev ? prev.events : [], fetched: prev ? prev.fetched : 0, error: String(e && e.message || e) });
    }
    this.expandCache.clear();
  }
  async refreshFeeds() {
    if (this.store.feeds.length === 0) return;
    await Promise.all(this.store.feeds.map((f) => this.fetchFeed(f)));
    for (const b of this.boards) b.render();
  }
  eventsBetween(fromMs, toMs) {
    const out = [];
    for (const f of this.store.feeds) {
      const data = this.feedData.get(f.id);
      if (!f.visible || !data) continue;
      const key = `${f.id}|${data.fetched}|${fromMs}|${toMs}`;
      let list = this.expandCache.get(key);
      if (!list) {
        list = expandIcs(data.events, fromMs, toMs).map((e) => ({ ...e, feedId: f.id, color: f.color, feedName: f.name }));
        this.expandCache.set(key, list);
      }
      out.push(...list);
    }
    return out.sort((a, b) => a.start - b.start);
  }
  async addFeed(name, url, color) {
    const f = { id: uid(), name: name.trim() || "Calendar", url: url.trim(), color, visible: true };
    this.store.feeds.push(f);
    await this.saveData(this.appData);
    await this.fetchFeed(f);
    for (const b of this.boards) b.render();
  }
  async removeFeed(id) {
    this.store.feeds = this.store.feeds.filter((f) => f.id !== id);
    this.feedData.delete(id);
    this.expandCache.clear();
    await this.save();
  }
  async toggleFeed(id) {
    const f = this.store.feeds.find((x) => x.id === id);
    if (f) f.visible = !f.visible;
    await this.save();
  }
  async openView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }
  groupNames() {
    return [...new Set(this.store.tasks.map((t) => t.group).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }
  async save() {
    await this.saveData(this.appData);
    for (const b of this.boards) b.render();
  }
  // ---- databases ("bases"): separate task lists you switch between, like separate Notion
  // databases. Each embed and the main view always shows whichever base is currently active.
  baseList() {
    return this.appData.bases;
  }
  activeBase() {
    return this.appData.bases.find((b) => b.id === this.appData.activeBaseId) || this.appData.bases[0];
  }
  uniqueBaseName(base) {
    const names = new Set(this.appData.bases.map((b) => b.name.toLowerCase()));
    if (!names.has(base.toLowerCase())) return base;
    for (let i = 2; ; i++) if (!names.has(`${base} ${i}`.toLowerCase())) return `${base} ${i}`;
  }
  async createBase(name) {
    const store = defaultStore([]);
    store.views[0].layout = "table";
    const b = { id: uid(), name: this.uniqueBaseName(name && name.trim() ? name.trim() : "New database"), store };
    this.appData.bases.push(b);
    await this.switchBase(b.id);
    return b;
  }
  async switchBase(id) {
    if (!this.appData.bases.some((b) => b.id === id) || id === this.appData.activeBaseId) return;
    this.appData.activeBaseId = id;
    for (const b of this.boards) {
      if (!b.opts.embedded) {
        b.initialScroll = true;
        b.selected.clear();
      }
    }
    await this.save();
  }
  async renameBase(id, name) {
    const b = this.appData.bases.find((x) => x.id === id);
    const n = name.trim();
    if (!b || !n) return;
    b.name = this.uniqueBaseName(n);
    await this.save();
  }
  async deleteBase(id) {
    if (this.appData.bases.length <= 1) return;
    this.appData.bases = this.appData.bases.filter((b) => b.id !== id);
    if (this.appData.activeBaseId === id) this.appData.activeBaseId = this.appData.bases[0].id;
    await this.save();
  }
};
const TimelineView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.board = null;
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "Routine timeline";
  }
  getIcon() {
    return "gantt-chart";
  }
  async onOpen() {
    this.board = new TimelineBoard(this.plugin, this.contentEl, { embedded: false }, this.plugin.activeView());
    this.plugin.boards.add(this.board);
    this.board.render();
  }
  async onClose() {
    if (this.board) {
      this.plugin.boards.delete(this.board);
      this.board.destroy();
      this.board = null;
    }
  }
};
const BoardChild = class extends import_obsidian.MarkdownRenderChild {
  constructor(el, plugin, o) {
    super(el);
    this.plugin = plugin;
    this.o = o;
    this.board = null;
  }
  onload() {
    let ui = { groupBy: this.o.groupBy, hideDone: this.o.hideDone, groups: this.o.groups, layout: this.o.layout, zoom: this.o.zoom, cal: this.o.cal, sidebar: false, showTasks: true, sortKey: null, sortDir: "asc", colFilters: {}, frozenKey: null, wrapKeys: [], colorRules: [], calc: {} };
    if (this.o.view) {
      const v = this.plugin.store.views.find((x) => x.name.toLowerCase() === this.o.view.toLowerCase());
      if (v) ui = { ...v, groups: [...v.groups] };
    }
    this.board = new TimelineBoard(
      this.plugin,
      this.containerEl,
      { embedded: true, height: this.o.height },
      ui
    );
    this.board.embedViewId = ui.id || null;
    this.plugin.boards.add(this.board);
    this.board.render();
  }
  onunload() {
    if (this.board) {
      this.plugin.boards.delete(this.board);
      this.board.destroy();
      this.board = null;
    }
  }
};
const TimelineBoard = class {
  constructor(plugin, host, opts, ui) {
    this.plugin = plugin;
    this.host = host;
    this.opts = opts;
    this.ui = ui;
    this.day = /* @__PURE__ */ new Date();
    this.dayStr = ymd(/* @__PURE__ */ new Date());
    this.q = "";
    this.visible = [];
    this.layout = [];
    this.yCenter = /* @__PURE__ */ new Map();
    this.totalH = 0;
    this.bars = /* @__PURE__ */ new Map();
    this.barInstances = /* @__PURE__ */ new Map();
    this.scroller = null;
    this.rowsEl = null;
    this.svg = null;
    this.nowEl = null;
    this.initialScroll = true;
    this.pendingShift = false;
    this.X0 = 0;
    this.winStart = null;
    this.selectedId = null;
    this.selectedLink = null;
    this.collapsed = /* @__PURE__ */ new Set();
    this.hw = 96;
    this.sp = null;
    this.lastW = 0;
    this.offPanel = null;
    this.renameId = null;
    this.renameViewId = null;
    this.dragKind = null;
    this.embedViewId = null;
    this.peekId = null;
    this.peekDraft = null;
    this.offPeek = null;
    this.selCell = null;
    this.restoreCellFocus = false;
    this.clipboardCell = null;
    this.calTop = null;
    this.calLeft = 0;
    this.calNow = null;
    this.reopenPanel = false;
    this.settingsBtn = null;
    this.selected = /* @__PURE__ */ new Set();
    this.resizeTimer = 0;
    this.timer = window.setInterval(() => this.updateNow(), 6e4);
    if (opts.embedded) host.addEventListener("mousedown", (e) => e.stopPropagation());
    this.ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      const w = this.host.clientWidth;
      if (this.ui.layout !== "timeline" || !w || Math.abs(w - this.lastW) < 12) return;
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.render(), 120);
    });
    if (this.ro) this.ro.observe(host);
  }
  destroy() {
    window.clearInterval(this.timer);
    window.clearTimeout(this.resizeTimer);
    if (this.ro) this.ro.disconnect();
    if (this.offPanel) this.offPanel();
    if (this.offPeek) this.offPeek();
  }
  px(min) {
    return min / 60 * this.hw;
  }
  // ---- view geometry -----------------------------------------------------------
  isSpan() {
    return this.ui.layout === "timeline" && this.ui.zoom !== "hours" && this.ui.zoom !== "day";
  }
  availWidth() {
    return Math.max(300, (this.host.clientWidth || 900) - 2);
  }
  // Date range, column width and header cells for week / month / year style zooms.
  spanBase(d, forceW) {
    const z = this.ui.zoom;
    const y = d.getFullYear();
    const m = d.getMonth();
    let start;
    let end;
    if (z === "week" || z === "biweek") {
      start = new Date(y, m, d.getDate() - d.getDay());
      end = new Date(y, m, d.getDate() - d.getDay() + (z === "week" ? 7 : 14));
    } else if (z === "month") {
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 1);
    } else if (z === "quarter") {
      start = new Date(y, Math.floor(m / 3) * 3, 1);
      end = new Date(y, Math.floor(m / 3) * 3 + 3, 1);
    } else if (z === "year") {
      start = new Date(y, 0, 1);
      end = new Date(y + 1, 0, 1);
    } else {
      start = new Date(y, 0, 1);
      end = new Date(y + 5, 0, 1);
    }
    const n = dayIndex(end, start);
    const dayW = forceW || Math.max(ZOOM_MIN_DAY_W[z], this.availWidth() / n);
    const unit = z === "5years" ? "year" : z === "quarter" || z === "year" ? "month" : "day";
    const cells = [];
    if (unit === "day") {
      for (let i = 0; i < n; i++) {
        const c = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        let text = String(c.getDate());
        if (z === "week" || dayW >= 44) text = `${c.toLocaleDateString(void 0, { weekday: "short" })} ${c.getDate()}`;
        if (c.getDate() === 1) text = `${c.toLocaleDateString(void 0, { month: "short" })} 1`;
        cells.push({ left: i * dayW, width: dayW, text, today: ymd(c) === ymd(/* @__PURE__ */ new Date()) });
      }
    } else if (unit === "month") {
      const months = z === "quarter" ? 3 : 12;
      for (let i = 0; i < months; i++) {
        const c = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const next = new Date(c.getFullYear(), c.getMonth() + 1, 1);
        cells.push({
          left: dayIndex(c, start) * dayW,
          width: dayIndex(next, c) * dayW,
          text: c.toLocaleDateString(void 0, { month: z === "quarter" ? "long" : "short" }),
          today: false
        });
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const c = new Date(start.getFullYear() + i, 0, 1);
        const next = new Date(c.getFullYear() + 1, 0, 1);
        cells.push({ left: dayIndex(c, start) * dayW, width: dayIndex(next, c) * dayW, text: String(c.getFullYear()), today: false });
      }
    }
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
    const fmtD = (x, o) => x.toLocaleDateString(void 0, o);
    let label;
    if (z === "week" || z === "biweek") label = `${fmtD(start, { month: "short", day: "numeric" })} – ${fmtD(last, { month: "short", day: "numeric", year: "numeric" })}`;
    else if (z === "month") label = fmtD(start, { month: "long", year: "numeric" });
    else if (z === "quarter") label = `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
    else if (z === "year") label = String(start.getFullYear());
    else label = `${start.getFullYear()} – ${last.getFullYear()}`;
    return { start, n, dayW, total: n * dayW, cells, label, startStr: ymd(start), endStr: ymd(end) };
  }
  // The visible range is three periods wide (previous, current, next) so you can scroll on into the past and future.
  spanInfo() {
    const cur = this.spanBase(this.day);
    const dayW = cur.dayW;
    const prev = this.spanBase(this.stepOf(this.day, -1), dayW);
    const next = this.spanBase(this.stepOf(this.day, 1), dayW);
    const start = prev.start;
    const cells = [];
    for (const part of [prev, cur, next]) {
      const off = dayIndex(part.start, start) * dayW;
      for (const c of part.cells) cells.push({ ...c, left: c.left + off });
    }
    const n = prev.n + cur.n + next.n;
    return { start, n, dayW, total: n * dayW, cells, label: cur.label, startStr: prev.startStr, endStr: next.endStr, i0: prev.n, n0: cur.n };
  }
  statusKey(t) {
    return t.date !== null ? t.date : this.sp ? ymd(/* @__PURE__ */ new Date()) : this.dayStr;
  }
  isDone(t) {
    return t.doneDates.includes(this.statusKey(t));
  }
  statusOf(t) {
    return statusOf(t, this.statusKey(t), this.plugin.store.statuses);
  }
  async toggleDone(t, on, dayKey = this.dayStr) {
    const sts = this.plugin.store.statuses;
    withStatus(t, dayKey, on ? doneStatus(sts) : sts[0], sts);
    await this.plugin.save();
  }
  // ---- data for the current day -------------------------------------------------
  compute() {
    var _a;
    const dayStr = this.dayStr;
    const q = this.q.trim().toLowerCase();
    const ui = this.ui;
    const sp = this.sp;
    const dy = this.day;
    const near = [-1, 0, 1].map((k) => new Date(dy.getFullYear(), dy.getMonth(), dy.getDate() + k));
    const dayTimeline = this.ui.layout === "timeline" && !sp;
    const inRange = sp ? (t) => t.date === null || t.date >= sp.startStr && t.date < sp.endStr : dayTimeline ? (t) => near.some((x) => occurs(t, x)) : (t) => occurs(t, this.day);
    const byIdAll = new Map(this.plugin.store.tasks.map((x) => [x.id, x]));
    this.byIdAll = byIdAll;
    const taskIndex = new Map(this.plugin.store.tasks.map((x, i) => [x.id, i]));
    const colFilters = ui.layout === "table" ? Object.entries(ui.colFilters || {}) : [];
    this.visible = this.plugin.store.tasks.filter(inRange).filter((t) => !ui.hideDone || !this.isDone(t)).filter((t) => ui.groups.length === 0 || ui.groups.includes(groupLabel(t))).filter((t) => !q || t.title.toLowerCase().includes(q)).filter((t) => colFilters.every(([k, needle]) => String(this.cellValue(t, k, byIdAll)).toLowerCase().includes(needle.toLowerCase()))).sort((a, b) => {
      // Row order must not depend on which of the three visible days is "selected" (this.day), or
      // rows reshuffle mid-scroll as the edge-watcher pages to a neighbour. Order by time of day only.
      // The Table layout's column Sort overrides this, since its rows have no "day" concept.
      if (ui.layout === "table") {
        if (ui.sortKey) {
          const va = this.cellValue(a, ui.sortKey, byIdAll);
          const vb = this.cellValue(b, ui.sortKey, byIdAll);
          const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
          if (cmp) return ui.sortDir === "desc" ? -cmp : cmp;
          return 0;
        }
        // No column sort: keep the task list's own order (new rows stay appended at the end)
        // rather than ordering by start time, which would scatter new rows wherever their
        // default time falls.
        return 0;
      }
      const byDate = sp ? (a.date || "").localeCompare(b.date || "") : 0;
      // Tasks tied on date/start/end keep the order they were created in (newest last), instead
      // of alphabetical, so a newly added task lands below its same-time siblings as expected.
      return byDate || a.start - b.start || a.end - b.end || taskIndex.get(a.id) - taskIndex.get(b.id);
    });
    this.layout = [];
    this.yCenter.clear();
    let y = 0;
    const pushTask = (t) => {
      this.layout.push({ kind: "task", t });
      this.yCenter.set(t.id, y + ROW_H / 2);
      y += ROW_H;
    };
    if (ui.groupBy === "none") {
      this.visible.forEach(pushTask);
    } else {
      const sts = this.plugin.store.statuses;
      const keyOf = (t) => ui.groupBy === "group" ? groupLabel(t) : this.statusOf(t).name;
      const buckets = /* @__PURE__ */ new Map();
      for (const t of this.visible) {
        const k = keyOf(t);
        const list = buckets.get(k);
        if (list) list.push(t);
        else buckets.set(k, [t]);
      }
      const order = (k) => ui.groupBy === "status" ? sts.findIndex((s) => s.name === k) : k === "No group" ? 1 : 0;
      const keys = [...buckets.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
      for (const k of keys) {
        const list = (_a = buckets.get(k)) != null ? _a : [];
        const key = `${ui.groupBy}:${k}`;
        this.layout.push({ kind: "head", key, label: k, count: list.length });
        y += HEAD_H;
        if (!this.collapsed.has(key)) list.forEach(pushTask);
      }
    }
    this.totalH = y;
    // The Timeline canvas shows yesterday/today/tomorrow side by side so scrolling across midnight
    // feels continuous. Sharing one row per task across all three days used to leave a blank row
    // wherever a task didn't occur that particular day (its only bar sat in a neighbour column,
    // maybe scrolled out of view). Each day now packs its own tasks into rows independently, so a
    // given day's column is always gapless, and a day's packing never depends on `this.day` (which
    // of the three columns is "selected"), so paging across the boundary can't reshuffle anything.
    this.dayCols = null;
    if (dayTimeline && ui.groupBy === "none") {
      const doneOn = (t2, d) => t2.doneDates.includes(t2.date !== null ? t2.date : ymd(d));
      const cols = [-1, 0, 1].map((k) => {
        const d = near[k + 1];
        const items = this.plugin.store.tasks.filter((t2) => occurs(t2, d)).filter((t2) => !ui.hideDone || !doneOn(t2, d)).filter((t2) => ui.groups.length === 0 || ui.groups.includes(groupLabel(t2))).filter((t2) => !q || t2.title.toLowerCase().includes(q)).sort((a, b) => a.start - b.start || a.end - b.end || taskIndex.get(a.id) - taskIndex.get(b.id));
        return { k, day: d, items };
      });
      for (const col of cols) {
        col.items.forEach((t2, i) => {
          this.yCenter.set(`${t2.id}:${col.k}`, i * ROW_H + ROW_H / 2);
          if (col.k === 0) this.yCenter.set(t2.id, i * ROW_H + ROW_H / 2);
        });
      }
      this.dayCols = cols;
      this.totalH = Math.max(0, ...cols.map((c) => c.items.length * ROW_H));
    }
  }
  // ---- rendering ---------------------------------------------------------------
  render() {
    var _a, _b, _c, _d, _e, _f;
    const host = this.host;
    const search = host.querySelector(".rt-search");
    const refocus = !!search && document.activeElement === search;
    const caret = (_a = search == null ? void 0 : search.selectionStart) != null ? _a : 0;
    const ae = document.activeElement;
    this.restoreCellFocus = !!(ae && host.contains(ae) && ae.closest && ae.closest("td[data-col]"));
    const calScroll = host.querySelector(".rt-cal-scroll");
    if (calScroll) {
      this.calTop = calScroll.scrollTop;
      this.calLeft = calScroll.scrollLeft;
    }
    this.calNow = null;
    if (!this.opts.embedded) this.ui = this.plugin.activeView();
    const prev = host.querySelector(".rt-scroll, .rt-body");
    const prevLeft = (_c = prev == null ? void 0 : prev.scrollLeft) != null ? _c : 0;
    const prevTop = (_e = prev == null ? void 0 : prev.scrollTop) != null ? _e : 0;
    if (this.offPanel) this.offPanel();
    if (this.offPeek) this.offPeek();
    host.empty();
    host.addClass("rt-root");
    host.toggleClass("is-embedded", this.opts.embedded);
    if (this.opts.embedded) host.style.height = `${(_f = this.opts.height) != null ? _f : 420}px`;
    this.dayStr = ymd(this.day);
    this.lastW = host.clientWidth;
    this.scroller = null;
    this.bars.clear();
    this.barInstances.clear();
    this.sp = this.isSpan() ? this.spanInfo() : null;
    this.hw = this.ui.zoom === "hours" ? HOURS_W : Math.max(MIN_HOUR_W, Math.floor(this.availWidth() / 24));
    this.X0 = this.sp ? 0 : this.hw * 24;
    const oldWin = this.winStart;
    const dd = this.day;
    this.winStart = this.sp ? this.sp.start : new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 1);
    this.compute();
    this.renderTabs(host);
    this.renderToolbar(host);
    if (this.reopenPanel) {
      this.reopenPanel = false;
      this.togglePanel(this.settingsBtn);
    }
    const layout = this.ui.layout;
    if (layout === "table") this.renderTable(host);
    else if (layout === "board") this.renderBoard(host);
    else if (layout === "calendar") this.renderCalendar(host);
    else if (this.sp) this.renderSpan(host);
    else this.renderCanvas(host);
    if (this.peekId) this.renderPeek(host);
    const s = host.querySelector(".rt-search");
    if (refocus && s) {
      s.focus();
      s.setSelectionRange(caret, caret);
    }
    const scroller = this.scroller || host.querySelector(".rt-body");
    if (!scroller) return;
    if (this.initialScroll) {
      this.initialScroll = false;
      const n = /* @__PURE__ */ new Date();
      let left = 0;
      if (this.sp) {
        const i = dayIndex(n, this.sp.start);
        left = i >= this.sp.i0 && i < this.sp.i0 + this.sp.n0 ? Math.max(0, i * this.sp.dayW - 60) : this.sp.i0 * this.sp.dayW;
      } else if (this.scroller) {
        const startHour = this.dayStr === ymd(n) ? Math.max(0, n.getHours() - 1) : 6;
        left = this.X0 + startHour * this.hw;
      }
      window.requestAnimationFrame(() => scroller.scrollLeft = left);
    } else if (this.pendingShift && this.scroller && oldWin) {
      this.pendingShift = false;
      const w = this.sp ? this.sp.dayW : this.hw * 24;
      scroller.scrollLeft = prevLeft + dayIndex(oldWin, this.winStart) * w;
      scroller.scrollTop = prevTop;
    } else {
      scroller.scrollLeft = prevLeft;
      scroller.scrollTop = prevTop;
    }
  }
  tool(parent, icon, label, active) {
    const b = parent.createEl("button", { cls: "rt-tool" });
    b.toggleClass("is-active", active);
    (0, import_obsidian.setIcon)(b.createSpan(), icon);
    b.createSpan({ text: label });
    return b;
  }
  renderToolbar(host) {
    const dayStr = this.dayStr;
    const head = host.createDiv("rt-head");
    if (this.ui.layout === "calendar") {
      const sb = head.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Toggle calendar sidebar" } });
      (0, import_obsidian.setIcon)(sb, "panel-left");
      sb.toggleClass("is-active", !!this.ui.sidebar);
      sb.onclick = () => {
        this.ui.sidebar = !this.ui.sidebar;
        this.uiChanged();
      };
    }
    const nav = head.createDiv("rt-nav");
    const unitName = this.ui.layout === "calendar" ? this.ui.cal : this.sp ? ZOOM_LABEL[this.ui.zoom].toLowerCase() : "day";
    const prev = nav.createEl("button", { cls: "clickable-icon", attr: { "aria-label": `Previous ${unitName}` } });
    (0, import_obsidian.setIcon)(prev, "chevron-left");
    prev.onclick = () => this.shift(-1);
    const today = nav.createEl("button", { text: "Today" });
    today.onclick = () => {
      this.day = /* @__PURE__ */ new Date();
      this.initialScroll = true;
      this.render();
    };
    const next = nav.createEl("button", { cls: "clickable-icon", attr: { "aria-label": `Next ${unitName}` } });
    (0, import_obsidian.setIcon)(next, "chevron-right");
    next.onclick = () => this.shift(1);
    head.createDiv({
      cls: "rt-date",
      text: this.ui.layout === "calendar" ? this.calLabel() : this.sp ? this.sp.label : this.day.toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" })
    });
    if (this.ui.layout === "calendar") {
      const cb = head.createEl("button", { cls: "rt-tool" });
      cb.createSpan({ text: CAL_LABEL[this.ui.cal] });
      (0, import_obsidian.setIcon)(cb.createSpan(), "chevron-down");
      cb.setAttribute("aria-label", "Calendar range");
      cb.onclick = (ev) => {
        const menu = new import_obsidian.Menu();
        for (const c of CAL_VIEWS) {
          menu.addItem((i) => i.setTitle(CAL_LABEL[c]).setChecked(this.ui.cal === c).onClick(() => {
            this.ui.cal = c;
            this.calTop = null;
            this.uiChanged();
          }));
        }
        menu.showAtMouseEvent(ev);
      };
    }
    if (this.ui.layout === "timeline") {
      const zb = head.createEl("button", { cls: "rt-tool" });
      zb.createSpan({ text: ZOOM_LABEL[this.ui.zoom] });
      (0, import_obsidian.setIcon)(zb.createSpan(), "chevron-down");
      zb.setAttribute("aria-label", "Timeline zoom");
      zb.onclick = (ev) => this.zoomMenu(ev);
    }
    if (!this.sp && this.ui.layout !== "calendar") {
      const dayTasks = this.plugin.store.tasks.filter((t) => occurs(t, this.day));
      const done = dayTasks.filter((t) => t.doneDates.includes(dayStr)).length;
      head.createDiv({ cls: "rt-count", text: `${done}/${dayTasks.length} done` });
    }
    const search = head.createEl("input", {
      cls: "rt-search",
      type: "search",
      attr: { placeholder: "Search tasks" }
    });
    search.value = this.q;
    search.oninput = () => {
      this.q = search.value;
      this.render();
    };
    const ui = this.ui;
    const filterOn = ui.hideDone || ui.groups.length > 0;
    this.tool(head, "list-filter", "Filter", filterOn).onclick = (ev) => this.filterMenu(ev);
    const pr = this.plugin.store.props;
    const groupName = { none: pr.group.label, group: `By ${pr.group.label.toLowerCase()}`, status: `By ${pr.status.label.toLowerCase()}` }[ui.groupBy];
    if (ui.layout !== "board" && ui.layout !== "calendar") this.tool(head, "layout-list", groupName, ui.groupBy !== "none").onclick = (ev) => this.groupMenu(ev);
    const settings = head.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "View settings" } });
    this.settingsBtn = settings;
    (0, import_obsidian.setIcon)(settings, "sliders-horizontal");
    settings.onclick = (ev) => {
      ev.stopPropagation();
      this.togglePanel(settings);
    };
  }
  // The view tabs (Default view | Timeline | + ), like Notion's.
  renderTabs(host) {
    const store = this.plugin.store;
    const activeId = this.opts.embedded ? this.embedViewId : store.activeView;
    const bar = host.createDiv("rt-tabs");
    if (!this.opts.embedded) {
      const baseBtn = bar.createDiv("rt-base-btn");
      (0, import_obsidian.setIcon)(baseBtn.createSpan({ cls: "rt-base-btn-icon" }), "database");
      baseBtn.createSpan({ cls: "rt-base-btn-name", text: this.plugin.activeBase().name });
      baseBtn.setAttribute("aria-label", "Switch database");
      baseBtn.onclick = (ev) => this.baseMenu(ev);
    }
    for (const v of store.views) {
      const tab = bar.createDiv("rt-tab");
      tab.toggleClass("is-active", v.id === activeId);
      (0, import_obsidian.setIcon)(tab.createSpan({ cls: "rt-tab-icon" }), LAYOUT_ICON[v.layout]);
      if (this.renameViewId === v.id) {
        const inp = tab.createEl("input", { type: "text", cls: "rt-tab-input" });
        inp.value = v.name;
        let finished = false;
        const finish = async (save) => {
          if (finished) return;
          finished = true;
          this.renameViewId = null;
          if (save && inp.value.trim() && inp.value.trim() !== v.name) await this.plugin.renameView(v.id, inp.value);
          else this.render();
        };
        inp.onkeydown = (e) => {
          e.stopPropagation();
          if (e.key === "Enter") void finish(true);
          else if (e.key === "Escape") void finish(false);
        };
        inp.onblur = () => void finish(true);
        inp.onclick = (e) => e.stopPropagation();
        window.requestAnimationFrame(() => {
          inp.focus();
          inp.select();
        });
      } else {
        tab.createSpan({ cls: "rt-tab-name", text: v.name });
      }
      if (this.renameViewId !== v.id) this.makeSortable(tab, "view", v.id, (dragged, after) => void this.plugin.moveView(dragged, v.id, after));
      tab.onclick = (e) => {
        if (this.renameViewId) return;
        if (v.id === activeId) this.viewMenu(e, v, true);
        else if (this.opts.embedded) this.adoptView(v);
        else void this.plugin.setActiveView(v.id);
      };
      tab.ondblclick = () => {
        this.renameViewId = v.id;
        this.render();
      };
      tab.oncontextmenu = (e) => {
        e.preventDefault();
        this.viewMenu(e, v, v.id === activeId);
      };
    }
    const add = bar.createEl("button", { cls: "clickable-icon rt-tab-add", attr: { "aria-label": "Add a view" } });
    (0, import_obsidian.setIcon)(add, "plus");
    add.onclick = (ev) => {
      const menu = new import_obsidian.Menu();
      for (const l of LAYOUTS) {
        menu.addItem(
          (i) => i.setTitle(LAYOUT_LABEL[l]).setIcon(LAYOUT_ICON[l]).onClick(async () => {
            const nv = await this.plugin.addView(l);
            if (this.opts.embedded && nv) this.adoptView(nv);
          })
        );
      }
      menu.showAtMouseEvent(ev);
    };
  }
  // Drag to reorder: wires drag events on an element; `onDrop(after)` runs when something of `kind` is dropped on it.
  makeSortable(el, kind, id, onDrop) {
    el.draggable = true;
    el.addEventListener("dragstart", (e) => {
      this.dragKind = kind;
      if (e.dataTransfer) {
        e.dataTransfer.setData("text/plain", `${kind}:${id}`);
        e.dataTransfer.effectAllowed = "move";
      }
      el.addClass("is-dragging");
    });
    const clear = () => {
      el.removeClass("is-drop-before");
      el.removeClass("is-drop-after");
    };
    el.addEventListener("dragend", () => {
      this.dragKind = null;
      el.removeClass("is-dragging");
      this.host.querySelectorAll(".is-drop-before, .is-drop-after").forEach((x) => {
        x.removeClass("is-drop-before");
        x.removeClass("is-drop-after");
      });
    });
    el.addEventListener("dragover", (e) => {
      if (this.dragKind !== kind) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      el.toggleClass("is-drop-before", !after);
      el.toggleClass("is-drop-after", after);
    });
    el.addEventListener("dragleave", clear);
    el.addEventListener("drop", (e) => {
      if (this.dragKind !== kind) return;
      e.preventDefault();
      const data = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
      const r = el.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      clear();
      const dragged = data.startsWith(`${kind}:`) ? data.slice(kind.length + 1) : "";
      if (dragged && dragged !== id) onDrop(dragged, after);
    });
  }
  // Inside a note, a tab copies that saved view's settings into this block.
  adoptView(v) {
    this.ui = { ...v, groups: [...v.groups] };
    this.embedViewId = v.id;
    this.initialScroll = true;
    this.calTop = null;
    this.render();
  }
  // Like Notion's tab menu: rename, display as, edit view, duplicate, delete.
  viewMenu(ev, v, active) {
    const menu = new import_obsidian.Menu();
    menu.addItem((i) => i.setTitle("Rename").setIcon("pencil").onClick(() => {
      this.renameViewId = v.id;
      this.render();
    }));
    if (active) {
      menu.addSeparator();
      menu.addItem((i) => i.setTitle("Display as").setDisabled(true));
      for (const l of LAYOUTS) {
        menu.addItem(
          (i) => i.setTitle(LAYOUT_LABEL[l]).setIcon(LAYOUT_ICON[l]).setChecked(this.ui.layout === l).onClick(() => {
            this.ui.layout = l;
            this.initialScroll = true;
            this.uiChanged();
          })
        );
      }
      menu.addItem((i) => i.setTitle("Edit view").setIcon("sliders-horizontal").onClick(() => {
        this.reopenPanel = true;
        this.render();
      }));
      menu.addSeparator();
    }
    menu.addItem((i) => i.setTitle("Duplicate view").setIcon("copy").onClick(() => void this.plugin.duplicateView(v.id)));
    menu.addItem(
      (i) => i.setTitle("Delete view").setIcon("trash-2").setDisabled(this.plugin.store.views.length <= 1).onClick(
        () => new ConfirmModal(this.app(), `Delete view "${v.name}"?`, "Your tasks are not affected, only this view's settings.", async () => {
          await this.plugin.deleteView(v.id);
        }).open()
      )
    );
    menu.showAtMouseEvent(ev);
  }
  zoomMenu(ev) {
    const menu = new import_obsidian.Menu();
    for (const z of ZOOMS) {
      menu.addItem(
        (i) => i.setTitle(ZOOM_LABEL[z]).setChecked(this.ui.zoom === z).onClick(() => {
          this.ui.zoom = z;
          this.initialScroll = true;
          this.uiChanged();
        })
      );
    }
    menu.showAtMouseEvent(ev);
  }
  // Notion-style "View settings" popover: pick the layout (Table / Board / Timeline).
  togglePanel(anchor) {
    if (this.offPanel) {
      this.offPanel();
      return;
    }
    const panel = this.host.createDiv("rt-panel");
    const top = panel.createDiv("rt-panel-top");
    top.createSpan({ cls: "rt-panel-title", text: "View settings" });
    const close = top.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Close" } });
    (0, import_obsidian.setIcon)(close, "x");
    panel.createDiv({ cls: "rt-panel-label", text: "Layout" });
    const tiles = panel.createDiv("rt-tiles");
    for (const l of LAYOUTS) {
      const tile = tiles.createEl("button", { cls: "rt-tile" });
      tile.toggleClass("is-on", this.ui.layout === l);
      (0, import_obsidian.setIcon)(tile.createSpan(), LAYOUT_ICON[l]);
      tile.createSpan({ text: LAYOUT_LABEL[l] });
      tile.onclick = () => {
        if (this.ui.layout !== l) {
          this.ui.layout = l;
          this.initialScroll = true;
          this.uiChanged();
        } else if (this.offPanel) this.offPanel();
      };
    }
    panel.createDiv({ cls: "rt-panel-label rt-panel-gap", text: "Conditional color" });
    const colorBtn = panel.createEl("button", { cls: "rt-addprop" });
    (0, import_obsidian.setIcon)(colorBtn.createSpan(), "palette");
    const n = this.ui.colorRules.length;
    colorBtn.createSpan({ text: n ? `${n} rule${n > 1 ? "s" : ""}` : "Add rule" });
    colorBtn.onclick = (ev) => this.colorRuleMenu(ev);
    const outside = (e) => {
      const target = e.target;
      if (!panel.contains(target) && !anchor.contains(target)) off();
    };
    const off = () => {
      document.removeEventListener("pointerdown", outside, true);
      panel.remove();
      this.offPanel = null;
    };
    close.onclick = off;
    document.addEventListener("pointerdown", outside, true);
    this.offPanel = off;
  }
  uiChanged() {
    if (this.opts.embedded) this.render();
    else void this.plugin.save();
  }
  // A quick dropdown to switch databases without leaving the view; "Manage databases..." opens the
  // full picker for renaming, deleting or creating one.
  baseMenu(ev) {
    const menu = new import_obsidian.Menu();
    for (const b of this.plugin.baseList()) {
      menu.addItem(
        (i) => i.setTitle(b.name).setIcon("database").setChecked(b.id === this.plugin.appData.activeBaseId).onClick(() => void this.plugin.switchBase(b.id))
      );
    }
    menu.addSeparator();
    menu.addItem((i) => i.setTitle("Manage databases…").setIcon("sliders-horizontal").onClick(() => new BaseSwitcherModal(this.app(), this.plugin).open()));
    menu.showAtMouseEvent(ev);
  }
  filterMenu(ev) {
    const ui = this.ui;
    const menu = new import_obsidian.Menu();
    menu.addItem(
      (i) => i.setTitle("Hide completed").setChecked(ui.hideDone).onClick(() => {
        ui.hideDone = !ui.hideDone;
        this.uiChanged();
      })
    );
    const groups = [...this.plugin.groupNames(), "No group"];
    menu.addSeparator();
    for (const g of groups) {
      menu.addItem(
        (i) => i.setTitle(g).setChecked(ui.groups.includes(g)).onClick(() => {
          ui.groups = ui.groups.includes(g) ? ui.groups.filter((x) => x !== g) : [...ui.groups, g];
          this.uiChanged();
        })
      );
    }
    if (ui.hideDone || ui.groups.length) {
      menu.addSeparator();
      menu.addItem(
        (i) => i.setTitle("Clear filters").onClick(() => {
          ui.hideDone = false;
          ui.groups = [];
          this.uiChanged();
        })
      );
    }
    menu.showAtMouseEvent(ev);
  }
  groupMenu(ev) {
    const ui = this.ui;
    const menu = new import_obsidian.Menu();
    const options = [
      ["none", "No grouping"],
      ["group", this.plugin.store.props.group.label],
      ["status", this.plugin.store.props.status.label]
    ];
    for (const [value, title] of options) {
      menu.addItem(
        (i) => i.setTitle(title).setChecked(ui.groupBy === value).onClick(() => {
          ui.groupBy = value;
          this.uiChanged();
        })
      );
    }
    menu.showAtMouseEvent(ev);
  }
  renderCanvas(host) {
    const scroller = host.createDiv("rt-scroll");
    this.scroller = scroller;
    scroller.addEventListener("click", (e) => {
      if (e.target.closest(".rt-bar")) return;
      if (this.selectedId || this.selectedLink) {
        this.selectedLink = null;
        this.select(null);
        this.drawDeps();
      }
    });
    const canvas = scroller.createDiv("rt-canvas");
    const dayPx = this.hw * 24;
    canvas.style.width = `${dayPx * 3}px`;
    canvas.style.backgroundSize = `${this.hw}px 100%`;
    // Yesterday, today and tomorrow side by side: keep scrolling to move on to the next day.
    for (const k of [0, 2]) {
      const shade = canvas.createDiv("rt-dayshade");
      shade.style.left = `${k * dayPx}px`;
      shade.style.width = `${dayPx}px`;
    }
    for (const k of [1, 2]) {
      const line = canvas.createDiv("rt-vline is-day");
      line.style.left = `${k * dayPx}px`;
    }
    const hours = canvas.createDiv("rt-hours");
    const step = this.hw >= 40 ? 1 : 2;
    const todayKey = ymd(/* @__PURE__ */ new Date());
    for (let g = 0; g < 72; g++) {
      const h = g % 24;
      const k = Math.floor(g / 24) - 1;
      let label = h % step !== 0 ? "" : this.hw >= 50 ? hourLabel(h) : hourLabelShort(h);
      let isToday = false;
      if (h === 0) {
        const dt = new Date(this.day.getFullYear(), this.day.getMonth(), this.day.getDate() + k);
        label = dt.toLocaleDateString(void 0, { weekday: "short", day: "numeric" });
        isToday = ymd(dt) === todayKey;
      }
      const cell = hours.createDiv({ cls: "rt-hour", text: label });
      cell.toggleClass("is-today", isToday);
      cell.toggleClass("is-daystart", h === 0);
      cell.style.left = `${g * this.hw}px`;
      cell.style.width = `${this.hw}px`;
    }
    this.watchEdges(scroller);
    const rows = canvas.createDiv("rt-rows");
    this.rowsEl = rows;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.classList.add("rt-deps");
    rows.appendChild(svg);
    this.svg = svg;
    if (this.dayCols) {
      let any = false;
      for (const col of this.dayCols) {
        col.items.forEach((t, i) => {
          any = true;
          this.renderDayBar(rows, t, col.k, i);
        });
      }
      rows.style.height = `${this.totalH}px`;
      if (!any) rows.createDiv({ cls: "rt-empty", text: "No tasks match. Use New to add one." });
    } else {
      for (const item of this.layout) {
        if (item.kind === "head") this.renderHead(rows, item);
        else this.renderTask(rows, item.t);
      }
      if (this.layout.length === 0) {
        rows.createDiv({ cls: "rt-empty", text: "No tasks match. Use New to add one." });
      }
    }
    const add = canvas.createDiv("rt-new");
    const addBtn = add.createEl("button", { cls: "rt-new-btn" });
    (0, import_obsidian.setIcon)(addBtn.createSpan(), "plus");
    addBtn.createSpan({ text: "New" });
    addBtn.onclick = () => this.addTask();
    this.enableHoverAdd(canvas, rows);
    this.nowEl = canvas.createDiv("rt-now");
    this.updateNow();
    this.drawDeps();
  }
  // Hover an empty spot of the grid: a dashed 25-minute block shows at the start of that hour. Click it to add a task there.
  enableHoverAdd(canvas, rows) {
    const ghost = canvas.createDiv("rt-ghost");
    ghost.style.display = "none";
    let hour = null;
    const skip = (t) => t.closest(".rt-bar, .rt-hours, .rt-new, .rt-ghead, .rt-empty, button, .rt-dot") || (t.closest(".rt-deps") && t.tagName !== "svg");
    const at = (e) => {
      if (skip(e.target)) return null;
      const r = canvas.getBoundingClientRect();
      const rr = rows.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - rr.top;
      if (y < 0 || x < 0) return null;
      const g = Math.min(71, Math.floor(x / this.hw));
      return { h: g % 24, g, k: Math.floor(g / 24) - 1, row: Math.floor(y / ROW_H) };
    };
    canvas.addEventListener("mousemove", (e) => {
      const p = at(e);
      if (!p) {
        ghost.style.display = "none";
        hour = null;
        return;
      }
      hour = p.h;
      ghost.style.display = "flex";
      ghost.style.left = `${p.g * this.hw + 2}px`;
      ghost.style.top = `${rows.offsetTop + p.row * ROW_H + 6}px`;
      ghost.style.width = `${Math.max(Math.round(DEFAULT_LEN / 60 * this.hw), 74)}px`;
      ghost.textContent = `+ ${clockLabel(p.h * 60)}`;
    });
    canvas.addEventListener("mouseleave", () => {
      ghost.style.display = "none";
      hour = null;
    });
    canvas.addEventListener("click", (e) => {
      const p = at(e);
      if (!p || hour === null) return;
      ghost.style.display = "none";
      const dd = new Date(this.day.getFullYear(), this.day.getMonth(), this.day.getDate() + p.k);
      this.addTask({ start: p.h * 60, date: ymd(dd) });
    });
  }
  renderHead(parent, item) {
    const h = parent.createDiv("rt-ghead");
    h.style.height = `${HEAD_H}px`;
    const inner = h.createDiv("rt-ghead-in");
    const closed = this.collapsed.has(item.key);
    (0, import_obsidian.setIcon)(inner.createSpan({ cls: "rt-chev" }), closed ? "chevron-right" : "chevron-down");
    inner.createSpan({ text: item.label });
    inner.createSpan({ cls: "rt-gcount", text: String(item.count) });
    h.onclick = () => {
      if (closed) this.collapsed.delete(item.key);
      else this.collapsed.add(item.key);
      this.render();
    };
  }
  // ---- week / month / year zooms: one column per day, read-only bars ---------------
  renderSpan(host) {
    const sp = this.sp;
    const scroller = host.createDiv("rt-scroll");
    this.scroller = scroller;
    scroller.addEventListener("click", (e) => {
      if (e.target.closest(".rt-bar")) return;
      if (this.selectedId) this.select(null);
    });
    const canvas = scroller.createDiv("rt-canvas is-span");
    this.watchEdges(scroller);
    canvas.style.width = `${sp.total}px`;
    canvas.style.backgroundImage = "none";
    for (const c of sp.cells) {
      const line = canvas.createDiv("rt-vline");
      line.style.left = `${c.left}px`;
    }
    const hours = canvas.createDiv("rt-hours");
    for (const c of sp.cells) {
      const cell = hours.createDiv({ cls: "rt-hour", text: c.text });
      cell.toggleClass("is-today", c.today);
      cell.style.left = `${c.left}px`;
      cell.style.width = `${c.width}px`;
    }
    const rows = canvas.createDiv("rt-rows");
    this.rowsEl = rows;
    for (const item of this.layout) {
      if (item.kind === "head") this.renderHead(rows, item);
      else this.renderSpanTask(rows, item.t);
    }
    if (this.layout.length === 0) {
      rows.createDiv({ cls: "rt-empty", text: "No tasks match. Use New to add one." });
    }
    const add = canvas.createDiv("rt-new");
    const addBtn = add.createEl("button", { cls: "rt-new-btn" });
    (0, import_obsidian.setIcon)(addBtn.createSpan(), "plus");
    addBtn.createSpan({ text: "New" });
    addBtn.onclick = () => this.addTask();
    this.enableSpanHoverAdd(canvas, rows);
    this.nowEl = null;
    const i = dayIndex(/* @__PURE__ */ new Date(), sp.start);
    if (i >= 0 && i < sp.n) {
      this.nowEl = canvas.createDiv("rt-now");
      this.updateNow();
    }
  }
  // One row per task. Repeating tasks show only on the days they occur: at their
  // time of day when the columns are wide (week, bi-week), as day marks otherwise.
  renderSpanTask(parent, t) {
    const sp = this.sp;
    const row = parent.createDiv("rt-row");
    row.style.height = `${ROW_H}px`;
    const days = [];
    if (t.date !== null) {
      const i = dayIndex(parseYmd(t.date), sp.start);
      if (i >= 0 && i < sp.n) days.push(i);
    } else {
      const s = sp.start;
      for (let i = 0; i < sp.n; i++) {
        if (occurs(t, new Date(s.getFullYear(), s.getMonth(), s.getDate() + i))) days.push(i);
      }
    }
    const w = sp.dayW;
    const specs = [];
    if (w >= 56) {
      const minW = Math.min(w - 2, 56);
      for (const i of days) {
        const left = i * w + t.start / 1440 * w;
        const width = Math.max(6, Math.min(Math.max((t.end - t.start) / 1440 * w, minW), (i + 1) * w - left - 1));
        specs.push({ left, width, i });
      }
    } else {
      let k = 0;
      while (k < days.length) {
        let j = k;
        while (j + 1 < days.length && days[j + 1] === days[j] + 1) j++;
        specs.push({ left: days[k] * w, width: Math.max(2, (days[j] - days[k] + 1) * w - 1), i: days[k] });
        k = j + 1;
      }
    }
    // A long title may run past its box, but never into the next occurrence of the same task.
    specs.forEach((sp2, n) => this.spanBar(row, t, sp2.left, sp2.width, sp2.i, (specs[n + 1] ? specs[n + 1].left : sp.total) - sp2.left - 8, specs.length === 1));
  }
  spanBar(row, t, left, width, i0 = 0, room = 0, solo = true) {
    const bar = row.createDiv({ cls: `rt-bar is-span rt-c-${t.color}` });
    bar.dataset.id = t.id;
    bar.toggleClass("is-done", this.isDone(t));
    bar.toggleClass("is-narrow", width < 70);
    bar.toggleClass("is-tiny", width < 38);
    bar.style.left = `${left}px`;
    bar.style.width = `${width}px`;
    // A title that does not fit starts inside the box and runs on past its right edge (like Notion).
    const tw = this.textWidth(t.title || "Untitled") + (t.date === null ? 20 : 0);
    bar.toggleClass("has-out", width < tw + 18);
    bar.toggleClass("out-left", solo && width < tw + 18 && left + tw + 24 > this.sp.total && left + width - tw - 24 > 0);
    bar.title = `${t.title || "Untitled"}
${fmt(t.start)} \u2013 ${fmt(t.end)}${t.date === null ? ` \xB7 ${repeatLabel(t).toLowerCase()}` : ""}`;
    const inner = bar.createDiv("rt-bar-in");
    const titleEl = inner.createSpan({ cls: "rt-title", text: t.title || "Untitled" });
    if (width < tw + 18 && !bar.classList.contains("out-left")) titleEl.style.maxWidth = `${Math.max(40, Math.max(room, width) - 12 - (t.date === null ? 20 : 0))}px`;
    if (t.date === null) (0, import_obsidian.setIcon)(inner.createSpan({ cls: "rt-repeat" }), "repeat");
    const drag = this.attachSpanDrag(bar, t, i0, left);
    bar.onclick = () => {
      if (Date.now() - drag.lastDrag < 150) return;
      this.editTask(t);
    };
  }
  // Drag a bar to move it. Wide columns (week, bi-week): to another day and time. Narrow columns: to another day.
  // A repeating task can only change its time of day, and only where the columns are wide.
  attachSpanDrag(bar, t, i0, left0) {
    const state = { lastDrag: 0 };
    const sp = this.sp;
    const w = sp.dayW;
    const precise = w >= 56;
    const oneTime = t.date !== null;
    if (!oneTime && !precise) return state;
    bar.addClass("is-draggable");
    const len = t.end - t.start;
    bar.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      e.preventDefault();
      bar.setPointerCapture(e.pointerId);
      const x0 = e.clientX;
      let moved = false;
      let target = { day: i0, start: t.start };
      const onMove = (ev) => {
        const dx = ev.clientX - x0;
        if (!moved && Math.abs(dx) < 4) return;
        moved = true;
        if (precise) {
          const dm = Math.round(dx / w * 1440 / SNAP) * SNAP;
          if (oneTime) {
            const total = clamp(i0 * 1440 + t.start + dm, 0, sp.n * 1440 - 1);
            const day = Math.floor(total / 1440);
            target = { day, start: clamp(total - day * 1440, 0, 1440 - len) };
          } else {
            target = { day: i0, start: clamp(t.start + dm, 0, 1440 - len) };
          }
          bar.style.left = `${target.day * w + target.start / 1440 * w}px`;
        } else {
          target = { day: clamp(i0 + Math.round(dx / w), 0, sp.n - 1), start: t.start };
          bar.style.left = `${target.day * w}px`;
        }
      };
      const onUp = async () => {
        bar.removeEventListener("pointermove", onMove);
        bar.removeEventListener("pointerup", onUp);
        bar.removeEventListener("pointercancel", onUp);
        if (!moved) return;
        state.lastDrag = Date.now();
        if (oneTime) {
          const s0 = sp.start;
          t.date = ymd(new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + target.day));
        }
        t.start = target.start;
        t.end = target.start + len;
        await this.plugin.save();
        this.render();
      };
      bar.addEventListener("pointermove", onMove);
      bar.addEventListener("pointerup", onUp);
      bar.addEventListener("pointercancel", onUp);
    });
    return state;
  }
  // Hover an empty spot: a dashed block shows on that day (at that hour in wide columns). Click to add a task there.
  enableSpanHoverAdd(canvas, rows) {
    const sp = this.sp;
    const w = sp.dayW;
    const precise = w >= 56;
    const ghost = canvas.createDiv("rt-ghost");
    ghost.style.display = "none";
    let pick = null;
    const skip = (t) => t.closest(".rt-bar, .rt-hours, .rt-new, .rt-ghead, .rt-empty, button");
    const at = (e) => {
      if (skip(e.target)) return null;
      const r = canvas.getBoundingClientRect();
      const rr = rows.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - rr.top;
      if (y < 0 || x < 0 || x >= sp.total) return null;
      const i = Math.min(sp.n - 1, Math.floor(x / w));
      const hour = precise ? Math.min(23, Math.floor((x - i * w) / w * 24)) : null;
      const date = new Date(sp.start.getFullYear(), sp.start.getMonth(), sp.start.getDate() + i);
      return { i, hour, date, row: Math.floor(y / ROW_H) };
    };
    canvas.addEventListener("mousemove", (e) => {
      const p = at(e);
      if (!p) {
        ghost.style.display = "none";
        pick = null;
        return;
      }
      pick = p;
      ghost.style.display = "flex";
      ghost.style.left = `${p.i * w + (p.hour === null ? 0 : p.hour / 24 * w) + 2}px`;
      ghost.style.top = `${rows.offsetTop + p.row * ROW_H + 6}px`;
      ghost.style.width = `${precise ? Math.max(Math.round(DEFAULT_LEN / 1440 * w), 96) : Math.max(Math.round(w) - 3, 74)}px`;
      const day = p.date.toLocaleDateString(void 0, { month: "short", day: "numeric" });
      ghost.textContent = precise ? `+ ${day}, ${clockLabel(p.hour * 60)}` : `+ ${day}`;
    });
    canvas.addEventListener("mouseleave", () => {
      ghost.style.display = "none";
      pick = null;
    });
    canvas.addEventListener("click", (e) => {
      const p = at(e);
      if (!p || !pick) return;
      ghost.style.display = "none";
      this.addTask({ date: ymd(p.date), start: p.hour === null ? 9 * 60 : p.hour * 60 });
    });
  }
  // ---- table layout --------------------------------------------------------------
  // ---- calendar layout: day / week / month grids with a sidebar, tasks + calendar feeds ----
  calRange() {
    const d = this.day;
    const v = this.ui.cal;
    if (v === "day") return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate()), n: 1 };
    if (v === "week") return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()), n: 7 };
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay()), n: Math.ceil((last.getDate() + first.getDay()) / 7) * 7 };
  }
  dayAt(range, i) {
    const s = range.start;
    return new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
  }
  calLabel() {
    const d = this.day;
    const v = this.ui.cal;
    if (v === "month") return d.toLocaleDateString(void 0, { month: "long", year: "numeric" });
    if (v === "day") return d.toLocaleDateString(void 0, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const r = this.calRange();
    const last = this.dayAt(r, 6);
    return `${r.start.toLocaleDateString(void 0, { month: "short", day: "numeric" })} – ${last.toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  calTasksOn(date) {
    const key = ymd(date);
    const q = this.q.trim().toLowerCase();
    const ui = this.ui;
    return this.plugin.store.tasks.filter((x) => occurs(x, date)).filter((x) => !ui.hideDone || !x.doneDates.includes(key)).filter((x) => ui.groups.length === 0 || ui.groups.includes(groupLabel(x))).filter((x) => !q || x.title.toLowerCase().includes(q)).sort((a, b) => a.start - b.start || a.end - b.end);
  }
  // Everything shown on one day: tasks (minutes) and calendar events, all-day first.
  calItems(date, events) {
    const key = ymd(date);
    const dayStart = date.getTime();
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    const items = [];
    if (this.ui.showTasks) {
      for (const x of this.calTasksOn(date)) {
        items.push({ kind: "task", t: x, allDay: false, start: x.start, end: x.end, title: x.title || "Untitled", color: x.color, done: x.doneDates.includes(key) });
      }
    }
    for (const e of events) {
      const overlaps = e.start < dayEnd && (e.end > dayStart || e.end === e.start && e.start >= dayStart);
      if (!overlaps) continue;
      const s = Math.max(e.start, dayStart);
      const en = Math.min(e.end, dayEnd);
      items.push({ kind: "event", e, allDay: e.allDay, start: Math.round((s - dayStart) / 6e4), end: Math.round((en - dayStart) / 6e4), title: e.title, color: e.color, done: false });
    }
    return items.sort((a, b) => (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || a.start - b.start);
  }
  openCalItem(it, date) {
    if (it.kind === "event") {
      new EventModal(this.app(), it.e).open();
      return;
    }
    this.day = date;
    this.dayStr = ymd(date);
    this.editTask(it.t);
  }
  addOn(date, start) {
    this.day = date;
    this.dayStr = ymd(date);
    this.addTask({ start });
  }
  renderCalendar(host) {
    const body = host.createDiv("rt-cal");
    const range = this.calRange();
    const events = this.plugin.eventsBetween(range.start.getTime(), this.dayAt(range, range.n).getTime());
    if (this.ui.sidebar) this.renderCalSidebar(body);
    const main = body.createDiv("rt-cal-main");
    if (this.ui.cal === "month") this.renderMonth(main, range, events);
    else this.renderWeekGrid(main, range, events);
  }
  chip(parent, it, date, cls) {
    const el = parent.createDiv({ cls: `rt-cal-chip rt-c-${it.color} ${cls || ""}` });
    el.toggleClass("is-event", it.kind === "event");
    el.toggleClass("is-done", it.done);
    if (!it.allDay) {
      const hh = Math.floor(it.start / 60);
      el.createSpan({ cls: "rt-cal-time", text: `${pad(hh)}:${pad(it.start % 60)}` });
    }
    el.createSpan({ cls: "rt-cal-title", text: it.title });
    el.onclick = (ev) => {
      ev.stopPropagation();
      this.openCalItem(it, date);
    };
    return el;
  }
  renderMonth(main, range, events) {
    const wrap = main.createDiv("rt-month-wrap");
    const grid = wrap.createDiv("rt-month");
    for (let i = 0; i < 7; i++) {
      const dn = this.dayAt({ start: new Date(2023, 0, 1) }, i);
      grid.createDiv({ cls: "rt-month-dow", text: dn.toLocaleDateString(void 0, { weekday: "short" }) });
    }
    const today = ymd(/* @__PURE__ */ new Date());
    const month = this.day.getMonth();
    const MAX = 3;
    for (let i = 0; i < range.n; i++) {
      const date = this.dayAt(range, i);
      const cell = grid.createDiv("rt-mcell");
      cell.toggleClass("is-other", date.getMonth() !== month);
      cell.toggleClass("is-today", ymd(date) === today);
      cell.createDiv({ cls: "rt-mnum", text: date.getDate() === 1 ? date.toLocaleDateString(void 0, { month: "short", day: "numeric" }) : String(date.getDate()) });
      const items = this.calItems(date, events);
      for (const it of items.slice(0, MAX)) this.chip(cell, it, date);
      if (items.length > MAX) {
        const more = cell.createDiv({ cls: "rt-cal-more", text: `+${items.length - MAX} more` });
        more.onclick = (ev) => {
          ev.stopPropagation();
          this.day = date;
          this.ui.cal = "day";
          this.calTop = null;
          this.uiChanged();
        };
      }
      cell.onclick = () => this.addOn(date, 9 * 60);
    }
  }
  renderWeekGrid(main, range, events) {
    const cols = range.n;
    const wrap = main.createDiv("rt-week");
    const scroll = wrap.createDiv("rt-cal-scroll");
    const inner = scroll.createDiv("rt-week-inner");
    inner.style.setProperty("--rt-cols", String(cols));
    if (cols > 1) inner.style.minWidth = `${48 + cols * 150}px`;
    const today = ymd(/* @__PURE__ */ new Date());
    const days = [];
    for (let i = 0; i < cols; i++) days.push(this.dayAt(range, i));
    const head = inner.createDiv("rt-week-head");
    head.createDiv("rt-week-gutter");
    for (const date of days) {
      const h = head.createDiv("rt-week-day");
      h.toggleClass("is-today", ymd(date) === today);
      h.createSpan({ cls: "rt-week-dow", text: date.toLocaleDateString(void 0, { weekday: "short" }) });
      h.createSpan({ cls: "rt-week-num", text: String(date.getDate()) });
      if (cols > 1) h.onclick = () => {
        this.day = date;
        this.ui.cal = "day";
        this.calTop = null;
        this.uiChanged();
      };
    }
    const perDay = days.map((d) => this.calItems(d, events));
    if (perDay.some((l) => l.some((i) => i.allDay))) {
      const ad = inner.createDiv("rt-week-allday");
      ad.createDiv({ cls: "rt-week-gutter", text: "all-day" });
      days.forEach((date, i) => {
        const cell = ad.createDiv("rt-week-adcell");
        for (const it of perDay[i].filter((x) => x.allDay)) this.chip(cell, it, date);
      });
    }
    const bodyEl = inner.createDiv("rt-week-body");
    bodyEl.style.height = `${24 * HOUR_H}px`;
    const gut = bodyEl.createDiv("rt-week-gutter rt-week-hours");
    for (let h = 1; h < 24; h++) {
      const l = gut.createDiv({ cls: "rt-week-hour", text: hourLabel(h) });
      l.style.top = `${h * HOUR_H - 7}px`;
    }
    days.forEach((date, i) => {
      const col = bodyEl.createDiv("rt-week-col");
      col.toggleClass("is-today", ymd(date) === today);
      col.onclick = (ev) => {
        if (ev.target !== col) return;
        const y = ev.clientY - col.getBoundingClientRect().top;
        this.addOn(date, Math.floor(y / HOUR_H * 60 / SNAP) * SNAP);
      };
      const timed = perDay[i].filter((x) => !x.allDay).map((x) => ({ ...x, ts: x.start, te: Math.max(x.end, x.start + 25) })).sort((a, b) => a.ts - b.ts || b.te - a.te);
      const lanes = [];
      let cluster = [];
      let clusterEnd = -1;
      const flush = () => {
        const n = Math.max(1, ...cluster.map((c) => c.lane + 1));
        for (const c of cluster) c.cols = n;
        cluster = [];
      };
      for (const it of timed) {
        if (it.ts >= clusterEnd) {
          flush();
          lanes.length = 0;
        }
        let l = lanes.findIndex((end) => end <= it.ts);
        if (l < 0) {
          l = lanes.length;
          lanes.push(it.te);
        } else lanes[l] = it.te;
        it.lane = l;
        clusterEnd = Math.max(clusterEnd, it.te);
        cluster.push(it);
      }
      flush();
      for (const it of timed) {
        const el = this.chip(col, it, date, "is-block");
        el.toggleClass("is-short", it.te - it.ts < 40);
        el.style.top = `${it.ts / 60 * HOUR_H}px`;
        el.style.height = `${Math.max((it.te - it.ts) / 60 * HOUR_H - 1, 18)}px`;
        el.style.left = `calc(${it.lane / it.cols * 100}% + 1px)`;
        el.style.width = `calc(${100 / it.cols}% - 3px)`;
      }
    });
    const todayIdx = days.findIndex((d) => ymd(d) === today);
    this.calNow = null;
    if (todayIdx >= 0) {
      const line = bodyEl.createDiv("rt-week-nowline");
      const label = gut.createDiv("rt-week-nowlabel");
      const bold = bodyEl.querySelectorAll(".rt-week-col")[todayIdx].createDiv("rt-week-now");
      this.calNow = { line, label, bold };
      this.updateCalNow();
    }
    window.requestAnimationFrame(() => {
      scroll.scrollTop = this.calTop !== null ? this.calTop : 7 * HOUR_H;
      scroll.scrollLeft = this.calLeft || 0;
    });
  }
  // Current-time marker: a thin line across the week, a bold segment on today, and a time pill in the gutter.
  updateCalNow() {
    if (!this.calNow) return;
    const n = /* @__PURE__ */ new Date();
    const y = (n.getHours() * 60 + n.getMinutes()) / 60 * HOUR_H;
    this.calNow.line.style.top = `${y}px`;
    this.calNow.bold.style.top = `${y}px`;
    this.calNow.label.style.top = `${y - 9}px`;
    this.calNow.label.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
  }
  renderCalSidebar(body) {
    const side = body.createDiv("rt-cal-side");
    const mini = side.createDiv("rt-mini");
    const mh = mini.createDiv("rt-mini-head");
    mh.createSpan({ cls: "rt-mini-title", text: this.day.toLocaleDateString(void 0, { month: "long", year: "numeric" }) });
    const mk = (icon, label, n) => {
      const b = mh.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
      (0, import_obsidian.setIcon)(b, icon);
      b.onclick = () => {
        this.day = new Date(this.day.getFullYear(), this.day.getMonth() + n, 1);
        this.render();
      };
    };
    mk("chevron-left", "Previous month", -1);
    mk("chevron-right", "Next month", 1);
    const grid = mini.createDiv("rt-mini-grid");
    for (let i = 0; i < 7; i++) {
      grid.createSpan({ cls: "rt-mini-dow", text: this.dayAt({ start: new Date(2023, 0, 1) }, i).toLocaleDateString(void 0, { weekday: "narrow" }) });
    }
    const first = new Date(this.day.getFullYear(), this.day.getMonth(), 1);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    const sel = this.calRange();
    const selFrom = ymd(sel.start);
    const selTo = ymd(this.dayAt(sel, sel.n - 1));
    const today = ymd(/* @__PURE__ */ new Date());
    for (let i = 0; i < 42; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const k = ymd(date);
      const b = grid.createEl("button", { cls: "rt-mini-day", text: String(date.getDate()) });
      b.toggleClass("is-other", date.getMonth() !== this.day.getMonth());
      b.toggleClass("is-today", k === today);
      b.toggleClass("is-sel", k >= selFrom && k <= selTo);
      b.onclick = () => {
        this.day = date;
        this.render();
      };
    }
    side.createDiv({ cls: "rt-side-title", text: "Calendars" });
    const list = side.createDiv("rt-side-list");
    const row = (name, color, on, onToggle, note) => {
      const r = list.createDiv("rt-side-row");
      r.createSpan({ cls: `rt-side-dot rt-c-${color}` });
      const nm = r.createSpan({ cls: "rt-side-name", text: name });
      if (note) nm.setAttribute("title", note);
      const eye = r.createEl("button", { cls: "clickable-icon", attr: { "aria-label": on ? "Hide" : "Show" } });
      (0, import_obsidian.setIcon)(eye, on ? "eye" : "eye-off");
      eye.onclick = onToggle;
      return r;
    };
    row("Tasks", "blue", this.ui.showTasks, () => {
      this.ui.showTasks = !this.ui.showTasks;
      this.uiChanged();
    });
    for (const f of this.plugin.store.feeds) {
      const data = this.plugin.feedData.get(f.id);
      const r = row(f.name, f.color, f.visible, () => void this.plugin.toggleFeed(f.id), data && data.error ? data.error : void 0);
      if (data && data.error) r.addClass("has-error");
    }
    const actions = side.createDiv("rt-side-actions");
    const add = actions.createEl("button", { cls: "rt-new-btn" });
    (0, import_obsidian.setIcon)(add.createSpan(), "plus");
    add.createSpan({ text: "Add calendar" });
    add.onclick = () => new AddFeedModal(this.app(), (n, u, c) => this.plugin.addFeed(n, u, c)).open();
    if (this.plugin.store.feeds.length) {
      const rf = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Refresh calendars" } });
      (0, import_obsidian.setIcon)(rf, "refresh-cw");
      rf.onclick = () => void this.plugin.refreshFeeds();
    }
  }
  renderTable(host) {
    const body = host.createDiv("rt-body");
    const props = this.plugin.store.props;
    const tasks = this.layout.filter((i) => i.kind === "task").map((i) => i.t);
    const known = new Set(this.plugin.store.tasks.map((x) => x.id));
    for (const id of [...this.selected]) if (!known.has(id)) this.selected.delete(id);
    const cols = this.plugin.store.propOrder.filter((k) => props[k] && (k === "name" || props[k].visible));
    const COLS = cols.length + 2;
    if (this.selected.size > 0) {
      const bar = body.createDiv("rt-selbar");
      bar.createSpan({ cls: "rt-selbar-n", text: `${this.selected.size} selected` });
      const del = bar.createEl("button", { cls: "clickable-icon rt-selbar-del", attr: { "aria-label": "Delete" } });
      (0, import_obsidian.setIcon)(del, "trash-2");
      del.onclick = () => this.confirmDelete([...this.selected]);
      const more = bar.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "More actions" } });
      (0, import_obsidian.setIcon)(more, "more-horizontal");
      more.onclick = (ev) => this.bulkMenu(ev, [...this.selected]);
      const clear = bar.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Clear selection" } });
      (0, import_obsidian.setIcon)(clear, "x");
      clear.onclick = () => {
        this.selected.clear();
        this.render();
      };
    }
    const tbl = body.createEl("table", { cls: "rt-table" });
    tbl.toggleClass("has-sel", this.selected.size > 0);
    const hr = tbl.createEl("thead").createEl("tr");
    const all = hr.createEl("th", { cls: "rt-td-check" }).createEl("input", { cls: "rt-check rt-sel", type: "checkbox", attr: { "aria-label": "Select all" } });
    all.checked = tasks.length > 0 && tasks.every((x) => this.selected.has(x.id));
    all.onchange = () => {
      for (const x of tasks) {
        if (all.checked) this.selected.add(x.id);
        else this.selected.delete(x.id);
      }
      this.render();
    };
    for (const k of cols) {
      const th = hr.createEl("th");
      th.toggleClass("is-frozen", this.ui.frozenKey === k);
      const label = th.createSpan("rt-th-label");
      label.createSpan({ text: props[k].label });
      if (this.ui.sortKey === k) (0, import_obsidian.setIcon)(label.createSpan(), this.ui.sortDir === "desc" ? "arrow-down" : "arrow-up");
      if (this.ui.colFilters[k]) (0, import_obsidian.setIcon)(label.createSpan(), "filter");
      th.onclick = (e) => {
        e.stopPropagation();
        this.propColumnMenu(e, k);
      };
      if (k !== "name") this.makeSortable(th, "col", k, (dragged, after) => void this.plugin.moveProp(dragged, k, after));
      else th.addEventListener("dragover", (e) => {
        if (this.dragKind !== "col") return;
        e.preventDefault();
        th.addClass("is-drop-after");
      });
      if (k === "name") {
        th.addEventListener("dragleave", () => th.removeClass("is-drop-after"));
        th.addEventListener("drop", (e) => {
          if (this.dragKind !== "col") return;
          e.preventDefault();
          th.removeClass("is-drop-after");
          const data = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
          if (data.startsWith("col:")) void this.plugin.moveProp(data.slice(4), "name", true);
        });
      }
    }
    const addTh = hr.createEl("th", { cls: "rt-th-add", attr: { "aria-label": "Add property" } });
    (0, import_obsidian.setIcon)(addTh, "plus");
    addTh.onclick = (e) => {
      e.stopPropagation();
      this.addPropertyMenu(e, null);
    };
    const tb = tbl.createEl("tbody");
    const byId = new Map(this.plugin.store.tasks.map((x) => [x.id, x]));
    for (const item of this.layout) {
      if (item.kind === "head") {
        const tr2 = tb.createEl("tr", { cls: "rt-trhead" });
        const td = tr2.createEl("td", { attr: { colspan: String(COLS) } });
        const closed = this.collapsed.has(item.key);
        (0, import_obsidian.setIcon)(td.createSpan({ cls: "rt-chev" }), closed ? "chevron-right" : "chevron-down");
        td.createSpan({ text: item.label });
        td.createSpan({ cls: "rt-gcount", text: String(item.count) });
        tr2.onclick = () => {
          if (closed) this.collapsed.delete(item.key);
          else this.collapsed.add(item.key);
          this.render();
        };
        continue;
      }
      const t2 = item.t;
      const tr = tb.createEl("tr", { cls: "rt-tr" });
      tr.toggleClass("is-done", this.isDone(t2));
      tr.toggleClass("is-selected", this.selected.has(t2.id));
      const ruleColor = this.rowColor(t2, byId);
      tr.toggleClass("has-rule-color", !!ruleColor);
      if (ruleColor) tr.addClass(`rt-c-${ruleColor}`);
      const sel = tr.createEl("td", { cls: "rt-td-check" }).createEl("input", { cls: "rt-check rt-sel", type: "checkbox", attr: { "aria-label": "Select task" } });
      sel.checked = this.selected.has(t2.id);
      sel.onclick = (e) => e.stopPropagation();
      sel.onchange = () => {
        if (sel.checked) this.selected.add(t2.id);
        else this.selected.delete(t2.id);
        this.render();
      };
      tr.dataset.id = t2.id;
      for (const k of cols) {
        const td = tr.createEl("td");
        td.dataset.col = k;
        td.tabIndex = 0;
        td.toggleClass("is-frozen", this.ui.frozenKey === k);
        td.toggleClass("is-wrap", this.ui.wrapKeys.includes(k));
        this.fillCell(td, t2, k, props, byId);
      }
      tr.oncontextmenu = (e) => {
        e.preventDefault();
        this.bulkMenu(e, this.selected.has(t2.id) ? [...this.selected] : [t2.id]);
      };
    }
    if (this.layout.length === 0) {
      tb.createEl("tr").createEl("td", { cls: "rt-empty-cell", text: "No tasks match. Use New to add one.", attr: { colspan: String(COLS) } });
    }
    const add = tb.createEl("tr", { cls: "rt-trnew" }).createEl("td", { attr: { colspan: String(COLS) } });
    const addBtn = add.createEl("button", { cls: "rt-new-btn" });
    (0, import_obsidian.setIcon)(addBtn.createSpan(), "plus");
    addBtn.createSpan({ text: "New" });
    addBtn.onclick = () => this.addTaskInline();
    this.bindCells(tb);
    if (this.focusNewId) {
      const id = this.focusNewId;
      this.focusNewId = null;
      const td = tb.querySelector(`tr[data-id="${id}"] td[data-col="name"]`);
      if (td) window.requestAnimationFrame(() => this.editCell(td));
    }
    const ft = tbl.createEl("tfoot").createEl("tr", { cls: "rt-calcrow" });
    ft.createEl("td", { cls: "rt-td-check" });
    for (const k of cols) {
      const td = ft.createEl("td");
      td.toggleClass("is-frozen", this.ui.frozenKey === k);
      const op = this.ui.calc[k];
      td.createSpan({ cls: "rt-calc-val", text: op ? `${CALC_LABEL[op]} ${this.calcValue(k, op)}` : "" });
      td.onclick = (e) => this.calcMenu(e, k);
    }
    ft.createEl("td");
  }
  // Column footer: a computed value (count, sum, average, ...) over every row currently shown.
  calcMenu(ev, key) {
    const menu = new import_obsidian.Menu();
    const set = (op) => {
      if (op) this.ui.calc[key] = op;
      else delete this.ui.calc[key];
      void this.plugin.save();
    };
    menu.addItem((i) => i.setTitle("None").setChecked(!this.ui.calc[key]).onClick(() => set(null)));
    menu.addItem((i) => i.setTitle("Count").onClick(() => {
      const m = new import_obsidian.Menu();
      for (const op of ["countAll", "countValues", "countUnique", "countEmpty", "countNotEmpty"]) {
        m.addItem((i2) => i2.setTitle(CALC_LABEL[op]).setChecked(this.ui.calc[key] === op).onClick(() => set(op)));
      }
      m.showAtMouseEvent(ev);
    }));
    menu.addItem((i) => i.setTitle("Percent").onClick(() => {
      const m = new import_obsidian.Menu();
      for (const op of ["percentEmpty", "percentNotEmpty"]) {
        m.addItem((i2) => i2.setTitle(CALC_LABEL[op]).setChecked(this.ui.calc[key] === op).onClick(() => set(op)));
      }
      m.showAtMouseEvent(ev);
    }));
    menu.addItem((i) => i.setTitle("More options").onClick(() => {
      const m = new import_obsidian.Menu();
      for (const op of ["sum", "average", "median", "min", "max", "range"]) {
        m.addItem((i2) => i2.setTitle(CALC_LABEL[op]).setChecked(this.ui.calc[key] === op).onClick(() => set(op)));
      }
      m.showAtMouseEvent(ev);
    }));
    menu.showAtMouseEvent(ev);
  }
  calcValue(key, op) {
    const rows = this.visible;
    const vals = rows.map((t) => this.cellValue(t, key, this.byIdAll));
    const isEmpty = (v) => v === "" || v === null || v === void 0;
    const nums = vals.filter((v) => typeof v === "number" && !Number.isNaN(v));
    const round2 = (n) => Math.round(n * 100) / 100;
    switch (op) {
      case "countAll":
        return String(rows.length);
      case "countValues":
      case "countNotEmpty":
        return String(vals.filter((v) => !isEmpty(v)).length);
      case "countUnique":
        return String(new Set(vals.filter((v) => !isEmpty(v)).map((v) => String(v))).size);
      case "countEmpty":
        return String(vals.filter(isEmpty).length);
      case "percentEmpty":
        return rows.length ? `${Math.round(vals.filter(isEmpty).length / rows.length * 100)}%` : "0%";
      case "percentNotEmpty":
        return rows.length ? `${Math.round(vals.filter((v) => !isEmpty(v)).length / rows.length * 100)}%` : "0%";
      case "sum":
        return nums.length ? String(round2(nums.reduce((a, b) => a + b, 0))) : "0";
      case "average":
        return nums.length ? String(round2(nums.reduce((a, b) => a + b, 0) / nums.length)) : "–";
      case "median": {
        if (!nums.length) return "–";
        const s = [...nums].sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        return String(round2(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2));
      }
      case "min":
        return nums.length ? String(round2(Math.min(...nums))) : "–";
      case "max":
        return nums.length ? String(round2(Math.max(...nums))) : "–";
      case "range":
        return nums.length ? String(round2(Math.max(...nums) - Math.min(...nums))) : "–";
      default:
        return "";
    }
  }
  // Notion-style instant add: push a bare task and drop straight into editing its name, no modal.
  addTaskInline() {
    const dayStr = this.dayStr;
    const t = {
      id: uid(),
      title: "",
      start: 9 * 60,
      end: 9 * 60 + DEFAULT_LEN,
      date: dayStr,
      days: null,
      from: null,
      until: null,
      count: null,
      custom: {},
      notes: "",
      deps: [],
      group: this.defaultGroup(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      doneDates: [],
      st: {}
    };
    this.plugin.store.tasks.push(t);
    this.focusNewId = t.id;
    void this.plugin.save();
  }
  // A plain, comparable value for a column: used by the table's column-header Sort and Filter, which
  // work the same way regardless of how the cell happens to be drawn.
  cellValue(t2, k, byId) {
    if (k === "name") return t2.title || "Untitled";
    if (k === "status") return this.statusOf(t2).name;
    if (k === "date") {
      const dd = t2.date || t2.from;
      return dd || "";
    }
    if (k === "duration") return t2.end - t2.start;
    if (k === "start") return t2.start;
    if (k === "end") return t2.end;
    if (k === "group") return t2.group || "";
    if (k === "repeat") return repeatLabel(t2);
    if (k === "after") return t2.deps.map((id) => (byId.get(id) || { title: "" }).title).filter(Boolean).join(", ");
    const def = this.plugin.store.props[k];
    const v = t2.custom[k];
    if (def && def.type === "number") return typeof v === "number" ? v : null;
    if (v === void 0 || v === null) return "";
    return String(v);
  }
  // Conditional color: the first color rule (in order) whose condition matches a task wins, like
  // Notion. Returns a COLORS entry or null if no rule matches.
  matchRule(t2, rule, byId) {
    const v = this.cellValue(t2, rule.key, byId);
    switch (rule.op) {
      case "empty":
        return v === "" || v === null || v === void 0;
      case "notEmpty":
        return !(v === "" || v === null || v === void 0);
      case "checked":
        return String(v) === "true";
      case "unchecked":
        return String(v) !== "true";
      case "eq":
        return String(v).toLowerCase() === rule.value.trim().toLowerCase();
      case "neq":
        return String(v).toLowerCase() !== rule.value.trim().toLowerCase();
      case "contains":
        return String(v).toLowerCase().includes(rule.value.trim().toLowerCase());
      case "gt":
        return typeof v === "number" && v > Number(rule.value);
      case "lt":
        return typeof v === "number" && v < Number(rule.value);
      default:
        return false;
    }
  }
  rowColor(t2, byId) {
    for (const rule of this.ui.colorRules) {
      if (this.matchRule(t2, rule, byId)) return rule.color;
    }
    return null;
  }
  fillCell(td, t2, k, props, byId) {
    td.removeClass("rt-td-name");
    if (k === "name") {
      td.addClass("rt-td-name");
      td.createSpan({ cls: `rt-dot rt-c-${t2.color}` });
      td.createSpan({ cls: "rt-name-text", text: t2.title || "Untitled" });
      const ob = td.createEl("button", { cls: "rt-open", attr: { "aria-label": "Open in side panel" } });
      (0, import_obsidian.setIcon)(ob.createSpan(), "panel-right");
      ob.createSpan({ text: "OPEN" });
      ob.onclick = (e) => {
        e.stopPropagation();
        this.openPeek(t2);
      };
    } else if (k === "status") {
      const st = this.statusOf(t2);
      const chip = td.createEl("button", { cls: `rt-status-chip rt-c-${st.color}`, text: st.name });
      chip.toggleClass("is-done", st.done);
      chip.onclick = (e) => {
        e.stopPropagation();
        this.statusMenu(e, t2);
      };
    } else if (k === "date") {
      const dd = t2.date || t2.from;
      td.textContent = dd ? parseYmd(dd).toLocaleDateString(void 0, { day: "numeric", month: "short", year: "numeric" }) + (t2.date ? "" : " \u2192") : "\u2014";
    } else if (k === "duration") td.textContent = String(t2.end - t2.start);
    else if (k === "start") td.textContent = fmt(t2.start);
    else if (k === "end") td.textContent = fmt(t2.end);
    else if (k === "group") {
      if (t2.group) td.createSpan({ cls: "rt-chip-sm", text: t2.group });
    } else if (k === "repeat") td.textContent = repeatLabel(t2);
    else if (k === "after") td.textContent = t2.deps.map((id) => (byId.get(id) || { title: "" }).title).filter(Boolean).join(", ");
    else this.customCell(td, t2, k, props[k]);
  }
  // Pick a type for a brand new property, then insert it next to `afterKey` (or at the end if null).
  addPropertyMenu(ev, afterKey) {
    const menu = new import_obsidian.Menu();
    for (const type of CUSTOM_TYPES) {
      menu.addItem((i) => i.setTitle(`New ${CUSTOM_LABEL[type].toLowerCase()} property`).setIcon("plus").onClick(() => {
        const store = this.plugin.store;
        const key = `c_${uid().slice(0, 8)}`;
        store.props[key] = { label: CUSTOM_LABEL[type], visible: true, type, custom: true };
        const order = store.propOrder;
        const at = afterKey ? order.indexOf(afterKey) : -1;
        if (at >= 0) order.splice(at + 1, 0, key);
        else order.push(key);
        void this.plugin.save();
      }));
    }
    menu.showAtMouseEvent(ev);
  }
  // Conditional color: highlight a row/bar when a property matches a rule, like Notion. A floating
  // popover (appended to document.body, like the column menu) so typing a rule's value doesn't get
  // interrupted by the re-renders each edit triggers.
  colorRuleMenu(ev) {
    if (this.offColorMenu) this.offColorMenu();
    const ui = this.ui;
    const props = this.plugin.store.props;
    const OP_LABEL = { eq: "is", neq: "is not", contains: "contains", empty: "is empty", notEmpty: "is not empty", gt: ">", lt: "<", checked: "checked", unchecked: "unchecked" };
    const panel = document.body.createDiv("rt-colmenu rt-colorpanel");
    const pad = 8;
    panel.style.visibility = "hidden";
    const place = () => {
      const r = panel.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      let x = ev.clientX, y = ev.clientY;
      if (x + r.width + pad > vw) x = vw - r.width - pad;
      if (y + r.height + pad > vh) y = vh - r.height - pad;
      panel.style.left = `${Math.max(pad, x)}px`;
      panel.style.top = `${Math.max(pad, y)}px`;
      panel.style.visibility = "visible";
    };
    const list = panel.createDiv("rt-colorrule-list");
    const visibleProps = () => this.plugin.store.propOrder.filter((k) => props[k] && (k === "name" || props[k].visible));
    const renderList = () => {
      list.empty();
      for (const rule of ui.colorRules) {
        const row = list.createDiv("rt-colorrule");
        const propSel = row.createEl("select");
        for (const k of visibleProps()) propSel.createEl("option", { attr: { value: k }, text: props[k].label });
        propSel.value = rule.key;
        propSel.onchange = () => {
          rule.key = propSel.value;
          void this.plugin.save();
        };
        const opSel = row.createEl("select");
        for (const op of COLOR_OPS) opSel.createEl("option", { attr: { value: op }, text: OP_LABEL[op] });
        opSel.value = rule.op;
        opSel.onchange = () => {
          rule.op = opSel.value;
          void this.plugin.save();
          renderList();
        };
        if (!["empty", "notEmpty", "checked", "unchecked"].includes(rule.op)) {
          const val = row.createEl("input", { type: "text", attr: { placeholder: "value" } });
          val.value = rule.value;
          val.onclick = (e) => e.stopPropagation();
          val.onkeydown = (e) => e.stopPropagation();
          val.oninput = () => {
            rule.value = val.value;
            void this.plugin.save();
          };
        }
        const swatches = row.createDiv("rt-swatches");
        for (const c of COLORS) {
          const b = swatches.createEl("button", { cls: `rt-colorrule-sw rt-c-${c}`, attr: { "aria-label": c } });
          b.toggleClass("is-on", rule.color === c);
          b.onclick = () => {
            rule.color = c;
            void this.plugin.save();
            renderList();
          };
        }
        const del = row.createEl("button", { cls: "clickable-icon rt-colorrule-del", attr: { "aria-label": "Delete rule" } });
        (0, import_obsidian.setIcon)(del, "trash-2");
        del.onclick = () => {
          ui.colorRules = ui.colorRules.filter((r) => r !== rule);
          void this.plugin.save();
          renderList();
        };
      }
      if (ui.colorRules.length === 0) {
        list.createDiv({ cls: "rt-panel-hint", text: "No rules yet. A matching rule highlights the row (Table) or bar (Timeline)." });
      }
    };
    renderList();
    const addBtn = panel.createEl("button", { cls: "rt-addprop" });
    (0, import_obsidian.setIcon)(addBtn.createSpan(), "plus");
    addBtn.createSpan({ text: "Add rule" });
    addBtn.onclick = () => {
      const firstKey = visibleProps()[0] || "name";
      ui.colorRules = [...ui.colorRules, { id: uid(), key: firstKey, op: "eq", value: "", color: COLORS[0] }];
      void this.plugin.save();
      renderList();
    };
    document.body.appendChild(panel);
    window.requestAnimationFrame(place);
    const onOutside = (e) => {
      if (!panel.contains(e.target)) off();
    };
    const off = () => {
      document.removeEventListener("pointerdown", onOutside, true);
      panel.remove();
      this.offColorMenu = null;
    };
    document.addEventListener("pointerdown", onOutside, true);
    this.offColorMenu = off;
  }
  // Notion-style column header popover: rename inline, change type, sort, filter, group, freeze, hide,
  // wrap, insert a property beside this one, duplicate it, or delete it. Replaces the old flat list of
  // properties in View settings, which required leaving the table to reach any of this.
  propColumnMenu(ev, key) {
    if (this.offColMenu) this.offColMenu();
    const store = this.plugin.store;
    const props = store.props;
    const def = props[key];
    const ui = this.ui;
    const isName = key === "name";
    const panel = document.body.createDiv("rt-colmenu");
    const pad = 8;
    const vw = window.innerWidth, vh = window.innerHeight;
    panel.style.visibility = "hidden";
    const place = () => {
      const r = panel.getBoundingClientRect();
      let left = ev.clientX;
      let top = ev.clientY + 4;
      if (left + r.width + pad > vw) left = vw - r.width - pad;
      if (top + r.height + pad > vh) top = ev.clientY - r.height - 4;
      panel.style.left = `${Math.max(pad, left)}px`;
      panel.style.top = `${Math.max(pad, top)}px`;
      panel.style.visibility = "visible";
    };
    const off = () => {
      document.removeEventListener("pointerdown", onOutside, true);
      panel.remove();
      this.offColMenu = null;
    };
    const onOutside = (e) => {
      if (!panel.contains(e.target)) off();
    };
    this.offColMenu = off;
    const commit = () => void this.plugin.save();
    const nameRow = panel.createDiv("rt-colmenu-name");
    (0, import_obsidian.setIcon)(nameRow.createSpan(), "text-cursor-input");
    const nameInput = nameRow.createEl("input", { type: "text" });
    nameInput.value = def.label;
    nameInput.onclick = (e) => e.stopPropagation();
    const rename = () => {
      const v = nameInput.value.trim();
      def.label = v || (def.custom ? CUSTOM_LABEL[def.type] : defaultProps()[key].label);
      void this.plugin.save();
    };
    nameInput.onblur = rename;
    nameInput.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        rename();
        off();
      } else if (e.key === "Escape") off();
    };
    const item = (opts) => {
      const b = panel.createEl("button", { cls: "rt-colmenu-item" });
      if (opts.icon) (0, import_obsidian.setIcon)(b.createSpan(), opts.icon);
      b.createSpan({ text: opts.label });
      if (opts.on) b.addClass("is-on");
      if (opts.sub) b.createSpan({ cls: "rt-colmenu-sub", text: opts.sub });
      if (opts.danger) b.addClass("rt-colmenu-danger");
      if (opts.disabled) b.disabled = true;
      b.onclick = (e) => {
        e.stopPropagation();
        opts.onClick();
      };
      return b;
    };
    const sep = () => panel.createEl("hr", { cls: "rt-colmenu-sep" });
    if (def.custom) {
      item({
        icon: "type",
        label: "Change type",
        sub: CUSTOM_LABEL[def.type],
        onClick: (e2) => {
          const m = new import_obsidian.Menu();
          for (const type of CUSTOM_TYPES) {
            m.addItem((i) => i.setTitle(CUSTOM_LABEL[type]).setChecked(def.type === type).onClick(() => {
              // Follow the rename along if the label was still the type's own default (e.g. "Number").
              if (def.label === CUSTOM_LABEL[def.type]) def.label = CUSTOM_LABEL[type];
              def.type = type;
              commit();
              off();
            }));
          }
          m.showAtMouseEvent(ev);
        }
      });
    }
    item({
      icon: "arrow-up-narrow-wide",
      label: "Sort old → new",
      on: ui.sortKey === key && ui.sortDir === "asc",
      onClick: () => {
        ui.sortKey = key;
        ui.sortDir = "asc";
        commit();
        off();
      }
    });
    item({
      icon: "arrow-down-wide-narrow",
      label: "Sort new → old",
      on: ui.sortKey === key && ui.sortDir === "desc",
      onClick: () => {
        ui.sortKey = key;
        ui.sortDir = "desc";
        commit();
        off();
      }
    });
    if (ui.sortKey === key) {
      item({ icon: "x", label: "Clear sort", onClick: () => {
        ui.sortKey = null;
        commit();
        off();
      } });
    }
    item({
      icon: "sigma",
      label: "Calculate",
      sub: ui.calc[key] ? CALC_LABEL[ui.calc[key]] : "None",
      onClick: () => {
        off();
        this.calcMenu(ev, key);
      }
    });
    sep();
    const filterWrap = panel.createDiv("rt-colmenu-filter");
    const filterInput = filterWrap.createEl("input", { type: "text", attr: { placeholder: `Filter by ${def.label.toLowerCase()}…` } });
    filterInput.value = ui.colFilters[key] || "";
    filterInput.onclick = (e) => e.stopPropagation();
    filterInput.onkeydown = (e) => e.stopPropagation();
    filterInput.oninput = () => {
      const v = filterInput.value.trim();
      if (v) ui.colFilters[key] = v;
      else delete ui.colFilters[key];
      void this.plugin.save();
    };
    if (key === "group" || key === "status") {
      item({
        icon: "layout-grid",
        label: "Group by this",
        on: ui.groupBy === key,
        onClick: () => {
          ui.groupBy = ui.groupBy === key ? "none" : key;
          commit();
          off();
        }
      });
    }
    item({
      icon: "pin",
      label: "Freeze",
      on: ui.frozenKey === key,
      onClick: () => {
        ui.frozenKey = ui.frozenKey === key ? null : key;
        commit();
        off();
      }
    });
    if (!isName) {
      item({
        icon: "eye-off",
        label: "Hide",
        onClick: () => {
          def.visible = false;
          commit();
          off();
        }
      });
    }
    item({
      icon: "wrap-text",
      label: "Wrap content",
      on: ui.wrapKeys.includes(key),
      onClick: () => {
        ui.wrapKeys = ui.wrapKeys.includes(key) ? ui.wrapKeys.filter((k2) => k2 !== key) : [...ui.wrapKeys, key];
        commit();
        off();
      }
    });
    sep();
    item({
      icon: "arrow-left-to-line",
      label: "Insert left",
      onClick: (e2) => {
        off();
        const order = store.propOrder;
        const at = order.indexOf(key);
        this.addPropertyMenu(ev, at > 0 ? order[at - 1] : null);
      }
    });
    item({
      icon: "arrow-right-to-line",
      label: "Insert right",
      onClick: () => {
        off();
        this.addPropertyMenu(ev, key);
      }
    });
    if (def.custom) {
      item({
        icon: "copy",
        label: "Duplicate property",
        onClick: () => {
          const order = store.propOrder;
          const newKey = `c_${uid().slice(0, 8)}`;
          store.props[newKey] = { ...def, label: `${def.label} copy` };
          order.splice(order.indexOf(key) + 1, 0, newKey);
          for (const t of store.tasks) if (t.custom[key] !== void 0) t.custom = { ...t.custom, [newKey]: t.custom[key] };
          commit();
          off();
        }
      });
      item({
        icon: "trash-2",
        label: "Delete property",
        danger: true,
        onClick: () => {
          off();
          new ConfirmModal(this.app(), `Delete property "${def.label}"?`, "Its values are removed from every task. This cannot be undone.", async () => {
            store.propOrder = store.propOrder.filter((k2) => k2 !== key);
            delete store.props[key];
            if (ui.sortKey === key) ui.sortKey = null;
            if (ui.frozenKey === key) ui.frozenKey = null;
            delete ui.colFilters[key];
            ui.wrapKeys = ui.wrapKeys.filter((k2) => k2 !== key);
            delete ui.calc[key];
            for (const x of store.tasks) if (x.custom) delete x.custom[key];
            void this.plugin.save();
          }).open();
        }
      });
    }
    document.body.appendChild(panel);
    place();
    window.requestAnimationFrame(() => nameInput.focus());
    document.addEventListener("pointerdown", onOutside, true);
  }
  // ---- Notion-style cells: click selects, type or Enter edits, arrows move, "OPEN" opens the side panel
  bindCells(tb) {
    tb.addEventListener("click", (e) => {
      if (e.target.closest("input, button")) return;
      const td = e.target.closest("td[data-col]");
      if (!td) return;
      // A single click both selects the cell (so arrow-key navigation and the fill handle work
      // right away) and opens it for editing, like Notion/Airtable - no more needing a second click.
      this.selectCell(td);
      this.editCell(td);
    });
    tb.addEventListener("dblclick", (e) => {
      if (e.target.closest("input, button")) return;
      const td = e.target.closest("td[data-col]");
      if (td) this.editCell(td);
    });
    tb.addEventListener("keydown", (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "BUTTON" || tag === "TEXTAREA") return;
      const td = e.target.closest && e.target.closest("td[data-col]");
      if (!td) return;
      if (e.key === "Enter") {
        e.preventDefault();
        this.editCell(td);
      } else if (e.key === "Escape") {
        td.removeClass("is-cell-sel");
        this.selCell = null;
        td.blur();
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        this.moveCell(td, e.key);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        this.copyCell(td);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        void this.pasteCell(td);
      } else if (!(e.ctrlKey || e.metaKey || e.altKey) && e.key.length === 1) {
        e.preventDefault();
        this.editCell(td, e.key);
      }
    });
    if (this.selCell) {
      const td = tb.querySelector(`tr[data-id="${this.selCell.id}"] td[data-col="${this.selCell.col}"]`);
      if (td) {
        td.addClass("is-cell-sel");
        if (this.restoreCellFocus) td.focus();
        this.attachFillHandle(td);
      }
    }
  }
  // Repeat and Comes after aren't single copyable values (Repeat is a whole recurrence pattern,
  // Comes after is a relation to other tasks' ids) - clicking them opens the side panel rather than
  // a text editor, so they're the only columns without copy/paste or a fill handle.
  cellEditable(k) {
    return k !== "repeat" && k !== "after";
  }
  // The same string a cell would seed its text-input editor with (editCell's `value`), reused so
  // copy, paste and the fill handle write values in the exact format applyCell expects.
  cellEditValue(task, k, customType) {
    if (k === "name") return task.title;
    if (k === "status") return this.statusOf(task).id;
    if (k === "group") return task.group;
    if (k === "start") return hhmm(task.start);
    if (k === "end") return hhmm(task.end >= DAY ? DAY - 1 : task.end);
    if (k === "duration") return String(task.end - task.start);
    if (k === "date") return task.date || task.from || this.dayStr;
    if (customType === "checkbox") return task.custom[k] ? "true" : "";
    return task.custom[k] === void 0 ? "" : String(task.custom[k]);
  }
  // Checkbox custom properties store a real boolean, and status is set per day via withStatus(),
  // not the text applyCell writes for everything else, so copy/paste/fill go through this instead
  // of calling applyCell directly.
  writeCellValue(task, k, v, customType) {
    if (k === "status") {
      const st = this.plugin.store.statuses.find((s) => s.id === v);
      if (!st) return "";
      withStatus(task, task.date !== null ? task.date : this.dayStr, st, this.plugin.store.statuses);
      return "";
    }
    if (customType === "checkbox") {
      task.custom = { ...task.custom, [k]: v === "true" };
      return "";
    }
    return this.applyCell(task, k, v, customType);
  }
  copyCell(td) {
    const k = td.dataset.col;
    if (!this.cellEditable(k)) return;
    const id = td.parentElement.dataset.id;
    const task = this.plugin.store.tasks.find((x) => x.id === id);
    if (!task) return;
    const def = this.plugin.store.props[k];
    const customType = def && def.custom ? def.type : null;
    this.clipboardCell = { col: k, value: this.cellEditValue(task, k, customType) };
  }
  async pasteCell(td) {
    const k = td.dataset.col;
    if (!this.cellEditable(k) || !this.clipboardCell || this.clipboardCell.col !== k) return;
    const id = td.parentElement.dataset.id;
    const task = this.plugin.store.tasks.find((x) => x.id === id);
    if (!task) return;
    const def = this.plugin.store.props[k];
    const customType = def && def.custom ? def.type : null;
    const err = this.writeCellValue(task, k, this.clipboardCell.value, customType);
    if (err) {
      new import_obsidian.Notice(err);
      return;
    }
    await this.plugin.save();
  }
  // Drag the handle at a selected cell's bottom-right corner down (or up) a column to copy its
  // value into every cell it passes over, like Notion/Excel's fill handle.
  startFillDrag(e, srcId, key, tb) {
    e.preventDefault();
    e.stopPropagation();
    const srcTask = this.plugin.store.tasks.find((x) => x.id === srcId);
    if (!srcTask) return;
    const def = this.plugin.store.props[key];
    const customType = def && def.custom ? def.type : null;
    const srcVal = this.cellEditValue(srcTask, key, customType);
    const rows = [...tb.querySelectorAll("tr.rt-tr")];
    const srcIdx = rows.findIndex((r) => r.dataset.id === srcId);
    if (srcIdx < 0) return;
    let lastIdx = srcIdx;
    const cellAt = (i) => rows[i] && rows[i].querySelector(`td[data-col="${key}"]`);
    const highlight = (endIdx) => {
      const lo = Math.min(srcIdx, endIdx), hi = Math.max(srcIdx, endIdx);
      rows.forEach((r, i) => {
        const td2 = cellAt(i);
        if (td2) td2.toggleClass("is-fill-target", i >= lo && i <= hi && i !== srcIdx);
      });
    };
    const onMove = (ev) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const tr = el && el.closest && el.closest("tr.rt-tr");
      if (!tr) return;
      const idx = rows.indexOf(tr);
      if (idx < 0) return;
      lastIdx = idx;
      highlight(idx);
    };
    const onUp = async () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      rows.forEach((r, i) => {
        const td2 = cellAt(i);
        if (td2) td2.removeClass("is-fill-target");
      });
      const lo = Math.min(srcIdx, lastIdx), hi = Math.max(srcIdx, lastIdx);
      if (lo === hi) return;
      for (let i = lo; i <= hi; i++) {
        if (i === srcIdx) continue;
        const id = rows[i].dataset.id;
        const task = this.plugin.store.tasks.find((x) => x.id === id);
        if (task) this.writeCellValue(task, key, srcVal, customType);
      }
      await this.plugin.save();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }
  selectCell(td) {
    this.host.querySelectorAll(".is-cell-sel").forEach((x) => x.removeClass("is-cell-sel"));
    td.addClass("is-cell-sel");
    td.focus();
    this.attachFillHandle(td);
    this.selCell = { id: td.parentElement.dataset.id, col: td.dataset.col };
  }
  // Adds the drag-to-copy dot to a cell, replacing any other one on the page. Called both when a
  // cell is selected and again after editCell rebuilds the cell's contents (which would otherwise
  // wipe it), so the dot is visible the whole time a cell is selected or being edited.
  attachFillHandle(td) {
    this.host.querySelectorAll(".rt-fill-handle").forEach((x) => x.remove());
    const k = td.dataset.col;
    if (!this.cellEditable(k)) return;
    const tb = td.closest("tbody");
    const handle = td.createDiv("rt-fill-handle");
    handle.addEventListener("pointerdown", (e) => this.startFillDrag(e, td.parentElement.dataset.id, k, tb));
  }
  moveCell(td, key) {
    const tr = td.parentElement;
    const cells = [...tr.querySelectorAll("td[data-col]")];
    const i = cells.indexOf(td);
    let target = null;
    if (key === "ArrowLeft") target = cells[i - 1];
    else if (key === "ArrowRight") target = cells[i + 1];
    else {
      const rows = [...tr.parentElement.querySelectorAll("tr.rt-tr")];
      const r = rows.indexOf(tr) + (key === "ArrowDown" ? 1 : -1);
      if (rows[r]) target = rows[r].querySelectorAll("td[data-col]")[i];
    }
    if (target) this.selectCell(target);
  }
  applyCell(task, k, v, customType) {
    if (k === "name") task.title = v.trim() || "Untitled";
    else if (k === "group") task.group = v.trim();
    else if (k === "start") {
      const m = parseHHMM(v);
      if (m === null) return "That is not a valid time.";
      const dur = task.end - task.start;
      task.start = m;
      task.end = Math.min(DAY, m + dur);
      if (task.end <= task.start) task.end = Math.min(DAY, task.start + 15);
    } else if (k === "end") {
      const m = parseHHMM(v);
      if (m === null || m <= task.start) return "End time must be after start time.";
      task.end = m;
    } else if (k === "duration") {
      const n = parseInt(v, 10);
      if (!(n > 0)) return "Duration must be at least 1 minute.";
      task.end = Math.min(DAY, task.start + n);
    } else if (k === "date") {
      if (!v) return "";
      if (task.date !== null) task.date = v;
      else task.from = v;
    } else {
      task.custom = { ...task.custom };
      if (customType === "number") {
        if (v === "") delete task.custom[k];
        else task.custom[k] = Number(v);
      } else if (v.trim() === "") delete task.custom[k];
      else task.custom[k] = v.trim();
    }
    return "";
  }
  editCell(td, seed) {
    const id = td.parentElement.dataset.id;
    const k = td.dataset.col;
    const task = this.plugin.store.tasks.find((x) => x.id === id);
    if (!task) return;
    const def = this.plugin.store.props[k];
    const customType = def && def.custom ? def.type : null;
    if (k === "status") {
      this.statusMenu(td.getBoundingClientRect ? { clientX: td.getBoundingClientRect().left, clientY: td.getBoundingClientRect().bottom } : { clientX: 0, clientY: 0 }, task);
      return;
    }
    if (k === "repeat" || k === "after") {
      this.openPeek(task);
      return;
    }
    if (customType === "checkbox") {
      task.custom = { ...task.custom, [k]: !task.custom[k] };
      void this.plugin.save();
      return;
    }
    let type = "text";
    let value = "";
    if (k === "name") value = task.title;
    else if (k === "group") value = task.group;
    else if (k === "start") {
      type = "time";
      value = hhmm(task.start);
    } else if (k === "end") {
      type = "time";
      value = hhmm(task.end >= DAY ? DAY - 1 : task.end);
    } else if (k === "duration") {
      type = "number";
      value = String(task.end - task.start);
    } else if (k === "date") {
      type = "date";
      value = task.date || task.from || this.dayStr;
    } else {
      type = customType === "number" ? "number" : customType === "date" ? "date" : "text";
      value = task.custom[k] === void 0 ? "" : String(task.custom[k]);
    }
    td.empty();
    const inp = td.createEl("input", { type, cls: "rt-cell-input" });
    inp.value = seed !== void 0 && type === "text" ? seed : value;
    this.attachFillHandle(td);
    if (k === "group" || customType === "select") {
      const lid = `rt-cell-list-${k}`;
      inp.setAttribute("list", lid);
      const dl = td.createEl("datalist", { attr: { id: lid } });
      const opts = k === "group" ? this.plugin.groupNames() : this.modalExtra().options[k] || [];
      for (const o of opts) dl.createEl("option", { attr: { value: o } });
    }
    let done = false;
    const finish = async (save) => {
      if (done) return;
      done = true;
      if (!save) {
        this.render();
        return;
      }
      const err = this.applyCell(task, k, inp.value, customType);
      if (err) {
        new import_obsidian.Notice(err);
        this.render();
        return;
      }
      await this.plugin.save();
    };
    inp.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === "Enter") void finish(true);
      else if (e.key === "Escape") void finish(false);
    };
    inp.onblur = () => void finish(true);
    inp.onclick = (e) => e.stopPropagation();
    window.requestAnimationFrame(() => {
      inp.focus();
      if (seed === void 0 && inp.select) inp.select();
    });
  }
  modalExtra() {
    const store = this.plugin.store;
    const options = {};
    for (const k of store.propOrder) {
      if (store.props[k] && store.props[k].custom && store.props[k].type === "select") {
        options[k] = [...new Set(store.tasks.map((x) => x.custom && x.custom[k]).filter(Boolean))];
      }
    }
    return { order: store.propOrder, options };
  }
  customCell(td, task, key, def) {
    const v = task.custom ? task.custom[key] : void 0;
    if (def.type === "checkbox") {
      const cb = td.createEl("input", { type: "checkbox", cls: "rt-check" });
      cb.checked = !!v;
      cb.onclick = (e) => e.stopPropagation();
      cb.onchange = async () => {
        task.custom = { ...task.custom, [key]: cb.checked };
        await this.plugin.save();
      };
    } else if (def.type === "select") {
      if (v) td.createSpan({ cls: "rt-chip-sm", text: String(v) });
    } else if (def.type === "date") {
      if (v) td.textContent = parseYmd(String(v)).toLocaleDateString(void 0, { day: "numeric", month: "short", year: "numeric" });
    } else if (v !== void 0 && v !== "") td.textContent = String(v);
  }
  statusMenu(ev, t) {
    const menu = new import_obsidian.Menu();
    const cur = this.statusOf(t).id;
    for (const st of this.plugin.store.statuses) {
      menu.addItem((i) => i.setTitle(st.name).setChecked(cur === st.id).onClick(() => void this.setStatusFor([t], st)));
    }
    if (ev && typeof ev.preventDefault === "function") menu.showAtMouseEvent(ev);
    else menu.showAtPosition({ x: ev.clientX, y: ev.clientY });
  }
  async setStatusFor(tasks, status) {
    for (const x of tasks) withStatus(x, this.dayStr, status, this.plugin.store.statuses);
    await this.plugin.save();
  }
  // The "..." menu for the selection bar (and right-click on a row), like Notion's.
  bulkMenu(ev, ids) {
    const tasks = this.plugin.store.tasks.filter((x) => ids.includes(x.id));
    if (tasks.length === 0) return;
    const props = this.plugin.store.props;
    const menu = new import_obsidian.Menu();
    for (const st of this.plugin.store.statuses) {
      menu.addItem(
        (i) => i.setTitle(`Mark as ${st.name}`).setIcon(st.done ? "check-circle-2" : "circle").onClick(() => void this.setStatusFor(tasks, st))
      );
    }
    menu.addSeparator();
    menu.addItem(
      (i) => i.setTitle(`Edit ${props.group.label.toLowerCase()} & color\u2026`).setIcon("pencil").onClick(
        () => new EditTasksModal(this.app(), tasks.length, this.plugin.groupNames(), props.group.label, async (group, color) => {
          for (const x of tasks) {
            if (group !== null) x.group = group;
            if (color) x.color = color;
          }
          await this.plugin.save();
        }).open()
      )
    );
    menu.addItem((i) => i.setTitle("Duplicate").setIcon("copy").onClick(() => void this.duplicateTasks(tasks)));
    menu.addSeparator();
    menu.addItem((i) => i.setTitle("Delete").setIcon("trash-2").onClick(() => this.confirmDelete(ids)));
    menu.showAtMouseEvent(ev);
  }
  async duplicateTasks(tasks) {
    for (const x of tasks) {
      this.plugin.store.tasks.push({
        ...x,
        id: uid(),
        title: `${x.title || "Untitled"} (copy)`,
        deps: [...x.deps],
        days: x.days ? [...x.days] : null,
        custom: { ...x.custom },
        doneDates: [],
        st: {}
      });
    }
    this.selected.clear();
    await this.plugin.save();
  }
  confirmDelete(ids) {
    const tasks = this.plugin.store.tasks.filter((x) => ids.includes(x.id));
    if (tasks.length === 0) return;
    const repeating = tasks.some((x) => x.date === null);
    const what = tasks.length === 1 ? `"${tasks[0].title || "Untitled"}"` : `${tasks.length} tasks`;
    new ConfirmModal(
      this.app(),
      `Delete ${what}?`,
      repeating ? "Repeating tasks are removed from every day they repeat. This cannot be undone." : "This cannot be undone.",
      async () => {
        const gone = new Set(tasks.map((x) => x.id));
        this.plugin.store.tasks = this.plugin.store.tasks.filter((x) => !gone.has(x.id));
        for (const o of this.plugin.store.tasks) o.deps = o.deps.filter((d) => !gone.has(d));
        for (const id of gone) this.selected.delete(id);
        await this.plugin.save();
      }
    ).open();
  }
  // ---- board layout: one column per status (Not started / In progress / Done by default)
  renderBoard(host) {
    const body = host.createDiv("rt-body");
    const board = body.createDiv("rt-board");
    const sts = this.plugin.store.statuses;
    for (const st of sts) {
      const col = board.createDiv("rt-col");
      const items = this.visible.filter((t) => this.statusOf(t).id === st.id);
      const head = col.createDiv("rt-col-head");
      head.createSpan({ cls: `rt-status-dot rt-c-${st.color}` });
      this.renderColTitle(head, st);
      head.createSpan({ cls: "rt-gcount", text: String(items.length) });
      const more = head.createEl("button", { cls: "clickable-icon rt-col-more", attr: { "aria-label": "Column options" } });
      (0, import_obsidian.setIcon)(more, "more-horizontal");
      more.onclick = (ev) => this.columnMenu(ev, st);
      const list = col.createDiv("rt-col-list");
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        col.addClass("is-over");
      });
      col.addEventListener("dragleave", (e) => {
        if (!col.contains(e.relatedTarget)) col.removeClass("is-over");
      });
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.removeClass("is-over");
        const id = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
        const t = this.plugin.store.tasks.find((x) => x.id === id);
        if (t) void this.moveToColumn(t, st);
      });
      for (const t of items) {
        const card = list.createDiv({ cls: `rt-card rt-c-${t.color}` });
        card.draggable = true;
        card.toggleClass("is-done", this.isDone(t));
        card.addEventListener("dragstart", (e) => {
          if (e.dataTransfer) e.dataTransfer.setData("text/plain", t.id);
        });
        const top = card.createDiv("rt-card-top");
        const cb = top.createEl("input", { cls: "rt-check", type: "checkbox" });
        cb.checked = this.isDone(t);
        cb.onclick = (e) => e.stopPropagation();
        cb.onchange = () => void this.toggleDone(t, cb.checked);
        top.createSpan({ cls: "rt-title", text: t.title || "Untitled" });
        if (t.date === null) (0, import_obsidian.setIcon)(top.createSpan({ cls: "rt-repeat" }), "repeat");
        const meta = card.createDiv("rt-card-meta");
        meta.createSpan({ text: `${fmt(t.start)} \u2013 ${fmt(t.end)}` });
        if (t.group) meta.createSpan({ cls: "rt-chip-sm", text: t.group });
        card.onclick = () => this.editTask(t);
      }
      if (items.length === 0) list.createDiv({ cls: "rt-col-empty", text: "No tasks" });
      const addBtn = col.createEl("button", { cls: "rt-new-btn rt-col-new" });
      (0, import_obsidian.setIcon)(addBtn.createSpan(), "plus");
      addBtn.createSpan({ text: "New" });
      addBtn.onclick = () => this.addTask({ status: st });
    }
    const addCol = board.createEl("button", { cls: "rt-new-btn rt-col-add" });
    (0, import_obsidian.setIcon)(addCol.createSpan(), "plus");
    addCol.createSpan({ text: "Add column" });
    addCol.onclick = async () => {
      const st = { id: uid(), name: "New column", done: false, color: EXTRA_STATUS_COLORS[(sts.length - 3 + EXTRA_STATUS_COLORS.length * 4) % EXTRA_STATUS_COLORS.length] };
      sts.push(st);
      this.renameId = st.id;
      await this.plugin.save();
    };
  }
  // Column title; click it to rename. Enter or clicking away saves, Escape cancels.
  renderColTitle(head, st) {
    if (this.renameId !== st.id) {
      const title = head.createSpan({ cls: "rt-col-title", text: st.name });
      title.onclick = () => {
        this.renameId = st.id;
        this.render();
      };
      return;
    }
    const inp = head.createEl("input", { cls: "rt-col-input", type: "text" });
    inp.value = st.name;
    let finished = false;
    const finish = async (save) => {
      if (finished) return;
      finished = true;
      this.renameId = null;
      const v = inp.value.trim();
      if (save && v && v !== st.name) {
        st.name = v;
        await this.plugin.save();
      } else this.render();
    };
    inp.onkeydown = (e) => {
      if (e.key === "Enter") void finish(true);
      else if (e.key === "Escape") void finish(false);
    };
    inp.onblur = () => void finish(true);
    window.requestAnimationFrame(() => {
      inp.focus();
      inp.select();
    });
  }
  columnMenu(ev, st) {
    const sts = this.plugin.store.statuses;
    const menu = new import_obsidian.Menu();
    menu.addItem(
      (i) => i.setTitle("Rename").setIcon("pencil").onClick(() => {
        this.renameId = st.id;
        this.render();
      })
    );
    menu.addItem((i) => i.setTitle("Change color").setIcon("palette").onClick(() => new ColorPickModal(this.app(), `Color for "${st.name}"`, st.color, async (c) => {
      st.color = c;
      await this.plugin.save();
    }).open()));
    menu.addItem(
      (i) => i.setTitle(st.done ? "Delete (the Done column stays)" : "Delete column").setIcon("trash").setDisabled(st.done || sts.length <= 1).onClick(async () => {
        const at = sts.findIndex((s) => s.id === st.id);
        if (at >= 0) sts.splice(at, 1);
        await this.plugin.save();
      })
    );
    menu.showAtMouseEvent(ev);
  }
  async moveToColumn(t, status) {
    if (this.statusOf(t).id === status.id) return;
    withStatus(t, this.dayStr, status, this.plugin.store.statuses);
    await this.plugin.save();
  }
  // The date one period before or after `d` (a day, week, month... depending on the zoom).
  stepOf(d, n) {
    const y = d.getFullYear();
    const m = d.getMonth();
    const z = this.ui.zoom;
    if (this.ui.layout === "calendar") {
      if (this.ui.cal === "month") return new Date(y, m + n, 1);
      return new Date(y, m, d.getDate() + (this.ui.cal === "week" ? 7 : 1) * n);
    }
    if (!this.sp && !this.isSpan()) return new Date(y, m, d.getDate() + n);
    if (z === "week") return new Date(y, m, d.getDate() + 7 * n);
    if (z === "biweek") return new Date(y, m, d.getDate() + 14 * n);
    if (z === "month") return new Date(y, m + n, 1);
    if (z === "quarter") return new Date(y, m + 3 * n, 1);
    if (z === "year") return new Date(y + n, 0, 1);
    return new Date(y + 5 * n, 0, 1);
  }
  shift(n) {
    this.day = this.stepOf(this.day, n);
    this.initialScroll = true;
    this.render();
  }
  // Scrolled past the current day/period: move on to the neighbour and keep the same spot on screen.
  pageBy(n) {
    this.pendingShift = true;
    this.day = this.stepOf(this.day, n);
    this.render();
  }
  watchEdges(scroller) {
    let timer = 0;
    const check = () => {
      const cw = scroller.clientWidth;
      if (!cw || !scroller.isConnected) return;
      const c = scroller.scrollLeft + cw / 2;
      const x0 = this.sp ? this.sp.i0 * this.sp.dayW : this.hw * 24;
      const len = this.sp ? this.sp.n0 * this.sp.dayW : this.hw * 24;
      if (c < x0) this.pageBy(-1);
      else if (c >= x0 + len) this.pageBy(1);
    };
    scroller.addEventListener("scroll", () => {
      window.clearTimeout(timer);
      const atEdge = scroller.scrollLeft <= 2 || scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
      timer = window.setTimeout(check, atEdge ? 0 : 140);
    });
  }
  updateNow() {
    if (this.calNow) this.updateCalNow();
    if (!this.nowEl) return;
    const d = /* @__PURE__ */ new Date();
    const mins = d.getHours() * 60 + d.getMinutes();
    if (this.sp) {
      const i = dayIndex(d, this.sp.start);
      this.nowEl.style.left = `${i * this.sp.dayW + mins / 1440 * this.sp.dayW}px`;
    } else {
      const i = this.winStart ? dayIndex(d, this.winStart) : 1;
      this.nowEl.style.display = i >= 0 && i < 3 ? "" : "none";
      this.nowEl.style.left = `${i * this.hw * 24 + this.px(mins)}px`;
    }
  }
  select(id) {
    this.selectedId = id;
    this.bars.forEach((b, bid) => b.toggleClass("is-selected", bid === id));
  }
  // Width of a task title in the bar font, so we know whether it fits inside the bar.
  textWidth(str) {
    try {
      if (this.measureCtx === void 0) {
        const c = document.createElement("canvas");
        this.measureCtx = c.getContext ? c.getContext("2d") : null;
      }
      if (this.measureCtx) {
        this.measureCtx.font = `500 13px ${getComputedStyle(document.body).fontFamily || "sans-serif"}`;
        return this.measureCtx.measureText(str).width;
      }
    } catch (e) {
      this.measureCtx = null;
    }
    return str.length * 7;
  }
  place(bar, t, off = this.X0) {
    const w = this.px(t.end - t.start);
    const left = off + this.px(t.start);
    bar.style.left = `${left}px`;
    bar.style.width = `${w}px`;
    bar.toggleClass("is-narrow", w < 70);
    bar.toggleClass("is-tiny", w < 38);
    // Like Notion: when the title does not fit, it starts inside the box and runs on past its right edge.
    const tw = this.textWidth(t.title || "Untitled") + (t.date === null ? 20 : 0);
    const fits = w >= tw + 28 + 20 + 6;
    bar.toggleClass("has-out", !fits);
    // Near the end of the day it would run off the grid, so it ends at the box's right edge and runs left instead.
    bar.toggleClass("out-left", !fits && left + tw + 40 > this.hw * 72 && left + w - tw - 40 > 0);
    bar.title = `${t.title || "Untitled"}
${fmt(t.start)} \u2013 ${fmt(t.end)}`;
  }
  // A dependency arrow needs to know which of the three visible days (k) a bar actually landed on,
  // since yesterday's and tomorrow's occurrences sit in their own columns, not under the selected day.
  markBarInstance(id, k) {
    const list = this.barInstances.get(id);
    if (list) list.push(k);
    else this.barInstances.set(id, [k]);
  }
  // Yesterday's and tomorrow's occurrence of a task: shown beside today's, and fully editable once you scroll to that day.
  neighbourBar(row, t, k) {
    const d = new Date(this.day.getFullYear(), this.day.getMonth(), this.day.getDate() + k);
    if (!occurs(t, d)) return;
    this.markBarInstance(t.id, k);
    const key = ymd(d);
    const bar = row.createDiv({ cls: `rt-bar is-neighbour rt-c-${this.rowColor(t, this.byIdAll) || t.color}` });
    bar.dataset.id = t.id;
    const done = t.doneDates.includes(t.date !== null ? t.date : key);
    bar.toggleClass("is-done", done);
    const inner = bar.createDiv("rt-bar-in");
    const cb = inner.createEl("input", { cls: "rt-check", type: "checkbox" });
    cb.checked = done;
    cb.onchange = () => void this.toggleDone(t, cb.checked, key);
    inner.createSpan({ cls: "rt-title", text: t.title || "Untitled" });
    if (t.date === null) (0, import_obsidian.setIcon)(inner.createSpan({ cls: "rt-repeat" }), "repeat");
    this.place(bar, t, this.X0 + k * this.hw * 24);
    bar.onclick = (e) => {
      if (e.target.closest("input")) return;
      // The editor takes the day it is for (its status is per day); put today's back straight after.
      const keep = this.dayStr;
      this.dayStr = key;
      this.editTask(t);
      this.dayStr = keep;
    };
  }
  // Used when each of the three visible days packs its own rows independently (the common,
  // ungrouped Timeline case): one bar per (task, day) instance, positioned at that day's own
  // compact row index instead of sharing a row with the task's other-day instances.
  renderDayBar(parent, t, k, rowIndex) {
    const row = parent.createDiv("rt-row");
    row.style.position = "absolute";
    row.style.left = "0";
    row.style.right = "0";
    row.style.top = `${rowIndex * ROW_H}px`;
    row.style.height = `${ROW_H}px`;
    this.markBarInstance(t.id, k);
    if (k === 0) {
      const isDone = this.isDone(t);
      const bar = row.createDiv({ cls: `rt-bar rt-c-${this.rowColor(t, this.byIdAll) || t.color}` });
      bar.dataset.id = t.id;
      bar.toggleClass("is-done", isDone);
      bar.toggleClass("is-selected", this.selectedId === t.id);
      const inner = bar.createDiv("rt-bar-in");
      const cb = inner.createEl("input", { cls: "rt-check", type: "checkbox" });
      cb.checked = isDone;
      cb.onchange = () => void this.toggleDone(t, cb.checked);
      inner.createSpan({ cls: "rt-title", text: t.title || "Untitled" });
      if (t.date === null) (0, import_obsidian.setIcon)(inner.createSpan({ cls: "rt-repeat" }), "repeat");
      bar.createDiv("rt-edge rt-edge-l");
      bar.createDiv("rt-edge rt-edge-r");
      const link = bar.createDiv("rt-link");
      this.bars.set(t.id, bar);
      this.place(bar, t);
      this.attachDrag(bar, t);
      this.attachLink(link, t);
      return;
    }
    const d = new Date(this.day.getFullYear(), this.day.getMonth(), this.day.getDate() + k);
    const key = ymd(d);
    const bar = row.createDiv({ cls: `rt-bar is-neighbour rt-c-${this.rowColor(t, this.byIdAll) || t.color}` });
    bar.dataset.id = t.id;
    const done = t.doneDates.includes(t.date !== null ? t.date : key);
    bar.toggleClass("is-done", done);
    const inner = bar.createDiv("rt-bar-in");
    const cb = inner.createEl("input", { cls: "rt-check", type: "checkbox" });
    cb.checked = done;
    cb.onchange = () => void this.toggleDone(t, cb.checked, key);
    inner.createSpan({ cls: "rt-title", text: t.title || "Untitled" });
    if (t.date === null) (0, import_obsidian.setIcon)(inner.createSpan({ cls: "rt-repeat" }), "repeat");
    this.place(bar, t, this.X0 + k * this.hw * 24);
    bar.onclick = (e) => {
      if (e.target.closest("input")) return;
      const keep = this.dayStr;
      this.dayStr = key;
      this.editTask(t);
      this.dayStr = keep;
    };
  }
  renderTask(parent, t) {
    const row = parent.createDiv("rt-row");
    row.style.height = `${ROW_H}px`;
    this.neighbourBar(row, t, -1);
    this.neighbourBar(row, t, 1);
    if (!occurs(t, this.day)) return;
    this.markBarInstance(t.id, 0);
    const isDone = this.isDone(t);
    const bar = row.createDiv({ cls: `rt-bar rt-c-${this.rowColor(t, this.byIdAll) || t.color}` });
    bar.dataset.id = t.id;
    bar.toggleClass("is-done", isDone);
    bar.toggleClass("is-selected", this.selectedId === t.id);
    const inner = bar.createDiv("rt-bar-in");
    const cb = inner.createEl("input", { cls: "rt-check", type: "checkbox" });
    cb.checked = isDone;
    cb.onchange = () => void this.toggleDone(t, cb.checked);
    inner.createSpan({ cls: "rt-title", text: t.title || "Untitled" });
    if (t.date === null) (0, import_obsidian.setIcon)(inner.createSpan({ cls: "rt-repeat" }), "repeat");
    bar.createDiv("rt-edge rt-edge-l");
    bar.createDiv("rt-edge rt-edge-r");
    const link = bar.createDiv("rt-link");
    this.bars.set(t.id, bar);
    this.place(bar, t);
    this.attachDrag(bar, t);
    this.attachLink(link, t);
  }
  // Move the bar, or drag either edge to change the start or end time.
  // Mouse: drag directly. Touch: tap to select first, then drag, so scrolling still works.
  attachDrag(bar, t) {
    let lastDragEnd = 0;
    let lastType = "mouse";
    bar.addEventListener("pointerdown", (e) => {
      lastType = e.pointerType;
      const target = e.target;
      if (target.closest("input") || target.closest(".rt-link")) return;
      if (e.pointerType !== "mouse" && this.selectedId !== t.id) return;
      const mode = target.closest(".rt-edge-l") ? "start" : target.closest(".rt-edge-r") ? "end" : "move";
      e.preventDefault();
      bar.setPointerCapture(e.pointerId);
      const x0 = e.clientX;
      const s0 = t.start;
      const e0 = t.end;
      let moved = false;
      const onMove = (ev) => {
        const dx = ev.clientX - x0;
        if (!moved && Math.abs(dx) < 4) return;
        moved = true;
        const dm = Math.round(dx / this.hw * 60 / SNAP) * SNAP;
        if (mode === "move") {
          const len = e0 - s0;
          t.start = clamp(s0 + dm, 0, DAY - len);
          t.end = t.start + len;
        } else if (mode === "start") {
          t.start = clamp(s0 + dm, 0, e0 - SNAP);
        } else {
          t.end = clamp(e0 + dm, s0 + SNAP, DAY);
        }
        this.place(bar, t);
        this.drawDeps();
      };
      const onUp = async () => {
        bar.removeEventListener("pointermove", onMove);
        bar.removeEventListener("pointerup", onUp);
        bar.removeEventListener("pointercancel", onUp);
        if (moved) {
          lastDragEnd = Date.now();
          await this.plugin.save();
        }
      };
      bar.addEventListener("pointermove", onMove);
      bar.addEventListener("pointerup", onUp);
      bar.addEventListener("pointercancel", onUp);
    });
    bar.addEventListener("click", (e) => {
      const target = e.target;
      if (target.closest("input") || target.closest(".rt-link")) return;
      if (Date.now() - lastDragEnd < 80) return;
      if (lastType !== "mouse" && this.selectedId !== t.id) {
        this.select(t.id);
        return;
      }
      this.select(t.id);
      this.editTask(t);
    });
  }
  // Drag from the dot at the end of a bar onto another bar to connect them.
  attachLink(link, t) {
    link.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const svg = this.svg;
      const rows = this.rowsEl;
      const y1 = this.yCenter.get(t.id);
      if (!svg || !rows || y1 === void 0) return;
      link.setPointerCapture(e.pointerId);
      const x1 = this.X0 + this.px(t.end);
      const temp = document.createElementNS(SVG_NS, "path");
      temp.classList.add("rt-dep", "is-temp");
      svg.appendChild(temp);
      let target = null;
      const clearTarget = () => this.bars.forEach((b) => b.removeClass("is-link-target"));
      const onMove = (ev) => {
        var _a, _b, _c, _d;
        const r = rows.getBoundingClientRect();
        temp.setAttribute("d", curve(x1, y1, ev.clientX - r.left, ev.clientY - r.top));
        const id = (_b = (_a = document.elementFromPoint(ev.clientX, ev.clientY)) == null ? void 0 : _a.closest(".rt-bar")) == null ? void 0 : _b.dataset.id;
        const hit = id && id !== t.id ? (_c = this.visible.find((v) => v.id === id)) != null ? _c : null : null;
        target = hit;
        clearTarget();
        if (hit) (_d = this.bars.get(hit.id)) == null ? void 0 : _d.addClass("is-link-target");
      };
      const onUp = async () => {
        link.removeEventListener("pointermove", onMove);
        link.removeEventListener("pointerup", onUp);
        link.removeEventListener("pointercancel", onUp);
        temp.remove();
        clearTarget();
        const to = target;
        if (to && !to.deps.includes(t.id)) {
          to.deps.push(t.id);
          await this.plugin.save();
        }
      };
      link.addEventListener("pointermove", onMove);
      link.addEventListener("pointerup", onUp);
      link.addEventListener("pointercancel", onUp);
    });
  }
  drawDeps() {
    const svg = this.svg;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("width", String(this.hw * 72));
    svg.setAttribute("height", String(this.totalH));
    const defs = document.createElementNS(SVG_NS, "defs");
    const marker = document.createElementNS(SVG_NS, "marker");
    marker.setAttribute("id", "rt-arrow");
    marker.setAttribute("markerWidth", "8");
    marker.setAttribute("markerHeight", "8");
    marker.setAttribute("refX", "7");
    marker.setAttribute("refY", "4");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "userSpaceOnUse");
    const head = document.createElementNS(SVG_NS, "path");
    head.setAttribute("d", "M1,1 L7,4 L1,7");
    head.classList.add("rt-arrow-head");
    marker.appendChild(head);
    defs.appendChild(marker);
    svg.appendChild(defs);
    // Yesterday's and tomorrow's occurrences are drawn in their own day column, not under the selected
    // day, so an arrow needs the day offset (k) both ends actually landed on, preferring the selected day.
    const byId = new Map(this.visible.map((t) => [t.id, t]));
    const sharedK = (aId, bId) => {
      const as = this.barInstances.get(aId), bs = this.barInstances.get(bId);
      if (!as || !bs) return null;
      if (as.includes(0) && bs.includes(0)) return 0;
      return as.find((k) => bs.includes(k)) ?? null;
    };
    for (const t of this.visible) {
      if (!this.barInstances.has(t.id)) continue;
      for (const depId of t.deps) {
        const dep = byId.get(depId);
        const k = dep ? sharedK(depId, t.id) : null;
        if (!dep || k === null) continue;
        // With independent per-day row packing (this.dayCols), each (task, day) instance has its
        // own y; without it (the grouped fallback), every instance of a task shares one row/y.
        const y1 = this.dayCols ? this.yCenter.get(`${depId}:${k}`) : this.yCenter.get(depId);
        const y2 = this.dayCols ? this.yCenter.get(`${t.id}:${k}`) : this.yCenter.get(t.id);
        if (y1 === void 0 || y2 === void 0) continue;
        const dayX = this.X0 + k * this.hw * 24;
        const x1 = dayX + this.px(dep.end);
        const x2 = dayX + this.px(t.start) - 2;
        const d = curve(x1, y1, x2, y2);
        const key = `${depId}>${t.id}`;
        const selected = this.selectedLink === key;
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", d);
        path.classList.add("rt-dep");
        if (selected) path.classList.add("is-selected");
        if (x2 + 2 < x1) path.classList.add("is-conflict");
        path.setAttribute("marker-end", "url(#rt-arrow)");
        svg.appendChild(path);
        const hit = document.createElementNS(SVG_NS, "path");
        hit.setAttribute("d", d);
        hit.classList.add("rt-dep-hit");
        hit.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectedLink = selected ? null : key;
          this.drawDeps();
        });
        svg.appendChild(hit);
        if (selected) {
          const g = document.createElementNS(SVG_NS, "g");
          g.classList.add("rt-del");
          g.setAttribute("transform", `translate(${(x1 + x2) / 2},${(y1 + y2) / 2})`);
          const c = document.createElementNS(SVG_NS, "circle");
          c.setAttribute("r", "10");
          const x = document.createElementNS(SVG_NS, "path");
          x.setAttribute("d", "M-3,-3 L3,3 M3,-3 L-3,3");
          g.appendChild(c);
          g.appendChild(x);
          g.addEventListener("click", async (e) => {
            e.stopPropagation();
            t.deps = t.deps.filter((i) => i !== depId);
            this.selectedLink = null;
            await this.plugin.save();
          });
          svg.appendChild(g);
        }
      }
    }
  }
  // ---- editing -----------------------------------------------------------------
  othersFor(t) {
    return this.plugin.store.tasks.filter(
      (o) => o.id !== t.id && occurs(o, this.day)
    );
  }
  editTask(t) {
    new TaskModal(
      this.app(),
      { ...t, doneDates: [...t.doneDates], deps: [...t.deps], days: t.days ? [...t.days] : null, st: { ...t.st }, custom: { ...t.custom } },
      this.othersFor(t),
      this.plugin.groupNames(),
      this.dayStr,
      false,
      (draft) => this.onTaskEdited(t, draft),
      this.plugin.store.statuses,
      this.plugin.store.props,
      this.modalExtra()
    ).open();
  }
  async onTaskEdited(t, draft) {
    if (draft) {
      Object.assign(t, draft);
    } else {
      this.plugin.store.tasks = this.plugin.store.tasks.filter((x) => x.id !== t.id);
      for (const o of this.plugin.store.tasks) o.deps = o.deps.filter((d) => d !== t.id);
    }
    await this.plugin.save();
  }
  // Side peek: the task editor docked on the right, with a notes box, like Notion's "Open".
  openPeek(t) {
    if (this.peekId && this.peekId !== t.id) void this.flushPeek();
    this.peekId = t.id;
    this.peekDraft = null;
    this.render();
  }
  // Save the side panel's edits if they are valid and changed (used when it closes by clicking away).
  async flushPeek() {
    const task = this.plugin.store.tasks.find((x) => x.id === this.peekId);
    const d = this.peekDraft;
    if (!task || !d || d.id !== task.id) return;
    if (d.end <= d.start) return;
    if (d.date === null && d.days && d.days.length === 0) return;
    if (d.date === null && d.until && d.from && d.until < d.from) return;
    if (d.days && d.days.length === 7) d.days = null;
    if (JSON.stringify(d) === JSON.stringify(task)) return;
    await this.onTaskEdited(task, d);
  }
  closePeek(save) {
    if (save) void this.flushPeek();
    this.peekId = null;
    this.peekDraft = null;
    this.render();
  }
  renderPeek(host) {
    const t = this.plugin.store.tasks.find((x) => x.id === this.peekId);
    if (!t) {
      this.peekId = null;
      return;
    }
    if (!this.peekDraft || this.peekDraft.id !== t.id) {
      this.peekDraft = { ...t, doneDates: [...t.doneDates], deps: [...t.deps], days: t.days ? [...t.days] : null, st: { ...t.st }, custom: { ...t.custom } };
    }
    const panel = host.createDiv("rt-peek");
    const top = panel.createDiv("rt-peek-top");
    top.createSpan({ text: "Task" });
    const close = top.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Close" } });
    (0, import_obsidian.setIcon)(close, "x");
    close.onclick = () => this.closePeek(true);
    const body = panel.createDiv("rt-peek-body");
    const board = this;
    const onDown = (e) => {
      const target = e.target;
      if (panel.contains(target)) return;
      if (target.closest && target.closest(".modal-container, .menu, .suggestion-container, .rt-open")) return;
      board.closePeek(true);
    };
    document.addEventListener("pointerdown", onDown, true);
    this.offPeek = () => {
      document.removeEventListener("pointerdown", onDown, true);
      this.offPeek = null;
    };
    const ctx = Object.assign(Object.create(TaskModal.prototype), {
      app: this.app(),
      contentEl: body,
      draft: this.peekDraft,
      others: this.othersFor(t),
      groups: this.plugin.groupNames(),
      dayStr: this.dayStr,
      isNew: false,
      statuses: this.plugin.store.statuses,
      props: this.plugin.store.props,
      extra: this.modalExtra(),
      close: () => board.closePeek(),
      onDone: (d) => board.onTaskEdited(t, d)
    });
    TaskModal.prototype.onOpen.call(ctx);
  }
  // New tasks join the view's group filter so they don't vanish right after being added.
  defaultGroup() {
    const g = this.ui.groups;
    if (g.length === 0 || g.includes("No group")) return "";
    return g[0];
  }
  addTask(preset = {}) {
    const now = /* @__PURE__ */ new Date();
    const dayStr = preset.date || this.dayStr;
    const isToday = dayStr === ymd(now);
    const rounded = Math.ceil((now.getHours() * 60 + now.getMinutes()) / SNAP) * SNAP;
    const start = preset.start !== void 0 ? clamp(preset.start, 0, DAY - DEFAULT_LEN) : clamp(isToday ? rounded : 9 * 60, 0, DAY - DEFAULT_LEN);
    const t = {
      id: uid(),
      title: "",
      start,
      end: start + DEFAULT_LEN,
      date: dayStr,
      days: null,
      from: null,
      until: null,
      count: null,
      custom: {},
      notes: "",
      deps: [],
      group: preset.group !== void 0 ? preset.group : this.defaultGroup(),
      color: "blue",
      doneDates: [],
      st: {}
    };
    if (preset.status) withStatus(t, dayStr, preset.status, this.plugin.store.statuses);
    new TaskModal(
      this.app(),
      t,
      this.othersFor(t),
      this.plugin.groupNames(),
      dayStr,
      true,
      async (draft) => {
        if (!draft) return;
        if (!draft.title.trim()) draft.title = "Untitled";
        this.plugin.store.tasks.push(draft);
        await this.plugin.save();
        const g = this.ui.groups;
        if (g.length > 0 && !g.includes(groupLabel(draft))) {
          new import_obsidian.Notice(`Added "${draft.title}", but this view only shows: ${g.join(", ")}. Its group is "${groupLabel(draft)}".`);
        }
      },
      this.plugin.store.statuses,
      this.plugin.store.props,
      this.modalExtra()
    ).open();
  }
  app() {
    return this.plugin.app;
  }
};
const AddFeedModal = class extends import_obsidian.Modal {
  constructor(app, onAdd) {
    super(app);
    this.onAdd = onAdd;
  }
  onOpen() {
    const { contentEl } = this;
    let name = "";
    let url = "";
    let color = "green";
    contentEl.createEl("h3", { text: "Add a calendar" });
    contentEl.createEl("p", {
      cls: "rt-hint",
      text: "In Google Calendar open Settings, pick the calendar, and copy its Secret address in iCal format. Anyone with that link can read the calendar, so keep it private. Read-only. Google refreshes it every few hours."
    });
    new import_obsidian.Setting(contentEl).setName("Name").addText((tx) => tx.setPlaceholder("e.g. Work").onChange((v) => name = v));
    new import_obsidian.Setting(contentEl).setName("iCal address").addText((tx) => tx.setPlaceholder("https://calendar.google.com/calendar/ical/\u2026/basic.ics").onChange((v) => url = v));
    const row = new import_obsidian.Setting(contentEl).setName("Color");
    const swatches = row.controlEl.createDiv("rt-swatches");
    for (const c of COLORS) {
      const b = swatches.createEl("button", { cls: `rt-swatch rt-c-${c}`, attr: { "aria-label": c } });
      b.toggleClass("is-on", c === color);
      b.onclick = () => {
        color = c;
        swatches.querySelectorAll(".rt-swatch").forEach((x) => x.removeClass("is-on"));
        b.addClass("is-on");
      };
    }
    new import_obsidian.Setting(contentEl).addButton(
      (b) => b.setButtonText("Add").setCta().onClick(async () => {
        if (!/^(https?|webcal):\/\//i.test(url.trim())) {
          new import_obsidian.Notice("Paste a full address that starts with https:// or webcal://");
          return;
        }
        this.close();
        await this.onAdd(name, url, color);
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
const ColorPickModal = class extends import_obsidian.Modal {
  constructor(app, title, current, onPick) {
    super(app);
    this.title = title;
    this.current = current;
    this.onPick = onPick;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.title });
    const swatches = contentEl.createDiv("rt-swatches rt-swatches-left");
    for (const c of COLORS) {
      const b = swatches.createEl("button", { cls: `rt-swatch rt-c-${c}`, attr: { "aria-label": c } });
      b.toggleClass("is-on", c === this.current);
      b.onclick = async () => {
        this.close();
        await this.onPick(c);
      };
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
const EventModal = class extends import_obsidian.Modal {
  constructor(app, ev) {
    super(app);
    this.ev = ev;
  }
  onOpen() {
    const { contentEl } = this;
    const e = this.ev;
    contentEl.createEl("h3", { text: e.title });
    const fmtD = (ms) => new Date(ms).toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const fmtT = (ms) => new Date(ms).toLocaleTimeString(void 0, { hour: "numeric", minute: "2-digit" });
    const ok = Number.isFinite(e.start) && Number.isFinite(e.end);
    const when = !ok ? "Time unavailable" : e.allDay ? fmtD(e.start) : `${fmtD(e.start)}, ${fmtT(e.start)} \u2013 ${fmtT(e.end)}`;
    contentEl.createEl("p", { text: when });
    if (e.location) contentEl.createEl("p", { text: `Location: ${e.location}` });
    if (e.feedName) contentEl.createEl("p", { cls: "rt-hint", text: `Calendar: ${e.feedName} (read-only)` });
    if (e.desc) contentEl.createEl("p", { cls: "rt-ev-desc", text: e.desc.slice(0, 1200) });
    if (e.url && /^https?:\/\//i.test(e.url)) {
      new import_obsidian.Setting(contentEl).addButton((b) => b.setButtonText("Open link").onClick(() => window.open(e.url)));
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
const RoutineSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Show Google Calendar events (or any .ics feed) in the Calendar layout. In Google Calendar open Settings, pick a calendar and copy its Secret address in iCal format. It is read-only, refreshes every 30 minutes, and Google itself updates the feed every few hours. Treat the address like a password: it is saved in this plugin's data file."
    });
    for (const f of this.plugin.store.feeds) {
      const data = this.plugin.feedData.get(f.id);
      const status = data ? data.error ? `Error: ${data.error}` : `${data.events.length} events, updated ${new Date(data.fetched).toLocaleTimeString()}` : "Not loaded yet";
      new import_obsidian.Setting(containerEl).setName(f.name).setDesc(status).addToggle((tg) => tg.setValue(f.visible).onChange(async (v) => {
        f.visible = v;
        await this.plugin.save();
      })).addButton((b) => b.setButtonText("Remove").setWarning().onClick(async () => {
        await this.plugin.removeFeed(f.id);
        this.display();
      }));
    }
    new import_obsidian.Setting(containerEl).addButton((b) => b.setButtonText("Add calendar").setCta().onClick(() => {
      new AddFeedModal(this.app, async (n, u, c) => {
        await this.plugin.addFeed(n, u, c);
        this.display();
      }).open();
    })).addButton((b) => b.setButtonText("Refresh now").onClick(async () => {
      await this.plugin.refreshFeeds();
      this.display();
    }));
  }
};
const BaseSwitcherModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    this.draw();
  }
  draw() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Switch database" });
    contentEl.createEl("p", { cls: "setting-item-description", text: "Each database has its own tasks, properties and views, like a separate Notion database." });
    const list = contentEl.createDiv("rt-base-list");
    for (const b of this.plugin.baseList()) {
      const row = list.createDiv("rt-base-row");
      const isActive = b.id === this.plugin.appData.activeBaseId;
      row.toggleClass("is-active", isActive);
      const main = row.createDiv("rt-base-main");
      (0, import_obsidian.setIcon)(main.createSpan({ cls: "rt-base-icon" }), "database");
      if (this.renameId === b.id) {
        const inp = main.createEl("input", { type: "text", cls: "rt-base-input" });
        inp.value = b.name;
        const finish = async (save) => {
          this.renameId = null;
          if (save && inp.value.trim() && inp.value.trim() !== b.name) await this.plugin.renameBase(b.id, inp.value);
          this.draw();
        };
        inp.onkeydown = (e) => {
          e.stopPropagation();
          if (e.key === "Enter") void finish(true);
          else if (e.key === "Escape") void finish(false);
        };
        inp.onblur = () => void finish(true);
        inp.onclick = (e) => e.stopPropagation();
        window.requestAnimationFrame(() => {
          inp.focus();
          inp.select();
        });
      } else {
        main.createSpan({ cls: "rt-base-name", text: b.name });
        if (isActive) main.createSpan({ cls: "rt-base-badge", text: "Active" });
      }
      main.onclick = () => {
        if (this.renameId) return;
        if (!isActive) void this.plugin.switchBase(b.id).then(() => this.close());
      };
      const actions = row.createDiv("rt-base-actions");
      const renameBtn = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Rename" } });
      (0, import_obsidian.setIcon)(renameBtn, "pencil");
      renameBtn.onclick = (e) => {
        e.stopPropagation();
        this.renameId = b.id;
        this.draw();
      };
      const delBtn = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Delete" } });
      (0, import_obsidian.setIcon)(delBtn, "trash-2");
      delBtn.toggleClass("is-disabled", this.plugin.baseList().length <= 1);
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (this.plugin.baseList().length <= 1) return;
        new ConfirmModal(this.app, `Delete "${b.name}"?`, "All of its tasks and views are deleted. This cannot be undone.", async () => {
          await this.plugin.deleteBase(b.id);
          this.draw();
        }).open();
      };
    }
    const addRow = new import_obsidian.Setting(contentEl).setName("New database").addText((t) => {
      t.setPlaceholder("e.g. Work, Personal");
      t.inputEl.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.plugin.createBase(t.inputEl.value).then(() => this.close());
        }
      };
      window.requestAnimationFrame(() => t.inputEl.focus());
    });
    addRow.addButton(
      (b) => b.setButtonText("Create").setCta().onClick(() => {
        const input = addRow.controlEl.querySelector("input");
        void this.plugin.createBase(input ? input.value : "").then(() => this.close());
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
const ConfirmModal = class extends import_obsidian.Modal {
  constructor(app, title, message, onConfirm) {
    super(app);
    this.title = title;
    this.message = message;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.title });
    contentEl.createEl("p", { text: this.message });
    const row = new import_obsidian.Setting(contentEl);
    row.addButton(
      (b) => b.setButtonText("Delete").setWarning().onClick(async () => {
        this.close();
        await this.onConfirm();
      })
    );
    row.addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose() {
    this.contentEl.empty();
  }
};
const EditTasksModal = class extends import_obsidian.Modal {
  constructor(app, count, groups, groupLabelText, onApply) {
    super(app);
    this.count = count;
    this.groups = groups;
    this.groupLabelText = groupLabelText;
    this.onApply = onApply;
  }
  onOpen() {
    const { contentEl } = this;
    let group = null;
    let color = "";
    contentEl.createEl("h3", { text: `Edit ${this.count} ${this.count === 1 ? "task" : "tasks"}` });
    const listId = "rt-bulk-groups";
    new import_obsidian.Setting(contentEl).setName(this.groupLabelText).setDesc("Leave empty to keep each task's current value.").addText((t) => {
      t.inputEl.setAttribute("list", listId);
      t.setPlaceholder("e.g. Work").onChange((v) => group = v.trim() ? v.trim() : null);
    });
    const list = contentEl.createEl("datalist", { attr: { id: listId } });
    for (const g of this.groups) list.createEl("option", { attr: { value: g } });
    const row = new import_obsidian.Setting(contentEl).setName("Color");
    const swatches = row.controlEl.createDiv("rt-swatches");
    for (const c of COLORS) {
      const b = swatches.createEl("button", { cls: `rt-swatch rt-c-${c}`, attr: { "aria-label": c } });
      b.onclick = () => {
        color = color === c ? "" : c;
        swatches.querySelectorAll(".rt-swatch").forEach((x) => x.removeClass("is-on"));
        if (color) b.addClass("is-on");
      };
    }
    new import_obsidian.Setting(contentEl).addButton(
      (b) => b.setButtonText("Apply").setCta().onClick(async () => {
        this.close();
        await this.onApply(group, color);
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
const TaskModal = class extends import_obsidian.Modal {
  constructor(app, draft, others, groups, dayStr, isNew, onDone, statuses, props, extra) {
    super(app);
    this.draft = draft;
    this.others = others;
    this.groups = groups;
    this.dayStr = dayStr;
    this.isNew = isNew;
    this.onDone = onDone;
    this.statuses = statuses;
    this.props = props || defaultProps();
    this.extra = extra || { order: [...PROP_KEYS], options: {} };
  }
  onOpen() {
    const { contentEl } = this;
    const d = this.draft;
    contentEl.createEl("h3", { text: this.isNew ? "New task" : "Edit task" });
    new import_obsidian.Setting(contentEl).setName(this.props.name.label).addText((t) => t.setValue(d.title).onChange((v) => d.title = v));
    let endInput = null;
    let endTouched = !this.isNew;
    new import_obsidian.Setting(contentEl).setName(this.props.start.label).addText((t) => {
      t.inputEl.type = "time";
      t.setValue(hhmm(d.start)).onChange((v) => {
        const m = parseHHMM(v);
        if (m === null) return;
        d.start = m;
        if (!endTouched) {
          d.end = Math.min(DAY - 1, m + DEFAULT_LEN);
          if (endInput) endInput.value = hhmm(d.end);
        }
      });
    });
    new import_obsidian.Setting(contentEl).setName(this.props.end.label).setDesc(this.isNew ? `Defaults to ${DEFAULT_LEN} minutes after the start.` : "").addText((t) => {
      endInput = t.inputEl;
      t.inputEl.type = "time";
      t.setValue(hhmm(d.end >= DAY ? DAY - 1 : d.end)).onChange((v) => {
        const m = parseHHMM(v);
        if (m === null) return;
        d.end = m;
        endTouched = true;
      });
    });
    const listId = "rt-groups-list";
    new import_obsidian.Setting(contentEl).setName(this.props.group.label).addText((t) => {
      t.inputEl.setAttribute("list", listId);
      t.setPlaceholder("e.g. Work").setValue(d.group).onChange((v) => d.group = v.trim());
    });
    const list = contentEl.createEl("datalist", { attr: { id: listId } });
    for (const g of this.groups) list.createEl("option", { attr: { value: g } });
    const colorRow = new import_obsidian.Setting(contentEl).setName("Color");
    const swatches = colorRow.controlEl.createDiv("rt-swatches");
    for (const c of COLORS) {
      const b = swatches.createEl("button", { cls: `rt-swatch rt-c-${c}`, attr: { "aria-label": c } });
      b.toggleClass("is-on", d.color === c);
      b.onclick = () => {
        d.color = c;
        swatches.querySelectorAll(".rt-swatch").forEach((x) => x.removeClass("is-on"));
        b.addClass("is-on");
      };
    }
    const mode = () => d.date !== null ? "none" : d.days ? "weekly" : "daily";
    const dayRow = contentEl.createDiv("rt-days");
    const drawDays = () => {
      dayRow.empty();
      dayRow.toggleClass("is-hidden", mode() !== "weekly");
      DOW.forEach((name, n) => {
        const b = dayRow.createEl("button", { cls: "rt-day", text: name });
        b.toggleClass("is-on", !!d.days && d.days.includes(n));
        b.onclick = () => {
          const cur = d.days || [];
          d.days = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n];
          drawDays();
        };
      });
    };
    new import_obsidian.Setting(contentEl).setName(this.props.repeat.label).setDesc("Repeating tasks keep one time slot. Ticking them off is tracked per day.").addDropdown((dd) => {
      dd.addOption("none", "Does not repeat");
      dd.addOption("daily", "Every day");
      dd.addOption("weekly", "On specific days of the week");
      dd.setValue(mode()).onChange((v) => {
        if (v === "none") {
          d.date = this.dayStr;
          d.days = null;
        } else if (v === "daily") {
          d.date = null;
          d.days = null;
        } else {
          d.date = null;
          if (!d.days) d.days = [parseYmd(this.dayStr).getDay()];
        }
        if (v === "none") {
          d.from = null;
          d.until = null;
          d.count = null;
        }
        drawDays();
        drawRep();
      });
    });
    contentEl.appendChild(dayRow);
    drawDays();
    const rbox = contentEl.createDiv("rt-repeatbox");
    const drawRep = () => {
      rbox.empty();
      rbox.toggleClass("is-hidden", mode() === "none");
      if (mode() === "none") return;
      new import_obsidian.Setting(rbox).setName("Starts").addText((tx) => {
        tx.inputEl.type = "date";
        tx.setValue(d.from || this.dayStr).onChange((v) => {
          d.from = v || null;
        });
      });
      const endMode = d.count ? "count" : d.until ? "date" : "never";
      new import_obsidian.Setting(rbox).setName("Ends").addDropdown((dd) => {
        dd.addOption("never", "Never");
        dd.addOption("count", "After a number of times");
        dd.addOption("date", "On a date");
        dd.setValue(endMode).onChange((v) => {
          if (v === "never") {
            d.count = null;
            d.until = null;
          } else if (v === "count") {
            d.count = d.count || 10;
            d.until = null;
            d.from = d.from || this.dayStr;
          } else {
            d.until = d.until || d.from || this.dayStr;
            d.count = null;
          }
          drawRep();
        });
      });
      if (d.count) {
        new import_obsidian.Setting(rbox).setName("Number of times").addText((tx) => {
          tx.inputEl.type = "number";
          tx.inputEl.min = "1";
          tx.setValue(String(d.count)).onChange((v) => {
            const n = parseInt(v, 10);
            d.count = n > 0 ? n : null;
            d.from = d.from || this.dayStr;
          });
        });
      } else if (d.until) {
        new import_obsidian.Setting(rbox).setName("End date").addText((tx) => {
          tx.inputEl.type = "date";
          tx.setValue(d.until).onChange((v) => {
            d.until = v || null;
          });
        });
      }
    };
    contentEl.appendChild(rbox);
    drawRep();
    if (this.statuses && this.statuses.length) {
      new import_obsidian.Setting(contentEl).setName(this.props.status.label).setDesc(`For ${this.dayStr}.`).addDropdown((dd) => {
        for (const s of this.statuses) dd.addOption(s.id, s.name);
        dd.setValue(statusOf(d, this.dayStr, this.statuses).id).onChange((v) => {
          const s = this.statuses.find((x) => x.id === v);
          if (s) withStatus(d, this.dayStr, s, this.statuses);
        });
      });
    }
    d.custom = d.custom || {};
    for (const key of this.extra.order) {
      const def = this.props[key];
      if (!def || !def.custom) continue;
      const set = (v) => {
        if (v === "" || v === null || v === false && def.type !== "checkbox") delete d.custom[key];
        else d.custom[key] = v;
      };
      const row = new import_obsidian.Setting(contentEl).setName(def.label);
      if (def.type === "checkbox") row.addToggle((tg) => tg.setValue(!!d.custom[key]).onChange((v) => d.custom[key] = v));
      else if (def.type === "number") row.addText((tx) => {
        tx.inputEl.type = "number";
        tx.setValue(d.custom[key] === void 0 ? "" : String(d.custom[key])).onChange((v) => set(v === "" ? "" : Number(v)));
      });
      else if (def.type === "date") row.addText((tx) => {
        tx.inputEl.type = "date";
        tx.setValue(d.custom[key] ? String(d.custom[key]) : "").onChange((v) => set(v));
      });
      else row.addText((tx) => {
        if (def.type === "select") {
          const id = `rt-opt-${key}`;
          tx.inputEl.setAttribute("list", id);
          const dl = contentEl.createEl("datalist", { attr: { id } });
          for (const o of this.extra.options[key] || []) dl.createEl("option", { attr: { value: o } });
        }
        tx.setValue(d.custom[key] === void 0 ? "" : String(d.custom[key])).onChange((v) => set(v.trim()));
      });
    }
    const chips = contentEl.createDiv("rt-chips");
    const drawChips = () => {
      chips.empty();
      for (const id of d.deps) {
        const o = this.others.find((x2) => x2.id === id);
        if (!o) continue;
        const chip = chips.createDiv("rt-chip");
        chip.createSpan({ text: o.title || "Untitled" });
        const x = chip.createEl("button", { text: "\u2715", attr: { "aria-label": "Remove connector" } });
        x.onclick = () => {
          d.deps = d.deps.filter((i) => i !== id);
          drawChips();
        };
      }
    };
    new import_obsidian.Setting(contentEl).setName(this.props.after.label).setDesc("Draws a connector from each chosen task into this one. You can also drag from a bar's end dot.").addDropdown((dd) => {
      dd.addOption("", "Add a task\u2026");
      for (const o of this.others) dd.addOption(o.id, o.title || "Untitled");
      dd.setValue("").onChange((v) => {
        if (v && !d.deps.includes(v)) d.deps.push(v);
        dd.setValue("");
        drawChips();
      });
    });
    contentEl.appendChild(chips);
    drawChips();
    contentEl.createDiv({ cls: "rt-notes-label", text: "Notes" });
    const notes = contentEl.createEl("textarea", { cls: "rt-notes", attr: { placeholder: "Write notes about this task\u2026", rows: "6" } });
    notes.value = d.notes || "";
    notes.oninput = () => {
      d.notes = notes.value;
    };
    const actions = new import_obsidian.Setting(contentEl);
    actions.addButton(
      (b) => b.setButtonText("Save").setCta().onClick(async () => {
        if (d.end <= d.start) {
          new import_obsidian.Notice("End time must be after start time.");
          return;
        }
        if (d.date === null && d.days && d.days.length === 0) {
          new import_obsidian.Notice("Pick at least one day of the week.");
          return;
        }
        if (d.days && d.days.length === 7) d.days = null;
        if (d.date === null && d.until && d.from && d.until < d.from) {
          new import_obsidian.Notice("The end date must be on or after the start date.");
          return;
        }
        this.close();
        await this.onDone(d);
      })
    );
    if (!this.isNew) {
      actions.addButton(
        (b) => b.setButtonText("Delete").setWarning().onClick(async () => {
          this.close();
          await this.onDone(null);
        })
      );
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
