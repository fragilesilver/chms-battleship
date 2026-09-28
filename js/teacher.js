// ============================================================
//  teacher.js  -  create games and run them
// ============================================================
import {
  ensureSignedIn, createGame, watchGame, gameExists, setPhase,
  startBattle, giveAmmo, endGame, addFeed, setMode, modesOf,
  advanceStorm, setStormNextAt, givePowerups,
} from "./firebase.js";
import { TEAM_PRESETS, fleetComplete, maxStorm } from "./game.js";
import { renderOcean, renderTeams, renderFeed, escapeHtml } from "./board.js";

const $ = (id) => document.getElementById(id);
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

const state = { code: null, game: null, stop: null, autoReload: true, nextReload: 0, timer: null };

// ---------------- setup form ----------------
function drawNameInputs() {
  const n = +$("team-count").value;
  $("team-names").innerHTML = TEAM_PRESETS.slice(0, n).map((t, i) =>
    `<label class="name-row" style="--tc:${t.color}"><span class="pennant"></span>
      <input data-i="${i}" value="${t.name}" maxlength="24" aria-label="Team ${i + 1} name"></label>`).join("");
}
$("team-count").addEventListener("change", drawNameInputs);
drawNameInputs();

const ready = ensureSignedIn().catch(() => { $("setup-msg").textContent = "Couldn't connect to Firebase. Check the internet connection."; });

$("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await ready;
  const code = await createGame({
    teamCount: +$("team-count").value,
    teamNames: [...document.querySelectorAll("#team-names input")].map((i) => i.value.trim()),
    startAmmo: +$("start-ammo").value,
    reloadSecs: +$("reload-secs").value,
    torpedoSecs: +$("torpedo-secs").value,
    stormMins: +$("storm-mins").value,
    modes: {
      quiz: $("mode-quiz").checked,
      torpedo: $("mode-torpedo").checked,
      console: $("mode-console").checked,
    },
  });
  openGame(code);
});

$("reopen-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await ready;
  const code = $("reopen-code").value.trim().toUpperCase();
  if (await gameExists(code)) openGame(code);
  else $("setup-msg").textContent = `No game with code ${code}.`;
});

$("reopen-code").value = store.get("bs_teacher_code") || "";

function openGame(code) {
  state.code = code;
  store.set("bs_teacher_code", code);
  $("screen-setup").hidden = true;
  $("screen-control").hidden = false;
  $("join-code").textContent = code;
  $("join-url").textContent = location.href.replace(/teacher\.html.*$/, "");
  $("projector-link").href = location.href.replace(/teacher\.html.*$/, "") + "projector.html?code=" + code;
  if (state.stop) state.stop();
  state.stop = watchGame(code, (g) => { state.game = g; render(); });
  startReloadClock();
}

// ---------------- control room ----------------
function render() {
  const g = state.game;
  if (!g) return;

  document.querySelectorAll("#phases li").forEach((li) => {
    const order = ["lobby", "placement", "battle", "finished"];
    li.className = li.dataset.p === g.phase ? "now" : order.indexOf(li.dataset.p) < order.indexOf(g.phase) ? "done" : "";
  });

  const teamIdsList = Object.keys(g.teams);
  const readyCount = teamIdsList.filter((id) => g.teams[id].ready && fleetComplete(g.fleets && g.fleets[id])).length;
  const players = Object.values(g.players || {});
  const secsLeft = Math.max(0, Math.ceil((state.nextReload - Date.now()) / 1000));

  let html = "";
  if (g.phase === "lobby") {
    html = `<p>${players.length} student${players.length === 1 ? "" : "s"} joined, ${players.filter((p) => !p.team).length} without a team.</p>
      <button class="btn primary" data-action="placement">Open fleet placement</button>`;
  } else if (g.phase === "placement") {
    html = `<p>${readyCount} of ${teamIdsList.length} teams locked in. Teams that aren't ready get a random fleet when the battle starts.</p>
      <button class="btn primary" data-action="battle">Start battle</button>
      <button class="btn" data-action="lobby">Back to lobby</button>`;
  } else if (g.phase === "battle") {
    const hasTimer = g.settings.reloadSecs > 0;
    html = `<div class="btn-row">
        <button class="btn" data-action="ammo1">Give every team +1 shot</button>
        <button class="btn" data-action="ammo3">+3 shots</button>
        ${hasTimer ? `<button class="btn ${state.autoReload ? "on" : ""}" data-action="reload" aria-pressed="${state.autoReload}">
          Free shots: ${state.autoReload ? `on, next in <span id="reload-left">${secsLeft}</span>s` : "paused"}</button>` : ""}
        <button class="btn" data-action="supply">Supply drop: sonar + airstrike for all</button>
        <button class="btn danger" data-action="end">End game</button>
      </div>
      ${stormControls(g)}`;
  } else {
    const w = g.winner && g.teams[g.winner];
    html = `<p class="big">${w ? `${escapeHtml(w.name)} win!` : "Game over."}</p>
      <button class="btn primary" data-action="new">Set up a new game</button>`;
  }
  if (g.phase === "placement" || g.phase === "battle") {
    const m = modesOf(g);
    const label = { quiz: "Questions", torpedo: "Torpedoes", console: "Code console" };
    html += `<div class="btn-row modes">${Object.keys(label).map((k) =>
      `<button class="btn ${m[k] ? "on" : ""}" data-action="mode" data-mode="${k}" aria-pressed="${m[k]}">${label[k]}: ${m[k] ? "on" : "off"}</button>`).join("")}</div>`;
  }
  $("controls").innerHTML = html;
  $("controls").onclick = onControl;

  renderOcean($("ocean"), g, { revealAll: true });
  renderTeams($("teams"), g, null);
  renderFeed($("feed"), g);

  $("crews").innerHTML = Object.entries(g.teams).map(([id, t]) => {
    const names = Object.values(g.players || {}).filter((p) => p.team === id)
      .map((p) => `${escapeHtml(p.name)}${p.correct || p.wrong ? ` <span class="score">${p.correct || 0}/${(p.correct || 0) + (p.wrong || 0)}</span>` : ""}`);
    return `<p style="--tc:${t.color}"><span class="pennant"></span><strong>${escapeHtml(t.name)}:</strong> ${names.join(", ") || "none yet"}</p>`;
  }).join("") + (() => {
    const loose = Object.values(g.players || {}).filter((p) => !p.team).map((p) => escapeHtml(p.name));
    return loose.length ? `<p><strong>No team:</strong> ${loose.join(", ")}</p>` : "";
  })();
}

function fmt(secs) { return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`; }

function stormControls(g) {
  const lvl = g.storm || 0, max = maxStorm(g.settings.teamCount);
  const auto = g.settings.stormMins > 0;
  const next = g.stormNextAt ? Math.max(0, Math.round((g.stormNextAt - Date.now()) / 1000)) : null;
  return `<div class="btn-row storm-row">
      <span class="storm-level">Storm ${lvl} of ${max}</span>
      <button class="btn" data-action="storm" ${lvl >= max ? "disabled" : ""}>Close the storm in now</button>
      ${auto && lvl < max ? `<button class="btn ${g.stormNextAt ? "on" : ""}" data-action="storm-auto" aria-pressed="${!!g.stormNextAt}">
        Auto storm: ${g.stormNextAt ? `on, next in <span id="storm-left">${fmt(next)}</span>` : "paused"}</button>` : ""}
    </div>`;
}

async function onControl(e) {
  const act = e.target.closest("[data-action]")?.dataset.action;
  const g = state.game;
  if (!act) return;
  if (act === "placement") { await setPhase(state.code, "placement"); await addFeed(state.code, "Fleet placement is open.", "info"); }
  if (act === "lobby") await setPhase(state.code, "lobby");
  if (act === "battle") { await startBattle(state.code, g); state.nextReload = Date.now() + g.settings.reloadSecs * 1000; }
  if (act === "ammo1") { await giveAmmo(state.code, g, 1); toast("Every team got +1 shot."); }
  if (act === "ammo3") { await giveAmmo(state.code, g, 3); toast("Every team got +3 shots."); }
  if (act === "reload") { state.autoReload = !state.autoReload; state.nextReload = Date.now() + g.settings.reloadSecs * 1000; render(); }
  if (act === "mode") {
    const k = e.target.closest("[data-mode]").dataset.mode;
    await setMode(state.code, k, !modesOf(g)[k]);
  }
  if (act === "supply") { await givePowerups(state.code, g); toast("Supply drop sent."); }
  if (act === "storm") {
    await advanceStorm(state.code, g);
    const max = maxStorm(g.settings.teamCount);
    if (g.stormNextAt) await setStormNextAt(state.code, (g.storm || 0) + 1 >= max ? null : Date.now() + g.settings.stormMins * 60000);
  }
  if (act === "storm-auto") await setStormNextAt(state.code, g.stormNextAt ? null : Date.now() + g.settings.stormMins * 60000);
  if (act === "end" && confirm("End the game for everyone?")) await endGame(state.code);
  if (act === "new") location.reload();
}

// Free shots are handed out by this tab, so keep it open during the battle
let stormBusy = false;
async function stormTick(g) {
  if (g.phase !== "battle" || !g.stormNextAt || stormBusy) return;
  const span = $("storm-left");
  if (span) span.textContent = fmt(Math.max(0, Math.round((g.stormNextAt - Date.now()) / 1000)));
  if (Date.now() < g.stormNextAt) return;
  stormBusy = true;
  try {
    await advanceStorm(state.code, g);
    const max = maxStorm(g.settings.teamCount);
    await setStormNextAt(state.code, (g.storm || 0) + 1 >= max ? null : Date.now() + g.settings.stormMins * 60000);
  } finally { stormBusy = false; }
}

function startReloadClock() {
  clearInterval(state.timer);
  state.timer = setInterval(async () => {
    const g = state.game;
    if (g) stormTick(g);
    if (!g || g.phase !== "battle" || !state.autoReload || !(g.settings.reloadSecs > 0)) return;
    if (!state.nextReload) state.nextReload = Date.now() + g.settings.reloadSecs * 1000;
    const left = Math.max(0, Math.ceil((state.nextReload - Date.now()) / 1000));
    const span = $("reload-left");
    if (span) span.textContent = left;
    if (Date.now() >= state.nextReload) {
      state.nextReload = Date.now() + g.settings.reloadSecs * 1000;
      await giveAmmo(state.code, g, 1);
    }
  }, 1000);
}

let toastTimer;
function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.className = "toast show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = "toast"), 2400);
}
