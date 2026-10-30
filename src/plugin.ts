import { Notice, Platform, Plugin, TFile, requestUrl } from "obsidian";
import { DEFAULT_SYNC_PATH, LAYOUT_LABEL, TOMBSTONE_MS, VIEW_TYPE, cleanNotify, cleanSyncPath, cleanView, clockLabel, defaultNotify, defaultStore, doneStatus, idleStatus, isPristineSeed, nowOccurrence, occSpan, progressStatus, statusOf, withStatus, mergeAppData, normalizeAppData, occurs, parseOpts, playTone, seedTasks, uid, ymd } from "./util";
import { expandIcs, parseIcs } from "./ics";
import { BoardChild, TimelineView } from "./view";
import { BaseSwitcherModal, RoutineSettingTab } from "./modals";

export class RoutineTimelinePlugin extends Plugin {
  declare appData: any;
  declare syncPath: any;
  declare syncText: any;
  declare syncTimer: any;
  declare syncReady: any;
  declare snap: any;
  declare notify: any;
  declare timer: any;
  declare clock: any;
  declare nowSig: string;
  declare clockSaved: number;
  declare notified: any;
  declare notifiedDay: any;
  declare boards: any;
  declare feedData: any;
  declare expandCache: any;
  declare reminderTimer: any;
  constructor(app, manifest) {
    super(app, manifest);
    const id = uid();
    this.appData = { bases: [{ id, name: "Routine", store: defaultStore([]) }], activeBaseId: id };
    this.syncPath = DEFAULT_SYNC_PATH;
    this.syncText = null;
    this.syncTimer = null;
    this.syncReady = false;
    // What each task looked like at the last save, to stamp the ones that changed (see stampChanges).
    this.snap = /* @__PURE__ */ new Map();
    this.notify = defaultNotify();
    // The one running stopwatch on this device: { taskId, baseId, date, startedAt }. Per device,
    // like reminders, so it is kept in local data and never in the synced file.
    this.timer = null;
    // Statuses that follow the clock (per device): on/off, and when this device last applied them.
    this.clock = { autoStatus: true, last: 0 };
    this.nowSig = "";
    this.notified = /* @__PURE__ */ new Set();
    this.notifiedDay = "";
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
    const raw = await this.loadData();
    if (raw && typeof raw.syncPath === "string") this.syncPath = cleanSyncPath(raw.syncPath);
    if (raw) this.notify = cleanNotify(raw.notify);
    const tm = raw && raw.timer;
    if (tm && typeof tm === "object" && typeof tm.taskId === "string" && typeof tm.baseId === "string" && typeof tm.date === "string" && Number.isFinite(tm.startedAt)) this.timer = { taskId: tm.taskId, baseId: tm.baseId, date: tm.date, startedAt: tm.startedAt };
    const ck = raw && raw.clock;
    if (ck && typeof ck === "object") this.clock = { autoStatus: ck.autoStatus !== false, last: Number.isFinite(ck.last) ? ck.last : 0 };
    const local = normalizeAppData(raw);
    const fromVault = await this.readSyncFile();
    if (fromVault) {
      this.appData = local && !isPristineSeed(local) ? mergeAppData(local, fromVault) : fromVault;
      this.applySynced(this.appData, local && local.activeBaseId, local);
    } else if (local) {
      this.appData = local;
    } else {
      const id = uid();
      this.appData = { bases: [{ id, name: "Routine", store: defaultStore(seedTasks()) }], activeBaseId: id };
      await this.saveLocal();
    }
    this.takeSnapshot();
    const pushLocal = !fromVault && local && !isPristineSeed(local);
    if (this.app && this.app.workspace) this.app.workspace.onLayoutReady(() => void this.startSync(pushLocal).then(() => this.clockTick()));
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
      id: "toggle-timer",
      name: "Start or stop the timer for the selected task",
      callback: () => {
        const board = [...this.boards].find((b) => !b.opts.embedded) || [...this.boards][0];
        const id = board && (board.selectedId || board.peekId);
        const t = id && this.store.tasks.find((x) => x.id === id);
        if (t) void this.toggleTimer(t, board.statusKey(t));
        else if (this.timer) void this.stopTimer();
        else new Notice("Select a task first.");
      }
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
    this.registerInterval(window.setInterval(() => this.checkReminders(), 15e3));
    this.scheduleReminderTick();
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
    if (!feed.url) {
      this.feedData.set(feed.id, { events: prev ? prev.events : [], fetched: prev ? prev.fetched : 0, error: "Address not set on this device" });
      return;
    }
    try {
      const res = await requestUrl({ url: feed.url.replace(/^webcal:/i, "https:"), method: "GET" });
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
    await this.persist();
    await this.fetchFeed(f);
    for (const b of this.boards) b.render();
  }
  async removeFeed(id) {
    this.store.feeds = this.store.feeds.filter((f) => f.id !== id);
    this.feedData.delete(id);
    this.expandCache.clear();
    await this.save();
  }
  async setFeedUrl(id, url) {
    const f = this.store.feeds.find((x) => x.id === id);
    if (!f) return;
    f.url = url.trim();
    await this.saveLocal();
    await this.fetchFeed(f);
    for (const b of this.boards) b.render();
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
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }
  groupNames() {
    return [...new Set<string>(this.store.tasks.map((t) => t.group).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }
  async save() {
    await this.persist();
    for (const b of this.boards) b.render();
  }
  saveLocal() {
    return this.saveData({ ...this.appData, syncPath: this.syncPath, notify: this.notify, timer: this.timer, clock: this.clock });
  }
  // ---- task reminders ------------------------------------------------------------------
  // Fires once per task per day, inside a 2-minute window after the reminder time, so opening
  // Obsidian at noon doesn't replay the whole morning.
  // Wake right at each minute boundary so a 9:00 reminder fires at 9:00:00, not up to 15s late.
  // The 15s interval stays as a backstop in case the OS throttles timers.
  scheduleReminderTick() {
    const delay = 6e4 - Date.now() % 6e4 + 50;
    this.reminderTimer = window.setTimeout(() => {
      this.checkReminders();
      this.tickTimer();
      void this.clockTick();
      this.scheduleReminderTick();
    }, delay);
  }
  // ---- the clock: statuses that follow the time, and the task happening now ------------------
  async clockTick(now = Date.now()) {
    const changed = await this.applyClockStatuses(now);
    const sig = this.nowSignature(new Date(now));
    if (changed) {
      this.nowSig = sig;
      await this.save();
    } else if (sig !== this.nowSig) {
      // A task just began or ended: re-render so the highlight moves to the new current task.
      this.nowSig = sig;
      for (const b of this.boards) b.render();
    } else {
      for (const b of this.boards) b.updateNow(now);
    }
  }
  nowSignature(now) {
    const ids = [];
    for (const t of this.store.tasks) {
      const o = nowOccurrence(t, now);
      if (o) ids.push(`${t.id}@${o.key}`);
    }
    return ids.sort().join(",");
  }
  // When a task's start time passes, "Not started" becomes "In progress"; when its end passes,
  // "Not started" or "In progress" becomes done. Only the moments that passed since this device
  // last looked are applied, so a status you change by hand afterwards is left alone. Opening
  // Obsidian catches up on what happened while it was closed (up to two days back; the first run
  // looks back to midnight).
  async applyClockStatuses(now = Date.now()) {
    const c = this.clock;
    const today0 = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
    const from = Math.max(c.last || today0, now - 2 * 864e5);
    c.last = now;
    if (!c.autoStatus || now <= from) {
      await this.saveClockMark(now);
      return false;
    }
    let changed = false;
    for (const base of this.appData.bases) {
      const sts = base.store.statuses;
      const idle = idleStatus(sts), prog = progressStatus(sts), done = doneStatus(sts);
      if (!idle || !done) continue;
      const d0 = new Date(from);
      for (const t of base.store.tasks) {
        for (let d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - 1); d.getTime() <= now; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
          if (!occurs(t, d)) continue;
          const { s, e } = occSpan(t, d);
          const key = t.date !== null ? t.date : ymd(d);
          const cur = statusOf(t, key, sts);
          if (e > from && e <= now) {
            if (cur.id === idle.id || prog && cur.id === prog.id) {
              withStatus(t, key, done, sts);
              changed = true;
            }
          } else if (prog && s > from && s <= now && e > now && cur.id === idle.id) {
            withStatus(t, key, prog, sts);
            changed = true;
          }
        }
      }
    }
    if (!changed) await this.saveClockMark(now);
    return changed;
  }
  // Remember the last check without rewriting data.json every minute (a status change saves anyway).
  async saveClockMark(now) {
    if (now - (this.clockSaved || 0) < 10 * 6e4) return;
    this.clockSaved = now;
    await this.saveLocal();
  }
  // ---- time tracking: a stopwatch per task, logging actual minutes per day ----------------
  isRunning(t) {
    return !!this.timer && this.timer.taskId === t.id;
  }
  runningMinutes(now = Date.now()) {
    return this.timer ? Math.floor(Math.max(0, now - this.timer.startedAt) / 6e4) : 0;
  }
  // Minutes spent on a task on a day: what was logged, plus the running stopwatch if it's this one.
  actualOn(t, date, now = Date.now()) {
    const logged = t.log && t.log[date] || 0;
    return logged + (this.isRunning(t) && this.timer.date === date ? this.runningMinutes(now) : 0);
  }
  async startTimer(t, date) {
    if (this.timer) await this.stopTimer();
    this.timer = { taskId: t.id, baseId: this.appData.activeBaseId, date, startedAt: Date.now() };
    await this.saveLocal();
    for (const b of this.boards) b.render();
  }
  async stopTimer(now = Date.now()) {
    const tm = this.timer;
    if (!tm) return;
    this.timer = null;
    const base = this.appData.bases.find((b) => b.id === tm.baseId);
    const t = base && base.store.tasks.find((x) => x.id === tm.taskId);
    const mins = Math.round(Math.max(0, now - tm.startedAt) / 6e4);
    if (t && mins > 0) t.log = { ...t.log, [tm.date]: (t.log && t.log[tm.date] || 0) + mins };
    await this.save();
  }
  async toggleTimer(t, date) {
    if (this.isRunning(t)) await this.stopTimer();
    else await this.startTimer(t, date);
  }
  // Once a minute, refresh the running counters in place instead of re-rendering everything.
  tickTimer() {
    if (!this.timer) return;
    for (const b of this.boards) b.updateElapsed();
  }
  checkReminders(now = /* @__PURE__ */ new Date()) {
    const n = this.notify;
    if (!n.enabled) return;
    const today = ymd(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (this.notifiedDay !== today) {
      this.notified.clear();
      this.notifiedDay = today;
    }
    const offsets = n.lead > 0 ? n.atStart ? [n.lead, 0] : [n.lead] : [0];
    for (const base of this.appData.bases) {
      for (const t of base.store.tasks) {
        if (!occurs(t, now)) continue;
        if (t.doneDates.includes(t.date !== null ? t.date : today)) continue;
        for (const off of offsets) {
          const at = t.start - off;
          if (at < 0 || nowMin < at || nowMin > at + 1) continue;
          const key = `${base.id}:${t.id}:${today}:${off}`;
          if (this.notified.has(key)) continue;
          this.notified.add(key);
          this.fireReminder(t, off);
        }
      }
    }
  }
  fireReminder(t, off) {
    const title = off ? `In ${off} min: ${t.title || "Untitled"}` : `Starting now: ${t.title || "Untitled"}`;
    const body = `${clockLabel(t.start)} \u2013 ${clockLabel(t.end)}${t.group ? ` \xB7 ${t.group}` : ""}`;
    this.showReminder(title, body);
  }
  // Desktop: a real system notification (the OS decides how long it stays). Phones: Obsidian
  // gives plugins no system notifications, so an in-app banner while the app is open.
  showReminder(title, body) {
    const sound = this.notify.sound;
    const N = window.Notification;
    const mobile = !!(Platform && Platform.isMobile);
    const canSystem = !!N && !mobile && N.permission !== "denied";
    const banner = () => {
      const frag = createFragment();
      frag.createDiv({ cls: "rt-notice-title", text: title });
      frag.createDiv({ cls: "rt-notice-body", text: body });
      new Notice(frag, 15e3);
    };
    if (canSystem) {
      const send = () => {
        const note = new N(title, { body, silent: sound !== "system" });
        note.onclick = () => {
          window.focus();
          note.close();
          void this.openView();
        };
      };
      if (N.permission === "granted") send();
      else void N.requestPermission().then((p) => p === "granted" ? send() : banner());
    } else {
      banner();
    }
    if (sound === "system") {
      if (!canSystem) playTone("chime");
    } else if (sound !== "none") {
      playTone(sound);
    }
  }
  async persist() {
    this.stampChanges();
    await this.saveLocal();
    this.queueSyncWrite();
  }
  // The rest of the plugin edits tasks in place and then calls save(), so timestamps are set here by
  // comparing each task with how it looked at the last save, instead of at every edit site.
  storeRest(st) {
    return JSON.stringify({ v: st.views, a: st.activeView, s: st.statuses, p: st.props, o: st.propOrder, f: st.feeds.map((f) => ({ ...f, url: "" })) });
  }
  takeSnapshot() {
    this.snap = /* @__PURE__ */ new Map();
    for (const b of this.appData.bases) {
      const tasks = /* @__PURE__ */ new Map();
      for (const t of b.store.tasks) tasks.set(t.id, JSON.stringify({ ...t, updatedAt: 0 }));
      this.snap.set(b.id, { tasks, rest: this.storeRest(b.store) });
    }
  }
  stampChanges() {
    const now = Date.now();
    for (const b of this.appData.bases) {
      const prev = this.snap.get(b.id);
      const st = b.store;
      const seen = /* @__PURE__ */ new Set();
      for (const t of st.tasks) {
        seen.add(t.id);
        const j = JSON.stringify({ ...t, updatedAt: 0 });
        if (!prev || prev.tasks.get(t.id) !== j) t.updatedAt = now;
      }
      if (prev) {
        for (const id of prev.tasks.keys()) if (!seen.has(id)) st.deleted = { ...st.deleted, [id]: now };
      }
      if (!prev || prev.rest !== this.storeRest(st)) st.updatedAt = now;
      for (const id of Object.keys(st.deleted)) if (now - st.deleted[id] >= TOMBSTONE_MS) delete st.deleted[id];
    }
    this.takeSnapshot();
  }
  // ---- vault sync file ---------------------------------------------------------------
  // Feed addresses are secrets, so they stay in this device's data.json and out of the vault file.
  syncJson() {
    const bases = this.appData.bases.map((b) => ({ ...b, store: { ...b.store, feeds: b.store.feeds.map(({ url, ...f }) => f) } }));
    return JSON.stringify({ version: 2, bases, activeBaseId: this.appData.activeBaseId, deletedBases: this.appData.deletedBases }, null, 1);
  }
  async readSyncFile() {
    const adapter = this.app && this.app.vault && this.app.vault.adapter;
    if (!adapter) return null;
    try {
      if (!await adapter.exists(this.syncPath)) return null;
      const text = await adapter.read(this.syncPath);
      const data = normalizeAppData(JSON.parse(text));
      if (data) this.syncText = text;
      return data;
    } catch (e) {
      console.error("Routine Timeline: could not read", this.syncPath, e);
      return null;
    }
  }
  // Keep this device's active database when the synced copy still has it, so switching
  // databases on the phone doesn't yank the desktop along with it.
  applySynced(data, keepActiveId, prev = this.appData) {
    if (keepActiveId && data.bases.some((b) => b.id === keepActiveId)) data.activeBaseId = keepActiveId;
    const urls = /* @__PURE__ */ new Map();
    if (prev) for (const b of prev.bases) for (const f of b.store.feeds) if (f.url) urls.set(f.id, f.url);
    for (const b of data.bases) for (const f of b.store.feeds) if (!f.url && urls.has(f.id)) f.url = urls.get(f.id);
    this.appData = data;
    this.takeSnapshot();
  }
  // Take in a newer copy of the vault file: merge it with what this device has, and if the result
  // differs from the file (this device had edits of its own), write it back.
  async takeIn(data, text) {
    const merged = mergeAppData(this.appData, data);
    this.applySynced(merged, this.appData.activeBaseId);
    this.expandCache.clear();
    const mine = this.syncJson();
    this.syncText = text;
    if (mine !== text) this.queueSyncWrite();
    await this.saveLocal();
    for (const b of this.boards) b.render();
  }
  async startSync(pushLocal) {
    const vault = this.app.vault;
    const onChange = (f) => {
      if (f && f.path === this.syncPath) void this.reloadFromVault();
    };
    this.registerEvent(vault.on("modify", onChange));
    this.registerEvent(vault.on("create", onChange));
    this.syncReady = true;
    const data = await this.readSyncFile();
    if (data) {
      await this.takeIn(data, this.syncText);
    } else if (pushLocal) {
      await this.writeSyncFile();
    }
  }
  async reloadFromVault() {
    const adapter = this.app.vault.adapter;
    let text;
    try {
      text = await adapter.read(this.syncPath);
    } catch {
      return;
    }
    if (text === this.syncText) return;
    let data;
    try {
      data = normalizeAppData(JSON.parse(text));
    } catch {
      return;
    }
    if (!data) return;
    await this.takeIn(data, text);
  }
  queueSyncWrite() {
    if (!this.syncReady) return;
    if (this.syncTimer) window.clearTimeout(this.syncTimer);
    this.syncTimer = window.setTimeout(() => {
      this.syncTimer = null;
      void this.writeSyncFile();
    }, 400);
  }
  async writeSyncFile() {
    const vault = this.app.vault;
    const text = this.syncJson();
    if (text === this.syncText) return;
    this.syncText = text;
    try {
      const existing = vault.getAbstractFileByPath(this.syncPath);
      if (existing) {
        if (existing instanceof TFile) await vault.modify(existing, text);
      } else {
        const dir = this.syncPath.includes("/") ? this.syncPath.slice(0, this.syncPath.lastIndexOf("/")) : "";
        if (dir && !vault.getAbstractFileByPath(dir)) await vault.createFolder(dir).catch(() => {});
        await vault.create(this.syncPath, text);
      }
    } catch (e) {
      console.error("Routine Timeline: could not write", this.syncPath, e);
    }
  }
  async setSyncPath(path) {
    const next = cleanSyncPath(path);
    if (next === this.syncPath) return;
    this.syncPath = next;
    this.syncText = null;
    const data = await this.readSyncFile();
    if (data) await this.takeIn(data, this.syncText);
    else await this.writeSyncFile();
    await this.saveLocal();
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
    const b = { id: uid(), name: this.uniqueBaseName(name && name.trim() ? name.trim() : "New database"), store, updatedAt: Date.now() };
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
    b.updatedAt = Date.now();
    await this.save();
  }
  async deleteBase(id) {
    if (this.appData.bases.length <= 1) return;
    this.appData.bases = this.appData.bases.filter((b) => b.id !== id);
    this.appData.deletedBases = { ...this.appData.deletedBases, [id]: Date.now() };
    if (this.appData.activeBaseId === id) this.appData.activeBaseId = this.appData.bases[0].id;
    await this.save();
  }
  onunload() {
    if (this.reminderTimer) window.clearTimeout(this.reminderTimer);
    if (this.syncTimer) {
      window.clearTimeout(this.syncTimer);
      this.syncTimer = null;
      void this.writeSyncFile();
    }
  }
}
