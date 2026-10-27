// Two devices share one vault file: real data migrates into it, a fresh phone takes it without
// pushing its sample tasks, edits on both sides merge task by task, deletes stick, calendar
// addresses never reach the file, and a pending write is not lost when the file changes first.
const { load, fakeApp, sleep, mkTask, openBoard, run, assert } = require("./harness");
const Mod = load();
const PATH = "Routine Timeline/routine-timeline.json";
run("vault sync merges both devices' edits and keeps secrets local", async () => {
  const fs = new Map();
  const desk = fakeApp(fs);
  const data = { tasks: [mkTask("a", "Deep work", 540, 600, null), mkTask("b", "Standup", 600, 615, null), mkTask("c", "Old task", 700, 730, "2026-10-01")],
    feeds: [{ id: "f1", name: "Work cal", url: "https://calendar.google.com/calendar/ical/SECRET/basic.ics", color: "green", visible: true }] };
  const D = await openBoard(Mod, data, desk);
  await sleep(50);
  // 1) The desktop's real data is written to the vault file, without the feed address.
  assert(fs.has(PATH), "desktop should write the vault file");
  const text1 = fs.get(PATH);
  assert(!text1.includes("SECRET"), "feed url must not be in the synced file");
  assert(text1.includes('"f1"') && text1.includes("Work cal"), "feed name/id should sync");
  assert(D.plugin.store.feeds[0].url.includes("SECRET"), "desktop keeps its url locally");
  await D.plugin.persist();
  assert(D.plugin._data.bases[0].store.feeds[0].url.includes("SECRET"), "local data.json keeps the url");
  // 2) A fresh phone (sample tasks only) takes the file and does not push its samples.
  const phone = fakeApp(fs);
  const P = await openBoard(Mod, null, phone);
  await sleep(50);
  assert(P.plugin.store.tasks.map((t) => t.title).join() === "Deep work,Standup,Old task", "phone should load desktop tasks, got " + P.plugin.store.tasks.map((t) => t.title).join());
  assert(fs.get(PATH) === text1, "phone must not rewrite the file with identical data");
  const pf = P.plugin.store.feeds[0];
  assert(pf && pf.url === "", "phone gets the feed without its address");
  await P.plugin.fetchFeed(pf);
  assert(/Address not set/.test(P.plugin.feedData.get("f1").error), "phone shows that the address is missing");
  await P.plugin.setFeedUrl("f1", "https://example.com/other.ics");
  assert(P.plugin.store.feeds[0].url === "https://example.com/other.ics" && !P.plugin.syncJson().includes("example.com"), "phone address stays local");
  // 3) Both edit while apart: desktop renames a, phone renames b and deletes c and adds d.
  D.plugin.store.tasks[0].title = "Deep work (desk)";
  await D.plugin.persist();
  P.plugin.store.tasks[1].title = "Standup (phone)";
  P.plugin.store.tasks = P.plugin.store.tasks.filter((t) => t.id !== "c");
  P.plugin.store.tasks.push(mkTask("d", "Added on phone", 800, 830, null));
  await P.plugin.persist();
  await sleep(500);
  // The phone's write landed last and triggered the desktop's reload through the vault event
  // (both apps share the fs but have separate listeners, so poke the desktop by hand).
  await D.plugin.reloadFromVault();
  await sleep(500);
  const titles = (p) => p.store.tasks.map((t) => t.title).join();
  assert(titles(D.plugin) === "Deep work (desk),Standup (phone),Added on phone", "desktop merge: " + titles(D.plugin));
  assert(D.plugin.store.deleted.c > 0, "tombstone for c should be kept");
  // The desktop wrote the merged result back; the phone takes it and settles without another write.
  await P.plugin.reloadFromVault();
  await sleep(500);
  assert(titles(P.plugin) === "Deep work (desk),Standup (phone),Added on phone", "phone merge: " + titles(P.plugin));
  const settled = fs.get(PATH);
  assert(P.plugin.syncJson() === settled && D.plugin.syncJson() === settled, "both devices should agree on the file text");
  assert(!settled.includes("SECRET") && !settled.includes("example.com"), "no secrets after merging");
  // 4) A pending local write is not dropped when the file changes inside the debounce window.
  P.plugin.store.tasks[0].title = "Deep work (phone again)";
  await P.plugin.persist();
  await sleep(500);
  D.plugin.store.tasks[2].title = "Added on phone (desk edit)";
  await D.plugin.persist();
  await D.plugin.reloadFromVault();
  await sleep(600);
  assert(titles(D.plugin) === "Deep work (phone again),Standup (phone),Added on phone (desk edit)", "desk after window: " + titles(D.plugin));
  assert(fs.get(PATH).includes("Deep work (phone again)") && fs.get(PATH).includes("(desk edit)"), "file should hold both edits");
  // 5) Old files without timestamps still load (updatedAt defaults to 0).
  const legacy = JSON.parse(fs.get(PATH));
  for (const t of legacy.bases[0].store.tasks) delete t.updatedAt;
  delete legacy.bases[0].store.deleted;
  const L = new Mod.default(fakeApp(new Map([[PATH, JSON.stringify(legacy)]])));
  L._data = null;
  await L.onload();
  assert(L.store.tasks.length === 3 && L.store.tasks.every((t) => t.updatedAt === 0), "legacy file loads");
});
