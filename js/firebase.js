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

export async function gameExists(code) {
  return (await get(gameRef(code, "phase"))).exists();
}

// ---------- teacher actions ----------
export async function createGame({ teamCount, teamNames, startAmmo, reloadSecs }) {
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
    };
  });

  await set(gameRef(code), {
    phase: "lobby",
    createdAt: Date.now(),
    settings: { teamCount, startAmmo, reloadSecs, maxAmmo: MAX_AMMO },
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
    if (!fleetComplete(fleet)) {
      updates[`fleets/${id}`] = randomFleet(zoneFor(teamIndex(id), game.settings.teamCount));
    }
    updates[`teams/${id}/ready`] = true;
  }
  updates.phase = "battle";
  await update(gameRef(code), updates);
  await addFeed(code, "Battle stations! Firing is open.", "info");
}

export async function giveAmmo(code, game, amount) {
  const cap = game.settings.maxAmmo || MAX_AMMO;
  await Promise.all(
    Object.entries(game.teams)
      .filter(([, t]) => t.alive)
      .map(([id]) => runTransaction(gameRef(code, `teams/${id}/ammo`),
        (a) => Math.min(cap, (a || 0) + amount)))
  );
}

export async function endGame(code) {
  await update(gameRef(code), { phase: "finished" });
  await addFeed(code, "The teacher ended the game.", "info");
}

// ---------- student actions ----------
export async function joinGame(code, uid, name) {
  const playerRef = gameRef(code, `players/${uid}`);
  const existing = (await get(playerRef)).val();
  await set(playerRef, { name, team: existing ? existing.team || null : null });
}

export const chooseTeam = (code, uid, teamId) =>
  update(gameRef(code, `players/${uid}`), { team: teamId });

export const saveFleet = (code, teamId, fleetObj) =>
  set(gameRef(code, `fleets/${teamId}`), fleetObj);

export const setReady = (code, teamId, ready) =>
  update(gameRef(code, `teams/${teamId}`), { ready });

export async function fire(code, game, teamId, r, c, uid) {
  const key = cellKey(r, c);
  const n = game.settings.teamCount;
  if (game.phase !== "battle") throw new Error("Firing isn't open right now.");
  if (!game.teams[teamId].alive) throw new Error("Your fleet has been sunk.");
  if (game.shots && game.shots[key]) throw new Error(cellName(r, c) + " has already been hit.");
  if (zoneOwner(r, c, n) === teamId) throw new Error("That's your own waters. Aim at another team.");

  // 1. spend one shot (transaction stops two teammates spending the same shot)
  const ammoRef = gameRef(code, `teams/${teamId}/ammo`);
  const spent = await runTransaction(ammoRef, (a) => ((a || 0) > 0 ? a - 1 : undefined));
  if (!spent.committed) throw new Error("No shots left. Earn more to keep firing.");

  // 2. claim the cell
  const found = findShipAt(game.fleets, r, c);
  const shot = {
    r, c, by: teamId, uid, t: Date.now(),
    hit: !!found,
    target: found ? found.teamId : null,
    ship: found ? found.ship.id : null,
  };
  const claimed = await runTransaction(gameRef(code, `shots/${key}`), (cur) => (cur ? undefined : shot));
  if (!claimed.committed) {
    await runTransaction(ammoRef, (a) => (a || 0) + 1);   // refund
    throw new Error("Another team fired at " + cellName(r, c) + " first.");
  }
  if (!found) return { hit: false, cell: cellName(r, c) };

  // 3. work out what the hit caused, using the latest shots
  const shots = (await get(gameRef(code, "shots"))).val() || {};
  const shooter = game.teams[teamId].name;
  const victim = game.teams[found.teamId].name;
  const result = { hit: true, cell: cellName(r, c), sunk: false, eliminated: false };

  if (isSunk(found.ship, shots)) {
    result.sunk = found.ship.name;
    await addFeed(code, `${shooter} sank ${victim}'s ${found.ship.name.toLowerCase()} at ${cellName(r, c)}`, "sink", teamId);

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
    await addFeed(code, `${shooter} hit ${victim} at ${cellName(r, c)}`, "hit", teamId);
  }
  return result;
}

// ---------- kill feed ----------
export function addFeed(code, text, type = "info", teamId = null) {
  return push(gameRef(code, "feed"), { text, type, teamId, t: Date.now() });
}
