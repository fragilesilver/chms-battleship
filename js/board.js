// ============================================================
//  board.js  -  draws the shared ocean chart
// ============================================================
import {
  ZONE, gridSize, colLabel, cellKey, zoneOwner, shipList, shipCells, isSunk,
} from "./game.js";

/**
 * opts:
 *   myTeam       team id whose ships are visible ("t0"), or null
 *   revealAll    true on the teacher view: show every ship
 *   activeZone   team id: only this zone is clickable (placement)
 *   preview      { cells:[[r,c]...], ok:bool } ghost ship while placing
 *   selected     [r,c] the chosen target
 *   onCell       function(r, c) called on click
 */
export function renderOcean(el, game, opts = {}) {
  const n = game.settings.teamCount;
  const { cols, rows } = gridSize(n);
  const shots = game.shots || {};

  // which cells hold ships we are allowed to see
  const shipAt = {};
  for (const [tid, fleet] of Object.entries(game.fleets || {})) {
    for (const ship of shipList(fleet)) {
      const sunk = isSunk(ship, shots);
      const visible = opts.revealAll || tid === opts.myTeam || sunk;
      if (!visible) continue;
      shipCells(ship).forEach(([r, c], i) => {
        shipAt[cellKey(r, c)] = {
          sunk,
          end: i === 0 ? "start" : i === ship.len - 1 ? "end" : "",
          dir: ship.dir,
        };
      });
    }
  }
  const previewSet = new Set((opts.preview?.cells || []).map(([r, c]) => cellKey(r, c)));

  let html = `<div class="ocean" style="--cols:${cols}" role="grid" aria-label="Ocean chart">`;
  html += `<div class="axis corner"></div>`;
  for (let c = 0; c < cols; c++) html += `<div class="axis col">${colLabel(c)}</div>`;

  for (let r = 0; r < rows; r++) {
    html += `<div class="axis row">${r + 1}</div>`;
    for (let c = 0; c < cols; c++) {
      const key = cellKey(r, c);
      const owner = zoneOwner(r, c, n);
      const team = owner && game.teams[owner];
      const cls = ["cell"];
      if (c % ZONE === 0) cls.push("zl");
      if (r % ZONE === 0) cls.push("zt");
      if (!team) cls.push("open-water");
      else if (!team.alive) cls.push("dead-zone");
      if (owner === opts.myTeam) cls.push("mine");
      if (opts.activeZone && owner !== opts.activeZone) cls.push("inactive");

      const ship = shipAt[key];
      if (ship) cls.push("ship", ship.dir === "h" ? "sh" : "sv", ship.end, ship.sunk ? "sunk" : "");
      const shot = shots[key];
      if (shot) cls.push(shot.hit ? "hit" : "miss");
      if (previewSet.has(key)) cls.push(opts.preview.ok ? "ghost" : "ghost bad");
      if (opts.selected && opts.selected[0] === r && opts.selected[1] === c) cls.push("target");

      const label = colLabel(c) + (r + 1) + (shot ? (shot.hit ? ", hit" : ", miss") : "");
      html += `<button class="${cls.join(" ")}" data-r="${r}" data-c="${c}"` +
        (team ? ` style="--tc:${team.color}"` : "") +
        ` aria-label="${label}"></button>`;
    }
  }
  html += `</div>`;
  el.innerHTML = html;

  if (opts.onCell) {
    el.onclick = (e) => {
      const b = e.target.closest(".cell");
      if (b && !b.classList.contains("inactive")) opts.onCell(+b.dataset.r, +b.dataset.c);
    };
    el.onmouseover = opts.onHover
      ? (e) => { const b = e.target.closest(".cell"); if (b) opts.onHover(+b.dataset.r, +b.dataset.c); }
      : null;
  } else {
    el.onclick = null;
    el.onmouseover = null;
  }
}

// Team status list (name, pennant, ships left, shots)
export function renderTeams(el, game, myTeam) {
  const shots = game.shots || {};
  el.innerHTML = Object.entries(game.teams).map(([id, t]) => {
    const fleet = game.fleets && game.fleets[id];
    const afloat = fleet ? shipList(fleet).filter((s) => !isSunk(s, shots)).length : 4;
    const members = Object.values(game.players || {}).filter((p) => p.team === id).length;
    return `<li class="team-row ${t.alive ? "" : "out"} ${id === myTeam ? "me" : ""}" style="--tc:${t.color}">
      <span class="pennant" aria-hidden="true"></span>
      <span class="tname">${escapeHtml(t.name)}${id === myTeam ? " (you)" : ""}</span>
      <span class="tstat">${t.alive ? `${afloat} afloat, ${t.ammo} shot${t.ammo === 1 ? "" : "s"}` : "Sunk"}</span>
      <span class="tmembers">${members} crew</span>
    </li>`;
  }).join("");
}

export function renderFeed(el, game) {
  const items = Object.values(game.feed || {}).sort((a, b) => b.t - a.t).slice(0, 30);
  el.innerHTML = items.map((f) => {
    const color = f.teamId && game.teams[f.teamId] ? game.teams[f.teamId].color : "var(--ink-soft)";
    return `<li class="feed-${f.type}" style="--tc:${color}"><time>${new Date(f.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time> ${escapeHtml(f.text)}</li>`;
  }).join("");
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
