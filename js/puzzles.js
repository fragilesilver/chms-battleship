// ============================================================
//  puzzles.js  -  pseudocode puzzles made up on the spot, so
//  there's always a fresh one. Every answer comes from running
//  the program in the interpreter, so it's always right.
//
//  Used by the "Earn shots" tab (as multiple choice) and by
//  torpedoes (type the output, or fill in the missing number).
// ============================================================
import { run } from "./pseudocode.js";

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

const WORDS = ["BRUNEI", "ANCHOR", "TORPEDO", "KRAKEN", "HARBOUR", "CAPTAIN", "SONAR", "PIRATE", "ISLAND", "COMPASS", "CANNON", "ARMADA"];
const SHORT = ["SHIP", "MAST", "SAIL", "DECK", "HULL", "PORT", "WAVE", "REEF", "CREW", "FLAG"];

// Each family builds one program. It returns:
//   lines     the program
//   level     "easy", "medium" or "hard"
//   q         the question (default: "What is output?")
//   answer    optional: work the answer out from the run result
//   wrong     likely wrong answers, for multiple choice
//   explain   why the answer is right
const FAMILIES = {
  sum() {
    const a = rand(1, 4), step = pick([1, 1, 2]), b = a + step * rand(2, 4);
    const vals = [];
    for (let i = a; i <= b; i += step) vals.push(i);
    const total = vals.reduce((x, y) => x + y, 0);
    return {
      level: "medium",
      lines: ["Total ← 0", `FOR i ← ${a} TO ${b}${step > 1 ? ` STEP ${step}` : ""}`, "    Total ← Total + i", "NEXT i", "OUTPUT Total"],
      wrong: [total - b, total + b + step, total - a, vals.length],
      explain: `i takes the values ${vals.join(", ")}. Adding them gives ${total}.`,
    };
  },
  countMultiples() {
    const n = rand(8, 20), k = rand(2, 5);
    const hits = [];
    for (let i = k; i <= n; i += k) hits.push(i);
    return {
      level: "hard",
      lines: ["Count ← 0", `FOR i ← 1 TO ${n}`, `    IF MOD(i, ${k}) = 0`, "      THEN", "        Count ← Count + 1", "    ENDIF", "NEXT i", "OUTPUT Count"],
      wrong: [hits.length + 1, hits.length - 1, n - hits.length, n],
      explain: `Count goes up only when i divides exactly by ${k}: ${hits.join(", ")}. That's ${hits.length}.`,
    };
  },
  whileDown() {
    const start = rand(12, 30), step = rand(2, 5), lim = rand(1, 6);
    const seen = [start];
    let x = start;
    while (x > lim) { x -= step; seen.push(x); }
    return {
      level: "medium",
      lines: [`X ← ${start}`, `WHILE X > ${lim} DO`, `    X ← X - ${step}`, "ENDWHILE", "OUTPUT X"],
      wrong: [x + step, x - step, lim, lim + 1],
      explain: `X goes ${seen.join(", ")}. When X is ${x}, X > ${lim} is FALSE, so the loop stops.`,
    };
  },
  repeatMul() {
    const a = rand(1, 3), m = rand(2, 3), lim = rand(10, 40);
    const seen = [a];
    let x = a;
    do { x *= m; seen.push(x); } while (!(x > lim));
    return {
      level: "medium",
      lines: [`X ← ${a}`, "REPEAT", `    X ← X * ${m}`, `UNTIL X > ${lim}`, "OUTPUT X"],
      wrong: [x / m, x * m, lim, x + m],
      explain: `X goes ${seen.join(", ")}. The loop stops once X > ${lim} is TRUE.`,
    };
  },
  ifMod() {
    const n = rand(5, 40), k = pick([2, 3, 4, 5]);
    const yes = n % k === 0;
    return {
      level: "easy",
      lines: [`N ← ${n}`, `IF MOD(N, ${k}) = 0`, "  THEN", '    OUTPUT "Hit"', "  ELSE", '    OUTPUT "Miss"', "ENDIF"],
      wrong: [yes ? "Miss" : "Hit", "HitMiss", String(n % k)],
      explain: `MOD(${n}, ${k}) is ${n % k}, so the ${yes ? "THEN" : "ELSE"} branch runs.`,
    };
  },
  divMod() {
    const k = rand(3, 9), n = k * rand(2, 7) + rand(1, k - 1);
    const q = Math.floor(n / k), r = n % k;
    return {
      level: "medium",
      lines: [`X ← ${n}`, `Q ← DIV(X, ${k})`, `R ← MOD(X, ${k})`, 'OUTPUT Q, " ", R'],
      wrong: [`${r} ${q}`, `${q + 1} ${r}`, `${q} ${k - r}`, `${Math.round((n / k) * 10) / 10} ${r}`],
      explain: `${n} ÷ ${k} is ${q} remainder ${r}. DIV gives ${q} and MOD gives ${r}.`,
    };
  },
  substring() {
    const w = pick(WORDS), s = rand(1, w.length - 2), l = rand(2, Math.min(4, w.length - s + 1));
    const sub = (a, b) => w.substr(a - 1, b);
    return {
      level: "easy",
      lines: [`Word ← "${w}"`, `OUTPUT SUBSTRING(Word, ${s}, ${l})`],
      wrong: [sub(s + 1, l), sub(s, l + 1), s > 1 ? sub(s - 1, l) : sub(s, l - 1), sub(s, l).split("").reverse().join("")],
      explain: `Start at character ${s} of ${w} and take ${l} characters: ${sub(s, l)}.`,
    };
  },
  reverse() {
    const w = pick(SHORT);
    const rev = w.split("").reverse().join("");
    return {
      level: "hard",
      lines: [`Word ← "${w}"`, 'Result ← ""', "FOR i ← LENGTH(Word) TO 1 STEP -1", "    Result ← Result & SUBSTRING(Word, i, 1)", "NEXT i", "OUTPUT Result"],
      wrong: [w, rev.slice(0, -1), w.slice(1) + w[0], rev.slice(1) + rev[0]],
      explain: `The loop counts down from ${w.length} to 1, adding one letter at a time from the end: ${rev}.`,
    };
  },
  countLetter() {
    const w = pick(["BANANA", "ARMADA", "CANNON", "KRAKEN", "HARBOUR", "TORPEDO", "PIRATE", "ANCHOR"]);
    const letters = [...new Set(w)];
    const ch = pick(letters.filter((c) => w.split(c).length > 2).concat(letters));
    const n = w.split(ch).length - 1;
    return {
      level: "hard",
      lines: [`Word ← "${w}"`, "Count ← 0", "FOR i ← 1 TO LENGTH(Word)", `    IF SUBSTRING(Word, i, 1) = "${ch}"`, "      THEN", "        Count ← Count + 1", "    ENDIF", "NEXT i", "OUTPUT Count"],
      wrong: [n + 1, n - 1, w.length, w.indexOf(ch) + 1],
      explain: `The loop checks every letter of ${w} and counts the ${ch}s: ${n}.`,
    };
  },
  swap() {
    const a = rand(2, 9), b = rand(10, 19);
    return {
      level: "easy",
      lines: [`A ← ${a}`, `B ← ${b}`, "Temp ← A", "A ← B", "B ← Temp", 'OUTPUT A, " ", B'],
      wrong: [`${a} ${b}`, `${b} ${b}`, `${a} ${a}`],
      explain: `Temp keeps A's old value (${a}) so the two values can swap. A is now ${b} and B is ${a}.`,
    };
  },
  chain() {
    const a = rand(2, 9), b = rand(2, 5);
    const B1 = a + b, A1 = B1 * 2, B2 = A1 - B1;
    return {
      level: "medium",
      lines: [`A ← ${a}`, `B ← A + ${b}`, "A ← B * 2", "B ← A - B", 'OUTPUT A, " ", B'],
      wrong: [`${B2} ${A1}`, `${a * 2} ${B1}`, `${A1} ${B1}`, `${A1} ${a}`],
      explain: `B becomes ${a} + ${b} = ${B1}. A becomes ${B1} × 2 = ${A1}. Then B becomes ${A1} - ${B1} = ${B2}.`,
    };
  },
  nested() {
    const p = rand(2, 4), q = rand(2, 4), addJ = Math.random() < 0.5;
    const total = addJ ? p * (q * (q + 1)) / 2 : p * q;
    return {
      level: addJ ? "hard" : "medium",
      lines: ["Total ← 0", `FOR i ← 1 TO ${p}`, `    FOR j ← 1 TO ${q}`, `        Total ← Total + ${addJ ? "j" : "1"}`, "    NEXT j", "NEXT i", "OUTPUT Total"],
      wrong: [p + q, addJ ? p * q : p * q + 1, addJ ? (q * (q + 1)) / 2 : p * q - 1, p * q * 2],
      explain: addJ
        ? `Each pass of the outer loop adds 1 + ... + ${q} = ${(q * (q + 1)) / 2}. That happens ${p} times: ${total}.`
        : `The inner loop runs ${q} times for each of the ${p} outer passes: ${p} × ${q} = ${total}.`,
    };
  },
  loopTimes() {
    const a = rand(1, 5), step = rand(1, 3), b = a + step * rand(2, 5) + rand(0, step - 1);
    const n = Math.floor((b - a) / step) + 1;
    return {
      level: "easy",
      lines: [`FOR i ← ${a} TO ${b}${step > 1 ? ` STEP ${step}` : ""}`, '    OUTPUT "Fire!"', "NEXT i"],
      q: 'How many times is "Fire!" output?',
      answer: (res) => String(res.outputs.length),
      wrong: [n + 1, n - 1, b - a, b],
      explain: `i takes ${n} values, from ${a} to ${a + (n - 1) * step}${step > 1 ? ` in steps of ${step}` : ""}.`,
    };
  },
  andOr() {
    const a = rand(1, 10), b = rand(1, 10), x = rand(2, 8), y = rand(3, 9), op = pick(["AND", "OR"]);
    const p = a > x, q = b < y, go = op === "AND" ? p && q : p || q;
    return {
      level: "medium",
      lines: [`A ← ${a}`, `B ← ${b}`, `IF A > ${x} ${op} B < ${y}`, "  THEN", '    OUTPUT "Launch"', "  ELSE", '    OUTPUT "Hold"', "ENDIF"],
      wrong: [go ? "Hold" : "Launch", "LaunchHold", "Nothing"],
      explain: `A > ${x} is ${p ? "TRUE" : "FALSE"} and B < ${y} is ${q ? "TRUE" : "FALSE"}. ${op} makes the whole condition ${go ? "TRUE" : "FALSE"}.`,
    };
  },
  countdown() {
    const a = rand(10, 20), s = rand(2, 4), stop = rand(1, 5);
    let x = a, n = 0;
    while (x >= stop) { x -= s; n++; }
    return {
      level: "hard",
      lines: [`X ← ${a}`, "Count ← 0", `WHILE X >= ${stop} DO`, `    X ← X - ${s}`, "    Count ← Count + 1", "ENDWHILE", 'OUTPUT Count, " ", X'],
      wrong: [`${n + 1} ${x - s}`, `${n - 1} ${x + s}`, `${n} ${x + s}`, `${x} ${n}`],
      explain: `X drops by ${s} each time until it's below ${stop}. That takes ${n} passes and leaves X at ${x}.`,
    };
  },
};

// Programs that only use numbers, good for "fill in the missing number"
const BLANKABLE = ["sum", "countMultiples", "whileDown", "repeatMul", "divMod", "chain", "nested", "countdown", "ifMod", "andOr"];

function build(name) {
  for (let tries = 0; tries < 20; tries++) {
    const p = FAMILIES[name]();
    const code = p.lines.join("\n");
    const res = run(code);
    const answer = p.answer ? p.answer(res) : res.outputs.join("\n");
    if (answer !== "" && !answer.includes("\n")) return { ...p, name, code, answer, q: p.q || "What is output?" };
  }
  throw new Error("Couldn't build a puzzle from " + name);
}

// Make answers comparable: ignore case, spaces at the ends, and quotes
export const normaliseAnswer = (s) =>
  String(s ?? "").trim().replace(/^["'“”]+|["'“”]+$/g, "").replace(/\s+/g, " ").toUpperCase();

// ---------------- Earn shots: multiple choice ----------------
let qCounter = 0;
export function makeQuestion() {
  const p = build(pick(Object.keys(FAMILIES)));
  const wrong = [];
  for (const w of shuffle(p.wrong.map(String))) {
    if (wrong.length < 3 && w !== "" && w !== "NaN" && w !== p.answer && !wrong.includes(w)) wrong.push(w);
  }
  // top up with nearby numbers if a family ran short
  for (let d = 1; wrong.length < 3 && d < 20; d++) {
    const n = Number(p.answer);
    for (const w of [n + d, n - d].map(String)) {
      if (wrong.length < 3 && Number.isFinite(n) && Number(w) >= 0 && !wrong.includes(w)) wrong.push(w);
    }
  }
  while (wrong.length < 3) wrong.push(["Nothing", "Error", "0"][wrong.length]);
  return {
    id: `gen-${p.name}-${++qCounter}`,
    level: p.level,
    code: p.lines,
    q: p.q,
    options: [p.answer, ...wrong],
    answer: 0,
    explain: p.explain,
  };
}

// ---------------- Torpedoes ----------------
// "output": type what the program outputs
export function makeOutputPuzzle() {
  const p = build(pick(Object.keys(FAMILIES)));
  return {
    type: "output",
    code: p.code,
    prompt: p.q === "What is output?" ? "Trace the code. What does it output?" : p.q,
    answer: p.answer,
    explain: p.explain,
    check: (input) => normaliseAnswer(input) === normaliseAnswer(p.answer),
  };
}

// "blank": one number is replaced by ?, find a number that makes the program output the target
export function makeBlankPuzzle() {
  for (let tries = 0; tries < 30; tries++) {
    const p = build(pick(BLANKABLE));
    // positive whole numbers outside quotes, not after a minus sign
    const spots = [];
    p.lines.forEach((line, i) => {
      if (line.includes('"') || line.startsWith("OUTPUT")) return;
      for (const m of line.matchAll(/(?<![\w.-])\d+(?![\w.])/g)) {
        if (m[0] !== "0") spots.push({ i, at: m.index, len: m[0].length, value: m[0] });   // "Total ← ?" would be too easy
      }
    });
    if (!spots.length) continue;
    const s = pick(spots);
    const withValue = (v) => p.lines.map((line, i) => (i === s.i ? line.slice(0, s.at) + v + line.slice(s.at + s.len) : line)).join("\n");
    const target = run(p.code).outputs.join("\n");
    return {
      type: "blank",
      code: withValue("?"),
      prompt: `Which whole number goes where the ? is, so the program outputs ${target}?`,
      answer: s.value,
      explain: `${s.value} works: it makes the program output ${target}.`,
      check: (input) => {
        const v = String(input ?? "").trim();
        if (!/^\d{1,4}$/.test(v)) return false;
        try { return run(withValue(v), { maxSteps: 2000 }).outputs.join("\n") === target; } catch { return false; }
      },
    };
  }
  return makeOutputPuzzle();
}
