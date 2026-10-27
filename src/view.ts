import { ItemView, MarkdownRenderChild } from "obsidian";
import { VIEW_TYPE } from "./util";
import { TimelineBoard } from "./board";

export class TimelineView extends ItemView {
  declare plugin: any;
  declare board: any;
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
}
export class BoardChild extends MarkdownRenderChild {
  declare plugin: any;
  declare o: any;
  declare board: any;
  constructor(el, plugin, o) {
    super(el);
    this.plugin = plugin;
    this.o = o;
    this.board = null;
  }
  onload() {
    let ui: any = { groupBy: this.o.groupBy, hideDone: this.o.hideDone, groups: this.o.groups, layout: this.o.layout, zoom: this.o.zoom, cal: this.o.cal, sidebar: false, showTasks: true, sortKey: null, sortDir: "asc", colFilters: {}, frozenKey: null, wrapKeys: [], colorRules: [], calc: {} };
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
}
