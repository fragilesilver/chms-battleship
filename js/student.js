// ============================================================
//  student.js  -  join, pick team, place fleet, fire
// ============================================================
import {
  ensureSignedIn, watchGame, gameExists, joinGame, chooseTeam,
  saveFleet, setReady, fire,
} from "./firebase.js";
import {
  FLEET, zoneFor, teamIndex, canPlace, randomFleet, shipCells, fleetComplete,
  cellName, zoneOwner, cellKey,
} from "./game.js";
import { renderOcean, renderTeams, renderFeed, escapeHtml } from "./board.js";

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

  if (!team && g.phase !== "finished") return renderTeamPicker(g);
  if (g.phase === "lobby") return renderWaiting(g, team);
  show("play");
  if (g.phase === "placement") return renderPlacement(g, me.team);
  if (g.phase === "battle") return renderBattle(g, me.team);
  return renderFinished(g, me.team);
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
function renderBattle(g, teamId) {
  const team = g.teams[teamId];
  const t = state.target;
  if (t && g.shots && g.shots[cellKey(t[0], t[1])]) state.target = null;   // someone already hit it

  renderOcean($("ocean"), g, {
    myTeam: teamId,
    selected: state.target,
    onCell: team.alive ? (r, c) => pickTarget(g, teamId, r, c) : null,
  });

  const targetText = state.target ? cellName(...state.target) : "None";
  const ammoDots = Array.from({ length: g.settings.maxAmmo }, (_, i) =>
    `<span class="shell ${i < team.ammo ? "full" : ""}"></span>`).join("");

  $("panel").innerHTML = team.alive ? `
    <div class="ammo" aria-label="${team.ammo} shots">
      <span class="ammo-n">${team.ammo}</span><span class="ammo-l">shot${team.ammo === 1 ? "" : "s"} for your crew</span>
      <div class="shells">${ammoDots}</div>
    </div>
    <div class="fire-box">
      <span class="target-label">Target</span>
      <span class="target-cell">${targetText}</span>
      <button class="btn fire wide" data-action="fire" ${state.target && team.ammo > 0 && !state.busy ? "" : "disabled"}>Fire</button>
    </div>
    <h3>Teams</h3><ul class="teams" id="teams"></ul>
    <h3>Battle log</h3><ol class="feed" id="feed"></ol>`
    : `<div class="sunk-note"><h2>Your fleet is sunk</h2><p>Keep watching. The chart updates live until one team is left.</p></div>
    <h3>Teams</h3><ul class="teams" id="teams"></ul>
    <h3>Battle log</h3><ol class="feed" id="feed"></ol>`;

  renderTeams($("teams"), g, teamId);
  renderFeed($("feed"), g);

  $("panel").onclick = async (e) => {
    if (e.target.closest("[data-action]")?.dataset.action !== "fire" || !state.target) return;
    state.busy = true; render();
    try {
      const res = await fire(state.code, g, teamId, ...state.target, state.uid);
      if (!res.hit) toast(`Miss at ${res.cell}.`);
      else if (res.eliminated) toast(`Hit! You finished off ${res.eliminated}!`, "big");
      else if (res.sunk) toast(`Hit! You sank a ${res.sunk.toLowerCase()}!`, "big");
      else toast(`Hit at ${res.cell}!`, "big");
    } catch (err) {
      toast(err.message);
    }
    state.target = null; state.busy = false; render();
  };
}

function pickTarget(g, teamId, r, c) {
  if (g.shots && g.shots[cellKey(r, c)]) return toast(`${cellName(r, c)} has already been hit.`);
  if (zoneOwner(r, c, g.settings.teamCount) === teamId) return toast("That's your own waters.");
  state.target = [r, c];
  render();
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
