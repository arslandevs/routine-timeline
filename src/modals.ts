import { Modal, Notice, Platform, PluginSettingTab, setIcon, Setting } from "obsidian";
import { COLORS, DAY, DEFAULT_LEN, DEFAULT_SYNC_PATH, DOW, NOTIFY_LEADS, NOTIFY_SOUNDS, PROP_KEYS, clockLabel, defaultProps, endClock, fmtDur, hhmm, overnightEnd, parseHHMM, parseYmd, playTone, statusOf, withStatus } from "./util";

export class AddFeedModal extends Modal {
  declare onAdd: any;
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
    new Setting(contentEl).setName("Name").addText((tx) => tx.setPlaceholder("e.g. Work").onChange((v) => name = v));
    new Setting(contentEl).setName("iCal address").addText((tx) => tx.setPlaceholder("https://calendar.google.com/calendar/ical/\u2026/basic.ics").onChange((v) => url = v));
    const row = new Setting(contentEl).setName("Color");
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
    new Setting(contentEl).addButton(
      (b) => b.setButtonText("Add").setCta().onClick(async () => {
        if (!/^(https?|webcal):\/\//i.test(url.trim())) {
          new Notice("Paste a full address that starts with https:// or webcal://");
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
}
export class ColorPickModal extends Modal {
  declare title: any;
  declare current: any;
  declare onPick: any;
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
}
export class EventModal extends Modal {
  declare ev: any;
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
      new Setting(contentEl).addButton((b) => b.setButtonText("Open link").onClick(() => window.open(e.url)));
    }
  }
  onClose() {
    this.contentEl.empty();
  }
}
export class RoutineSettingTab extends PluginSettingTab {
  declare plugin: any;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("rt-settings");
    this.notifySection(containerEl);
    this.calendarSection(containerEl);
    this.syncSection(containerEl);
  }
  notifySection(el) {
    const plugin = this.plugin;
    const n = plugin.notify;
    const save = async (redraw) => {
      await plugin.saveLocal();
      if (redraw) this.display();
    };
    new Setting(el).setName("Notifications").setHeading();
    new Setting(el).setName("Task reminders").setDesc("Get a notification when a task is about to start. This setting is saved on this device only, so you can pick which devices remind you.").addToggle((tg) => tg.setValue(n.enabled).onChange(async (v) => {
      n.enabled = v;
      await save(true);
    }));
    if (!n.enabled) return;
    new Setting(el).setName("Remind me").addDropdown((dd) => {
      for (const m of NOTIFY_LEADS) dd.addOption(String(m), m ? `${m} minutes before` : "When it starts");
      dd.setValue(String(n.lead)).onChange(async (v) => {
        n.lead = Number(v);
        await save(true);
      });
    });
    if (n.lead > 0) {
      new Setting(el).setName("Also notify when it starts").addToggle((tg) => tg.setValue(n.atStart).onChange(async (v) => {
        n.atStart = v;
        await save(false);
      }));
    }
    new Setting(el).setName("Sound").setDesc("System default uses your computer's own notification sound and settings.").addDropdown((dd) => {
      for (const k in NOTIFY_SOUNDS) dd.addOption(k, NOTIFY_SOUNDS[k]);
      dd.setValue(n.sound).onChange(async (v) => {
        n.sound = v;
        await save(false);
        if (v !== "system" && v !== "none") playTone(v);
      });
    }).addExtraButton((b) => b.setIcon("volume-2").setTooltip("Play sound").onClick(() => playTone(n.sound === "system" ? "chime" : n.sound)));
    const mobile = !!(Platform && Platform.isMobile);
    const desc = mobile ? "On phones, Obsidian lets plugins show reminders only inside the app while it's open, as a banner with sound. There are no background system notifications." : "How long a notification stays on screen follows your system settings. On macOS, set Obsidian to Alerts in System Settings > Notifications to keep it until you dismiss it. Reminders only fire while Obsidian is running.";
    new Setting(el).setName("Test").setDesc(desc).addButton((b) => b.setButtonText("Send test notification").onClick(() => {
      plugin.showReminder("Starting now: Test task", `${clockLabel(9 * 60)} \u2013 ${clockLabel(9 * 60 + 30)} \xB7 Routine Timeline`);
    }));
  }
  calendarSection(el) {
    new Setting(el).setName("Status").setHeading();
    new Setting(el).setName("Status follows the clock").setDesc("When a task's start time arrives, Not started becomes In progress; when it ends, it becomes Done. Only moments that pass are applied, so a status you change by hand stays as you set it. Saved on this device only.").addToggle((tg) => tg.setValue(this.plugin.clock.autoStatus).onChange(async (v) => {
      this.plugin.clock.autoStatus = v;
      this.plugin.clock.last = Date.now();
      await this.plugin.saveLocal();
    }));
    new Setting(el).setName("Calendars").setDesc("Show Google Calendar events (or any .ics feed) in the Calendar layout. In Google Calendar open Settings, pick a calendar and copy its Secret address in iCal format. It is read-only and refreshes every 30 minutes. Treat the address like a password.").setHeading();
    for (const f of this.plugin.store.feeds) {
      const data = this.plugin.feedData.get(f.id);
      const status = !f.url ? "This calendar came from another device. Its address is kept out of the synced file, so paste it here too." : data ? data.error ? `Error: ${data.error}` : `${data.events.length} events, updated ${new Date(data.fetched).toLocaleTimeString()}` : "Not loaded yet";
      const row = new Setting(el).setName(f.name).setDesc(status);
      if (!f.url) {
        let u = "";
        row.addText((t) => {
          t.inputEl.addClass("rt-setting-path");
          t.setPlaceholder("https://calendar.google.com/calendar/ical/...").onChange((v) => {
            u = v;
          });
        }).addButton((b) => b.setButtonText("Set address").setCta().onClick(async () => {
          if (!u.trim()) return;
          await this.plugin.setFeedUrl(f.id, u);
          this.display();
        }));
      }
      row.addToggle((tg) => tg.setValue(f.visible).onChange(async (v) => {
        f.visible = v;
        await this.plugin.save();
      })).addButton((b) => b.setButtonText("Remove").setWarning().onClick(async () => {
        await this.plugin.removeFeed(f.id);
        this.display();
      }));
    }
    new Setting(el).addButton((b) => b.setButtonText("Add calendar").setCta().onClick(() => {
      new AddFeedModal(this.app, async (n, u, c) => {
        await this.plugin.addFeed(n, u, c);
        this.display();
      }).open();
    })).addButton((b) => b.setButtonText("Refresh now").onClick(async () => {
      await this.plugin.refreshFeeds();
      this.display();
    }));
  }
  syncSection(el) {
    new Setting(el).setName("Sync").setHeading();
    let pathInput = this.plugin.syncPath;
    new Setting(el).setName("Data file").setDesc("Your tasks, databases and views are saved in this vault file, so any sync that carries your notes (LiveSync, Obsidian Sync, Remotely Save, iCloud) also carries them to your phone. Use the same path on every device. Edits made on two devices are merged task by task. Calendar addresses, reminders and the timer stay on each device.").addText((t) => {
      t.inputEl.addClass("rt-setting-path");
      t.setPlaceholder(DEFAULT_SYNC_PATH).setValue(this.plugin.syncPath).onChange((v) => {
        pathInput = v;
      });
    }).addButton((b) => b.setButtonText("Apply").onClick(async () => {
      await this.plugin.setSyncPath(pathInput);
      this.display();
    }));
  }
}
export class BaseSwitcherModal extends Modal {
  declare plugin: any;
  declare renameId: any;
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
      setIcon(main.createSpan({ cls: "rt-base-icon" }), "database");
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
      setIcon(renameBtn, "pencil");
      renameBtn.onclick = (e) => {
        e.stopPropagation();
        this.renameId = b.id;
        this.draw();
      };
      const delBtn = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Delete" } });
      setIcon(delBtn, "trash-2");
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
    const addRow = new Setting(contentEl).setName("New database").addText((t) => {
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
}
export class ConfirmModal extends Modal {
  declare title: any;
  declare message: any;
  declare onConfirm: any;
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
    const row = new Setting(contentEl);
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
}
export class EditTasksModal extends Modal {
  declare count: any;
  declare groups: any;
  declare groupLabelText: any;
  declare onApply: any;
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
    new Setting(contentEl).setName(this.groupLabelText).setDesc("Leave empty to keep each task's current value.").addText((t) => {
      t.inputEl.setAttribute("list", listId);
      t.setPlaceholder("e.g. Work").onChange((v) => group = v.trim() ? v.trim() : null);
    });
    const list = contentEl.createEl("datalist", { attr: { id: listId } });
    for (const g of this.groups) list.createEl("option", { attr: { value: g } });
    const row = new Setting(contentEl).setName("Color");
    const swatches = row.controlEl.createDiv("rt-swatches");
    for (const c of COLORS) {
      const b = swatches.createEl("button", { cls: `rt-swatch rt-c-${c}`, attr: { "aria-label": c } });
      b.onclick = () => {
        color = color === c ? "" : c;
        swatches.querySelectorAll(".rt-swatch").forEach((x) => x.removeClass("is-on"));
        if (color) b.addClass("is-on");
      };
    }
    new Setting(contentEl).addButton(
      (b) => b.setButtonText("Apply").setCta().onClick(async () => {
        this.close();
        await this.onApply(group, color);
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
}
export class TaskModal extends Modal {
  declare draft: any;
  declare others: any;
  declare groups: any;
  declare dayStr: any;
  declare isNew: any;
  declare onDone: any;
  declare statuses: any;
  declare props: any;
  declare extra: any;
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
    new Setting(contentEl).setName(this.props.name.label).addText((t) => t.setValue(d.title).onChange((v) => d.title = v));
    let endInput = null;
    let endTouched = !this.isNew;
    new Setting(contentEl).setName(this.props.start.label).addText((t) => {
      t.inputEl.type = "time";
      t.setValue(hhmm(d.start)).onChange((v) => {
        const m = parseHHMM(v);
        if (m === null) return;
        d.start = m;
        if (!endTouched) {
          d.end = m + DEFAULT_LEN;
          if (endInput) endInput.value = endClock(d.end);
        } else d.end = overnightEnd(m, d.end % DAY);
        showNext();
      });
    });
    const endHint = this.isNew ? `Defaults to ${DEFAULT_LEN} minutes after the start. ` : "";
    const endSetting = new Setting(contentEl).setName(this.props.end.label).addText((t) => {
      endInput = t.inputEl;
      t.inputEl.type = "time";
      t.setValue(endClock(d.end)).onChange((v) => {
        const m = parseHHMM(v);
        if (m === null) return;
        d.end = overnightEnd(d.start, m);
        endTouched = true;
        showNext();
      });
    });
    // An end time earlier than the start runs past midnight into the next day.
    const showNext = () => endSetting.setDesc(d.end > DAY ? `${endHint}Ends the next day (overnight).` : endHint);
    showNext();
    const listId = "rt-groups-list";
    new Setting(contentEl).setName(this.props.group.label).addText((t) => {
      t.inputEl.setAttribute("list", listId);
      t.setPlaceholder("e.g. Work").setValue(d.group).onChange((v) => d.group = v.trim());
    });
    const list = contentEl.createEl("datalist", { attr: { id: listId } });
    for (const g of this.groups) list.createEl("option", { attr: { value: g } });
    const colorRow = new Setting(contentEl).setName("Color");
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
    new Setting(contentEl).setName(this.props.repeat.label).setDesc("Repeating tasks keep one time slot. Ticking them off is tracked per day.").addDropdown((dd) => {
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
      new Setting(rbox).setName("Starts").addText((tx) => {
        tx.inputEl.type = "date";
        tx.setValue(d.from || this.dayStr).onChange((v) => {
          d.from = v || null;
        });
      });
      const endMode = d.count ? "count" : d.until ? "date" : "never";
      new Setting(rbox).setName("Ends").addDropdown((dd) => {
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
        new Setting(rbox).setName("Number of times").addText((tx) => {
          tx.inputEl.type = "number";
          tx.inputEl.min = "1";
          tx.setValue(String(d.count)).onChange((v) => {
            const n = parseInt(v, 10);
            d.count = n > 0 ? n : null;
            d.from = d.from || this.dayStr;
          });
        });
      } else if (d.until) {
        new Setting(rbox).setName("End date").addText((tx) => {
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
      new Setting(contentEl).setName(this.props.status.label).setDesc(`For ${this.dayStr}.`).addDropdown((dd) => {
        for (const s of this.statuses) dd.addOption(s.id, s.name);
        dd.setValue(statusOf(d, this.dayStr, this.statuses).id).onChange((v) => {
          const s = this.statuses.find((x) => x.id === v);
          if (s) withStatus(d, this.dayStr, s, this.statuses);
        });
      });
    }
    const track = this.extra.track;
    if (track && !this.isNew) {
      const date = track.key(d.id);
      const row = new Setting(contentEl).setName(track.label).setDesc(`Time spent on ${date}.`);
      const val = row.controlEl.createSpan({ cls: "rt-elapsed rt-modal-elapsed", text: fmtDur(track.actual(d.id, date)) });
      val.dataset.id = d.id;
      val.dataset.date = date;
      row.addButton((b) => {
        const draw = () => {
          const on = track.running(d.id);
          b.setButtonText(on ? "Stop" : "Start");
          b.buttonEl.toggleClass("is-on", on);
        };
        draw();
        b.onClick(() => {
          track.toggle(d.id, date);
          window.setTimeout(() => {
            draw();
            val.textContent = fmtDur(track.actual(d.id, date));
          }, 50);
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
      const row = new Setting(contentEl).setName(def.label);
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
    new Setting(contentEl).setName(this.props.after.label).setDesc("Draws a connector from each chosen task into this one. You can also drag from a bar's end dot.").addDropdown((dd) => {
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
    const actions = new Setting(contentEl);
    actions.addButton(
      (b) => b.setButtonText("Save").setCta().onClick(async () => {
        if (d.end <= d.start) {
          new Notice("End time must be different from the start time.");
          return;
        }
        if (d.date === null && d.days && d.days.length === 0) {
          new Notice("Pick at least one day of the week.");
          return;
        }
        if (d.days && d.days.length === 7) d.days = null;
        if (d.date === null && d.until && d.from && d.until < d.from) {
          new Notice("The end date must be on or after the start date.");
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
}
