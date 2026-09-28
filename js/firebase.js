// ============================================================
//  firebase.js  -  connection to Firebase + every database action
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, update, onValue, push, runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  TEAM_PRESETS, MAX_AMMO, teamIds, makeCode, cellKey, cellName, zoneOwner,
  findShipAt, isSunk, shipsAfloat, randomFleet, zoneFor, teamIndex, fleetComplete,
  maxStorm, airstrikeCells, sonarCells, STREAK_FOR_POWERUP, POWERUPS,
  ZONE, DEFAULT_FLEET, avatarOf, shipName,
} from "./game.js";

const firebaseConfig = {
  apiKey: "AIzaSyBAq-hGEtiIOs6GiZIwzamdq2XwTRS-7zk",
  authDomain: "chms-battleship.firebaseapp.com",
  databaseURL: "https://chms-battleship-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chms-battleship",
  storageBucket: "chms-battleship.firebasestorage.app",
  messagingSenderId: "628904430799",
  appId: "1:628904430799:web:6e58a545d9a2a302c3bbba",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const gameRef = (code, path = "") => ref(db, `games/${code}${path ? "/" + path : ""}`);

// ---------- sign-in (anonymous, no student accounts needed) ----------
export function ensureSignedIn() {
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) { stop(); resolve(user); }
    }, reject);
    signInAnonymously(auth).catch(reject);
  });
}

// ---------- listening ----------
export function watchGame(code, callback) {
  return onValue(gameRef(code), (snap) => callback(snap.val()));
}

// "lobby", "placement", "battle", "finished", or null if there's no such game
export async function getPhase(code) {
  return (await get(gameRef(code, "phase"))).val();
}

export async function gameExists(code) {
  return (await get(gameRef(code, "phase"))).exists();
}

// ---------- teacher actions ----------
export const DEFAULT_MODES = { quiz: true, torpedo: true, console: true };
export const modesOf = (game) => ({ ...DEFAULT_MODES, ...(game.settings.modes || {}) });

export async function createGame({ teamCount, teamNames, startAmmo, reloadSecs, modes, torpedoSecs, stormMins, zoneSize, fleet }) {
  let code;
  do { code = makeCode(); } while (await gameExists(code));

  const teams = {};
  teamIds(teamCount).forEach((id, i) => {
    teams[id] = {
      name: teamNames[i] || TEAM_PRESETS[i].name,
      color: TEAM_PRESETS[i].color,
      ammo: startAmmo,
      alive: true,
      ready: false,
      powerups: { sonar: 0, airstrike: 0 },
    };
  });

  await set(gameRef(code), {
    phase: "lobby",
    createdAt: Date.now(),
    settings: {
      teamCount, startAmmo, reloadSecs, maxAmmo: MAX_AMMO,
      modes: modes || DEFAULT_MODES, torpedoSecs: torpedoSecs || 30,
      stormMins: stormMins || 0,
      zoneSize: zoneSize || ZONE, fleet: fleet || DEFAULT_FLEET,
    },
    storm: 0,
    teams,
  });
  await addFeed(code, "Game created. Join with code " + code, "info");
  return code;
}

export const setPhase = (code, phase) => update(gameRef(code), { phase });

export async function startBattle(code, game) {
  // Any team that hasn't finished placing gets a random fleet
  const updates = {};
  for (const id of Object.keys(game.teams)) {
    const fleet = game.fleets && game.fleets[id];
    if (!fleetComplete(fleet, game.settings)) {
      updates[`fleets/${id}`] = randomFleet(zoneFor(teamIndex(id), game.settings), game.settings, crewAvatars(game, id));
    }
    updates[`teams/${id}/ready`] = true;
  }
  updates.phase = "battle";
  updates.storm = 0;
  updates.stormNextAt = game.settings.stormMins > 0 ? Date.now() + game.settings.stormMins * 60000 : null;
  await update(gameRef(code), updates);
  await addFeed(code, "Battle stations! Firing is open.", "info");
}

// The avatars of everyone on a team, for painting on their ships
export const crewAvatars = (game, teamId) =>
  Object.values(game.players || {}).filter((p) => p.team === teamId).map((p) => avatarOf(p.avatar)).filter(Boolean);

export async function giveAmmo(code, game, amount) {
  const cap = game.settings.maxAmmo || MAX_AMMO;
  await Promise.all(
    Object.entries(game.teams)
      .filter(([, t]) => t.alive)
      .map(([id]) => runTransaction(gameRef(code, `teams/${id}/ammo`),
        (a) => Math.min(cap, (a || 0) + amount)))
  );
}

export const setMode = (code, mode, on) =>
  update(gameRef(code, "settings/modes"), { [mode]: on });

export async function endGame(code) {
  await update(gameRef(code), { phase: "finished" });
  await addFeed(code, "The teacher ended the game.", "info");
}

// ---------- student actions ----------
export async function joinGame(code, uid, name, avatar) {
  const playerRef = gameRef(code, `players/${uid}`);
  const existing = (await get(playerRef)).val();
  await set(playerRef, { ...(existing || {}), name, avatar: avatarOf(avatar) || null, team: existing ? existing.team || null : null });
}

export const setAvatar = (code, uid, avatar) =>
  update(gameRef(code, `players/${uid}`), { avatar: avatarOf(avatar) || null });

export const chooseTeam = (code, uid, teamId) =>
  update(gameRef(code, `players/${uid}`), { team: teamId });

export const saveFleet = (code, teamId, fleetObj) =>
  set(gameRef(code, `fleets/${teamId}`), fleetObj);

export const setReady = (code, teamId, ready) =>
  update(gameRef(code, `teams/${teamId}`), { ready });

// opts.free = true for a torpedo (doesn't use a shot)
export async function fire(code, game, teamId, r, c, uid, opts = {}) {
  const key = cellKey(r, c);
  const n = game.settings;
  if (game.phase !== "battle") throw new Error("Firing isn't open right now.");
  if (!game.teams[teamId].alive) throw new Error("Your fleet has been sunk.");
  if (game.shots && game.shots[key]) throw new Error(cellName(r, c) + " has already been hit.");
  if (zoneOwner(r, c, n) === teamId) throw new Error("That's your own waters. Aim at another team.");

  // 1. spend one shot (transaction stops two teammates spending the same shot)
  const ammoRef = gameRef(code, `teams/${teamId}/ammo`);
  if (!opts.free) {
    const spent = await runTransaction(ammoRef, (a) => ((a || 0) > 0 ? a - 1 : undefined));
    if (!spent.committed) throw new Error("No shots left. Earn more to keep firing.");
  }

  // 2. claim the cell
  const found = findShipAt(game.fleets, r, c);
  const shot = {
    r, c, by: teamId, uid, t: Date.now(), via: opts.via || "fire",
    hit: !!found,
    target: found ? found.teamId : null,
    ship: found ? found.ship.id : null,
  };
  const claimed = await runTransaction(gameRef(code, `shots/${key}`), (cur) => (cur ? undefined : shot));
  if (!claimed.committed) {
    if (!opts.free) await runTransaction(ammoRef, (a) => (a || 0) + 1);   // refund
    throw new Error("Another team fired at " + cellName(r, c) + " first.");
  }
  if (!found) return { hit: false, cell: cellName(r, c) };

  // 3. work out what the hit caused, using the latest shots
  const shots = (await get(gameRef(code, "shots"))).val() || {};
  const shooter = game.teams[teamId].name;
  const victim = game.teams[found.teamId].name;
  const result = { hit: true, cell: cellName(r, c), sunk: false, eliminated: false };

  if (isSunk(found.ship, shots)) {
    result.sunk = shipName(game.settings, found.ship.id);
    await addFeed(code, `${shooter} sank ${victim}'s ${shipName(game.settings, found.ship.id).toLowerCase()} at ${cellName(r, c)}`, "sink", teamId);

    if (shipsAfloat(game.fleets[found.teamId], shots) === 0) {
      result.eliminated = victim;
      await update(gameRef(code, `teams/${found.teamId}`), { alive: false, ammo: 0 });
      await addFeed(code, `${victim} is out! Eliminated by ${shooter}.`, "out", teamId);

      const teams = (await get(gameRef(code, "teams"))).val();
      const left = Object.entries(teams).filter(([, t]) => t.alive);
      if (left.length <= 1) {
        await update(gameRef(code), { phase: "finished", winner: left[0] ? left[0][0] : null });
        if (left[0]) await addFeed(code, `${left[0][1].name} win the battle royale!`, "win", left[0][0]);
      }
    }
  } else {
    const how = { torpedo: " with a torpedo", code: " with code", airstrike: " in an airstrike" }[opts.via] || "";
    await addFeed(code, `${shooter} hit ${victim} at ${cellName(r, c)}${how}`, "hit", teamId);
  }
  return result;
}

// ---------- earning shots ----------
// Returns how many shots were actually added (0 if the magazine is full)
export async function recordAnswer(code, game, teamId, uid, correct, reward) {
  const field = correct ? "correct" : "wrong";
  await Promise.all([
    runTransaction(gameRef(code, `players/${uid}/${field}`), (n) => (n || 0) + 1),
    runTransaction(gameRef(code, `teams/${teamId}/${field}`), (n) => (n || 0) + 1),
  ]);
  if (!correct) {
    await set(gameRef(code, `players/${uid}/streak`), 0);
    return { added: 0, powerup: null };
  }
  if (game.phase !== "battle") return { added: 0, powerup: null };

  const cap = game.settings.maxAmmo || MAX_AMMO;
  let added = 0;
  await runTransaction(gameRef(code, `teams/${teamId}/ammo`), (a) => {
    const now = a || 0;
    added = Math.max(0, Math.min(cap, now + reward) - now);
    return now + added;
  });

  // every STREAK_FOR_POWERUP correct answers in a row earns the crew a power-up
  const streak = await runTransaction(gameRef(code, `players/${uid}/streak`),
    (n) => ((n || 0) + 1 >= STREAK_FOR_POWERUP ? 0 : (n || 0) + 1));
  let powerup = null;
  if (streak.committed && streak.snapshot.val() === 0) {
    powerup = Math.random() < 0.5 ? "sonar" : "airstrike";
    await runTransaction(gameRef(code, `teams/${teamId}/powerups/${powerup}`), (n) => (n || 0) + 1);
    const who = (game.players && game.players[uid] && game.players[uid].name) || "Someone";
    await addFeed(code, `${who} earned ${game.teams[teamId].name} a${powerup === "airstrike" ? "n" : ""} ${POWERUPS[powerup].name.toLowerCase()} with ${STREAK_FOR_POWERUP} right in a row`, "power", teamId);
  }
  return { added, powerup };
}

// ---------------- power-ups ----------------
async function spendPowerup(code, teamId, type) {
  const t = await runTransaction(gameRef(code, `teams/${teamId}/powerups/${type}`), (n) => ((n || 0) > 0 ? n - 1 : undefined));
  if (!t.committed) throw new Error(`Your crew has no ${POWERUPS[type].name.toLowerCase()} left.`);
}

export async function useSonar(code, game, teamId, r, c) {
  if (game.phase !== "battle") throw new Error("Power-ups only work during the battle.");
  await spendPowerup(code, teamId, "sonar");
  const n = game.settings;
  const updates = {};
  let found = 0;
  for (const [a, b] of sonarCells(r, c, n)) {
    if (zoneOwner(a, b, n) === teamId) continue;
    const ship = !!findShipAt(game.fleets, a, b);
    if (ship) found++;
    updates[cellKey(a, b)] = ship;
  }
  await update(gameRef(code, `teams/${teamId}/intel`), updates);
  return { found, cell: cellName(r, c) };
}

export async function useAirstrike(code, teamId, r, c, uid) {
  let game = (await get(gameRef(code))).val();
  if (game.phase !== "battle") throw new Error("Power-ups only work during the battle.");
  const n = game.settings;
  const cells = airstrikeCells(r, c, n).filter(([a, b]) =>
    zoneOwner(a, b, n) !== teamId && !(game.shots && game.shots[cellKey(a, b)]));
  if (!cells.length) throw new Error("There's nothing left to hit there. Pick another square.");
  await spendPowerup(code, teamId, "airstrike");
  await addFeed(code, `${game.teams[teamId].name} called an airstrike on ${cellName(r, c)}`, "power", teamId);

  const results = [];
  for (const [a, b] of cells) {
    try {
      results.push(await fire(code, game, teamId, a, b, uid, { free: true, via: "airstrike" }));
    } catch { /* square taken meanwhile, or the game ended */ }
    game = (await get(gameRef(code))).val();
    if (game.phase !== "battle") break;
  }
  return results;
}

export async function givePowerups(code, game) {
  await Promise.all(Object.entries(game.teams).filter(([, t]) => t.alive).flatMap(([id]) => [
    runTransaction(gameRef(code, `teams/${id}/powerups/sonar`), (n) => (n || 0) + 1),
    runTransaction(gameRef(code, `teams/${id}/powerups/airstrike`), (n) => (n || 0) + 1),
  ]));
  await addFeed(code, "Supply drop! Every crew gets a sonar and an airstrike.", "power");
}

// ---------------- storm ----------------
export async function advanceStorm(code, game) {
  const max = maxStorm(game.settings);
  let level = 0;
  const t = await runTransaction(gameRef(code, "storm"), (s) => ((s || 0) >= max ? undefined : (level = (s || 0) + 1)));
  if (!t.committed) return false;
  await addFeed(code, level === max
    ? "The storm is at full strength. Only the centre of the ocean is safe."
    : "The storm closes in! Ships in the storm are now visible to everyone.", "storm");
  return true;
}

export const setStormNextAt = (code, when) => update(gameRef(code), { stormNextAt: when });

// ---------- kill feed ----------
export function addFeed(code, text, type = "info", teamId = null) {
  return push(gameRef(code, "feed"), { text, type, teamId, t: Date.now() });
}
