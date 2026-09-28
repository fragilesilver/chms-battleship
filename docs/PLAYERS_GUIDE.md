# Player's Guide: Battleship Royale

Your crew shares one fleet on a big shared ocean with every other team. Earn shots by solving pseudocode problems, hunt down the other fleets, and be the **last crew with a ship afloat**.

New to pseudocode? Read the [Pseudocode Lesson](PSEUDOCODE_LESSON.md). It teaches everything the Earn shots, Torpedo and Code tabs use.

---

## Contents

1. [Joining a game](#1-joining-a-game)
2. [Choosing your crew](#2-choosing-your-crew)
3. [Placing your fleet](#3-placing-your-fleet)
4. [Reading the chart](#4-reading-the-chart)
5. [The battle](#5-the-battle)
6. [Four ways to attack](#6-four-ways-to-attack)
7. [Power-ups](#7-power-ups)
8. [The storm](#8-the-storm)
9. [Winning (and losing)](#9-winning-and-losing)
10. [Strategy tips](#10-strategy-tips)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Joining a game

1. Open the game link your teacher gives you (or scan the QR code on the projector).
2. Type the **4-letter game code** shown on the board, and your **first name**.
3. **Pick your avatar.** This icon is painted on every ship you place, so your crew can see who put which ship where.
4. Press **Join game**.

If your page refreshes or your laptop sleeps, just open the link again. The game remembers you and puts you back with your crew.

---

## 2. Choosing your crew

Tap the team your teacher assigned you. Each team has its own colour, shown by the little flag (pennant) next to its name.

While you wait for your teacher to open fleet placement, you can still **change your avatar**.

---

## 3. Placing your fleet

Your crew shares **one fleet**. Everyone on your crew sees the same ships and can move them, so talk to each other!

Your **home waters** are the bright squares in your team's colour. Ships can only go there.

| To... | Do this |
|---|---|
| Choose a ship | Tap it in the list on the right |
| Turn it | Press **Rotate** (across ↔ down) |
| Place it | Tap the square where its **left end** (across) or **top end** (down) should go. A preview follows your pointer: dark means it fits, red means it doesn't |
| Move a placed ship | Tap it on the chart to pick it up, then tap its new spot |
| Place everything at random | Press **Random**. The ships are shared out between your crew's avatars |
| Finish | When every ship is placed, press **Lock in fleet**. Press **Unlock fleet** to change it again |

Your teacher chooses how many ships each team gets and how big the home waters are, so the ship list can change from game to game. Ships can't overlap, but they can touch.

If your crew hasn't locked in when the battle starts, you get a random fleet.

---

## 4. Reading the chart

Columns are **letters** along the top and rows are **numbers** down the side. A square is named column-then-row: **C7** means column C, row 7.

| You see | It means |
|---|---|
| Bright squares in your colour | Your home waters |
| Pale squares tinted in a team colour | That team's waters |
| Dashed lines | Borders between teams' waters |
| Striped squares | Open water that belongs to nobody |
| Greyed-out zone | A team that has been knocked out |
| Dark rounded bar with an avatar | A ship. You see your own ships, sunk ships and ships exposed by the storm. Other crews' ships stay hidden |
| Red **✕** | Hit! |
| Small circle | Miss |
| Brown ship with a grey avatar | Sunk |
| Ship with a dashed yellow outline | An enemy ship exposed by the storm |
| Purple diagonal stripes | The storm |
| Orange diamond | Your sonar found a ship here |
| Small grey dot | Your sonar found clear water here |

---

## 5. The battle

The panel at the top shows your crew's **shots**. They're shared by the whole crew, so if a teammate fires, the count goes down for everyone. A crew can hold up to **8** shots. When you're full, answering questions won't add any more, so spend some!

You get shots by:

- **answering questions** in the **Earn shots** tab
- **free shots**, which your teacher's timer hands to every crew every so often
- **bonus shots** your teacher gives out

When another team hits one of your ships, you'll see an **Incoming!** alert. The **Battle log** lists every hit, sink and knockout.

The **Sound on / Sound off** button at the top right mutes the game.

---

## 6. Four ways to attack

Your teacher can switch any of the Earn shots, Torpedo and Code tabs on or off, so you might not see all of them.

### Fire tab: a normal shot

1. Tap a square in **another team's** waters. It gets a red target ring.
2. Check the weapon is set to **Shot**.
3. Press **Fire**. This uses 1 shot.

You can't fire at your own waters, or at a square that's already been hit by anyone.

### Earn shots tab: answer questions

Answer pseudocode multiple-choice questions to earn shots for your crew:

| Level | Reward |
|---|---|
| Easy | 1 shot |
| Medium | 2 shots |
| Hard | 3 shots |

Get it wrong and you'll see the explanation. Read it! You have to wait **10 seconds** before the next question.

Get **3 right in a row** and your crew earns a **power-up** (see below). A wrong answer resets your streak.

### Torpedo tab: trace the code

A torpedo is a **free shot** (it uses no shots), but its target is hidden inside a short program.

1. Press **Load a torpedo**.
2. **Trace** the code to work out which square it outputs, like `F7`.
3. Type the square, or tap it on the chart, and press **Launch**.

If you're right, the torpedo fires at that square. If you're wrong, it's lost. Either way you wait for the torpedo to reload before loading another. See [Part 8 of the lesson](PSEUDOCODE_LESSON.md#8-reading-code-trace-tables) for how to trace.

### Code tab: write a program

Write pseudocode using `FIRE(column, row)` and press **Run**. Every `FIRE` launches a real shot and uses 1 of your shots.

```
FOR Row ← 1 TO 7 STEP 2
    FIRE("K", Row)
NEXT Row
```

This fires at K1, K3, K5 and K7.

- **Tap the chart** to add a `FIRE` line for that square.
- The **←** button types the assignment arrow. You can also type `<-`.
- If your code has a mistake, **nothing fires**, and the console tells you which line to fix.
- Squares that were already hit, or are in your own waters, are skipped and cost nothing.
- If you run out of shots partway through, the rest of the program's shots don't fire.

See [Part 9 of the lesson](PSEUDOCODE_LESSON.md#9-writing-code-that-fires) for firing patterns you can copy.

---

## 7. Power-ups

Your crew earns a power-up when anyone on the crew gets **3 questions right in a row**. It's a random choice between a sonar and an airstrike. Your teacher can also send a **supply drop** that gives every crew one of each.

To use one, go to the **Fire** tab, choose it as your weapon, tap a square, and press the button.

| Power-up | What it does | Cost |
|---|---|---|
| **Sonar** | Scans a **3 × 3** area around the square you pick. Squares hiding a ship get an **orange diamond** and clear squares get a **grey dot**. **Only your crew sees the result.** | 1 sonar |
| **Airstrike** | Hits the square you pick **and** the 4 squares above, below, left and right of it (a + shape). It skips your own waters and squares already hit. | 1 airstrike, no shots |

**Combo:** use a sonar first, then aim an airstrike or your shots at the diamonds.

---

## 8. The storm

As the battle goes on, a **storm** closes in from the **edges of the ocean**, one ring of squares at a time. The panel shows how long until it moves again.

**Any ship inside the storm is exposed.** Every crew can see it on their chart, marked with a dashed yellow outline. Exposed ships are easy targets!

---

## 9. Winning (and losing)

- A ship **sinks** when every one of its squares has been hit.
- A crew is **knocked out** when all of its ships have sunk. Its waters turn grey.
- The **last crew with a ship afloat wins.** Your teacher can also end the game at any time.

If your fleet is sunk, keep watching. The chart keeps updating until the end. When the game is over, every ship is revealed. Press **Join a new game** to play again.

---

## 10. Strategy tips

- **Keep your shots working.** You can't hold more than 8, so answering questions while full wastes the reward.
- **Share out the jobs.** One crew member answers questions while another fires, and a third traces torpedoes.
- **Don't fire at random.** Ships are at least 2 squares long, so fire at every other square (a checkerboard) until you hit something.
- **After a hit, go hunting.** Fire at the squares above, below, left and right of the hit until you find which way the ship lies.
- **Place ships away from the ocean's edge.** The storm starts at the outside edges, so ships nearer the middle of the ocean stay hidden longer.
- **Don't line up all your ships.** Spread them out and mix across and down.
- **Watch the battle log.** It shows who is attacking whom. A team that's losing ships fast is a good target to finish off.
- **Let code do the boring work.** A 3-line loop can sweep a whole row faster than tapping.

---

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| "No game with code ..." | Check the code on the board. The letter O and the number 0 aren't used, and neither are I and 1 |
| I can't click my ships during placement | Your crew locked in. Press **Unlock fleet** |
| The Fire button is greyed out | Pick a target square first, or your crew has run out of that weapon |
| "That's your own waters" | Aim at a square in another team's colour |
| My shots went down but I didn't fire | A teammate fired. Shots are shared by the crew |
| A tab has disappeared | Your teacher switched that mode off for now |
| No sound on the projector | Click once anywhere on the projector page |

Good hunting, Captain! ⚓

[Pseudocode Lesson →](PSEUDOCODE_LESSON.md) · [Back to the README](../README.md)
