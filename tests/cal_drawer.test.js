// Calendar sidebar: fixed on desktop, a closed-by-default drawer on phones (run with PHONE=1).
const { load, openBoard, run, assert } = require("./harness");
const Mod = load();
const phone = !!process.env.PHONE;
run(phone ? "phone calendar sidebar is a closed-by-default drawer" : "desktop keeps the fixed calendar sidebar", async () => {
  const data = { tasks: [], views: [{ id: "v1", name: "Calendar", layout: "calendar", zoom: "day", cal: "week", ui: {} }] };
  const { plugin, board } = await openBoard(Mod, data, {});
  await plugin.setActiveView("v1"); board.render();
  const side = () => board.host.querySelector(".rt-cal-side");
  const toggle = () => board.host.querySelector('[aria-label="Toggle calendar sidebar"]');
  if (!phone) {
    assert(side() && !board.host.querySelector(".rt-cal.has-drawer"), "desktop should keep the fixed sidebar");
    return;
  }
  assert(!side(), "phone: sidebar should start closed");
  toggle().onclick();
  assert(side() && board.host.querySelector(".rt-cal.has-drawer .rt-cal-scrim"), "phone: toggle opens a drawer with a scrim");
  board.host.querySelector(".rt-mini-day:not(.is-other)").onclick();
  assert(!side(), "phone: picking a date closes the drawer");
  toggle().onclick(); board.host.querySelector(".rt-cal-scrim").onclick();
  assert(!side(), "phone: tapping outside closes the drawer");
  assert(plugin.store.views[0].sidebar === true, "drawer must not change the synced sidebar setting");
});
