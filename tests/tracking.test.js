// Time tracking: a stopwatch per task logs actual minutes per day, shown in the table, on the bar,
// in the header count and in the editor; the running timer is per device and survives a reload.
const { load, mkTask, openBoard, run, assert, w } = require("./harness");
const Mod = load();
run("time tracking logs actual minutes and shows planned vs actual", async () => {
  const D = "2026-10-15";
  let now = new Date(2026, 9, 15, 9, 0).getTime();
  const realNow = Date.now;
  Date.now = () => now;
  const data = { tasks: [mkTask("a", "Deep work", 540, 600, D), mkTask("b", "Walk", 700, 730, null)], views: [{ id: "v1", name: "Table", layout: "table", ui: {} }] };
  const { plugin, board } = await openBoard(Mod, data, {});
  await plugin.setActiveView("v1");
  board.day = new Date(2026, 9, 15);
  board.render();
  assert(plugin.store.propOrder.includes("actual") && plugin.store.props.actual.label === "Actual (min)", "actual property exists");
  const a = plugin.store.tasks[0];
  // Start, run 25 minutes, stop.
  await plugin.startTimer(a, D);
  assert(plugin.isRunning(a) && plugin._data.timer.taskId === "a", "timer saved locally while running");
  assert(!plugin.syncJson().includes("startedAt"), "timer must not be in the synced data");
  now += 25 * 6e4;
  assert(plugin.actualOn(a, D) === 25, "running counter counts");
  board.updateElapsed();
  const cell = board.host.querySelector('td[data-col="actual"]');
  assert(cell && cell.querySelector(".rt-play.is-on") && cell.querySelector(".rt-elapsed").textContent === "25", "table cell shows running timer: " + (cell && cell.textContent));
  assert(/25m tracked/.test(board.host.querySelector(".rt-count").textContent), "header shows tracked time");
  await plugin.stopTimer(now);
  assert(a.log[D] === 25 && !plugin.timer, "stopping logs 25 minutes");
  assert(plugin.syncJson().includes('"log"') && plugin.syncJson().includes(D), "log syncs with the task");
  // Starting another task stops the first; a second session adds to the same day.
  await plugin.startTimer(a, D);
  now += 10 * 6e4;
  const b = plugin.store.tasks[1];
  await plugin.startTimer(b, D);
  assert(a.log[D] === 35 && plugin.isRunning(b), "switching tasks logs the first and runs the second");
  now += 5 * 6e4;
  await plugin.stopTimer(now);
  assert(b.log[D] === 5, "repeating task logs on the day");
  // Table edit sets the actual minutes directly; 0 clears.
  assert(!board.applyCell(a, "actual", "40") && a.log[D] === 40, "edit actual");
  assert(!board.applyCell(a, "actual", "0") && !(D in a.log), "clearing actual");
  assert(board.applyCell(a, "actual", "-3"), "negative rejected");
  // Timeline bar shows the play button and tracked time; the editor has a Start/Stop row.
  a.log[D] = 40;
  plugin.store.views[0].layout = "timeline";
  board.render();
  const bar = board.host.querySelector('.rt-bar[data-id="a"]:not(.is-neighbour)');
  assert(bar && bar.querySelector(".rt-play") && bar.querySelector(".rt-bar-elapsed").textContent === "40m", "bar shows tracked time");
  bar.querySelector(".rt-play").onclick(new w.Event("click"));
  await new Promise((r) => setTimeout(r, 20));
  assert(plugin.isRunning(a), "play button starts the timer");
  board.editTask(a);
  const row = [...w.document.querySelectorAll(".setting-item")].find((e) => e.querySelector(".setting-item-name") && e.querySelector(".setting-item-name").textContent === "Actual (min)");
  assert(row && row.querySelector("button").textContent === "Stop", "editor shows Stop while running");
  row.querySelector("button").onclick();
  await new Promise((r) => setTimeout(r, 80));
  assert(!plugin.timer && a.log[D] === 40, "editor Stop ends the timer (0 extra minutes)");
  // The command toggles the selected task's timer.
  board.select("b");
  plugin._commands.find((c) => c.id === "toggle-timer").callback();
  await new Promise((r) => setTimeout(r, 20));
  assert(plugin.isRunning(b), "command starts timer for the selected task");
  // A reload picks the running timer back up from local data.
  const again = new Mod.default({});
  again._data = plugin._data;
  await again.onload();
  assert(again.timer && again.timer.taskId === "b", "timer restored after reload");
  Date.now = realNow;
});
