// ============================================================
//  trace.js  -  "torpedo" snippets: trace the code to find
//  where the torpedo lands. Every snippet is checked with the
//  interpreter, so the expected answer is always what the code
//  really outputs.
// ============================================================
import { run } from "./pseudocode.js";
import { cellName } from "./game.js";

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Each template returns lines that leave `name` holding value v (v >= 1)
const TEMPLATES = {
  sequence(name, v) {
    const k = pick([2, 3]);
    const m = v % k;
    const a = (v - m) / k;
    if (a < 1) return TEMPLATES.add(name, v);
    return [`${name} ← ${a}`, `${name} ← ${name} * ${k}${m ? ` + ${m}` : ""}`];
  },
  add(name, v) {
    if (v === 1) return [`${name} ← 5`, `${name} ← ${name} - 4`];
    const a = rand(1, v - 1);
    return [`${name} ← ${a}`, `${name} ← ${name} + ${v - a}`];
  },
  forLoop(name, v, loopVar) {
    for (let tries = 0; tries < 10; tries++) {
      const step = rand(1, 3), n = rand(2, 4), s = v - n * step;
      if (s >= 0) {
        return [`${name} ← ${s}`, `FOR ${loopVar} ← 1 TO ${n}`, `    ${name} ← ${name} + ${step}`, `NEXT ${loopVar}`];
      }
    }
    return TEMPLATES.add(name, v);
  },
  whileLoop(name, v) {
    const step = rand(2, 3), n = rand(2, 3);
    const limit = v + rand(0, step - 1);
    return [`${name} ← ${v + n * step}`, `WHILE ${name} > ${limit} DO`, `    ${name} ← ${name} - ${step}`, `ENDWHILE`];
  },
  ifMod(name, v, _loop, temp) {
    if (v >= 2 && Math.random() < 0.5) {
      const odds = [];
      for (let x = 1; x < v; x += 2) odds.push(x);
      const x = pick(odds);
      return [`${temp} ← ${x}`, `IF MOD(${temp}, 2) = 0`, `  THEN`, `    ${name} ← DIV(${temp}, 2)`, `  ELSE`, `    ${name} ← ${temp} + ${v - x}`, `ENDIF`];
    }
    return [`${temp} ← ${2 * v}`, `IF MOD(${temp}, 2) = 0`, `  THEN`, `    ${name} ← DIV(${temp}, 2)`, `  ELSE`, `    ${name} ← ${temp} + ${rand(1, 3)}`, `ENDIF`];
  },
};
const NAMES = Object.keys(TEMPLATES);

/**
 * Build a torpedo aimed at cell (r, c).
 * Returns { code, answer } where answer is like "K7".
 */
export function makeTorpedo(r, c, cols = 24) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const [rowT, colT] = [pick(NAMES), pick(NAMES)];
    const rowLines = TEMPLATES[rowT]("Row", r + 1, "Count", "X");
    const colLines = TEMPLATES[colT]("Col", c + 1, "Index", "Y");
    const lines = [
      `Letters ← "${"ABCDEFGHIJKLMNOPQRSTUVWX".slice(0, cols)}"`,
      ...rowLines,
      ...colLines,
      `OUTPUT SUBSTRING(Letters, Col, 1), Row`,
    ];
    const code = lines.join("\n");
    try {
      const { outputs } = run(code, { cols });
      if (outputs[0] === cellName(r, c)) return { code, answer: outputs[0] };
    } catch { /* try another combination */ }
  }
  // should never happen, but keep the game going
  const code = `Row ← ${r + 1}\nCol ← "${cellName(r, c)[0]}"\nOUTPUT Col, Row`;
  return { code, answer: cellName(r, c) };
}

// Normalise what a student typed: " k 7 " -> "K7"
export const normaliseCell = (s) => String(s || "").replace(/\s+/g, "").toUpperCase();
