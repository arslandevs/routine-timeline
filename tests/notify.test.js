// Reminders: fire once at the task's start (and at the lead time), skip done tasks, don't replay
// missed ones, and the minute tick lands just after each minute boundary.
const { load, mkTask, openBoard, run, assert, notices } = require("./harness");
const Mod = load();
run("reminders fire once at the right minute and the tick aligns to the minute", async () => {
  const D = "2026-10-15";
  const data = { tasks: [mkTask("a", "Deep work", 9 * 60, 10 * 60, D), mkTask("b", "Done one", 9 * 60, 9 * 60 + 30, D, { doneDates: [D] }), mkTask("c", "Earlier", 8 * 60, 8 * 60 + 30, D)] };
  const { plugin } = await openBoard(Mod, data, {});
  const fired = [];
  plugin.showReminder = (title, body) => fired.push(title);
  plugin.notify = { enabled: true, lead: 5, atStart: true, sound: "none" };
  plugin.checkReminders(new Date(2026, 9, 15, 8, 55, 10));
  assert(fired.join() === "In 5 min: Deep work", "lead reminder: " + fired.join());
  plugin.checkReminders(new Date(2026, 9, 15, 8, 55, 40));
  assert(fired.length === 1, "no duplicate within the minute");
  plugin.checkReminders(new Date(2026, 9, 15, 9, 0, 0));
  assert(fired[1] === "Starting now: Deep work" && fired.length === 2, "start reminder, done task skipped, missed 8:00 not replayed: " + fired.join());
  plugin.notify.enabled = false;
  plugin.checkReminders(new Date(2026, 9, 15, 9, 0, 30));
  assert(fired.length === 2, "disabled fires nothing");
  const realNow = Date.now; const realTimeout = window.setTimeout;
  Date.now = () => new Date(2026, 9, 15, 9, 0, 18, 805).getTime();
  let delay = null; window.setTimeout = (fn, ms) => { delay = ms; return 1; };
  plugin.scheduleReminderTick();
  assert(delay === 41195 + 50, "tick should land 50 ms past the next minute, got " + delay);
  Date.now = realNow; window.setTimeout = realTimeout;
});
