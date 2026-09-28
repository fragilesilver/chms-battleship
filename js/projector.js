// ============================================================
//  projector.js  -  the big-screen view for the class TV.
//  Read-only: shows the ocean without anyone's hidden ships.
// ============================================================
import { ensureSignedIn, watchGame, gameExists } from "./firebase.js";
import { maxStorm, fleetComplete } from "./game.js";
import { renderOcean, renderTeams, renderFeed, escapeHtml } from "./board.js";
import { sfx, muteButton } from "./sound.js";

const $ = (id) => document.getElementById(id);
const state = { code: null, game: null, stop: null, feedSeen: null, qrFor: null };
const baseUrl = location.href.replace(/projector\.html.*$/, "");

muteButton($("mute"));
document.addEventListener("pointerdown", () => $("sound-hint").remove(), { once: true });

const params = new URLSearchParams(location.search);
ensureSignedIn().then(async () => {
  const code = (params.get("code") || "").toUpperCase();
  if (code && (await gameExists(code))) open(code);
  else $("screen-code").hidden = false;
});

$("code-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = $("code-input").value.trim().toUpperCase();
  if (await gameExists(code)) open(code);
  else $("code-msg").textContent = `No game with code ${code}.`;
});

function open(code) {
  state.code = code;
  history.replaceState(null, "", `?code=${code}`);
  $("screen-code").hidden = true;
  if (state.stop) state.stop();
  state.stop = watchGame(code, (g) => { state.game = g; render(); });
}

function show(which) {
  $("screen-lobby").hidden = which !== "lobby";
  $("screen-battle").hidden = which !== "battle";
}

function render() {
  const g = state.game;
  if (!g) return;
  playFeedSounds(g);

  $("proj-join").innerHTML = g.phase === "battle" || g.phase === "finished"
    ? `Join at <strong>${escapeHtml(baseUrl.replace(/^https?:\/\//, ""))}</strong> with code <strong>${state.code}</strong>`
    : "";

  if (g.phase === "lobby" || g.phase === "placement") return renderLobby(g);
  show("battle");
  renderOcean($("ocean"), g, { revealAll: g.phase === "finished" });
  renderTeams($("teams"), g, null);
  renderFeed($("feed"), g);
  renderStorm(g);

  const banner = $("winner");
  const w = g.phase === "finished" && g.winner && g.teams[g.winner];
  banner.hidden = !(g.phase === "finished");
  if (g.phase === "finished") {
    banner.style.setProperty("--tc", w ? w.color : "var(--ink)");
    banner.innerHTML = w ? `<span class="pennant"></span><strong>${escapeHtml(w.name)} win!</strong> <span>Every ship is now shown.</span>` : `<strong>Game over</strong>`;
  }
}

function renderLobby(g) {
  show("lobby");
  $("lj-url").textContent = baseUrl.replace(/^https?:\/\//, "");
  $("lj-code").textContent = state.code;
  if (state.qrFor !== state.code && window.QRCode) {
    $("qr").innerHTML = "";
    new window.QRCode($("qr"), { text: baseUrl, width: 220, height: 220, colorDark: "#14324a", colorLight: "#f7fafb" });
    state.qrFor = state.code;
  }

  const players = Object.values(g.players || {});
  const ids = Object.keys(g.teams);
  const ready = ids.filter((id) => g.teams[id].ready && fleetComplete(g.fleets && g.fleets[id])).length;
  $("lobby-status").textContent = g.phase === "lobby"
    ? `${players.length} sailor${players.length === 1 ? "" : "s"} aboard`
    : `Placing fleets: ${ready} of ${ids.length} crews locked in`;

  $("lobby-teams").innerHTML = Object.entries(g.teams).map(([id, t]) => {
    const crew = players.filter((p) => p.team === id).map((p) => escapeHtml(p.name));
    const locked = g.phase === "placement" && t.ready && fleetComplete(g.fleets && g.fleets[id]);
    return `<div class="lobby-team" style="--tc:${t.color}">
      <h3><span class="pennant"></span>${escapeHtml(t.name)}${locked ? ' <span class="locked">locked in</span>' : ""}</h3>
      <p>${crew.join(", ") || "Waiting for crew"}</p></div>`;
  }).join("");
}

function renderStorm(g) {
  const lvl = g.storm || 0, max = maxStorm(g.settings.teamCount);
  const el = $("proj-storm");
  if (g.phase !== "battle" || (!lvl && !g.stormNextAt)) { el.innerHTML = ""; return; }
  const secs = g.stormNextAt && lvl < max ? Math.max(0, Math.round((g.stormNextAt - Date.now()) / 1000)) : null;
  const t = secs !== null ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : null;
  el.innerHTML = `<span class="ps-level">${lvl ? `Storm ${lvl} of ${max}` : "Storm arrives"}</span>` +
    (t ? `<span class="ps-time">${lvl ? "closes in again in " : "in "}${t}</span>` : "");
}
setInterval(() => { if (state.game) renderStorm(state.game); }, 1000);

// Play a sound for each new event in the battle log
function playFeedSounds(g) {
  const feed = g.feed || {};
  if (!state.feedSeen) { state.feedSeen = new Set(Object.keys(feed)); return; }
  const fresh = Object.entries(feed).filter(([k]) => !state.feedSeen.has(k));
  fresh.forEach(([k]) => state.feedSeen.add(k));
  const types = new Set(fresh.map(([, f]) => f.type));
  if (types.has("win")) sfx.win();
  else if (types.has("out") || types.has("sink")) sfx.sink();
  else if (types.has("storm")) sfx.storm();
  else if (types.has("hit")) sfx.hit();
  else if (types.has("power")) sfx.power();
}
