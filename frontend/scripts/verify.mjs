import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const css = fs.readFileSync("src/styles/tokens.css", "utf8");
const blocks = [
  ...css.matchAll(/(?:^:root|\[data-theme=['"]dark['"]\])\s*\{([^}]+)\}/gm),
].slice(0, 2);
assert.equal(blocks.length, 2, "Both themes must declare tokens");
const luminance = (hex) => {
  const rgb = hex
    .replace("#", "")
    .match(/../g)
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const contrast = (a, b) => {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
let pairs = 0;
for (const [i, block] of blocks.entries()) {
  const t = Object.fromEntries(
    [...block[1].matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map((m) => [
      m[1],
      m[2],
    ]),
  );
  for (const [fg, bg] of [
    ["ink", "canvas"],
    ["muted", "canvas"],
    ["ink", "surface"],
    ["muted", "surface"],
    ["muted", "surface-quiet"],
    ["primary-fg", "primary-bg"],
    ["risk-high", "high-fill"],
    ["risk-critical", "critical-fill"],
    ["risk-moderate", "moderate-fill"],
    ["risk-protected", "protected-fill"],
    ["risk-protected", "map-protected-fill"],
    ["muted", "hero-bg"],
    ["ink", "hero-bg"],
  ]) {
    const ratio = contrast(t[fg], t[bg]);
    assert(
      ratio >= 4.5,
      `${i ? "Dark" : "Light"} ${fg}/${bg} contrast ${ratio.toFixed(2)} is below AA`,
    );
    pairs++;
  }
}
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
}
const source = walk("src")
  .filter((p) => /\.(ts|tsx)$/.test(p) && !p.includes("tests"))
  .map((p) => fs.readFileSync(p, "utf8"))
  .join("\n");
assert(
  !/fetch\s*\(\s*[`'"]https?:\/\//.test(source) &&
    !/XMLHttpRequest|axios/.test(source),
  "App source must not issue requests directly to external origins",
);
assert(!/from\s+['"][^'"]*api[.'"]/.test(source), "No old API imports");
const appCss = fs.readFileSync("src/styles/app.css", "utf8");
for (const size of appCss.matchAll(/font-size:\s*([\d.]+)px/g))
  assert(
    [12, 14, 16, 20, 28, 44, 72].includes(Number(size[1])),
    `Unexpected type size ${size[1]}`,
  );
assert(
  /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/.test(appCss),
  "Mobile bottom navigation must expose five primary screens",
);
console.log(
  `Passed: ${pairs} semantic text contrast pairs at >=4.5:1, no direct external requests, type-scale declarations and five-tab mobile structure.`,
);
