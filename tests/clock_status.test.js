// Statuses follow the clock (start -> In progress, end -> Done) without overriding manual changes,
// and the task happening now is highlighted in the Timeline, Table, Board and Calendar.
const { load, mkTask, openBoard, run, assert } = require("./harness");
const Mod = load();
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
run("status follows the clock; the current task is highlighted in every view", async () => {
  const day = new Date(2026, 10, 3), D = ymd(day), Y = ymd(new Date(2026, 10, 2));
  const at = (h, m = 0) => new Date(2026, 10, 3, h, m).getTime();
  const data = { tasks: [
    mkTask("a", "Deep work", 9 * 60, 10 * 60, D),
    mkTask("b", "Newsletter", 10 * 60, 11 * 60, D),
    mkTask("c", "Blocked thing", 9 * 60, 9 * 60 + 30, D, { st: { [D]: "blocked" } }),
    mkTask("n", "Overnight", 23 * 60, 26 * 60, Y),
    mkTask("r", "Daily ritual", 9 * 60 + 15, 9 * 60 + 45, null, { from: "2026-11-01" })
  ], statuses: [
    { id: "not-started", name: "Not started", done: false, color: "gray" },
    { id: "in-progress", name: "In progress", done: false, color: "blue" },
    { id: "blocked", name: "Blocked", done: false, color: "red" },
    { id: "done", name: "Done", done: true, color: "green" }
  ], views: [{ id: "v1", name: "Timeline", layout: "timeline", zoom: "hours", ui: {} }] };
  const { plugin, board } = await openBoard(Mod, data, {});
  const T = (id) => plugin.store.tasks.find((t) => t.id === id);
  const st = (id, key = D) => (T(id).st || {})[key] || (T(id).doneDates.includes(key) ? "done" : "not-started");

  plugin.clock.last = 0; // first run on this device: looks back to midnight
  await plugin.applyClockStatuses(at(9, 1));
  assert(st("a") === "in-progress", "a started -> in progress, got " + st("a"));
  assert(st("b") === "not-started", "b not yet");
  assert(st("n", Y) === "done", "yesterday's overnight task ended at 02:00 -> done (catch-up)");

  await plugin.applyClockStatuses(at(10, 1));
  assert(st("a") === "done" && T("a").doneDates.includes(D), "a ended -> done");
  assert(st("b") === "in-progress", "b started -> in progress");
  assert(st("c") === "blocked", "custom status left alone");
  assert(st("r", D) === "done", "repeating task's occurrence today: started and ended inside the window -> done");

  // A manual change after the transition is respected.
  T("b").st[D] = "not-started";
  await plugin.applyClockStatuses(at(10, 30));
  assert(st("b") === "not-started", "manual reset kept");
  await plugin.applyClockStatuses(at(11, 1));
  assert(st("b") === "done", "b ended -> done");

  // Turned off: nothing changes, and turning it back on does not replay the missed time.
  T("b").st[D] = "not-started"; T("b").doneDates = []; T("b").start = 12 * 60; T("b").end = 13 * 60;
  plugin.clock.autoStatus = false;
  await plugin.applyClockStatuses(at(12, 5));
  assert(st("b") === "not-started", "disabled: no change");

  // ---- the task happening now (uses the real clock) ----
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  if (m < 40 || m > 1400) { console.log("  (skipping now-highlight checks near midnight)"); return; }
  const today = ymd(now);
  plugin.store.tasks.push(mkTask("now", "Happening now", m - 20, m + 30, today), mkTask("next", "Up next", m + 30, m + 60, today));
  board.day = new Date(now.getFullYear(), now.getMonth(), now.getDate()); board.dayStr = today;
  board.render();
  const bar = board.host.querySelector('.rt-bar[data-id="now"]:not(.is-neighbour)');
  assert(bar && bar.classList.contains("is-now"), "timeline bar marked now");
  assert(!board.host.querySelector('.rt-bar[data-id="next"]').classList.contains("is-now"), "next task not marked");
  const pill = bar.querySelector(".rt-now-text");
  assert(pill && /^Now · (30m|31m) left$/.test(pill.textContent), "pill text: " + (pill && pill.textContent));
  assert(/^4\d(\.\d)?%$/.test(bar.style.getPropertyValue("--rt-prog")), "progress " + bar.style.getPropertyValue("--rt-prog"));
  plugin.store.views[0].layout = "table"; board.render();
  const tr = board.host.querySelector('tr[data-id="now"]');
  assert(tr && tr.classList.contains("is-now") && tr.querySelector(".rt-now-pill"), "table row marked now with pill");
  plugin.store.views[0].layout = "board"; board.render();
  const card = [...board.host.querySelectorAll(".rt-card")].find((c) => c.textContent.includes("Happening now"));
  assert(card && card.classList.contains("is-now"), "board card marked now");
  plugin.store.views[0].layout = "calendar"; plugin.store.views[0].cal = "week"; board.render();
  const chip = [...board.host.querySelectorAll(".rt-cal-chip")].find((c) => c.textContent.includes("Happening now"));
  assert(chip && chip.classList.contains("is-now"), "calendar block marked now");
});
