# CHMS Battleship Royale

A classroom battle-royale version of Battleship. Teams share one big ocean and earn shots by solving Cambridge-style pseudocode problems (IGCSE / O Level 0478 / 2210). The last crew with a ship afloat wins.

Students play on their own phones or laptops. The teacher runs the game from a dashboard, and the class watches the live chart on the projector.

## Guides

| Guide | For | What's in it |
|---|---|---|
| [Player's Guide](docs/PLAYERS_GUIDE.md) | Students | Joining, placing ships, reading the chart, the four ways to attack, power-ups, the storm, strategy tips |
| [Pseudocode Lesson](docs/PSEUDOCODE_LESSON.md) | Students (and teachers planning lessons) | How to read and write pseudocode, from variables to loops, trace tables, `FIRE` patterns, practice questions with answers, and a quick reference card |
| [Teacher's guide](#teachers-guide) | Teachers | Setting up, game settings and running a battle (below) |

---

## Setup

Upload everything in this folder to the root of your GitHub Pages repo, keeping the `js/`, `css/` and `docs/` folders. Replace the old files.

| Who | Opens |
|---|---|
| Students | `https://<your-username>.github.io/chms-battleship/` |
| Teacher | `https://<your-username>.github.io/chms-battleship/teacher.html` |
| Class screen | Press **Open projector view** on the teacher dashboard (`projector.html?code=XXXX`) |

The game uses Firebase Realtime Database with anonymous sign-in, so students don't need accounts. The connection settings are in `js/firebase.js`.

---

## Teacher's guide

### 1. Create a game

On `teacher.html`, choose:

| Setting | What it does |
|---|---|
| **Number of teams** | 2 to 6, and each team's name |
| **Crew sizes** | **Keep crews even** (on by default) stops a crew getting more than one student ahead of the smallest crew. **Most students per crew** sets a hard limit, with 0 for no limit. Students can leave a crew and pick another until the battle starts |
| **Each team's home waters** | 6 × 6 up to 12 × 12 per team. The form shows the size of the whole ocean |
| **Fleet** | How many of each ship every team gets: Battleship (5 squares), Carrier (4), Destroyer (3), Submarine (3), Patrol boat (2), with 0 to 4 of each. The default is one each of Carrier, Destroyer, Submarine and Patrol boat. The form warns you if the fleet won't fit |
| **Ways to earn and fire shots** | Turn the question bank, torpedoes and the code console on or off. You can also change these during the game |
| **Starting shots** | Shots each crew starts the battle with |
| **Free shot every (seconds)** | Every crew gets a free shot on this timer. 0 turns it off |
| **Torpedo reload (seconds)** | How long a student waits between torpedoes |
| **Storm closes in every (minutes)** | 0 means the storm only moves when you press the button |

With 3, 5 or 6 teams and home waters bigger than 8 × 8, the teams are arranged two zones across so the columns still fit within A to Z. Smaller waters and fewer ships make a shorter game.

### 2. Run the game

The dashboard walks through four phases:

1. **Crews join.** Put the projector view on the board. It shows the join link, the code and a QR code. The crew list shows who has joined each team.
2. **Fleet placement.** Press **Open fleet placement**. Crews place their ships and lock in. Any crew that isn't ready when you start gets a random fleet.
3. **Battle.** Press **Start battle**. During the battle you can:
   - give every crew +1 or +3 shots
   - pause or restart the free-shot timer
   - send a **supply drop** (a sonar and an airstrike for every crew)
   - close the storm in now, or pause the automatic storm
   - switch Questions, Torpedoes or the Code console on and off
4. **Finished.** The game ends when one crew is left, or when you press **End game**.

**Keep the teacher tab open during a battle.** It runs the free-shot timer and the automatic storm.

**The teacher view shows every ship, so don't put it on the projector.** Use the projector view, which hides ships.

On the projector, click once anywhere so the browser allows sound.

The crew list shows each student's score as questions right out of questions answered. It's a quick way to see who needs help.

### 3. Teaching with it

- Before the first game, go through Parts 1 to 3 of the [Pseudocode Lesson](docs/PSEUDOCODE_LESSON.md) and the [Player's Guide](docs/PLAYERS_GUIDE.md).
- To warm up, play with **only Questions** switched on.
- Once the class has covered loops, switch on **Torpedoes** for tracing practice and the **Code console** for writing practice.
- The lesson's practice questions and trace tables work as a starter or homework, and the answers are hidden in collapsible sections.

---

## How the game works

### Storm and power-ups
The storm closes in from the edge one ring at a time. Ships inside the storm are shown on everyone's chart.
Power-ups: 3 correct answers in a row earns the crew a sonar or an airstrike. Teachers can also send a supply drop.
Sonar scans a 3 × 3 area (only that crew sees the result). Airstrike hits a square and its 4 neighbours.

### Questions and torpedoes
About half of the Earn shots questions come from the bank in `js/questions.js`. The rest are trace questions generated by `js/puzzles.js` (loops, MOD/DIV, string handling, swaps, AND/OR and more), with the answer worked out by the game's own interpreter.
Torpedoes never miss: each one locks on to an unhit square of an enemy ship. Students unlock it by solving one of three puzzle types: find the square, predict the output, or fill in a missing number.

### Phones
On phones the chart stays pinned to the top of the screen while the panel scrolls underneath. The −, Fit and + buttons, or a two-finger pinch, zoom the chart, and the letters and numbers stay visible while zoomed in.

### Avatars
Students pick an avatar when they join, and can change it in the lobby. Every ship a student places carries their avatar on its middle square. **Random** shares the ships out between the crew's avatars.

### Pseudocode the code console understands
`FIRE(column, row)`, for example `FIRE("C", 7)` or `FIRE(3, 7)`,
`X ← value` (or `X <- value`), `CONSTANT`, `DECLARE` (skipped), `OUTPUT`, `IF/THEN/ELSE/ENDIF`, `FOR/TO/STEP/NEXT`,
`WHILE/DO/ENDWHILE`, `REPEAT/UNTIL`, `AND/OR/NOT`, `DIV`, `MOD`, `ROUND`, `INT`, `LENGTH`, `UCASE`, `LCASE`, `SUBSTRING`, `&`.
Not supported: arrays, `INPUT`, `CASE`, procedures and functions. A program stops after 5000 steps or 50 `FIRE` commands.

---

## Editing the question bank
Open `js/questions.js`. Each question is one block. Copy a block, change the text, and give it a new `id`.
Put the correct answer in any position and set `answer` to its index (0 = first). Options are shuffled for students.
Rewards: easy = 1 shot, medium = 2, hard = 3.

## Files

| File | What it does |
|---|---|
| `index.html`, `js/student.js` | Student app: join, pick a crew, place ships, battle |
| `teacher.html`, `js/teacher.js` | Teacher dashboard |
| `projector.html`, `js/projector.js` | Class screen (hides ships) |
| `js/game.js` | Game rules: board layout, fleets, avatars, crew limits, torpedo targets, storm, power-ups |
| `js/firebase.js` | Every database action |
| `js/board.js` | Draws the ocean chart, team list and battle log |
| `js/pseudocode.js` | The pseudocode interpreter |
| `js/trace.js` | Builds "find the square" torpedo puzzles |
| `js/puzzles.js` | Generates trace questions and "predict the output" / "fill the gap" torpedo puzzles |
| `js/zoom.js` | Chart zoom buttons and pinch-to-zoom |
| `js/questions.js` | The question bank |
| `js/sound.js` | Sound effects (Web Audio, no files) |
| `css/style.css` | All styling |
| `docs/` | Player's Guide and Pseudocode Lesson |
