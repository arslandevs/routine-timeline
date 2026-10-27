// Runs every *.test.js in this folder in its own process (each needs a fresh jsdom + plugin).
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const main = process.argv[2] || path.join(dir, "..", "main.js");
let failed = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".test.js")).sort()) {
  for (const env of f.startsWith("cal_drawer") ? [{}, { PHONE: "1" }] : [{}]) {
    const r = spawnSync(process.execPath, [path.join(dir, f), main], { env: { ...process.env, ...env }, encoding: "utf8" });
    const tail = (r.stdout + r.stderr).trim().split("\n").filter((l) => /^(PASS|FAIL)/.test(l)).join("\n") || (r.stdout + r.stderr).trim().slice(-400);
    console.log(`${env.PHONE ? "[phone] " : ""}${tail}`);
    if (r.status !== 0) { failed++; console.log((r.stdout + r.stderr).trim().split("\n").slice(-12).join("\n")); }
  }
}
console.log(failed ? `\n${failed} test file(s) failed` : "\nAll tests passed");
process.exit(failed ? 1 : 0);
