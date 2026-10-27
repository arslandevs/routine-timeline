import { uid } from "./util";

// ---- iCalendar (.ics) parsing and recurrence expansion for read-only calendar feeds
export const icsUnfold = (text) => text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
export const icsText = (s) => s.replace(/\\[nN]/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
export function icsSplit(line) {
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
export function tzOffsetMs(ms, tz) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const o: any = {};
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second) - Math.floor(ms / 1e3) * 1e3;
}
export function wallToMs(w, kind, tz) {
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
export function icsWhen(value, params) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/.exec(value.trim());
  if (!m) return null;
  const w = { y: +m[1], m: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0), s: +(m[6] || 0) };
  const allDay = params.VALUE === "DATE" || m[4] === void 0;
  const kind = allDay ? "local" : m[7] ? "utc" : params.TZID ? "tz" : "local";
  return { w, kind, tz: params.TZID, allDay, ms: wallToMs(w, kind, params.TZID) };
}
export function parseIcs(text) {
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
export const WD = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
export function icsDurationMs(s) {
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(s || "");
  if (!m) return 0;
  return (((+m[1] || 0) * 7 + (+m[2] || 0)) * 24 * 60 * 60 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60 + (+m[5] || 0)) * 1e3;
}
export function parseRule(str) {
  const r: any = { byday: [], bymonthday: [], bymonth: [], interval: 1 };
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
export const DAY_MS = 864e5;
export const utcDay = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
export const dayToYmd = (n) => {
  const d = new Date(n * DAY_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
};
export const dowOfDay = (n) => (n % 7 + 11) % 7;
export function monthDays(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
export function nthWeekday(y, m, wd, n) {
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
export function ruleDays(ev, rule, fromDay, toDay, cap) {
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
export function expandIcs(events, fromMs, toMs) {
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
