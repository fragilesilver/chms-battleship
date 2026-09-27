// ============================================================
//  game.js  -  pure game rules (no Firebase in here)
//  Coordinates: r = row (0-based), c = column (0-based)
//  Shown to students as letter + number, e.g. column C, row 7 -> "C7"
// ============================================================

export const ZONE = 8;           // each team's home waters are 8 x 8
export const MAX_AMMO = 5;       // a team can bank at most this many shots

export const FLEET = [
  { id: "carrier",   name: "Carrier",     len: 4 },
  { id: "destroyer", name: "Destroyer",   len: 3 },
  { id: "submarine", name: "Submarine",   len: 3 },
  { id: "patrol",    name: "Patrol boat", len: 2 },
];

export const TEAM_PRESETS = [
  { name: "Red Raiders",       color: "#d0342c" },
  { name: "Blue Sharks",       color: "#1f6fb2" },
  { name: "Green Turtles",     color: "#1f8a5b" },
  { name: "Gold Krakens",      color: "#c98a06" },
  { name: "Purple Squids",     color: "#7a3fb0" },
  { name: "Orange Barracudas", color: "#e0621b" },
];

// How the team zones are arranged on the shared ocean
export function layoutFor(teamCount) {
  if (teamCount <= 2) return { zc: 2, zr: 1 };
  if (teamCount === 3) return { zc: 3, zr: 1 };
  if (teamCount === 4) return { zc: 2, zr: 2 };
  return { zc: 3, zr: 2 };                     // 5 or 6 teams
}

export function gridSize(teamCount) {
  const { zc, zr } = layoutFor(teamCount);
  return { cols: zc * ZONE, rows: zr * ZONE };
}

export function zoneFor(teamIndex, teamCount) {
  const { zc } = layoutFor(teamCount);
  return {
    r0: Math.floor(teamIndex / zc) * ZONE,
    c0: (teamIndex % zc) * ZONE,
    size: ZONE,
  };
}

export const teamIndex = (teamId) => Number(teamId.slice(1));   // "t3" -> 3
export const teamIds = (n) => Array.from({ length: n }, (_, i) => "t" + i);

export const colLabel = (c) => String.fromCharCode(65 + c);      // 0 -> "A"
export const cellName = (r, c) => colLabel(c) + (r + 1);         // (6,2) -> "C7"
export const cellKey = (r, c) => r + "_" + c;

export function inZone(r, c, z) {
  return r >= z.r0 && r < z.r0 + z.size && c >= z.c0 && c < z.c0 + z.size;
}

export function zoneOwner(r, c, teamCount) {
  for (let i = 0; i < teamCount; i++) {
    if (inZone(r, c, zoneFor(i, teamCount))) return "t" + i;
  }
  return null;
}

export function shipCells(ship) {
  const cells = [];
  for (let i = 0; i < ship.len; i++) {
    cells.push(ship.dir === "h" ? [ship.r, ship.c + i] : [ship.r + i, ship.c]);
  }
  return cells;
}

// Firebase stores a team's ships as an object keyed by ship id
export const shipList = (fleetObj) => (fleetObj ? Object.values(fleetObj) : []);

export function canPlace(fleetObj, candidate, zone) {
  const taken = new Set();
  shipList(fleetObj)
    .filter((s) => s.id !== candidate.id)
    .forEach((s) => shipCells(s).forEach(([r, c]) => taken.add(cellKey(r, c))));
  return shipCells(candidate).every(
    ([r, c]) => inZone(r, c, zone) && !taken.has(cellKey(r, c))
  );
}

export function randomFleet(zone) {
  const fleet = {};
  for (const proto of FLEET) {
    for (let tries = 0; tries < 500; tries++) {
      const dir = Math.random() < 0.5 ? "h" : "v";
      const ship = {
        ...proto,
        dir,
        r: zone.r0 + Math.floor(Math.random() * zone.size),
        c: zone.c0 + Math.floor(Math.random() * zone.size),
      };
      if (canPlace(fleet, ship, zone)) { fleet[ship.id] = ship; break; }
    }
  }
  return fleet;
}

export const fleetComplete = (fleetObj) =>
  FLEET.every((p) => fleetObj && fleetObj[p.id]);

export function findShipAt(fleets, r, c) {
  for (const [teamId, fleetObj] of Object.entries(fleets || {})) {
    for (const ship of shipList(fleetObj)) {
      if (shipCells(ship).some(([a, b]) => a === r && b === c)) {
        return { teamId, ship };
      }
    }
  }
  return null;
}

export function isSunk(ship, shots) {
  return shipCells(ship).every(([r, c]) => shots && shots[cellKey(r, c)]);
}

export function shipsAfloat(fleetObj, shots) {
  return shipList(fleetObj).filter((s) => !isSunk(s, shots)).length;
}

export function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // no O/0 or I/1 confusion
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
