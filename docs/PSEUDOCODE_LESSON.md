# Lesson: Reading and Writing Pseudocode

This lesson teaches the pseudocode used in Battleship Royale. It follows the Cambridge IGCSE / O Level (0478 / 2210) style, so what you learn here is what you'll see in exams.

You use pseudocode in three places in the game:

| Where | What you do | Skill |
|---|---|---|
| **Earn shots** tab | Answer questions about code | Reading |
| **Torpedo** tab | Work out which square a program outputs | Reading (tracing) |
| **Code** tab | Write programs that fire at the enemy | Writing |

**How to use this lesson:** work through Parts 1 to 8 in order. Try each example yourself before you read the output. Part 9 has practice questions with hidden answers.

> The examples use the standard game: 4 teams, each with 8 × 8 home waters. That makes an ocean with columns **A to P** and rows **1 to 16**. Your teacher may choose a different size. Check the letters and numbers along the edges of your chart.

---

## Contents

1. [What is pseudocode?](#1-what-is-pseudocode)
2. [Variables and assignment](#2-variables-and-assignment)
3. [OUTPUT](#3-output)
4. [Arithmetic: + - * / DIV MOD](#4-arithmetic)
5. [Working with text](#5-working-with-text)
6. [Decisions: IF ... THEN ... ELSE ... ENDIF](#6-decisions-if)
7. [Loops: FOR, WHILE, REPEAT](#7-loops)
8. [Reading code: trace tables](#8-reading-code-trace-tables)
9. [Writing code that fires: FIRE](#9-writing-code-that-fires)
10. [Practice questions](#10-practice-questions)
11. [When the console says no: error messages](#11-error-messages)
12. [Quick reference card](#12-quick-reference-card)

---

## 1. What is pseudocode?

Pseudocode is a way of writing down the steps of a program that sits between plain English and a real programming language. It's precise enough that everyone reads it the same way, but you don't need to worry about the fussy rules of Python or Java.

Some ground rules:

- **One instruction per line.** The computer runs them from top to bottom.
- **Keywords are in CAPITALS**: `IF`, `FOR`, `OUTPUT`, `FIRE`. This makes them easy to spot.
- **Indent** the lines inside an `IF` or a loop by 4 spaces. The game doesn't require it, but it makes your code much easier to read, and examiners expect it.
- **Comments** start with `//`. The computer ignores everything after `//` on that line. Use comments to explain your thinking.

```
// This whole line is a comment
OUTPUT "Hello"    // a comment can go after code too
```

**Output:**

```
Hello
```

---

## 2. Variables and assignment

A **variable** is a named box that stores a value. You put a value in the box with the **assignment arrow `←`**.

```
Score ← 0
Name ← "Aisyah"
Ready ← TRUE
```

Read `Score ← 0` out loud as "Score **becomes** 0" or "store 0 in Score".

> **No ← key on your keyboard?** Type `<-` instead (a less-than sign and a dash). The game treats it the same. The Code tab also has a **←** button.

### Assignment is not "equals"

`=` means **compare** ("is it equal?"). `←` means **store**. Mixing them up is the most common mistake.

```
X = 5     // ✗ wrong: this asks a question, it doesn't store anything
X ← 5     // ✓ right
```

### The right-hand side is worked out first

```
Score ← 10
Score ← Score + 5
OUTPUT Score
```

**Output:**

```
15
```

The computer first works out `Score + 5` using the **old** value (10 + 5 = 15), then stores 15 back in `Score`. This "take the old value, change it, store it back" pattern is everywhere in programming.

### Types of value

| Type | Examples | Notes |
|---|---|---|
| INTEGER | `7`, `-3`, `0` | Whole numbers |
| REAL | `3.5`, `0.25` | Numbers with a decimal part |
| STRING | `"C7"`, `"Hello"` | Text, always in **double quotes** |
| CHAR | `"K"` | A single character |
| BOOLEAN | `TRUE`, `FALSE` | Only two possible values |

In exam answers you often write `DECLARE Score : INTEGER` before using a variable. The game accepts `DECLARE` lines and simply skips them, so you can practise writing them.

**Naming tip:** use clear names like `Row`, `HitCount`, `TargetCol`. Names can contain letters, digits and `_` but must start with a letter. `Row` and `row` are **different** variables, so be consistent.

---

## 3. OUTPUT

`OUTPUT` displays values. Separate several values with commas. **They are joined together with no spaces**:

```
OUTPUT "C", 7
OUTPUT "Row ", 7
OUTPUT "Total: ", 3 + 4
```

**Output:**

```
C7
Row 7
Total: 7
```

That's why a torpedo program can end with `OUTPUT Col, Row` and produce a square name like `C7`. If you want a space, put it inside the quotes, like `"Row "`.

---

## 4. Arithmetic

| Operator | Meaning | Example | Result |
|---|---|---|---|
| `+` | add | `7 + 2` | `9` |
| `-` | subtract | `7 - 2` | `5` |
| `*` | multiply | `7 * 2` | `14` |
| `/` | divide | `7 / 2` | `3.5` |
| `DIV(a, b)` | whole-number division (throw away the remainder) | `DIV(7, 2)` | `3` |
| `MOD(a, b)` | the remainder after dividing | `MOD(7, 2)` | `1` |
| `ROUND(x, places)` | round to a number of decimal places | `ROUND(3.456, 1)` | `3.5` |
| `INT(x)` | chop off the decimal part | `INT(4.9)` | `4` |

`DIV` and `MOD` can also go in the middle: `7 DIV 2` and `7 MOD 2` mean the same as above.

**Order of operations:** `*`, `/`, `DIV` and `MOD` happen before `+` and `-`, just like in maths. Use brackets to change the order.

```
OUTPUT 2 + 3 * 4
OUTPUT (2 + 3) * 4
OUTPUT DIV(17, 5), " remainder ", MOD(17, 5)
```

**Output:**

```
14
20
3 remainder 2
```

### Why MOD is so useful

`MOD(N, 2)` is `0` when N is even and `1` when N is odd. That lets you do something on **every other** turn, or build a **checkerboard** pattern. You'll use this in Part 9.

---

## 5. Working with text

| Function | Meaning | Example | Result |
|---|---|---|---|
| `LENGTH(s)` | how many characters | `LENGTH("SHIP")` | `4` |
| `SUBSTRING(s, start, count)` | cut out part of a string. **The first character is position 1** | `SUBSTRING("ABCDEF", 3, 1)` | `"C"` |
| `UCASE(s)` | to capitals | `UCASE("k7")` | `"K7"` |
| `LCASE(s)` | to lower case | `LCASE("HIT")` | `"hit"` |
| `&` | join two strings | `"K" & "7"` | `"K7"` |

### Turning a number into a column letter

This is the trick every torpedo uses:

```
Letters ← "ABCDEFGHIJKLMNOP"
Col ← 3
OUTPUT SUBSTRING(Letters, Col, 1)
```

**Output:**

```
C
```

Start at position 3 of `Letters` and take 1 character: **C**. So column number 1 is A, 2 is B, 3 is C, and so on.

**Quick way to count letters:** A1 B2 C3 D4 E5 F6 G7 H8 I9 J10 K11 L12 M13 N14 O15 P16.

---

## 6. Decisions: IF

An `IF` statement runs some lines **only when a condition is TRUE**.

```
Ammo ← 0
IF Ammo = 0
  THEN
    OUTPUT "Out of shots! Answer a question."
  ELSE
    OUTPUT "Ready to fire"
ENDIF
```

**Output:**

```
Out of shots! Answer a question.
```

Things to notice:

- The condition goes after `IF`. `THEN` can go on the next line (Cambridge style) or at the end of the IF line.
- The lines after `THEN` run when the condition is **TRUE**.
- The lines after `ELSE` run when it is **FALSE**. The `ELSE` part is optional.
- Every `IF` must be closed with `ENDIF`.

### Comparison operators

| Operator | Meaning |
|---|---|
| `=` | equal to |
| `<>` | not equal to |
| `<` | less than |
| `>` | greater than |
| `<=` | less than or equal to |
| `>=` | greater than or equal to |

### Combining conditions: AND, OR, NOT

```
Row ← 5
IF Row >= 1 AND Row <= 8
  THEN
    OUTPUT "Row ", Row, " is in the top half"
ENDIF
IF NOT (Row = 5)
  THEN
    OUTPUT "This won't print"
ENDIF
```

**Output:**

```
Row 5 is in the top half
```

- `A AND B`: TRUE only if **both** are TRUE.
- `A OR B`: TRUE if **at least one** is TRUE.
- `NOT A`: flips TRUE to FALSE and FALSE to TRUE.

---

## 7. Loops

Loops repeat lines. There are three kinds. Picking the right one is a common exam question.

| Loop | Use it when... | Checks the condition... |
|---|---|---|
| `FOR ... NEXT` | you know **how many times** | (count-controlled) |
| `WHILE ... ENDWHILE` | you might need to repeat **zero** or more times | at the **start** |
| `REPEAT ... UNTIL` | you must run **at least once** | at the **end** |

### FOR loops (count-controlled)

```
FOR Count ← 1 TO 4
    OUTPUT "Shot ", Count
NEXT Count
```

**Output:**

```
Shot 1
Shot 2
Shot 3
Shot 4
```

`Count` starts at 1 and goes up by 1 each time, until it has done 4. `NEXT Count` marks the end of the loop and names the same variable.

Add `STEP` to count in different jumps, including backwards:

```
FOR Row ← 2 TO 10 STEP 4
    OUTPUT Row
NEXT Row
FOR Row ← 3 TO 1 STEP -1
    OUTPUT "Countdown ", Row
NEXT Row
```

**Output:**

```
2
6
10
Countdown 3
Countdown 2
Countdown 1
```

### WHILE loops (check first)

```
Fuel ← 10
WHILE Fuel > 3 DO
    Fuel ← Fuel - 4
ENDWHILE
OUTPUT Fuel
```

**Output:**

```
2
```

Fuel goes 10, then 6, then 2. When Fuel is 2, `Fuel > 3` is FALSE, so the loop stops. If Fuel had started at 1, the loop body would never run at all.

### REPEAT loops (check last)

```
X ← 1
REPEAT
    X ← X * 3
UNTIL X > 20
OUTPUT X
```

**Output:**

```
27
```

X goes 1, 3, 9, 27. After each pass it asks "is X > 20 yet?" and stops once the answer is yes. Notice `WHILE` keeps going **while** the condition is TRUE, but `REPEAT` keeps going **until** it becomes TRUE.

### Loops inside loops (nested)

```
Total ← 0
FOR i ← 1 TO 3
    FOR j ← 1 TO 2
        Total ← Total + 1
    NEXT j
NEXT i
OUTPUT Total
```

**Output:**

```
6
```

The inner loop runs 2 times for **each** of the 3 outer passes: 3 × 2 = 6.

> **Watch out for infinite loops.** If a `WHILE` condition never becomes FALSE, the loop never ends. The game stops any program after 5000 steps and tells you "Your program ran too long".

---

## 8. Reading code: trace tables

**Tracing** means running code in your head (or on paper), line by line, and writing down what every variable holds. It's the skill you need for torpedoes, and it's worth lots of marks in exams.

### How to make a trace table

1. Make a column for **each variable**, plus one for **OUTPUT**.
2. Go through the code one line at a time.
3. Each time a variable changes, write its new value on a **new row** in its column.
4. When something is output, write it in the OUTPUT column.

### Worked example

```
Total ← 0
FOR Count ← 1 TO 4
    Total ← Total + Count
NEXT Count
OUTPUT Total
```

| Count | Total | OUTPUT |
|---|---|---|
| | 0 | |
| 1 | 1 | |
| 2 | 3 | |
| 3 | 6 | |
| 4 | 10 | |
| | | 10 |

**Output:**

```
10
```

### Worked example: a torpedo

Here is a torpedo like the ones in the game. Where does it land?

```
Letters ← "ABCDEFGHIJKLMNOP"
Row ← 3
Row ← Row * 2 + 1
Col ← 0
FOR Index ← 1 TO 3
    Col ← Col + 2
NEXT Index
OUTPUT SUBSTRING(Letters, Col, 1), Row
```

Take it in three steps:

1. **Row:** it starts at 3, then becomes 3 × 2 + 1 = **7**.
2. **Col:** it starts at 0, and the loop adds 2 three times: 2, 4, **6**.
3. **The last line:** position 6 of `Letters` is **F**. OUTPUT joins the letter and the row with no space.

| Row | Col | Index | OUTPUT |
|---|---|---|---|
| 3 | | | |
| 7 | 0 | | |
| | 2 | 1 | |
| | 4 | 2 | |
| | 6 | 3 | |
| | | | F7 |

**Output:**

```
F7
```

Type **F7** (or tap F7 on the chart) and launch.

### Torpedo tips

- Row and column are worked out **separately**. Do one, then the other.
- Keep going to the end. A variable can change several times before the `OUTPUT`.
- Count carefully in `SUBSTRING`: the **first** letter is position **1**, not 0.
- If you see `MOD` or `DIV` in an `IF`, work out the condition first, then follow **only** the THEN branch or **only** the ELSE branch, never both.

---

## 9. Writing code that fires

In the **Code** tab you write a program, press **Run**, and every `FIRE` command launches a real shot.

```
FIRE(column, row)
```

- `column` can be a **letter in quotes**, `FIRE("C", 7)`, or a **number**, `FIRE(3, 7)`. Both mean C7.
- `row` is a number, counting from 1 at the top.
- **Each FIRE uses one of your crew's shots.** When you run out, the rest of the program's shots don't fire.
- Squares that have already been hit, or that are in your own waters, are **skipped** and cost nothing.
- **Tap a square on the chart** while the Code tab is open to add a `FIRE` line for it.

The game runs your whole program first, then fires the shots in order. If there's a mistake anywhere in the code, **nothing** is fired, so you never waste shots on a broken program.

### Pattern 1: a single shot

```
FIRE("K", 7)
```

**Fires at:** K7

### Pattern 2: sweep along a row

```
FOR Col ← 9 TO 12
    FIRE(Col, 3)
NEXT Col
```

**Fires at:** I3, J3, K3, L3

Columns 9 to 12 are I to L. Using a number for the column is what makes loops like this possible.

### Pattern 3: every other square in a column

```
FOR Row ← 1 TO 7 STEP 2
    FIRE("K", Row)
NEXT Row
```

**Fires at:** K1, K3, K5, K7

Every ship is at least 2 squares long, so a ship lying down column K between rows 1 and 8 can't fit between these shots. It's a cheap way to search.

### Pattern 4: a diagonal

```
FOR i ← 1 TO 4
    FIRE(8 + i, i)
NEXT i
```

**Fires at:** I1, J2, K3, L4

The column and row both change by 1 each time.

### Pattern 5: hunt around a hit

You hit K4 but haven't sunk the ship yet. The rest of the ship must be above, below, left or right:

```
HitCol ← 11    // K is column 11
HitRow ← 4
FIRE(HitCol, HitRow - 1)
FIRE(HitCol, HitRow + 1)
FIRE(HitCol - 1, HitRow)
FIRE(HitCol + 1, HitRow)
```

**Fires at:** K3, K5, J4, L4

Change the first two lines to reuse this for any hit.

### Pattern 6: a checkerboard with MOD

```
FOR Row ← 1 TO 4
    FOR Col ← 9 TO 12
        IF MOD(Row + Col, 2) = 0
          THEN
            FIRE(Col, Row)
        ENDIF
    NEXT Col
NEXT Row
```

**Fires at:** I1, K1, J2, L2, I3, K3, J4, L4

`Row + Col` is even on every other square, like the black squares on a chessboard. This covers a 4 × 4 area with only 8 shots and can't miss any ship longer than 1 square that lies completely inside it.

### Pattern 7: pick columns from a string

```
Cols ← "ACEG"
FOR i ← 1 TO LENGTH(Cols)
    FIRE(SUBSTRING(Cols, i, 1), 5)
NEXT i
```

**Fires at:** A5, C5, E5, G5

### Test before you fire

Use `OUTPUT` to check your plan without spending any shots. Programs with no `FIRE` are free to run:

```
FOR Row ← 1 TO 7 STEP 2
    OUTPUT "K", Row
NEXT Row
```

**Output:**

```
K1
K3
K5
K7
```

When the list looks right, change `OUTPUT "K", Row` to `FIRE("K", Row)`.

---

## 10. Practice questions

Try each one on paper first, then click to reveal the answer.

**Q1.** What is output?

```
A ← 5
B ← A + 3
A ← B * 2
OUTPUT A, " ", B
```

<details><summary>Answer</summary>

`16 8`. B becomes 5 + 3 = 8, then A becomes 8 × 2 = 16. The old value of A doesn't matter any more.

</details>

**Q2.** What is output?

```
N ← 17
IF MOD(N, 2) = 0
  THEN
    OUTPUT "Even"
  ELSE
    OUTPUT "Odd"
ENDIF
```

<details><summary>Answer</summary>

`Odd`. 17 ÷ 2 is 8 remainder 1, so `MOD(17, 2)` is 1, not 0.

</details>

**Q3.** How many times is "Fire!" output?

```
FOR i ← 3 TO 9 STEP 3
    OUTPUT "Fire!"
NEXT i
```

<details><summary>Answer</summary>

**3 times**, with i = 3, 6, 9.

</details>

**Q4.** Torpedo: which square?

```
Letters ← "ABCDEFGHIJKLMNOP"
Row ← 20
WHILE Row > 12 DO
    Row ← Row - 3
ENDWHILE
Col ← DIV(25, 2)
OUTPUT SUBSTRING(Letters, Col, 1), Row
```

<details><summary>Answer</summary>

**L11**. Row goes 20, 17, 14, 11 and stops because 11 > 12 is false. `DIV(25, 2)` is 12, and letter 12 is L.

</details>

**Q5.** Torpedo: which square?

```
Letters ← "ABCDEFGHIJKLMNOP"
X ← 9
IF MOD(X, 2) = 0
  THEN
    Col ← DIV(X, 2)
  ELSE
    Col ← X + 4
ENDIF
Row ← 1
REPEAT
    Row ← Row * 2
UNTIL Row > 5
OUTPUT SUBSTRING(Letters, Col, 1), Row
```

<details><summary>Answer</summary>

**M8**. 9 is odd, so the ELSE branch runs: Col = 9 + 4 = 13, which is M. Row goes 1, 2, 4, 8 and stops at 8 because 8 > 5.

</details>

**Q6.** Write a program that fires at every square in column **N** from row 2 to row 6.

<details><summary>Answer</summary>

```
FOR Row ← 2 TO 6
    FIRE("N", Row)
NEXT Row
```

This fires at N2, N3, N4, N5 and N6, using 5 shots. `FIRE(14, Row)` works too, because N is column 14.

</details>

**Q7.** Write a program that fires at the four **corners** of the square from I9 to L12.

<details><summary>Answer</summary>

One way, using loops that jump from one edge to the other:

```
FOR Col ← 9 TO 12 STEP 3
    FOR Row ← 9 TO 12 STEP 3
        FIRE(Col, Row)
    NEXT Row
NEXT Col
```

This fires at I9, I12, L9 and L12. Four separate `FIRE` lines are also a correct answer.

</details>

**Q8.** Find the mistake. It should output 1 to 5:

```
Count = 1
WHILE Count <= 5 DO
    OUTPUT Count
ENDWHILE
```

<details><summary>Answer</summary>

There are **two** mistakes:

1. `Count = 1` should be `Count ← 1`. `=` compares, `←` assigns.
2. Count never changes inside the loop, so it would run forever. Add `Count ← Count + 1` before `ENDWHILE`.

```
Count ← 1
WHILE Count <= 5 DO
    OUTPUT Count
    Count ← Count + 1
ENDWHILE
```

</details>

---

## 11. Error messages

When something's wrong, the console tells you the **line number** and what it expected. Nothing is fired until the whole program is correct.

| Message | What it means | Fix |
|---|---|---|
| `Use ← to store a value, like X ← 5` | You wrote `X = 5` | Use `←` or `<-` |
| `X has no value yet` | You used a variable before storing anything in it | Assign it first, and check the spelling and capitals |
| `IF needs THEN after the condition` | `THEN` is missing | Add `THEN` |
| `A FOR is never closed. Add NEXT.` | Missing `NEXT`, `ENDIF`, `ENDWHILE` or `UNTIL` | Every block needs its closing keyword |
| `NEXT should say NEXT Row` | `NEXT` names a different variable than its `FOR` | Match the names |
| `"Z" isn't a column on this chart` | That column doesn't exist in this game | Check the letters along the top of the chart |
| `Row 20 is off the chart` | That row doesn't exist | Check the numbers down the side |
| `Your program ran too long` | Probably a loop that never ends | Make sure the loop's condition eventually changes |
| `This text is missing its closing quote` | A `"` was opened but not closed | Add the closing `"` |

### What the game's console doesn't do

The console understands a subset of Cambridge pseudocode. You'll meet these in exams and in the quiz questions, but the console can't run them:

- arrays (`Nums[1]`), `INPUT`, `CASE OF ... ENDCASE`
- `PROCEDURE` / `FUNCTION` definitions
- file handling (`OPENFILE`, `READFILE`, ...)

`DECLARE` lines are accepted and skipped.

---

## 12. Quick reference card

```
// comment
X ← 5                   store (or X <- 5)
CONSTANT Max ← 8
DECLARE X : INTEGER     accepted, not needed

OUTPUT "Row ", R        values are joined with no spaces

+  -  *  /              arithmetic
DIV(a, b)   MOD(a, b)   whole division, remainder
ROUND(x, p)   INT(x)
LENGTH(s)   UCASE(s)   LCASE(s)
SUBSTRING(s, start, n)  first character is position 1
"A" & "7"               join strings

=  <>  <  >  <=  >=     compare
AND  OR  NOT

IF condition
  THEN
    ...
  ELSE
    ...
ENDIF

FOR i ← 1 TO 10 STEP 2
    ...
NEXT i

WHILE condition DO
    ...
ENDWHILE

REPEAT
    ...
UNTIL condition

FIRE("C", 7)   FIRE(3, 7)   one shot at C7
```

Column numbers: A1 B2 C3 D4 E5 F6 G7 H8 I9 J10 K11 L12 M13 N14 O15 P16 Q17 R18 S19 T20 U21 V22 W23 X24 Y25 Z26

[← Back to the Player's Guide](PLAYERS_GUIDE.md) · [Back to the README](../README.md)
