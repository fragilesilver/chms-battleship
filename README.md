# CHMS Battleship Royale (Phase 4)

Upload everything in this folder to the root of your GitHub Pages repo, keeping the `js/` and `css/` folders. Replace the old files.

- Students open: `https://<your-username>.github.io/chms-battleship/`
- Teacher opens: `https://<your-username>.github.io/chms-battleship/teacher.html`
- Class screen: use "Open projector view" on the teacher dashboard (projector.html?code=XXXX)

Keep the teacher tab open during a battle: it runs the free-shot timer and the automatic storm.

On the projector, click once anywhere so the browser allows sound.

## Editing the question bank
Open `js/questions.js`. Each question is one block; copy a block, change the text, and give it a new `id`.
Put the correct answer in any position and set `answer` to its index (0 = first). Options are shuffled for students.
Rewards: easy = 1 shot, medium = 2, hard = 3.

## Pseudocode the code console understands
FIRE(column, row), for example FIRE("C", 7) or FIRE(3, 7)
X ← value (or X <- value), OUTPUT, IF/THEN/ELSE/ENDIF, FOR/TO/STEP/NEXT,
WHILE/DO/ENDWHILE, REPEAT/UNTIL, DIV, MOD, ROUND, LENGTH, UCASE, LCASE, SUBSTRING

## Storm and power-ups
The storm closes in from the edge one ring at a time. Ships inside the storm are shown on everyone's chart.
Power-ups: 3 correct answers in a row earns the crew a sonar or an airstrike. Teachers can also send a supply drop.
Sonar scans a 3 x 3 area (only that crew sees the result). Airstrike hits a square and its 4 neighbours.

## Map size, fleet and avatars
When creating a game, the teacher picks each team's home waters (6 x 6 up to 12 x 12) and how many of each ship type every team gets (0 to 4 of each; Battleship 5, Carrier 4, Destroyer 3, Submarine 3, Patrol boat 2). The form checks the fleet fits before the game is created. With home waters bigger than 8 x 8, 3, 5 and 6 teams are arranged two zones across so the columns stay within A to Z.
Students pick an avatar when they join (and can change it in the lobby). Every ship a student places carries their avatar on its middle square. "Random" shares the ships out between the crew's avatars.
