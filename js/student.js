// ============================================================
//  student.js  -  join, pick team, place fleet, fire
// ============================================================
import {
  ensureSignedIn, watchGame, gameExists, joinGame, chooseTeam,
  saveFleet, setReady, fire, recordAnswer, modesOf, useSonar, useAirstrike,
} from "./firebase.js";
import {
  FLEET, zoneFor, teamIndex, canPlace, randomFleet, shipCells, fleetComplete,
  cellName, zoneOwner, cellKey, gridSize, colLabel,
  POWERUPS, airstrikeCells, sonarCells, maxStorm,
} from "./game.js";
import { renderOcean, renderTeams, renderFeed, escapeHtml } from "./board.js";
import { QUESTIONS, REWARD } from "./questions.js";
import { makeTorpedo, normaliseCell } from "./trace.js";
import { run as runPseudo } from "./pseudocode.js";
import { sfx, muteButton } from "./sound.js";

const $ = (id) => document.getElementById(id);
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

const state = {
  uid: null, code: null, game: null, stop: null,
  placing: { shipId: FLEET[0].id, dir: "h", hover: null },
  target: null, busy: false,
};

// ---------------- start-up ----------------
muteButton($("mute"));
setInterval(() => {
  const el = document.querySelector(".storm-line");
  if (el && state.game) el.outerHTML = stormLine(state.game) || "<div class=\"storm-line\"></div>";
}, 1000);
$("join-code").value = store.get("bs_code") || "";
$("join-name").value = store.get("bs_name") || "";

ensureSignedIn().then((user) => {
  state.uid = user.uid;
  const code = store.get("bs_code");
  if (code && store.get("bs_name")) tryJoin(code, store.get("bs_name"), true);
}).catch(() => showMsg("Couldn't connect. Check the internet connection and reload."));

$("join-form").addEventListener("submit", (e) => {
  e.preventDefault();
  tryJoin($("join-code").value.trim().toUpperCase(), $("join-name").value.trim(), false);
});

async function tryJoin(code, name, silent) {
  if (!state.uid) return showMsg("Still connecting. Try again in a moment.");
  if (!name) return showMsg("Enter your name.");
  if (!(await gameExists(code))) {
    if (!silent) showMsg(`No game with code ${code}. Check the board and try again.`);
    return;
  }
  await joinGame(code, state.uid, name);
  store.set("bs_code", code);
  store.set("bs_name", name);
  state.code = code;
  if (state.stop) state.stop();
  state.stop = watchGame(code, (g) => { state.game = g; render(); });
}

function showMsg(text) { $("join-msg").textContent = text; }

// ---------------- main render ----------------
function show(screen) {
  for (const s of ["join", "team", "wait", "play"]) $("screen-" + s).hidden = s !== screen;
}

function render() {
  const g = state.game;
  if (!g) { show("join"); return; }
  const me = g.players && g.players[state.uid];
  if (!me) { show("join"); return; }
  const team = me.team && g.teams[me.team];

  $("who").innerHTML = team
    ? `<span class="pennant" style="--tc:${team.color}"></span>${escapeHtml(me.name)}, ${escapeHtml(team.name)} <span class="code">Code ${state.code}</span>`
    : `${escapeHtml(me.name)} <span class="code">Code ${state.code}</span>`;

  watchEvents(g, me.team);
  if (!team && g.phase !== "finished") return renderTeamPicker(g);
  if (g.phase === "lobby") return renderWaiting(g, team);
  show("play");
  if (g.phase !== "battle") {
    const panel = $("panel");
    panel.dataset.key = "";
    panel.onsubmit = null;
    panel.oninput = null;
  }
  if (g.phase === "placement") return renderPlacement(g, me.team);
  if (g.phase === "battle") return renderBattle(g, me.team);
  return renderFinished(g, me.team);
}

// ---------------- alerts for things other players did ----------------
const seen = { shots: null, storm: 0, won: false };
function watchEvents(g, teamId) {
  const shots = g.shots || {};
  if (seen.shots === null) {
    seen.shots = new Set(Object.keys(shots));
    seen.storm = g.storm || 0;
    seen.won = g.phase === "finished";
    return;
  }
  for (const [k, shot] of Object.entries(shots)) {
    if (seen.shots.has(k)) continue;
    seen.shots.add(k);
    if (teamId && shot.target === teamId && shot.hit) {
      const ship = FLEET.find((f) => f.id === shot.ship);
      toast(`Incoming! ${g.teams[shot.by].name} hit your ${ship ? ship.name.toLowerCase() : "ship"} at ${cellName(shot.r, shot.c)}.`, "alert");
      sfx.incoming();
    }
  }
  if ((g.storm || 0) > seen.storm) {
    seen.storm = g.storm;
    toast(g.storm >= maxStorm(g.settings.teamCount)
      ? "The storm is at full strength!"
      : "The storm closes in! Ships in the storm are visible to everyone.", "storm");
    sfx.storm();
  }
  if (g.phase === "finished" && !seen.won) {
    seen.won = true;
    if (g.winner) sfx.win();
  }
}

// ---------------- team picker ----------------
function renderTeamPicker(g) {
  show("team");
  $("team-picker").innerHTML = Object.entries(g.teams).map(([id, t]) => {
    const crew = Object.values(g.players || {}).filter((p) => p.team === id).map((p) => escapeHtml(p.name));
    return `<li><button class="team-btn" data-team="${id}" style="--tc:${t.color}" ${t.alive ? "" : "disabled"}>
      <span class="pennant"></span><strong>${escapeHtml(t.name)}</strong>
      <span class="crew">${crew.length ? crew.join(", ") : "No crew yet"}</span></button></li>`;
  }).join("");
  $("team-picker").onclick = (e) => {
    const b = e.target.closest("[data-team]");
    if (b) chooseTeam(state.code, state.uid, b.dataset.team);
  };
}

function renderWaiting(g, team) {
  show("wait");
  $("wait-title").textContent = `You're aboard with ${team.name}`;
  renderTeams($("wait-teams"), g, g.players[state.uid].team);
}

// ---------------- placement ----------------
function currentShip(g, teamId) {
  const p = state.placing;
  const proto = FLEET.find((s) => s.id === p.shipId);
  if (!proto || !p.hover) return null;
  return { ...proto, dir: p.dir, r: p.hover[0], c: p.hover[1] };
}

function renderPlacement(g, teamId) {
  const zone = zoneFor(teamIndex(teamId), g.settings.teamCount);
  const fleet = (g.fleets && g.fleets[teamId]) || {};
  const ready = g.teams[teamId].ready;
  const cand = !ready && currentShip(g, teamId);

  renderOcean($("ocean"), g, {
    myTeam: teamId,
    activeZone: teamId,
    preview: cand ? { cells: shipCells(cand), ok: canPlace(fleet, cand, zone) } : null,
    onCell: ready ? null : (r, c) => placeAt(g, teamId, zone, fleet, r, c),
    onHover: ready ? null : (r, c) => {
      const h = state.placing.hover;
      if (!h || h[0] !== r || h[1] !== c) { state.placing.hover = [r, c]; renderPlacement(g, teamId); }
    },
  });

  const shipsHtml = FLEET.map((s) => {
    const placed = !!fleet[s.id];
    const sel = s.id === state.placing.shipId;
    return `<li><button class="ship-pick ${sel ? "sel" : ""} ${placed ? "placed" : ""}" data-ship="${s.id}" ${ready ? "disabled" : ""}>
      <span class="ship-bar" style="--len:${s.len}"></span>${s.name} <small>${s.len} squares${placed ? ", placed" : ""}</small></button></li>`;
  }).join("");

  $("panel").innerHTML = `
    <h2>Place your fleet</h2>
    <p class="hint">Your home waters are the bright squares. Pick a ship, then tap where its ${state.placing.dir === "h" ? "left" : "top"} end goes. Your whole crew sees the same fleet.</p>
    <ul class="ship-list">${shipsHtml}</ul>
    <div class="btn-row">
      <button class="btn" data-action="rotate" ${ready ? "disabled" : ""}>Rotate (${state.placing.dir === "h" ? "across" : "down"})</button>
      <button class="btn" data-action="random" ${ready ? "disabled" : ""}>Random</button>
    </div>
    <button class="btn primary wide" data-action="ready" ${fleetComplete(fleet) ? "" : "disabled"}>
      ${ready ? "Unlock fleet" : "Lock in fleet"}</button>
    <p class="hint">${ready ? "Locked in. Waiting for the other teams and your teacher." : fleetComplete(fleet) ? "All ships placed. Lock in when your crew agrees." : "Place all four ships to lock in."}</p>
    <h3>Teams</h3><ul class="teams" id="teams"></ul>`;
  renderTeams($("teams"), g, teamId);

  $("panel").onclick = async (e) => {
    const shipBtn = e.target.closest("[data-ship]");
    if (shipBtn) { state.placing.shipId = shipBtn.dataset.ship; return renderPlacement(g, teamId); }
    const act = e.target.closest("[data-action]")?.dataset.action;
    if (act === "rotate") { state.placing.dir = state.placing.dir === "h" ? "v" : "h"; renderPlacement(g, teamId); }
    if (act === "random") await saveFleet(state.code, teamId, randomFleet(zone));
    if (act === "ready") await setReady(state.code, teamId, !ready);
  };
}

async function placeAt(g, teamId, zone, fleet, r, c) {
  // tapping one of your ships picks it up for moving
  const onShip = Object.values(fleet).find((s) => shipCells(s).some(([a, b]) => a === r && b === c));
  if (onShip && onShip.id !== state.placing.shipId) {
    state.placing.shipId = onShip.id;
    state.placing.dir = onShip.dir;
    return renderPlacement(g, teamId);
  }
  const proto = FLEET.find((s) => s.id === state.placing.shipId);
  const ship = { ...proto, dir: state.placing.dir, r, c };
  if (!canPlace(fleet, ship, zone)) return toast("That ship doesn't fit there.");
  const next = FLEET.find((s) => !fleet[s.id] && s.id !== ship.id);
  if (next) state.placing.shipId = next.id;
  await saveFleet(state.code, teamId, { ...fleet, [ship.id]: ship });
}

// ---------------- battle ----------------
// The panel is built once, then only the live parts are refreshed,
// so a half-answered question or half-written code isn't wiped
// every time another team fires.
const TABS = [
  { id: "fire", label: "Fire" },
  { id: "quiz", label: "Earn shots", mode: "quiz" },
  { id: "torpedo", label: "Torpedo", mode: "torpedo" },
  { id: "code", label: "Code", mode: "console" },
];

const battle = {
  tab: "fire",
  weapon: "shot",   // "shot", "sonar" or "airstrike"
  quiz: { q: null, order: null, picked: null, lockUntil: 0, note: "" },
  torpedo: { snippet: null, cell: null, result: null, readyAt: 0 },
  code: {
    text: '// Fire at C7 (column, row)\nFIRE("C", 7)\n\n// A loop fires one shot per turn:\n// FOR Row ← 2 TO 4\n//     FIRE("K", Row)\n// NEXT Row\n',
    log: [], running: false,
  },
};
const seenQuestions = new Set();

function renderBattle(g, teamId) {
  const team = g.teams[teamId];
  const modes = modesOf(g);
  const tabs = TABS.filter((t) => !t.mode || modes[t.mode]);
  if (!tabs.some((t) => t.id === battle.tab)) battle.tab = "fire";

  const t = state.target;
  if (t && g.shots && g.shots[cellKey(t[0], t[1])]) state.target = null;

  const pu = team.powerups || {};
  if (battle.weapon !== "shot" && !(pu[battle.weapon] > 0)) battle.weapon = "shot";
  let area = null;
  if (battle.tab === "fire" && state.target && battle.weapon === "sonar") area = sonarCells(...state.target, g.settings.teamCount);
  if (battle.tab === "fire" && state.target && battle.weapon === "airstrike") area = airstrikeCells(...state.target, g.settings.teamCount);

  renderOcean($("ocean"), g, {
    myTeam: teamId,
    selected: battle.tab === "fire" ? state.target : null,
    onCell: team.alive ? (r, c) => onChartTap(g, teamId, r, c) : null,
    intel: team.intel,
    area,
  });

  const key = `battle:${teamId}:${team.alive}:${tabs.map((x) => x.id).join(",")}`;
  const panel = $("panel");
  if (panel.dataset.key !== key) {
    panel.dataset.key = key;
    panel.innerHTML = team.alive ? `
      <div class="ammo" id="ammo"></div>
      <div class="tabs" role="tablist">${tabs.map((x) =>
        `<button role="tab" class="tab" data-tab="${x.id}">${x.label}</button>`).join("")}</div>
      <div class="tab-body" id="tab-body"></div>
      <h3>Teams</h3><ul class="teams" id="teams"></ul>
      <h3>Battle log</h3><ol class="feed" id="feed"></ol>`
      : `<div class="sunk-note"><h2>Your fleet is sunk</h2><p>Keep watching. The chart updates live until one team is left.</p></div>
      <h3>Teams</h3><ul class="teams" id="teams"></ul>
      <h3>Battle log</h3><ol class="feed" id="feed"></ol>`;
    panel.onclick = (e) => onPanelClick(e, teamId);
    panel.onsubmit = (e) => onPanelSubmit(e, teamId);
    panel.oninput = (e) => { if (e.target.id === "code-input") battle.code.text = e.target.value; };
    if (team.alive) renderTab(g, teamId);
  }

  if (team.alive) {
    const max = g.settings.maxAmmo;
    $("ammo").innerHTML = `
      <span class="ammo-n">${team.ammo}</span><span class="ammo-l">shot${team.ammo === 1 ? "" : "s"} for your crew</span>
      <div class="shells">${Array.from({ length: max }, (_, i) => `<span class="shell ${i < team.ammo ? "full" : ""}"></span>`).join("")}</div>
      <div class="pu-count">${pu.sonar || 0} sonar, ${pu.airstrike || 0} airstrike${pu.airstrike === 1 ? "" : "s"}</div>
      ${stormLine(g)}`;
    panel.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === battle.tab));
    if (battle.tab === "fire") updateFireBox(g, teamId);
  }
  renderTeams($("teams"), g, teamId);
  renderFeed($("feed"), g);
}

function stormLine(g) {
  const lvl = g.storm || 0, max = maxStorm(g.settings.teamCount);
  if (!lvl && !g.stormNextAt) return "";
  const next = g.stormNextAt && lvl < max ? Math.max(0, Math.round((g.stormNextAt - Date.now()) / 1000)) : null;
  const t = next !== null ? `${Math.floor(next / 60)}:${String(next % 60).padStart(2, "0")}` : null;
  const text = lvl
    ? `Storm ${lvl} of ${max}${t ? `, closes in again in ${t}` : ""}`
    : `Storm arrives in ${t}`;
  return `<div class="storm-line">${text}</div>`;
}

// Tapping the chart does something different on each tab
function onChartTap(g, teamId, r, c) {
  if (battle.tab === "code") {
    const box = $("code-input");
    const line = `FIRE("${colLabel(c)}", ${r + 1})\n`;
    const at = box.selectionStart ?? box.value.length;
    const before = box.value.slice(0, at);
    const pad = before && !before.endsWith("\n") ? "\n" : "";
    box.value = before + pad + line + box.value.slice(at);
    battle.code.text = box.value;
    box.focus();
    box.selectionStart = box.selectionEnd = at + pad.length + line.length;
    return;
  }
  if (battle.tab === "torpedo" && battle.torpedo.snippet && !battle.torpedo.result) {
    const input = $("torpedo-answer");
    if (input) input.value = cellName(r, c);
    return;
  }
  const needsFresh = battle.tab !== "fire" || battle.weapon === "shot";
  if (needsFresh && g.shots && g.shots[cellKey(r, c)]) return toast(`${cellName(r, c)} has already been hit.`);
  if (needsFresh && zoneOwner(r, c, g.settings.teamCount) === teamId) return toast("That's your own waters.");
  state.target = [r, c];
  if (battle.tab !== "fire") { battle.tab = "fire"; renderTab(g, teamId); }
  render();
}

function renderTab(g, teamId) {
  const body = $("tab-body");
  if (!body) return;
  if (battle.tab === "fire") {
    body.innerHTML = `
      <div class="fire-box">
        <div class="weapons" role="radiogroup" aria-label="Weapon" id="weapons"></div>
        <span class="target-label">Target</span>
        <span class="target-cell" id="target-cell"></span>
        <button class="btn fire wide" data-action="fire" id="fire-btn">Fire</button>
        <p class="hint" id="weapon-help"></p>
      </div>`;
    updateFireBox(g, teamId);
  }
  if (battle.tab === "quiz") renderQuiz(g);
  if (battle.tab === "torpedo") renderTorpedo(g);
  if (battle.tab === "code") renderCode(g);
  $("panel").querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === battle.tab));
}

function updateFireBox(g, teamId) {
  const team = g.teams[teamId];
  const pu = team.powerups || {};
  const cell = $("target-cell"), btn = $("fire-btn");
  if (!cell) return;
  const w = battle.weapon;
  $("weapons").innerHTML = [
    ["shot", "Shot", team.ammo],
    ["sonar", "Sonar", pu.sonar || 0],
    ["airstrike", "Airstrike", pu.airstrike || 0],
  ].map(([id, label, n]) => `<button role="radio" class="weapon" data-weapon="${id}" aria-checked="${w === id}" ${n > 0 ? "" : "disabled"}>
      ${label} <span>${n}</span></button>`).join("");
  cell.textContent = state.target ? cellName(...state.target) : "None";
  btn.textContent = w === "shot" ? "Fire" : POWERUPS[w].verb;
  const have = w === "shot" ? team.ammo > 0 : (pu[w] || 0) > 0;
  btn.disabled = !(state.target && have && !state.busy);
  $("weapon-help").textContent = w === "shot"
    ? `Tap a square in another team's waters, then fire. Get 3 questions right in a row to earn a power-up.`
    : POWERUPS[w].help;
}

async function onPanelClick(e, teamId) {
  const g = state.game;
  const tabBtn = e.target.closest("[data-tab]");
  if (tabBtn) { battle.tab = tabBtn.dataset.tab; renderTab(g, teamId); render(); return; }
  const weaponBtn = e.target.closest("[data-weapon]");
  if (weaponBtn) {
    battle.weapon = weaponBtn.dataset.weapon;
    // a plain shot can't go at a square that's already been hit
    if (battle.weapon === "shot" && state.target && ((g.shots && g.shots[cellKey(...state.target)]) || zoneOwner(...state.target, g.settings.teamCount) === teamId)) state.target = null;
    render(); return;
  }
  const act = e.target.closest("[data-action]")?.dataset.action;
  if (!act) return;


  if (act === "fire" && state.target) {
    state.busy = true; updateFireBox(g, teamId);
    try {
      if (battle.weapon === "shot") {
        sfx.fire();
        announce(await fire(state.code, g, teamId, ...state.target, state.uid));
      } else if (battle.weapon === "sonar") {
        sfx.sonar();
        const res = await useSonar(state.code, g, teamId, ...state.target);
        toast(res.found ? `Sonar contact! ${res.found} square${res.found === 1 ? "" : "s"} near ${res.cell} hide a ship.` : `Sonar around ${res.cell}: clear water.`, res.found ? "big" : "");
      } else {
        sfx.fire();
        const results = await useAirstrike(state.code, teamId, ...state.target, state.uid);
        const hits = results.filter((r) => r.hit);
        const sunk = results.find((r) => r.eliminated) || results.find((r) => r.sunk);
        if (sunk) announce(sunk);
        else if (hits.length) { toast(`Airstrike: ${hits.length} hit${hits.length === 1 ? "" : "s"}!`, "big"); sfx.hit(); }
        else { toast("Airstrike: all misses."); sfx.miss(); }
      }
    } catch (err) { toast(err.message); }
    state.target = null; state.busy = false; battle.weapon = "shot"; render();
  }
  if (act === "next-q") nextQuestion();
  if (act === "answer") await answerQuestion(g, teamId, +e.target.closest("[data-opt]").dataset.opt);
  if (act === "launch") launchTorpedo(g, teamId);
  if (act === "arrow") insertAtCursor($("code-input"), " ← ");
  if (act === "run") await runCode(teamId);
  if (act === "clear-log") { battle.code.log = []; renderCode(state.game); }
}

async function onPanelSubmit(e, teamId) {
  e.preventDefault();
  if (e.target.id === "torpedo-form") await submitTorpedo(teamId);
}

function announce(res) {
  if (!res.hit) { toast(`Miss at ${res.cell}.`); sfx.miss(); }
  else if (res.eliminated) { toast(`Hit! You finished off ${res.eliminated}!`, "big"); sfx.sink(); }
  else if (res.sunk) { toast(`Hit! You sank a ${res.sunk.toLowerCase()}!`, "big"); sfx.sink(); }
  else { toast(`Hit at ${res.cell}!`, "big"); sfx.hit(); }
}

// ---------------- Earn shots (quiz) ----------------
function nextQuestion() {
  let pool = QUESTIONS.filter((q) => !seenQuestions.has(q.id));
  if (!pool.length) { seenQuestions.clear(); pool = QUESTIONS; }
  const q = pool[Math.floor(Math.random() * pool.length)];
  seenQuestions.add(q.id);
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  Object.assign(battle.quiz, { q, order, picked: null, note: "" });
  renderQuiz(state.game);
}

function renderQuiz(g) {
  const body = $("tab-body");
  const Q = battle.quiz;
  if (!Q.q) { nextQuestion(); return; }
  const locked = Date.now() < Q.lockUntil;
  const reward = REWARD[Q.q.level];
  const done = Q.picked !== null;

  body.innerHTML = `
    <div class="quiz">
      <p class="q-level">${Q.q.level === "easy" ? "Easy" : Q.q.level === "medium" ? "Medium" : "Hard"}, worth ${reward} shot${reward === 1 ? "" : "s"}</p>
      ${Q.q.code ? `<pre class="code-view">${escapeHtml(Q.q.code.join("\n"))}</pre>` : ""}
      <p class="q-text">${escapeHtml(Q.q.q)}</p>
      <div class="options">${Q.order.map((i) => {
        let cls = "opt";
        if (done && i === Q.q.answer) cls += " right";
        else if (done && i === Q.picked) cls += " wrong";
        return `<button class="${cls}" data-action="answer" data-opt="${i}" ${done ? "disabled" : ""}>${escapeHtml(Q.q.options[i])}</button>`;
      }).join("")}</div>
      ${done ? `<p class="explain">${escapeHtml(Q.q.explain)}</p>` : ""}
      ${Q.note ? `<p class="q-note">${escapeHtml(Q.note)}</p>` : ""}
      ${done ? `<button class="btn primary wide" data-action="next-q" id="next-q" ${locked ? "disabled" : ""}>
        ${locked ? `Next question in <span id="lock-left">${Math.ceil((Q.lockUntil - Date.now()) / 1000)}</span>s` : "Next question"}</button>` : ""}
    </div>`;

  if (locked) {
    const tick = setInterval(() => {
      const left = Math.ceil((Q.lockUntil - Date.now()) / 1000);
      const span = $("lock-left"), btn = $("next-q");
      if (!span || !btn) return clearInterval(tick);
      if (left <= 0) { clearInterval(tick); btn.disabled = false; btn.textContent = "Next question"; }
      else span.textContent = left;
    }, 250);
  }
}

async function answerQuestion(g, teamId, opt) {
  const Q = battle.quiz;
  if (Q.picked !== null) return;
  Q.picked = opt;
  const correct = opt === Q.q.answer;
  if (correct) {
    Q.note = "";
    renderQuiz(g);
    sfx.correct();
    const { added, powerup } = await recordAnswer(state.code, g, teamId, state.uid, true, REWARD[Q.q.level]);
    Q.note = added ? `Correct! +${added} shot${added === 1 ? "" : "s"} for your crew.` : "Correct, but your crew's shots are full. Fire some first!";
    if (powerup) {
      Q.note += ` Three in a row: your crew earned a${powerup === "airstrike" ? "n" : ""} ${POWERUPS[powerup].name.toLowerCase()}!`;
      toast(`Power-up: ${POWERUPS[powerup].name}!`, "big");
      sfx.power();
    } else if (added) toast(`+${added} shot${added === 1 ? "" : "s"}!`, "big");
  } else {
    Q.lockUntil = Date.now() + 10000;
    Q.note = "Not this time. Read the explanation, then try another.";
    sfx.wrong();
    recordAnswer(state.code, g, teamId, state.uid, false, 0);
  }
  if (battle.tab === "quiz") renderQuiz(g);
}

// ---------------- Torpedo (trace the code) ----------------
function renderTorpedo(g) {
  const body = $("tab-body");
  const T = battle.torpedo;
  const wait = Math.ceil((T.readyAt - Date.now()) / 1000);

  if (!T.snippet) {
    body.innerHTML = `
      <div class="torpedo">
        <p>A torpedo is a free shot. Its target is hidden in code: trace the code to find the square, and the torpedo fires there. Get it wrong and it's lost.</p>
        <button class="btn primary wide" data-action="launch" id="launch-btn" ${wait > 0 ? "disabled" : ""}>
          ${wait > 0 ? `Torpedo reloading, <span id="torp-left">${wait}</span>s` : "Load a torpedo"}</button>
      </div>`;
    if (wait > 0) {
      const tick = setInterval(() => {
        const left = Math.ceil((T.readyAt - Date.now()) / 1000);
        const span = $("torp-left"), btn = $("launch-btn");
        if (!span || !btn) return clearInterval(tick);
        if (left <= 0) { clearInterval(tick); btn.disabled = false; btn.textContent = "Load a torpedo"; }
        else span.textContent = left;
      }, 250);
    }
    return;
  }

  body.innerHTML = `
    <div class="torpedo">
      <p class="hint">Trace the code. What does it output? Type the square, or tap it on the chart.</p>
      <pre class="code-view">${escapeHtml(T.snippet.code)}</pre>
      ${T.result ? `<p class="${T.result.ok ? "q-note ok" : "q-note"}">${escapeHtml(T.result.text)}</p>
        <button class="btn wide" data-action="launch" ${wait > 0 ? "disabled" : ""}>${wait > 0 ? `Next torpedo in ${wait}s` : "Load another torpedo"}</button>`
      : `<form id="torpedo-form" class="inline">
          <input id="torpedo-answer" maxlength="3" placeholder="K7" aria-label="Your answer" autocomplete="off" autocapitalize="characters">
          <button class="btn fire" type="submit">Launch</button>
        </form>`}
    </div>`;
  if (T.result && wait > 0) setTimeout(() => { if (battle.tab === "torpedo") renderTorpedo(state.game); }, wait * 1000 + 50);
}

function launchTorpedo(g, teamId) {
  const T = battle.torpedo;
  if (Date.now() < T.readyAt) return;
  // aim at a random square in a surviving enemy's waters that hasn't been hit
  const n = g.settings.teamCount;
  const { rows, cols } = gridSize(n);
  const options = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const owner = zoneOwner(r, c, n);
    if (owner && owner !== teamId && g.teams[owner].alive && !(g.shots && g.shots[cellKey(r, c)])) options.push([r, c]);
  }
  if (!options.length) return toast("No enemy waters left to aim at.");
  const [r, c] = options[Math.floor(Math.random() * options.length)];
  T.cell = [r, c];
  T.snippet = makeTorpedo(r, c, cols);
  T.result = null;
  renderTorpedo(g);
}

async function submitTorpedo(teamId) {
  const T = battle.torpedo;
  const guess = normaliseCell($("torpedo-answer").value);
  if (!guess) return;
  T.readyAt = Date.now() + (state.game.settings.torpedoSecs || 30) * 1000;
  if (guess !== T.snippet.answer) {
    T.result = { ok: false, text: `The code outputs ${T.snippet.answer}, not ${guess}. The torpedo missed its mark.` };
    sfx.wrong();
    renderTorpedo(state.game);
    return;
  }
  try {
    sfx.fire();
    const res = await fire(state.code, state.game, teamId, ...T.cell, state.uid, { free: true, via: "torpedo" });
    announce(res);
    T.result = { ok: true, text: `Correct, it's ${T.snippet.answer}! Torpedo away: ${res.hit ? "it's a hit!" : "a miss this time."}` };
  } catch (err) {
    T.result = { ok: false, text: `Correct trace, but ${err.message.charAt(0).toLowerCase() + err.message.slice(1)}` };
  }
  if (battle.tab === "torpedo") renderTorpedo(state.game);
}

// ---------------- Code console ----------------
function renderCode() {
  const body = $("tab-body");
  const C = battle.code;
  body.innerHTML = `
    <div class="console">
      <p class="hint">Write pseudocode that uses FIRE(column, row). Each FIRE uses one shot. Tap the chart to add a FIRE line.</p>
      <textarea id="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" rows="9" aria-label="Your pseudocode">${escapeHtml(C.text)}</textarea>
      <div class="btn-row">
        <button class="btn" data-action="arrow" title="Insert the assignment arrow">←</button>
        <button class="btn fire run" data-action="run" ${C.running ? "disabled" : ""}>${C.running ? "Running…" : "Run"}</button>
      </div>
      ${C.log.length ? `<ol class="console-log">${C.log.map((l) => `<li class="log-${l.kind}">${escapeHtml(l.text)}</li>`).join("")}</ol>
        <button class="linkish" data-action="clear-log">Clear output</button>` : ""}
    </div>`;
}

function insertAtCursor(box, text) {
  const at = box.selectionStart ?? box.value.length;
  box.value = box.value.slice(0, at) + text + box.value.slice(box.selectionEnd ?? at);
  battle.code.text = box.value;
  box.focus();
  box.selectionStart = box.selectionEnd = at + text.length;
}

async function runCode(teamId) {
  const C = battle.code;
  const g = state.game;
  const { cols, rows } = gridSize(g.settings.teamCount);
  C.log = [];
  let result;
  try {
    result = runPseudo(C.text, { cols, rows });
  } catch (err) {
    C.log.push({ kind: "err", text: err.message + " Nothing was fired." });
    return renderCode();
  }
  result.outputs.forEach((o) => C.log.push({ kind: "out", text: o }));
  if (!result.fires.length) {
    C.log.push({ kind: "info", text: "The program ran, but it has no FIRE commands." });
    return renderCode();
  }

  C.running = true; renderCode();
  for (const f of result.fires) {
    const where = cellName(f.r, f.c);
    if (state.game.teams[teamId].ammo <= 0) {
      C.log.push({ kind: "err", text: `Out of shots at ${where} (line ${f.line}). The rest didn't fire.` });
      break;
    }
    try {
      const res = await fire(state.code, state.game, teamId, f.r, f.c, state.uid, { via: "code" });
      C.log.push({ kind: res.hit ? "hit" : "miss", text: `${where}: ${res.hit ? (res.sunk ? `hit, sank a ${res.sunk.toLowerCase()}!` : "hit!") : "miss"}` });
      if (res.hit) announce(res);
    } catch (err) {
      C.log.push({ kind: "info", text: `${where} skipped (line ${f.line}): ${err.message}` });
    }
    renderCode();
  }
  C.running = false;
  if (battle.tab === "code") renderCode();
}

// ---------------- finished ----------------
function renderFinished(g, teamId) {
  renderOcean($("ocean"), g, { myTeam: teamId, revealAll: true });
  const w = g.winner && g.teams[g.winner];
  $("panel").innerHTML = `
    <div class="winner" style="--tc:${w ? w.color : "var(--ink)"}">
      <h2>${w ? `${escapeHtml(w.name)} win!` : "Game over"}</h2>
      <p>${w && g.winner === teamId ? "Your crew is the last fleet afloat." : "Every ship is now shown on the chart."}</p>
    </div>
    <h3>Teams</h3><ul class="teams" id="teams"></ul>
    <h3>Battle log</h3><ol class="feed" id="feed"></ol>`;
  renderTeams($("teams"), g, teamId);
  renderFeed($("feed"), g);
  $("panel").onclick = null;
}

// ---------------- toast ----------------
let toastTimer;
function toast(text, kind = "") {
  const el = $("toast");
  el.textContent = text;
  el.className = "toast show " + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = "toast"), 2600);
}
