// Headless test harness: a jsdom window plus a stub of the `obsidian` module, enough to load main.js
// and drive the plugin, its views and modals without Obsidian.
// Usage in a test:  const { load, w } = require("./harness"); const Mod = load();
const { JSDOM } = require("jsdom");
const Module = require("module");
const path = require("path");
const dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true });
const w = dom.window;
global.window = w;
global.document = w.document;
const P = w.HTMLElement.prototype;
P.createEl = function (tag, o = {}) {
  const e = w.document.createElement(tag);
  if (o.cls) e.className = o.cls;
  if (o.text != null) e.textContent = o.text;
  if (o.type) e.type = o.type;
  if (o.attr) for (const k in o.attr) e.setAttribute(k, o.attr[k]);
  this.appendChild(e);
  return e;
};
P.createDiv = function (o) { return this.createEl("div", typeof o === "string" ? { cls: o } : o); };
P.createSpan = function (o) { return this.createEl("span", typeof o === "string" ? { cls: o } : o); };
P.empty = function () { while (this.firstChild) this.removeChild(this.firstChild); };
P.addClass = function (c) { this.classList.add(c); };
P.removeClass = function (c) { this.classList.remove(c); };
P.toggleClass = function (c, on) { this.classList.toggle(c, !!on); };
P.setPointerCapture = function () {};
w.SVGElement.prototype.addClass = P.addClass;
w.HTMLCanvasElement.prototype.getContext = () => null;

const notices = [];
class Plugin {
  constructor(app) { this.app = app || {}; this._data = null; }
  async loadData() { return this._data; }
  async saveData(d) { this._data = JSON.parse(JSON.stringify(d)); }
  registerView(type, f) { global.__viewFactory = f; }
  addRibbonIcon() {}
  addCommand(c) { (this._commands = this._commands || []).push(c); }
  registerMarkdownCodeBlockProcessor() {}
  addSettingTab() {}
  registerInterval() {}
  registerEvent() {}
}
class Menu {
  constructor() { this.items = []; }
  addItem(f) {
    const it = { title: "", setTitle(t) { this.title = t; return this; }, setChecked() { return this; }, setIcon() { return this; }, setDisabled() { return this; }, onClick(cb) { this.cb = cb; return this; } };
    f(it); this.items.push(it); return this;
  }
  addSeparator() {}
  showAtMouseEvent() {}
  showAtPosition() {}
}
class Setting {
  constructor(el) { this.el = el.createDiv("setting-item"); this.nameEl = this.el.createDiv("setting-item-name"); this.descEl = this.el.createDiv("setting-item-description"); this.controlEl = this.el.createDiv("setting-item-control"); }
  setName(n) { this.nameEl.textContent = n; return this; }
  setDesc(d) { this.descEl.textContent = d; return this; }
  setHeading() { return this; }
  addText(cb) { const inputEl = this.controlEl.createEl("input"); cb({ inputEl, setValue(v) { inputEl.value = v; return this; }, setPlaceholder(p) { inputEl.placeholder = p; return this; }, onChange(f) { inputEl.oninput = () => f(inputEl.value); return this; } }); return this; }
  addToggle(cb) { const t = { v: false, setValue(v) { this.v = v; return this; }, onChange(f) { this.f = f; return this; } }; cb(t); return this; }
  addDropdown(cb) { const sel = this.controlEl.createEl("select"); cb({ addOption(v, l) { sel.createEl("option", { text: l, attr: { value: v } }); return this; }, setValue(v) { sel.value = v; return this; }, onChange(f) { sel.onchange = () => f(sel.value); return this; } }); return this; }
  addButton(cb) { const buttonEl = this.controlEl.createEl("button"); cb({ buttonEl, setButtonText(t) { buttonEl.textContent = t; return this; }, setCta() { return this; }, setWarning() { return this; }, setIcon() { return this; }, setTooltip() { return this; }, onClick(f) { buttonEl.onclick = f; return this; } }); return this; }
  addExtraButton(cb) { return this.addButton(cb); }
}
const stub = {
  Plugin, Menu, Setting,
  PluginSettingTab: class { constructor(app, plugin) { this.app = app; this.plugin = plugin; this.containerEl = w.document.body.createDiv(); } },
  ItemView: class { constructor(leaf) { this.leaf = leaf; this.contentEl = w.document.body.createDiv(); } },
  MarkdownRenderChild: class { constructor(el) { this.containerEl = el; } },
  Modal: class { constructor(app) { this.app = app; this.contentEl = w.document.body.createDiv(); } open() { this.onOpen(); } close() { this.contentEl.remove(); } },
  Notice: class { constructor(msg) { notices.push(String(msg)); } },
  requestUrl: async () => ({ text: "" }),
  Platform: { isPhone: !!process.env.PHONE, isMobile: !!process.env.PHONE },
  setIcon(el, n) { el.setAttribute("data-icon", n); }
};
const orig = Module._resolveFilename;
Module._resolveFilename = function (r, ...a) { return r === "obsidian" ? "obsidian" : orig.call(this, r, ...a); };
require.cache.obsidian = { id: "obsidian", filename: "obsidian", loaded: true, exports: stub };

// A fake vault around one shared "file system" (a Map of path -> text), so two plugin instances can
// act as two devices sharing a synced vault file.
function fakeApp(fs) {
  const listeners = { modify: [], create: [] };
  const vault = {
    adapter: { exists: async (p) => fs.has(p), read: async (p) => { if (!fs.has(p)) throw new Error("ENOENT"); return fs.get(p); } },
    getAbstractFileByPath: (p) => fs.has(p) ? { path: p } : null,
    modify: async (f, text) => { fs.set(f.path, text); for (const cb of listeners.modify) cb(f); },
    create: async (p, text) => { fs.set(p, text); const f = { path: p }; for (const cb of listeners.create) cb(f); return f; },
    createFolder: async () => {},
    on: (ev, cb) => { listeners[ev].push(cb); return {}; }
  };
  return { vault, workspace: { onLayoutReady: (cb) => cb(), getLeavesOfType: () => [], getLeaf: () => ({ setViewState: async () => {} }), revealLeaf() {} }, listeners };
}
const load = () => require(path.resolve(process.argv[2] || path.join(__dirname, "..", "main.js")));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mkTask = (id, title, start, end, date, extra = {}) => ({ id, title, start, end, date, days: null, from: null, until: null, count: null, custom: {}, notes: "", deps: [], group: "", color: "blue", doneDates: [], st: {}, log: {}, updatedAt: 0, ...extra });
async function openBoard(Mod, data, app) {
  const plugin = new Mod.default(app || {});
  plugin._data = data;
  await plugin.onload();
  const view = global.__viewFactory({});
  await view.onOpen();
  return { plugin, board: view.board };
}
function run(name, fn) {
  fn().then(() => { console.log(`PASS: ${name}`); process.exit(0); }).catch((e) => { console.error(`FAIL: ${name}\n`, e.stack || e); process.exit(1); });
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
module.exports = { load, w, stub, notices, fakeApp, sleep, mkTask, openBoard, run, assert };
