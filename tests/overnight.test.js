// Overnight tasks: a task may end after midnight; bars span into the next day, drags cross midnight,
// the table and calendar understand a next-day end.
const { load, mkTask, openBoard, run, assert, w } = require("./harness");
const Mod = load();
const ev = (type, x) => { const e = new w.Event(type, { bubbles: true, cancelable: true }); Object.assign(e, { clientX: x, clientY: 0, pointerType: "mouse", pointerId: 1, button: 0 }); return e; };
run("overnight tasks span midnight, drag/resize across days, table/calendar handle the next-day end", async () => {
  const D = "2026-10-15", N = "2026-10-16";
  const data = { tasks: [
    mkTask("night", "Overnight build", 23 * 60, 27 * 60, D),
    mkTask("late", "Late task", 22 * 60, 23 * 60, D),
    mkTask("early", "Early next day", 60, 120, N),
    mkTask("f1", "F1", 10, 20, N), mkTask("f2", "F2", 20, 30, N), mkTask("f3", "F3", 30, 40, N),
    mkTask("a", "A", 9 * 60, 10 * 60, N), mkTask("b", "B", 10 * 60, 11 * 60, N), mkTask("c", "C", 11 * 60, 12 * 60, N),
    mkTask("d", "D1", 8 * 60, 9 * 60, D), mkTask("e", "E1", 9 * 60, 9 * 60 + 30, D)
  ], views: [{ id: "v1", name: "Timeline", layout: "timeline", zoom: "hours", ui: {} }] };
  const { plugin, board } = await openBoard(Mod, data, {});
  await plugin.setActiveView("v1");
  board.day = new Date(2026, 9, 15); board.render();
  const hw = board.hw, X0 = board.X0;
  const bar = (id) => board.host.querySelector(`.rt-bar[data-id="${id}"]:not(.is-neighbour)`);
  const nb = bar("night");
  assert(parseFloat(nb.style.width) === 4 * hw, "overnight width " + nb.style.width);
  assert(parseFloat(nb.style.left) === X0 + 23 * hw, "overnight left " + nb.style.left);
  const yNight = board.yCenter.get("night:0"), yEarly = board.yCenter.get("early:1");
  assert(yNight !== yEarly, "next-day early task must not share the overnight bar's row");
  board.day = new Date(2026, 9, 16); board.render();
  assert(board.yCenter.get("night:-1") === yNight && board.yCenter.get("early:0") === yEarly, "rows reshuffled after paging");
  const prevBar = [...board.host.querySelectorAll('.rt-bar.is-neighbour[data-id="night"]')];
  assert(prevBar.length === 1 && parseFloat(prevBar[0].style.left) + parseFloat(prevBar[0].style.width) === X0 + 3 * hw, "previous-day overnight bar ends at 03:00");
  board.day = new Date(2026, 9, 15); board.render();
  const lb = bar("late");
  lb.dispatchEvent(ev("pointerdown", 100)); lb.dispatchEvent(ev("pointermove", 100 + 2.5 * hw)); lb.dispatchEvent(ev("pointerup", 100 + 2.5 * hw));
  await new Promise((r) => setTimeout(r, 20));
  const late = plugin.store.tasks.find((t) => t.id === "late");
  assert(late.date === N && late.start === 30 && late.end === 90, "drag across midnight: " + JSON.stringify([late.date, late.start, late.end]));
  board.day = new Date(2026, 9, 16); board.render();
  const lb2 = bar("late");
  lb2.dispatchEvent(ev("pointerdown", 500)); lb2.dispatchEvent(ev("pointermove", 500 - hw)); lb2.dispatchEvent(ev("pointerup", 500 - hw));
  await new Promise((r) => setTimeout(r, 20));
  assert(late.date === D && late.start === 23 * 60 + 30 && late.end === 24 * 60 + 30, "drag back across midnight");
  board.day = new Date(2026, 9, 15); board.render();
  const db = bar("e"); const edge = db.querySelector(".rt-edge-r");
  edge.dispatchEvent(ev("pointerdown", 200)); edge.dispatchEvent(ev("pointermove", 200 + 16 * hw)); edge.dispatchEvent(ev("pointerup", 200 + 16 * hw));
  await new Promise((r) => setTimeout(r, 20));
  const e1 = plugin.store.tasks.find((t) => t.id === "e");
  assert(e1.date === D && e1.start === 540 && e1.end === 25 * 60 + 30, "resize past midnight");
  const d1 = plugin.store.tasks.find((t) => t.id === "d");
  assert(!board.applyCell(d1, "end", "02:00") && d1.end === 26 * 60, "table overnight end");
  assert(board.cellEditValue(d1, "end") === "02:00", "table shows clock end");
  assert(board.applyCell(d1, "end", "08:00"), "end == start rejected");
  assert(!board.applyCell(d1, "duration", "600") && d1.end === 8 * 60 + 600, "duration");
  const thu = board.calItems(new Date(2026, 9, 15), []).find((x) => x.t && x.t.id === "night");
  const fri = board.calItems(new Date(2026, 9, 16), []).find((x) => x.t && x.t.id === "night");
  assert(thu && thu.start === 1380 && thu.end === 1440, "calendar Thu part");
  assert(fri && fri.start === 0 && fri.end === 180, "calendar Fri continuation");
  Object.assign(plugin.store.views[0], { layout: "timeline", groupBy: "group", zoom: "hours" }); board.render();
  assert(parseFloat(bar("night").style.width) === 4 * board.hw, "grouped overnight width");
  Object.assign(plugin.store.views[0], { groupBy: "none", zoom: "week" }); board.render();
  const sb = board.host.querySelector('.rt-bar.is-span[data-id="night"]');
  const i0 = Math.round((parseFloat(sb.style.left) - 23 / 24 * board.sp.dayW) / board.sp.dayW);
  assert(sb && parseFloat(sb.style.left) + parseFloat(sb.style.width) > (i0 + 1) * board.sp.dayW + 1, "week zoom bar crosses the day line");
  plugin.store.views[0].layout = "calendar"; plugin.store.views[0].cal = "week"; board.render();
  const blocks = [...board.host.querySelectorAll(".rt-cal-chip.is-block")].filter((el) => el.textContent.includes("Overnight"));
  assert(blocks.length === 2, "week grid shows the overnight task on both days, got " + blocks.length);
});
