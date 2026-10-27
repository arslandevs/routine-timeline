import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner = `/*
Routine Timeline for Obsidian. Built from src/ with esbuild; see the repository for the source.
*/
`;
const prod = process.argv[2] === "production";
const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtins],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: false
});
if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
