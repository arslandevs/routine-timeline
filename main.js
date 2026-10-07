"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => RoutineTimelinePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW_TYPE = "routine-timeline";
var HOUR_W = 96;
var ROW_H = 44;
var HEAD_H = 34;
var SNAP = 15;
var DAY = 1440;
var SVG_NS = "http://www.w3.org/2000/svg";
var COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
var uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
var pad = (n) => String(n).padStart(2, "0");
var ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
var clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
var px = (min) => min / 60 * HOUR_W;
var hhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
var parseHHMM = (s) => {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
};
var hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
var fmt = (min) => {
  const h = Math.floor(min / 60) % 24;
  return `${h % 12 || 12}:${pad(min % 60)} ${h < 12 ? "AM" : "PM"}`;
};
var groupLabel = (t) => t.group || "No group";
var curve = (x1, y1, x2, y2) => {
  const dx = Math.max(24, Math.abs(x2 - x1) * 0.5);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
};
var defaultUi = () => ({ groupBy: "none", hideDone: false, groups: [] });
function seedTasks() {
  const mk = (title, start, end, group, color, deps = []) => ({ id: uid(), title, start, end, date: null, deps, group, color, doneDates: [] });
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
      deps: Array.isArray(t.deps) ? t.deps : t.after ? [t.after] : [],
      group: (_f = t.group) != null ? _f : "",
      color: COLORS.includes(t.color) ? t.color : "blue",
      doneDates: Array.isArray(t.doneDates) ? t.doneDates : []
    };
  });
  const ui = {
    groupBy: (_b = (_a = s.ui) == null ? void 0 : _a.groupBy) != null ? _b : "none",
    hideDone: !!((_c = s.ui) == null ? void 0 : _c.hideDone),
    groups: (_e = (_d = s.ui) == null ? void 0 : _d.groups) != null ? _e : []
  };
  return { tasks, ui };
}
function parseOpts(src) {
  const o = { height: 420, groupBy: "none", hideDone: false, groups: [] };
  for (const line of src.split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (k === "height") o.height = clamp(Number(v) || 420, 200, 1200);
    else if (k === "group" && (v === "group" || v === "status" || v === "none")) o.groupBy = v;
    else if (k === "hidedone") o.hideDone = v === "true";
    else if (k === "filter") o.groups = v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return o;
}
var RoutineTimelinePlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.store = { tasks: [], ui: defaultUi() };
    this.boards = /* @__PURE__ */ new Set();
  }
  async onload() {
    const loaded = normalize(await this.loadData());
    if (loaded) {
      this.store = loaded;
    } else {
      this.store = { tasks: seedTasks(), ui: defaultUi() };
      await this.saveData(this.store);
    }
    this.registerView(VIEW_TYPE, (leaf) => new TimelineView(leaf, this));
    this.addRibbonIcon("gantt-chart", "Open routine timeline", () => void this.openView());
    this.addCommand({
      id: "open-routine-timeline",
      name: "Open routine timeline",
      callback: () => void this.openView()
    });
    this.addCommand({
      id: "insert-routine-timeline",
      name: "Insert routine timeline into note",
      editorCallback: (editor) => editor.replaceSelection("```routine-timeline\n```\n")
    });
    this.registerMarkdownCodeBlockProcessor("routine-timeline", (source, el, ctx) => {
      ctx.addChild(new BoardChild(el, this, parseOpts(source)));
    });
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
    await this.saveData(this.store);
    for (const b of this.boards) b.render();
  }
};
var TimelineView = class extends import_obsidian.ItemView {
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
    this.board = new TimelineBoard(this.plugin, this.contentEl, { embedded: false }, this.plugin.store.ui);
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
var BoardChild = class extends import_obsidian.MarkdownRenderChild {
  constructor(el, plugin, o) {
    super(el);
    this.plugin = plugin;
    this.o = o;
    this.board = null;
  }
  onload() {
    this.board = new TimelineBoard(
      this.plugin,
      this.containerEl,
      { embedded: true, height: this.o.height },
      { groupBy: this.o.groupBy, hideDone: this.o.hideDone, groups: this.o.groups }
    );
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
var TimelineBoard = class {
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
    this.scroller = null;
    this.rowsEl = null;
    this.svg = null;
    this.nowEl = null;
    this.initialScroll = true;
    this.selectedId = null;
    this.selectedLink = null;
    this.collapsed = /* @__PURE__ */ new Set();
    this.timer = window.setInterval(() => this.updateNow(), 6e4);
    if (opts.embedded) host.addEventListener("mousedown", (e) => e.stopPropagation());
  }
  destroy() {
    window.clearInterval(this.timer);
  }
  // ---- data for the current day -------------------------------------------------
  compute() {
    var _a;
    const dayStr = this.dayStr;
    const q = this.q.trim().toLowerCase();
    const ui = this.ui;
    this.visible = this.plugin.store.tasks.filter((t) => t.date === null || t.date === dayStr).filter((t) => !ui.hideDone || !t.doneDates.includes(dayStr)).filter((t) => ui.groups.length === 0 || ui.groups.includes(groupLabel(t))).filter((t) => !q || t.title.toLowerCase().includes(q)).sort((a, b) => a.start - b.start || a.end - b.end);
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
      const keyOf = (t) => ui.groupBy === "group" ? groupLabel(t) : t.doneDates.includes(dayStr) ? "Done" : "To do";
      const buckets = /* @__PURE__ */ new Map();
      for (const t of this.visible) {
        const k = keyOf(t);
        const list = buckets.get(k);
        if (list) list.push(t);
        else buckets.set(k, [t]);
      }
      const order = (k) => ui.groupBy === "status" ? k === "To do" ? 0 : 1 : k === "No group" ? 1 : 0;
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
  }
  // ---- rendering ---------------------------------------------------------------
  render() {
    var _a, _b, _c, _d, _e, _f;
    const host = this.host;
    const search = host.querySelector(".rt-search");
    const refocus = !!search && document.activeElement === search;
    const caret = (_a = search == null ? void 0 : search.selectionStart) != null ? _a : 0;
    const prevLeft = (_c = (_b = this.scroller) == null ? void 0 : _b.scrollLeft) != null ? _c : 0;
    const prevTop = (_e = (_d = this.scroller) == null ? void 0 : _d.scrollTop) != null ? _e : 0;
    host.empty();
    host.addClass("rt-root");
    host.toggleClass("is-embedded", this.opts.embedded);
    if (this.opts.embedded) host.style.height = `${(_f = this.opts.height) != null ? _f : 420}px`;
    this.dayStr = ymd(this.day);
    this.bars.clear();
    this.compute();
    this.renderToolbar(host);
    this.renderCanvas(host);
    const s = host.querySelector(".rt-search");
    if (refocus && s) {
      s.focus();
      s.setSelectionRange(caret, caret);
    }
    const scroller = this.scroller;
    if (!scroller) return;
    if (this.initialScroll) {
      this.initialScroll = false;
      const n = /* @__PURE__ */ new Date();
      const startHour = this.dayStr === ymd(n) ? Math.max(0, n.getHours() - 1) : 6;
      window.requestAnimationFrame(() => scroller.scrollLeft = startHour * HOUR_W);
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
    const nav = head.createDiv("rt-nav");
    const prev = nav.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Previous day" } });
    (0, import_obsidian.setIcon)(prev, "chevron-left");
    prev.onclick = () => this.shift(-1);
    const today = nav.createEl("button", { text: "Today" });
    today.onclick = () => {
      this.day = /* @__PURE__ */ new Date();
      this.initialScroll = true;
      this.render();
    };
    const next = nav.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Next day" } });
    (0, import_obsidian.setIcon)(next, "chevron-right");
    next.onclick = () => this.shift(1);
    head.createDiv({
      cls: "rt-date",
      text: this.day.toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" })
    });
    const dayTasks = this.plugin.store.tasks.filter((t) => t.date === null || t.date === dayStr);
    const done = dayTasks.filter((t) => t.doneDates.includes(dayStr)).length;
    head.createDiv({ cls: "rt-count", text: `${done}/${dayTasks.length} done` });
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
    const groupName = { none: "Group", group: "By group", status: "By status" }[ui.groupBy];
    this.tool(head, "layout-list", groupName, ui.groupBy !== "none").onclick = (ev) => this.groupMenu(ev);
  }
  uiChanged() {
    if (this.opts.embedded) this.render();
    else void this.plugin.save();
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
      ["group", "Group"],
      ["status", "Status"]
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
    canvas.style.width = `${HOUR_W * 24}px`;
    canvas.style.backgroundSize = `${HOUR_W}px 100%`;
    const hours = canvas.createDiv("rt-hours");
    for (let h = 0; h < 24; h++) {
      const cell = hours.createDiv({ cls: "rt-hour", text: hourLabel(h) });
      cell.style.left = `${h * HOUR_W}px`;
      cell.style.width = `${HOUR_W}px`;
    }
    const rows = canvas.createDiv("rt-rows");
    this.rowsEl = rows;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.classList.add("rt-deps");
    rows.appendChild(svg);
    this.svg = svg;
    for (const item of this.layout) {
      if (item.kind === "head") this.renderHead(rows, item);
      else this.renderTask(rows, item.t);
    }
    if (this.layout.length === 0) {
      rows.createDiv({ cls: "rt-empty", text: "No tasks match. Use New to add one." });
    }
    const add = canvas.createDiv("rt-new");
    const addBtn = add.createEl("button", { cls: "rt-new-btn" });
    (0, import_obsidian.setIcon)(addBtn.createSpan(), "plus");
    addBtn.createSpan({ text: "New" });
    addBtn.onclick = () => this.addTask();
    this.nowEl = null;
    if (this.dayStr === ymd(/* @__PURE__ */ new Date())) {
      this.nowEl = canvas.createDiv("rt-now");
      this.updateNow();
    }
    this.drawDeps();
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
  shift(n) {
    this.day = new Date(this.day.getFullYear(), this.day.getMonth(), this.day.getDate() + n);
    this.initialScroll = true;
    this.render();
  }
  updateNow() {
    if (!this.nowEl) return;
    const d = /* @__PURE__ */ new Date();
    this.nowEl.style.left = `${px(d.getHours() * 60 + d.getMinutes())}px`;
  }
  select(id) {
    this.selectedId = id;
    this.bars.forEach((b, bid) => b.toggleClass("is-selected", bid === id));
  }
  place(bar, t) {
    bar.style.left = `${px(t.start)}px`;
    bar.style.width = `${px(t.end - t.start)}px`;
    bar.title = `${t.title || "Untitled"}
${fmt(t.start)} \u2013 ${fmt(t.end)}`;
  }
  renderTask(parent, t) {
    const row = parent.createDiv("rt-row");
    row.style.height = `${ROW_H}px`;
    const isDone = t.doneDates.includes(this.dayStr);
    const bar = row.createDiv({ cls: `rt-bar rt-c-${t.color}` });
    bar.dataset.id = t.id;
    bar.toggleClass("is-done", isDone);
    bar.toggleClass("is-selected", this.selectedId === t.id);
    const inner = bar.createDiv("rt-bar-in");
    const cb = inner.createEl("input", { cls: "rt-check", type: "checkbox" });
    cb.checked = isDone;
    cb.onchange = async () => {
      t.doneDates = cb.checked ? [...t.doneDates, this.dayStr] : t.doneDates.filter((d) => d !== this.dayStr);
      await this.plugin.save();
    };
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
        const dm = Math.round(dx / HOUR_W * 60 / SNAP) * SNAP;
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
      const x1 = px(t.end);
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
    svg.setAttribute("width", String(HOUR_W * 24));
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
    const byId = new Map(this.visible.map((t) => [t.id, t]));
    for (const t of this.visible) {
      const y2 = this.yCenter.get(t.id);
      if (y2 === void 0) continue;
      for (const depId of t.deps) {
        const dep = byId.get(depId);
        const y1 = this.yCenter.get(depId);
        if (!dep || y1 === void 0) continue;
        const x1 = px(dep.end);
        const x2 = px(t.start) - 2;
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
      (o) => o.id !== t.id && (o.date === null || o.date === this.dayStr)
    );
  }
  editTask(t) {
    new TaskModal(
      this.app(),
      { ...t, doneDates: [...t.doneDates], deps: [...t.deps] },
      this.othersFor(t),
      this.plugin.groupNames(),
      this.dayStr,
      false,
      async (draft) => {
        if (draft) {
          Object.assign(t, draft);
        } else {
          this.plugin.store.tasks = this.plugin.store.tasks.filter((x) => x.id !== t.id);
          for (const o of this.plugin.store.tasks) o.deps = o.deps.filter((d) => d !== t.id);
        }
        await this.plugin.save();
      }
    ).open();
  }
  addTask() {
    const now = /* @__PURE__ */ new Date();
    const isToday = this.dayStr === ymd(now);
    const rounded = Math.ceil((now.getHours() * 60 + now.getMinutes()) / SNAP) * SNAP;
    const start = clamp(isToday ? rounded : 9 * 60, 0, DAY - 60);
    const t = {
      id: uid(),
      title: "",
      start,
      end: start + 60,
      date: this.dayStr,
      deps: [],
      group: this.ui.groups.length === 1 && this.ui.groups[0] !== "No group" ? this.ui.groups[0] : "",
      color: "blue",
      doneDates: []
    };
    new TaskModal(
      this.app(),
      t,
      this.othersFor(t),
      this.plugin.groupNames(),
      this.dayStr,
      true,
      async (draft) => {
        if (!draft) return;
        if (!draft.title.trim()) draft.title = "Untitled";
        this.plugin.store.tasks.push(draft);
        await this.plugin.save();
      }
    ).open();
  }
  app() {
    return this.plugin.app;
  }
};
var TaskModal = class extends import_obsidian.Modal {
  constructor(app, draft, others, groups, dayStr, isNew, onDone) {
    super(app);
    this.draft = draft;
    this.others = others;
    this.groups = groups;
    this.dayStr = dayStr;
    this.isNew = isNew;
    this.onDone = onDone;
  }
  onOpen() {
    const { contentEl } = this;
    const d = this.draft;
    contentEl.createEl("h3", { text: this.isNew ? "New task" : "Edit task" });
    new import_obsidian.Setting(contentEl).setName("Title").addText((t) => t.setValue(d.title).onChange((v) => d.title = v));
    new import_obsidian.Setting(contentEl).setName("Start").addText((t) => {
      t.inputEl.type = "time";
      t.setValue(hhmm(d.start)).onChange((v) => {
        const m = parseHHMM(v);
        if (m !== null) d.start = m;
      });
    });
    new import_obsidian.Setting(contentEl).setName("End").addText((t) => {
      t.inputEl.type = "time";
      t.setValue(hhmm(d.end >= DAY ? DAY - 1 : d.end)).onChange((v) => {
        const m = parseHHMM(v);
        if (m !== null) d.end = m;
      });
    });
    const listId = "rt-groups-list";
    new import_obsidian.Setting(contentEl).setName("Group").addText((t) => {
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
    new import_obsidian.Setting(contentEl).setName("Repeat every day").setDesc("Daily routines keep one time slot; ticking them off is tracked per day.").addToggle((t) => t.setValue(d.date === null).onChange((v) => d.date = v ? null : this.dayStr));
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
    new import_obsidian.Setting(contentEl).setName("Comes after").setDesc("Draws a connector from each chosen task into this one. You can also drag from a bar's end dot.").addDropdown((dd) => {
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
    const actions = new import_obsidian.Setting(contentEl);
    actions.addButton(
      (b) => b.setButtonText("Save").setCta().onClick(async () => {
        if (d.end <= d.start) {
          new import_obsidian.Notice("End time must be after start time.");
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
