// Yesterday's and tomorrow's bars on the Timeline are fully interactive: drag and resize them
// without paging back a day. The play button lives on the bar's left, also on tiny bars.
const { load, mkTask, openBoard, run, assert, w } = require("./harness");
const Mod = load();
const ev = (type, x) => { const e = new w.Event(type, { bubbles: true, cancelable: true }); Object.assign(e, { clientX: x, clientY: 0, pointerType: "mouse", pointerId: 1, button: 0 }); return e; };
const wait = () => new Promise((r) => setTimeout(r, 20));
run("previous/next-day bars drag and resize; play button pinned left on every bar", async () => {
  const D = "2026-10-28", N = "2026-10-29";
  const data = { tasks: [
    mkTask("late", "TikTok batch", 20 * 60, 23 * 60, D),
    mkTask("night", "Overnight", 23 * 60, 26 * 60, D),
    mkTask("tmrw", "Tomorrow task", 9 * 60, 10 * 60, "2026-10-30"),
    mkTask("tiny", "Quick call", 12 * 60, 12 * 60 + 5, N)
  ], views: [{ id: "v1", name: "Timeline", layout: "timeline", zoom: "hours", ui: {} }] };
  const { plugin, board } = await openBoard(Mod, data, {});
  await plugin.setActiveView("v1");
  board.day = new Date(2026, 9, 29); board.render();
  const hw = board.hw, X0 = board.X0;
  const nbar = (id) => board.host.querySelector(`.rt-bar.is-neighbour[data-id="${id}"]`);
  const task = (id) => plugin.store.tasks.find((t) => t.id === id);

  // Yesterday's 20:00 task, viewed from today: move it one hour later.
  let b = nbar("late");
  assert(b && parseFloat(b.style.left) === X0 - 24 * hw + 20 * hw, "yesterday bar placed in yesterday's column");
  b.dispatchEvent(ev("pointerdown", 300)); b.dispatchEvent(ev("pointermove", 300 + hw)); b.dispatchEvent(ev("pointerup", 300 + hw));
  await wait();
  assert(task("late").date === D && task("late").start === 21 * 60 && task("late").end === 24 * 60, "dragged yesterday's task: " + JSON.stringify(task("late")));

  // Drag it across midnight into today.
  b = nbar("late");
  b.dispatchEvent(ev("pointerdown", 300)); b.dispatchEvent(ev("pointermove", 300 + 4 * hw)); b.dispatchEvent(ev("pointerup", 300 + 4 * hw));
  await wait();
  assert(task("late").date === N && task("late").start === 60 && task("late").end === 240, "moved into today: " + JSON.stringify(task("late")));

  // Resize the overnight spill from yesterday: end 02:00 -> 03:00.
  b = nbar("night");
  const edge = b.querySelector(".rt-edge-r");
  edge.dispatchEvent(ev("pointerdown", 400)); edge.dispatchEvent(ev("pointermove", 400 + hw)); edge.dispatchEvent(ev("pointerup", 400 + hw));
  await wait();
  assert(task("night").date === D && task("night").end === 27 * 60, "resized yesterday's overnight end");

  // Tomorrow's bar is draggable too.
  b = nbar("tmrw");
  b.dispatchEvent(ev("pointerdown", 500)); b.dispatchEvent(ev("pointermove", 500 - hw)); b.dispatchEvent(ev("pointerup", 500 - hw));
  await wait();
  assert(task("tmrw").start === 8 * 60, "dragged tomorrow's task");

  // Play button: a direct child of every bar (not squeezed inside the text row), tiny bars included.
  board.render();
  const bars = [...board.host.querySelectorAll(".rt-bar")];
  assert(bars.length >= 4 && bars.every((x) => x.querySelector(":scope > .rt-bar-play")), "every bar has a pinned play button");
  const tb = board.host.querySelector('.rt-bar[data-id="tiny"]:not(.is-neighbour)');
  assert(tb.classList.contains("is-tiny"), "5-minute bar is tiny");
  tb.querySelector(".rt-bar-play").click();
  await wait();
  assert(plugin.timer && plugin.timer.taskId === "tiny", "play on a tiny bar starts its timer");
  // Pressing play does not start a drag.
  const before = task("tiny").start;
  const p = board.host.querySelector('.rt-bar[data-id="tiny"]:not(.is-neighbour) .rt-bar-play');
  p.dispatchEvent(ev("pointerdown", 600)); p.dispatchEvent(ev("pointermove", 700)); p.dispatchEvent(ev("pointerup", 700));
  await wait();
  assert(task("tiny").start === before, "play button is not a drag handle");
});
