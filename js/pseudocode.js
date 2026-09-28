// ============================================================
//  pseudocode.js  -  a small Cambridge 2210-style interpreter
//
//  Supports:
//    X ← expr   (or X <- expr)        CONSTANT X ← expr     DECLARE ... (ignored)
//    OUTPUT a, b                       FIRE(column, row)
//    IF cond THEN ... ELSE ... ENDIF   (THEN may be on its own line)
//    FOR i ← a TO b [STEP s] ... NEXT i
//    WHILE cond [DO] ... ENDWHILE      REPEAT ... UNTIL cond
//    + - * /  &  = <> < > <= >=  AND OR NOT  ( )
//    DIV(a,b) MOD(a,b) (also infix: a MOD b)  ROUND(x,p) INT(x)
//    LENGTH(s) UCASE(s) LCASE(s) SUBSTRING(s,start,len) RANDOM()
//  Comments start with //
// ============================================================

export class PseudoError extends Error {
  constructor(message, line) {
    super(line ? `Line ${line}: ${message}` : message);
    this.line = line;
  }
}

const KEYWORDS = new Set([
  "IF", "THEN", "ELSE", "ENDIF", "FOR", "TO", "STEP", "NEXT", "WHILE", "DO", "ENDWHILE",
  "REPEAT", "UNTIL", "OUTPUT", "DECLARE", "CONSTANT", "AND", "OR", "NOT", "TRUE", "FALSE",
  "FIRE", "DIV", "MOD",
]);
const BLOCK_ENDS = ["ELSE", "ENDIF", "NEXT", "ENDWHILE", "UNTIL", "THEN"];
const DOUBLE_Q = "\"\u201C\u201D";   // " and Word-style curly quotes
const SINGLE_Q = "'\u2018\u2019";

// ---------------- tokenizer (one line at a time) ----------------
function tokenize(src, line) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (src.startsWith("//", i)) break;
    if (ch === "\u2190") { toks.push({ t: "assign" }); i++; continue; }
    if (src.startsWith("<-", i)) { toks.push({ t: "assign" }); i += 2; continue; }

    const family = DOUBLE_Q.includes(ch) ? DOUBLE_Q : SINGLE_Q.includes(ch) ? SINGLE_Q : null;
    if (family) {
      let j = i + 1;
      while (j < src.length && !family.includes(src[j])) j++;
      if (j >= src.length) throw new PseudoError("This text is missing its closing quote.", line);
      toks.push({ t: "str", v: src.slice(i + 1, j) });
      i = j + 1; continue;
    }
    if (/\d/.test(ch)) {
      const m = src.slice(i).match(/^\d+(\.\d+)?/);
      toks.push({ t: "num", v: Number(m[0]) });
      i += m[0].length; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = src.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      const up = m[0].toUpperCase();
      toks.push(KEYWORDS.has(up) ? { t: "kw", v: up } : { t: "id", v: m[0] });
      i += m[0].length; continue;
    }
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "<>"].includes(two)) { toks.push({ t: "op", v: two }); i += 2; continue; }
    if ("+-*/(),=<>&".includes(ch)) { toks.push({ t: "op", v: ch }); i++; continue; }
    throw new PseudoError(`I don't recognise the symbol "${ch}".`, line);
  }
  return toks;
}

// ---------------- expression parser ----------------
class Expr {
  constructor(toks, pos, line) { this.toks = toks; this.pos = pos; this.line = line; }
  peek() { return this.toks[this.pos]; }
  isKw(v) { const t = this.peek(); return t && t.t === "kw" && t.v === v; }
  isOp(v) { const t = this.peek(); return t && t.t === "op" && t.v === v; }
  expectOp(v) {
    if (!this.isOp(v)) throw new PseudoError(`Expected "${v}" here.`, this.line);
    this.pos++;
  }
  parse() { return this.or(); }
  or() {
    let a = this.and();
    while (this.isKw("OR")) { this.pos++; a = { k: "bin", op: "OR", a, b: this.and() }; }
    return a;
  }
  and() {
    let a = this.not();
    while (this.isKw("AND")) { this.pos++; a = { k: "bin", op: "AND", a, b: this.not() }; }
    return a;
  }
  not() {
    if (this.isKw("NOT")) { this.pos++; return { k: "not", a: this.not() }; }
    return this.cmp();
  }
  cmp() {
    const a = this.add();
    const t = this.peek();
    if (t && t.t === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(t.v)) {
      this.pos++;
      return { k: "bin", op: t.v, a, b: this.add() };
    }
    return a;
  }
  add() {
    let a = this.mul();
    for (;;) {
      const t = this.peek();
      if (t && t.t === "op" && ["+", "-", "&"].includes(t.v)) { this.pos++; a = { k: "bin", op: t.v, a, b: this.mul() }; }
      else return a;
    }
  }
  mul() {
    let a = this.unary();
    for (;;) {
      const t = this.peek();
      const next = this.toks[this.pos + 1];
      if (t && t.t === "op" && ["*", "/"].includes(t.v)) { this.pos++; a = { k: "bin", op: t.v, a, b: this.unary() }; }
      else if (t && t.t === "kw" && (t.v === "DIV" || t.v === "MOD") && !(next && next.t === "op" && next.v === "(")) {
        this.pos++; a = { k: "bin", op: t.v, a, b: this.unary() };
      } else return a;
    }
  }
  unary() {
    if (this.isOp("-")) { this.pos++; return { k: "neg", a: this.unary() }; }
    return this.primary();
  }
  primary() {
    const t = this.peek();
    if (!t) throw new PseudoError("This line ends too early. Something is missing.", this.line);
    this.pos++;
    if (t.t === "num" || t.t === "str") return { k: "lit", v: t.v };
    if (t.t === "kw" && (t.v === "TRUE" || t.v === "FALSE")) return { k: "lit", v: t.v === "TRUE" };
    if (t.t === "op" && t.v === "(") { const e = this.parse(); this.expectOp(")"); return e; }
    if (t.t === "id" || (t.t === "kw" && (t.v === "DIV" || t.v === "MOD"))) {
      if (this.isOp("(")) {
        this.pos++;
        const args = [];
        if (!this.isOp(")")) {
          args.push(this.parse());
          while (this.isOp(",")) { this.pos++; args.push(this.parse()); }
        }
        this.expectOp(")");
        return { k: "call", name: t.v.toUpperCase(), args };
      }
      if (t.t === "kw") throw new PseudoError(`${t.v} needs brackets, like ${t.v}(17, 5).`, this.line);
      return { k: "var", name: t.v };
    }
    throw new PseudoError(`Unexpected "${t.v}".`, this.line);
  }
}

function exprFrom(toks, start, line, stopKw) {
  // parse toks[start..] as one expression; stop before keyword stopKw if given
  const end = stopKw ? toks.findIndex((t, i) => i >= start && t.t === "kw" && stopKw.includes(t.v)) : -1;
  const slice = end === -1 ? toks.slice(start) : toks.slice(start, end);
  if (!slice.length) throw new PseudoError("Something is missing here.", line);
  const p = new Expr(slice, 0, line);
  const node = p.parse();
  if (p.pos < slice.length) throw new PseudoError(`Unexpected "${slice[p.pos].v ?? "←"}".`, line);
  return { node, next: end === -1 ? toks.length : end };
}

// ---------------- statement parser ----------------
export function parse(source) {
  const lines = [];
  source.replace(/\r/g, "").split("\n").forEach((text, i) => {
    // DECLARE X : INTEGER is skipped, so don't trip over the ":" or ARRAY[...]
    if (/^\s*DECLARE\b/i.test(text)) { lines.push({ toks: [{ t: "kw", v: "DECLARE" }], line: i + 1 }); return; }
    const toks = tokenize(text, i + 1);
    if (toks.length) lines.push({ toks, line: i + 1 });
  });
  let idx = 0;

  const first = (l) => l.toks[0];
  const isKwLine = (l, v) => first(l).t === "kw" && first(l).v === v;

  function block(stops) {
    const stmts = [];
    while (idx < lines.length) {
      const l = lines[idx];
      const f = first(l);
      if (f.t === "kw" && BLOCK_ENDS.includes(f.v)) {
        if (stops.includes(f.v)) return stmts;
        const want = stops.length ? `Expected ${stops.join(" or ")} but found ${f.v}.` : `${f.v} doesn't match any IF, FOR, WHILE or REPEAT above it.`;
        throw new PseudoError(want, l.line);
      }
      stmts.push(statement());
    }
    if (stops.length) {
      const opener = stops.includes("ENDIF") ? "IF" : stops.includes("NEXT") ? "FOR" : stops.includes("ENDWHILE") ? "WHILE" : "REPEAT";
      throw new PseudoError(`A ${opener} is never closed. Add ${stops[stops.length - 1]}.`);
    }
    return stmts;
  }

  function statement() {
    const { toks, line } = lines[idx];
    const f = toks[0];
    idx++;

    if (f.t === "kw" && f.v === "DECLARE") return { k: "nop", line };

    if (f.t === "kw" && f.v === "OUTPUT") {
      const items = [];
      let pos = 1;
      // split on top-level commas
      let depth = 0, start = 1;
      for (; pos <= toks.length; pos++) {
        const t = toks[pos];
        if (t && t.t === "op" && t.v === "(") depth++;
        if (t && t.t === "op" && t.v === ")") depth--;
        if (!t || (t.t === "op" && t.v === "," && depth === 0)) {
          items.push(exprFrom(toks.slice(0, pos), start, line).node);
          start = pos + 1;
        }
      }
      return { k: "output", items, line };
    }

    if (f.t === "kw" && f.v === "FIRE") {
      const p = new Expr(toks, 1, line);
      p.expectOp("(");
      const col = p.parse();
      p.expectOp(",");
      const row = p.parse();
      p.expectOp(")");
      if (p.pos < toks.length) throw new PseudoError("Extra symbols after FIRE(...).", line);
      return { k: "fire", col, row, line };
    }

    if (f.t === "kw" && f.v === "IF") {
      const { node: cond, next } = exprFrom(toks, 1, line, ["THEN"]);
      if (next === toks.length) {
        if (idx < lines.length && isKwLine(lines[idx], "THEN") && lines[idx].toks.length === 1) idx++;
        else throw new PseudoError("IF needs THEN after the condition.", line);
      } else if (next !== toks.length - 1) {
        throw new PseudoError("Put the statements after THEN on the next lines.", line);
      }
      const yes = block(["ELSE", "ENDIF"]);
      let no = [];
      if (isKwLine(lines[idx], "ELSE")) {
        if (lines[idx].toks.length > 1) throw new PseudoError("Put the statements after ELSE on the next lines.", lines[idx].line);
        idx++;
        no = block(["ENDIF"]);
      }
      idx++;   // ENDIF
      return { k: "if", cond, yes, no, line };
    }

    if (f.t === "kw" && f.v === "FOR") {
      const v = toks[1];
      if (!v || v.t !== "id" || !toks[2] || toks[2].t !== "assign") {
        throw new PseudoError("Write FOR like this: FOR Count ← 1 TO 5", line);
      }
      const a = exprFrom(toks, 3, line, ["TO"]);
      if (a.next === toks.length) throw new PseudoError("FOR needs TO, like FOR Count ← 1 TO 5", line);
      const b = exprFrom(toks, a.next + 1, line, ["STEP"]);
      const step = b.next < toks.length ? exprFrom(toks, b.next + 1, line).node : null;
      const body = block(["NEXT"]);
      const nx = lines[idx];
      if (nx.toks[1] && (nx.toks[1].t !== "id" || nx.toks[1].v !== v.v)) {
        throw new PseudoError(`NEXT should say NEXT ${v.v}.`, nx.line);
      }
      idx++;
      return { k: "for", name: v.v, from: a.node, to: b.node, step, body, line };
    }

    if (f.t === "kw" && f.v === "WHILE") {
      const { node: cond, next } = exprFrom(toks, 1, line, ["DO"]);
      if (next < toks.length - 1) throw new PseudoError("Put the loop's statements on the next lines.", line);
      const body = block(["ENDWHILE"]);
      idx++;
      return { k: "while", cond, body, line };
    }

    if (f.t === "kw" && f.v === "REPEAT") {
      if (toks.length > 1) throw new PseudoError("Put the loop's statements on the next lines.", line);
      const body = block(["UNTIL"]);
      const u = lines[idx];
      idx++;
      const { node: cond } = exprFrom(u.toks, 1, u.line);
      return { k: "repeat", cond, body, line };
    }

    let t0 = 0;
    if (f.t === "kw" && f.v === "CONSTANT") t0 = 1;
    const target = toks[t0];
    if (target && target.t === "id") {
      const op = toks[t0 + 1];
      if (op && op.t === "assign") {
        return { k: "set", name: target.v, value: exprFrom(toks, t0 + 2, line).node, line };
      }
      if (op && op.t === "op" && op.v === "=") {
        throw new PseudoError(`Use ← to store a value, like ${target.v} ← 5 (type <- if you have no ← key).`, line);
      }
    }
    throw new PseudoError("I don't understand this line.", line);
  }

  return block([]);
}

// ---------------- evaluator ----------------
function colIndex(v, cols, line) {
  if (typeof v === "string") {
    const s = v.trim().toUpperCase();
    if (s.length === 1 && s >= "A" && s.charCodeAt(0) - 65 < cols) return s.charCodeAt(0) - 65;
    throw new PseudoError(`"${v}" isn't a column on this chart (A to ${String.fromCharCode(64 + cols)}).`, line);
  }
  if (Number.isInteger(v) && v >= 1 && v <= cols) return v - 1;
  throw new PseudoError(`Column ${v} is off the chart. Use a letter, or a number from 1 to ${cols}.`, line);
}

export function run(source, { cols = 24, rows = 16, maxSteps = 5000, maxFires = 50 } = {}) {
  const program = parse(source);
  const env = new Map();
  const out = { outputs: [], fires: [] };
  let steps = 0;

  const num = (v, line, what) => {
    if (typeof v !== "number") throw new PseudoError(`${what} needs a number, but got ${JSON.stringify(v)}.`, line);
    return v;
  };

  function ev(n, line) {
    switch (n.k) {
      case "lit": return n.v;
      case "var":
        if (!env.has(n.name)) throw new PseudoError(`${n.name} has no value yet. Give it one with ←.`, line);
        return env.get(n.name);
      case "neg": return -num(ev(n.a, line), line, "-");
      case "not": return !ev(n.a, line);
      case "bin": {
        const a = ev(n.a, line), b = ev(n.b, line);
        switch (n.op) {
          case "+": return typeof a === "string" || typeof b === "string" ? String(a) + String(b) : a + b;
          case "&": return String(a) + String(b);
          case "-": return num(a, line, "-") - num(b, line, "-");
          case "*": return num(a, line, "*") * num(b, line, "*");
          case "/": if (b === 0) throw new PseudoError("You can't divide by zero.", line); return a / b;
          case "DIV": if (b === 0) throw new PseudoError("You can't divide by zero.", line); return Math.trunc(a / b);
          case "MOD": if (b === 0) throw new PseudoError("You can't divide by zero.", line); return a % b;
          case "=": return a === b;
          case "<>": return a !== b;
          case "<": return a < b;
          case ">": return a > b;
          case "<=": return a <= b;
          case ">=": return a >= b;
          case "AND": return a && b;
          case "OR": return a || b;
        }
        break;
      }
      case "call": {
        const args = n.args.map((x) => ev(x, line));
        const need = (k) => { if (args.length !== k) throw new PseudoError(`${n.name} needs ${k} value${k === 1 ? "" : "s"} in its brackets.`, line); };
        switch (n.name) {
          case "DIV": need(2); if (args[1] === 0) throw new PseudoError("You can't divide by zero.", line); return Math.trunc(num(args[0], line, "DIV") / num(args[1], line, "DIV"));
          case "MOD": need(2); if (args[1] === 0) throw new PseudoError("You can't divide by zero.", line); return num(args[0], line, "MOD") % num(args[1], line, "MOD");
          case "ROUND": need(2); return Number(num(args[0], line, "ROUND").toFixed(args[1]));
          case "INT": need(1); return Math.trunc(num(args[0], line, "INT"));
          case "LENGTH": need(1); return String(args[0]).length;
          case "UCASE": need(1); return String(args[0]).toUpperCase();
          case "LCASE": need(1); return String(args[0]).toLowerCase();
          case "SUBSTRING": need(3); return String(args[0]).substr(args[1] - 1, args[2]);
          case "RANDOM": need(0); return Math.random();
        }
        throw new PseudoError(`${n.name}() isn't a function I know.`, line);
      }
    }
    throw new PseudoError("Something went wrong working this out.", line);
  }

  function tick(line) {
    if (++steps > maxSteps) throw new PseudoError("Your program ran too long. Check for a loop that never ends.", line);
  }

  function exec(stmts) {
    for (const s of stmts) {
      tick(s.line);
      switch (s.k) {
        case "nop": break;
        case "set": env.set(s.name, ev(s.value, s.line)); break;
        case "output": out.outputs.push(s.items.map((x) => { const v = ev(x, s.line); return typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v); }).join("")); break;
        case "fire": {
          const c = colIndex(ev(s.col, s.line), cols, s.line);
          const r = ev(s.row, s.line);
          if (!Number.isInteger(r) || r < 1 || r > rows) throw new PseudoError(`Row ${r} is off the chart. Use 1 to ${rows}.`, s.line);
          if (out.fires.length >= maxFires) throw new PseudoError(`That's more than ${maxFires} FIRE commands. Nobody has that many shots!`, s.line);
          out.fires.push({ r: r - 1, c, line: s.line });
          break;
        }
        case "if": exec(ev(s.cond, s.line) ? s.yes : s.no); break;
        case "for": {
          const a = num(ev(s.from, s.line), s.line, "FOR");
          const b = num(ev(s.to, s.line), s.line, "FOR");
          const st = s.step ? num(ev(s.step, s.line), s.line, "STEP") : 1;
          if (st === 0) throw new PseudoError("STEP can't be 0.", s.line);
          for (let i = a; st > 0 ? i <= b : i >= b; i += st) {
            tick(s.line);
            env.set(s.name, i);
            exec(s.body);
          }
          break;
        }
        case "while": while (ev(s.cond, s.line)) { tick(s.line); exec(s.body); } break;
        case "repeat": do { tick(s.line); exec(s.body); } while (!ev(s.cond, s.line)); break;
      }
    }
  }

  exec(program);
  return out;
}
