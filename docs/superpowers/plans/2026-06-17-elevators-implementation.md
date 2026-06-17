# Elevators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the elevator system described in `docs/superpowers/specs/2026-06-17-elevators-design.md` — V1 with 10 floors, 5 elevators, FIFO queue, smooth movement, and wait-time display.

**Architecture:** Vanilla JS with ES modules. Four classes (`Building`, `Dispatcher`, `Elevator`, `CallButton`) with direct coupling by reference. Modular SCSS with BEM. HTML5 templates + cloning for markup. CSS transition for movement. `performance.now()` for time measurement. `HTMLAudioElement` for the ding.

**Tech Stack:** Vanilla JS (ES modules), SCSS, Vite (dev server + SCSS compiler), no runtime dependencies.

**On tests:** the spec decides not to include automated tests in V1 (explicit decision §12 of the spec). Each task ends with a **manual verification** step that replaces the TDD cycle with a visual/functional validation cycle in the browser. This is intentional, not an oversight.

---

## File Structure (locked in by spec §3)

```
elevators/
├── .gitignore
├── package.json
├── vite.config.js
├── index.html              # root markup + <template>s for elevator and call-row
├── public/
│   ├── elevator.svg        # placeholder in V1; user replaces with the Drive one
│   └── ding.wav            # placeholder in V1; user replaces with real sound
└── src/
    ├── main.js             # entry point — instantiates Building
    ├── config.js           # FLOORS, ELEVATORS, FLOOR_DURATION_MS, REST_MS
    ├── Building.js         # bootstrap + wiring
    ├── Dispatcher.js       # queue + algorithm + time setInterval
    ├── Elevator.js         # lifecycle + CSS movement
    ├── CallButton.js       # button UI + setState
    ├── format.js           # formatTime(ms)
    └── styles/
        ├── main.scss
        ├── _variables.scss
        ├── _layout.scss
        ├── _floors.scss
        ├── _elevator.scss
        └── _button.scss
```

11 tasks. Each one produces independently verifiable code. Commit at the end of each task.

---

## Task 1: Project bootstrap

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`

- [ ] **Step 1.1: Initialize git**

Run in the working directory:
```bash
git init
git add docs/
git commit -m "chore: include design spec"
```
Expected: commit created with the spec inside.

- [ ] **Step 1.2: Create `.gitignore`**

Full contents:
```
node_modules/
dist/
.DS_Store
*.log
.vite/
```

- [ ] **Step 1.3: Create `package.json`**

Full contents:
```json
{
  "name": "elevators",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "sass": "^1.77.0",
    "vite": "^5.2.0"
  }
}
```

- [ ] **Step 1.4: Create `vite.config.js`**

Full contents:
```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: true
  }
});
```

- [ ] **Step 1.5: Create `index.html` with minimal skeleton**

Full contents:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Elevator Exercise</title>
  </head>
  <body>
    <main id="app">
      <h1>Elevator Exercise</h1>
    </main>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 1.6: Create `src/main.js` placeholder**

Full contents:
```js
console.log('Elevators boot');
```

- [ ] **Step 1.7: Install dependencies and verify**

Run:
```bash
npm install
npm run dev
```
Expected: Vite starts, browser opens `http://localhost:5173`, "Elevator Exercise" shows as title and "Elevators boot" appears in the console. Stop the server with Ctrl+C.

- [ ] **Step 1.8: Commit**

```bash
git add .gitignore package.json package-lock.json vite.config.js index.html src/main.js
git commit -m "chore: bootstrap vite + module entry point"
```

---

## Task 2: Config + SCSS base with variables and empty layout

**Files:**
- Create: `src/config.js`
- Create: `src/styles/main.scss`
- Create: `src/styles/_variables.scss`
- Create: `src/styles/_layout.scss`
- Modify: `src/main.js` (import the SCSS)
- Modify: `index.html` (placeholder shows)

- [ ] **Step 2.1: Create `src/config.js` with constants**

Full contents:
```js
export const FLOORS = 10;
export const ELEVATORS = 5;
export const FLOOR_DURATION_MS = 800;
export const REST_MS = 2000;
export const TIME_REFRESH_MS = 1000;
```

- [ ] **Step 2.2: Create `src/styles/_variables.scss`**

Full contents:
```scss
:root {
  --floor-height: 60px;
  --shaft-width: 80px;
  --label-width: 60px;
  --calls-width: 160px;
}

$color-bg: #ebebeb;
$color-grid-line: #d8d8d8;

$color-call: #36c272;
$color-call-text: #ffffff;
$color-waiting: #ef4456;
$color-waiting-text: #ffffff;
$color-arrived-border: #36c272;
$color-arrived-text: #36c272;
$color-arrived-bg: #ffffff;

$color-elevator-idle: #2d2d2d;
$color-elevator-moving: #ef4456;
$color-elevator-arrived: #36c272;

$font-stack: 'Helvetica Neue', Arial, sans-serif;
```

- [ ] **Step 2.3: Create `src/styles/_layout.scss`**

Full contents:
```scss
@use 'variables' as *;

* { box-sizing: border-box; }

body {
  margin: 0;
  background: $color-bg;
  font-family: $font-stack;
  font-size: 14px;
  color: #222;
}

#app {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.building {
  display: flex;
  align-items: stretch;
  background: #ffffff;
  border: 1px solid $color-grid-line;
  padding: 16px;
}

.building__labels,
.building__shafts,
.building__calls {
  display: flex;
  flex-direction: column-reverse;
}

.building__labels { width: var(--label-width); }
.building__shafts { display: flex; flex-direction: row; }
.building__calls  { width: var(--calls-width); }
```

Note: `column-reverse` for labels and calls because floor 0 (Ground) goes at the bottom and floor 9 at the top. We iterate the data 0..9 but visually they end up reversed.

- [ ] **Step 2.4: Create `src/styles/main.scss` as entry**

Full contents:
```scss
@use 'variables';
@use 'layout';
```

- [ ] **Step 2.5: Import SCSS from `src/main.js`**

Replace full contents of `src/main.js`:
```js
import './styles/main.scss';

console.log('Elevators boot');
```

- [ ] **Step 2.6: Manual verification**

Run:
```bash
npm run dev
```
Expected:
- The page loads with a light gray background (`#ebebeb`).
- The "Elevator Exercise" title shows centered.
- No errors in the console.

Stop the server.

- [ ] **Step 2.7: Commit**

```bash
git add src/config.js src/styles/ src/main.js
git commit -m "feat: scss base with variables and empty layout"
```

---

## Task 3: `format.js` with time helper

**Files:**
- Create: `src/format.js`
- Modify: `src/main.js` (quick console check)

- [ ] **Step 3.1: Create `src/format.js`**

Full contents:
```js
export function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec} sec`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min} min. ${sec} sec.`;
}
```

- [ ] **Step 3.2: Verify in console**

Temporarily replace the contents of `src/main.js`:
```js
import './styles/main.scss';
import { formatTime } from './format.js';

console.log(formatTime(5000));     // expected: "5 sec"
console.log(formatTime(42500));    // expected: "42 sec"
console.log(formatTime(60000));    // expected: "1 min. 0 sec."
console.log(formatTime(90000));    // expected: "1 min. 30 sec."
console.log(formatTime(125400));   // expected: "2 min. 5 sec."
```

Run:
```bash
npm run dev
```
Expected: the 5 values appear in the browser console as indicated above. No errors.

Stop the server.

- [ ] **Step 3.3: Restore `src/main.js` to its base state**

Replace contents of `src/main.js`:
```js
import './styles/main.scss';

console.log('Elevators boot');
```

- [ ] **Step 3.4: Commit**

```bash
git add src/format.js src/main.js
git commit -m "feat: formatTime helper"
```

---

## Task 4: HTML templates + skeleton rendered (no classes yet)

This task adds the `<template>` elements and minimal cloning code, no classes yet. The goal is to see the building grid (10 rows × 5 columns + labels + inert buttons) rendered on screen.

**Files:**
- Modify: `index.html`
- Create: `src/styles/_floors.scss`
- Create: `src/styles/_elevator.scss`
- Create: `src/styles/_button.scss`
- Modify: `src/styles/main.scss`
- Modify: `src/main.js`

- [ ] **Step 4.1: Replace full contents of `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Elevator Exercise</title>
  </head>
  <body>
    <main id="app">
      <div class="building"></div>
    </main>

    <template id="floor-label-template">
      <div class="floor-label"></div>
    </template>

    <template id="shaft-template">
      <div class="shaft">
        <div class="shaft__elevator shaft__elevator--idle">
          <img class="shaft__elevator-img" src="/elevator.svg" alt="" />
        </div>
      </div>
    </template>

    <template id="call-row-template">
      <div class="call-row">
        <span class="call-row__time"></span>
        <button type="button" class="call-button call-button--call">Call</button>
      </div>
    </template>

    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 4.2: Create `src/styles/_floors.scss`**

Full contents:
```scss
@use 'variables' as *;

.floor-label {
  height: var(--floor-height);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  color: #555;
  font-size: 12px;
  border-top: 1px solid $color-grid-line;

  &:last-child { border-top: none; }
}
```

- [ ] **Step 4.3: Create `src/styles/_elevator.scss`**

Full contents:
```scss
@use 'variables' as *;

.shaft {
  position: relative;
  width: var(--shaft-width);
  height: calc(var(--floor-height) * 10);
  border-left: 1px solid $color-grid-line;

  &:last-child { border-right: 1px solid $color-grid-line; }
}

.shaft__elevator {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 32px;
  height: calc(var(--floor-height) - 8px);
  margin-left: -16px;
  transform: translateY(0);
  transition: transform var(--travel-duration, 0ms) ease-in-out;
}

.shaft__elevator-img {
  width: 100%;
  height: 100%;
  display: block;
}

.shaft__elevator--idle    .shaft__elevator-img { filter: brightness(0); }
.shaft__elevator--moving  .shaft__elevator-img { filter: brightness(0) drop-shadow(0 0 0 $color-elevator-moving); }
.shaft__elevator--arrived .shaft__elevator-img { filter: brightness(0) drop-shadow(0 0 0 $color-elevator-arrived); }
```

Note: the `filter`s are a quick way to tint the SVG when loaded as `<img>`. If the provided SVG has its own fill, this is adjusted in Task 11 (polish).

- [ ] **Step 4.4: Create `src/styles/_button.scss`**

Full contents:
```scss
@use 'variables' as *;

.call-row {
  height: var(--floor-height);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-right: 8px;
  border-top: 1px solid $color-grid-line;

  &:last-child { border-top: none; }
}

.call-row__time {
  font-size: 12px;
  color: #555;
  min-width: 80px;
  text-align: right;
}

.call-button {
  width: 64px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.call-button--call    { background: $color-call;    color: $color-call-text; }
.call-button--waiting { background: $color-waiting; color: $color-waiting-text; }
.call-button--arrived { background: $color-arrived-bg; color: $color-arrived-text; border-color: $color-arrived-border; }
```

- [ ] **Step 4.5: Update `src/styles/main.scss`**

Replace full contents:
```scss
@use 'variables';
@use 'layout';
@use 'floors';
@use 'elevator';
@use 'button';
```

- [ ] **Step 4.6: Create elevator.svg placeholder**

Create `public/elevator.svg` with full contents (simple square — you'll replace it with the Drive one later):
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 52">
  <rect x="2" y="2" width="28" height="48" fill="currentColor" stroke="#000" stroke-width="2"/>
  <line x1="16" y1="2" x2="16" y2="50" stroke="#fff" stroke-width="1"/>
</svg>
```

- [ ] **Step 4.7: Replace `src/main.js` with template cloning**

Full contents:
```js
import './styles/main.scss';
import { FLOORS, ELEVATORS } from './config.js';

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  return tpl.content.firstElementChild.cloneNode(true);
}

function renderSkeleton(rootSelector) {
  const root = document.querySelector(rootSelector);

  const labels = document.createElement('div');
  labels.className = 'building__labels';

  const shafts = document.createElement('div');
  shafts.className = 'building__shafts';

  const calls = document.createElement('div');
  calls.className = 'building__calls';

  for (let f = 0; f < FLOORS; f++) {
    const label = cloneTemplate('floor-label-template');
    label.textContent = f === 0 ? 'Ground' : `${f}${ordinalSuffix(f)}`;
    labels.appendChild(label);

    const callRow = cloneTemplate('call-row-template');
    callRow.dataset.floor = String(f);
    calls.appendChild(callRow);
  }

  for (let i = 0; i < ELEVATORS; i++) {
    const shaft = cloneTemplate('shaft-template');
    shaft.dataset.elevatorId = String(i);
    shafts.appendChild(shaft);
  }

  root.appendChild(labels);
  root.appendChild(shafts);
  root.appendChild(calls);
}

function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

renderSkeleton('.building');
```

- [ ] **Step 4.8: Manual verification**

Run:
```bash
npm run dev
```
Expected:
- A building shows centered on screen.
- Left column: labels "9th, 8th, 7th, 6th, 5th, 4th, 3rd, 2nd, 1st, Ground" (top to bottom).
- Center: 5 vertical shafts with a black square at the base of each.
- Right column: 10 green buttons that say "Call" aligned with the floors.
- Clicks on the buttons do nothing (no logic yet).
- No errors in the console.

Stop the server.

- [ ] **Step 4.9: Commit**

```bash
git add index.html src/main.js src/styles/ public/elevator.svg
git commit -m "feat: render building skeleton with templates"
```

---

## Task 5: `CallButton` class

**Files:**
- Create: `src/CallButton.js`
- Modify: `src/main.js` (instantiate and verify manually)

- [ ] **Step 5.1: Create `src/CallButton.js`**

Full contents:
```js
const STATES = ['call', 'waiting', 'arrived'];

export class CallButton {
  constructor(floor, dispatcher, rowElement) {
    this.floor = floor;
    this.dispatcher = dispatcher;
    this.row = rowElement;
    this.button = rowElement.querySelector('.call-button');
    this.timeEl = rowElement.querySelector('.call-row__time');

    this.state = 'call';
    this.button.addEventListener('click', () => {
      this.dispatcher.requestElevator(this.floor);
    });
  }

  setState(state, timeText = '') {
    if (!STATES.includes(state)) {
      throw new Error(`Unknown CallButton state: ${state}`);
    }
    STATES.forEach(s => this.button.classList.remove(`call-button--${s}`));
    this.button.classList.add(`call-button--${state}`);
    this.state = state;

    switch (state) {
      case 'call':    this.button.textContent = 'Call'; break;
      case 'waiting': this.button.textContent = 'Waiting'; break;
      case 'arrived': this.button.textContent = 'Arrived'; break;
    }

    this.timeEl.textContent = timeText;
  }
}
```

- [ ] **Step 5.2: Manual verification with fake dispatcher**

Temporarily replace `src/main.js` to verify `CallButton` in isolation:
```js
import './styles/main.scss';
import { FLOORS, ELEVATORS } from './config.js';
import { CallButton } from './CallButton.js';

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  return tpl.content.firstElementChild.cloneNode(true);
}

function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

const root = document.querySelector('.building');
const labels = document.createElement('div'); labels.className = 'building__labels';
const shafts = document.createElement('div'); shafts.className = 'building__shafts';
const calls  = document.createElement('div'); calls.className  = 'building__calls';

const fakeDispatcher = {
  requestElevator(floor) {
    console.log('requestElevator', floor);
    const next = { call: 'waiting', waiting: 'arrived', arrived: 'call' }[buttons[floor].state];
    buttons[floor].setState(next, next === 'arrived' ? '3 sec' : '');
  }
};

const buttons = [];
for (let f = 0; f < FLOORS; f++) {
  const label = cloneTemplate('floor-label-template');
  label.textContent = f === 0 ? 'Ground' : `${f}${ordinalSuffix(f)}`;
  labels.appendChild(label);

  const callRow = cloneTemplate('call-row-template');
  callRow.dataset.floor = String(f);
  calls.appendChild(callRow);
  buttons[f] = new CallButton(f, fakeDispatcher, callRow);
}
for (let i = 0; i < ELEVATORS; i++) {
  const shaft = cloneTemplate('shaft-template');
  shaft.dataset.elevatorId = String(i);
  shafts.appendChild(shaft);
}
root.appendChild(labels); root.appendChild(shafts); root.appendChild(calls);
```

Run:
```bash
npm run dev
```
Expected:
- Each click on a "Call" button changes it to red "Waiting".
- Another click changes it to "Arrived" (white with green border) and "3 sec" appears in the time column.
- Another click brings it back to green "Call", the time clears.
- Console: each click logs `requestElevator <floor>`.

Stop the server.

- [ ] **Step 5.3: Commit (don't restore main.js — leave as is, Task 6 refactors it again)**

```bash
git add src/CallButton.js src/main.js
git commit -m "feat: CallButton with states and manual verification"
```

---

## Task 6: `Elevator` class with CSS movement

**Files:**
- Create: `src/Elevator.js`
- Modify: `src/main.js` (manual movement verification)

- [ ] **Step 6.1: Create `src/Elevator.js`**

Full contents:
```js
import { FLOOR_DURATION_MS, REST_MS } from './config.js';

const STATES = ['idle', 'moving', 'arrived'];

export class Elevator {
  constructor(id, dispatcher, config = {}) {
    this.id = id;
    this.dispatcher = dispatcher;
    this.config = config;

    this.currentFloor = 0;
    this.state = 'idle';
    this.element = null;
    this.floorHeightPx = 0;
  }

  attach(shaftElement) {
    this.shaft = shaftElement;
    this.element = shaftElement.querySelector('.shaft__elevator');
    const v = getComputedStyle(document.documentElement).getPropertyValue('--floor-height');
    this.floorHeightPx = parseFloat(v);
    this._applyStateClass();
    this._applyTransform(0);
  }

  goTo(targetFloor) {
    if (this.state !== 'idle') {
      throw new Error(`Elevator ${this.id}: goTo called while state=${this.state}`);
    }
    const distance = Math.abs(targetFloor - this.currentFloor);
    const durationMs = distance * FLOOR_DURATION_MS;
    const start = performance.now();

    this.state = 'moving';
    this._applyStateClass();

    this.element.style.setProperty('--travel-duration', `${durationMs}ms`);
    this._applyTransform(targetFloor);

    const onEnd = () => {
      const elapsedMs = performance.now() - start;
      this.currentFloor = targetFloor;
      this.state = 'arrived';
      this._applyStateClass();
      this.dispatcher.onArrival(this, elapsedMs);
    };

    if (distance === 0) {
      setTimeout(onEnd, 0);
    } else {
      this.element.addEventListener('transitionend', onEnd, { once: true });
    }
  }

  rest() {
    setTimeout(() => {
      this.state = 'idle';
      this._applyStateClass();
      this.dispatcher.onIdle(this);
    }, REST_MS);
  }

  _applyTransform(floor) {
    this.element.style.transform = `translateY(${-floor * this.floorHeightPx}px)`;
  }

  _applyStateClass() {
    STATES.forEach(s => this.element.classList.remove(`shaft__elevator--${s}`));
    this.element.classList.add(`shaft__elevator--${this.state}`);
  }
}
```

Note: the `if (distance === 0)` covers the "call to the same floor where the elevator already is" case. CSS doesn't fire `transitionend` if the transform doesn't change → force it with `setTimeout(0)`.

- [ ] **Step 6.2: Manual verification with fake dispatcher**

Temporarily replace `src/main.js`:
```js
import './styles/main.scss';
import { FLOORS, ELEVATORS } from './config.js';
import { CallButton } from './CallButton.js';
import { Elevator } from './Elevator.js';

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  return tpl.content.firstElementChild.cloneNode(true);
}
function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

const root = document.querySelector('.building');
const labels = document.createElement('div'); labels.className = 'building__labels';
const shafts = document.createElement('div'); shafts.className = 'building__shafts';
const calls  = document.createElement('div'); calls.className  = 'building__calls';

const elevators = [];
const buttons = [];

const fakeDispatcher = {
  requestElevator(floor) {
    const elev = elevators.find(e => e.state === 'idle');
    if (!elev) { console.log('no idle'); return; }
    buttons[floor].setState('waiting');
    fakeDispatcher._activeFloor = floor;
    fakeDispatcher._activeElev = elev;
    elev.goTo(floor);
  },
  onArrival(elev, ms) {
    console.log('arrived', elev.id, 'ms=', ms);
    buttons[this._activeFloor].setState('arrived', `${Math.round(ms / 1000)} sec`);
    elev.rest();
  },
  onIdle(elev) {
    console.log('idle', elev.id);
    buttons[this._activeFloor].setState('call');
  }
};

for (let f = 0; f < FLOORS; f++) {
  const label = cloneTemplate('floor-label-template');
  label.textContent = f === 0 ? 'Ground' : `${f}${ordinalSuffix(f)}`;
  labels.appendChild(label);

  const callRow = cloneTemplate('call-row-template');
  callRow.dataset.floor = String(f);
  calls.appendChild(callRow);
  buttons[f] = new CallButton(f, fakeDispatcher, callRow);
}

for (let i = 0; i < ELEVATORS; i++) {
  const shaft = cloneTemplate('shaft-template');
  shaft.dataset.elevatorId = String(i);
  shafts.appendChild(shaft);

  const e = new Elevator(i, fakeDispatcher);
  elevators.push(e);
}

root.appendChild(labels); root.appendChild(shafts); root.appendChild(calls);

elevators.forEach((e, i) => e.attach(shafts.children[i]));
```

Run:
```bash
npm run dev
```
Expected:
- Click on "Call" of floor 5: the first elevator smoothly rides up to floor 5 (~4 seconds).
- On arrival, the button changes to "Arrived" with a time (e.g. "4 sec"), the elevator stays for 2 seconds.
- After 2s the button goes back to "Call".
- Clicks on other floors keep working, picking an idle elevator.
- If all are busy, "no idle" shows in the console and the button doesn't change (this is the bug the real Dispatcher fixes).

Stop the server.

- [ ] **Step 6.3: Commit**

```bash
git add src/Elevator.js src/main.js
git commit -m "feat: Elevator with CSS movement and lifecycle"
```

---

## Task 7: `Dispatcher` class with algorithm and queue

**Files:**
- Create: `src/Dispatcher.js`
- Modify: `src/main.js` (use the real Dispatcher)

- [ ] **Step 7.1: Create `src/Dispatcher.js`**

Full contents (no sound or display timer yet — those come in tasks 9 and 10):
```js
import { formatTime } from './format.js';

export class Dispatcher {
  constructor() {
    this.elevators = [];
    this.buttons = [];
    this.queue = [];
    this.activeCalls = new Map();
  }

  setActors(elevators, buttons) {
    this.elevators = elevators;
    this.buttons = buttons;
  }

  requestElevator(floor) {
    if (this.buttons[floor].state === 'waiting') return;
    if (this.buttons[floor].state === 'arrived') return;

    const startTime = performance.now();
    this.buttons[floor].setState('waiting');

    const idle = this.elevators.filter(e => e.state === 'idle');
    if (idle.length === 0) {
      this.queue.push({ floor, startTime });
      return;
    }

    const closest = this._pickClosest(idle, floor);
    this.activeCalls.set(closest, { floor, startTime });
    closest.goTo(floor);
  }

  onArrival(elevator, durationMs) {
    const call = this.activeCalls.get(elevator);
    if (!call) {
      throw new Error(`Dispatcher: arrival from elevator ${elevator.id} with no active call`);
    }
    const elapsed = performance.now() - call.startTime;
    this.buttons[call.floor].setState('arrived', formatTime(elapsed));
    elevator.rest();
  }

  onIdle(elevator) {
    const call = this.activeCalls.get(elevator);
    if (call) {
      this.buttons[call.floor].setState('call');
      this.activeCalls.delete(elevator);
    }

    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.activeCalls.set(elevator, next);
      elevator.goTo(next.floor);
    }
  }

  _pickClosest(elevators, floor) {
    let best = elevators[0];
    let bestDist = Math.abs(best.currentFloor - floor);
    for (let i = 1; i < elevators.length; i++) {
      const d = Math.abs(elevators[i].currentFloor - floor);
      if (d < bestDist) {
        best = elevators[i];
        bestDist = d;
      }
    }
    return best;
  }
}
```

- [ ] **Step 7.2: Replace `src/main.js` with the wiring using the real Dispatcher**

Full contents:
```js
import './styles/main.scss';
import { FLOORS, ELEVATORS } from './config.js';
import { CallButton } from './CallButton.js';
import { Elevator } from './Elevator.js';
import { Dispatcher } from './Dispatcher.js';

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  return tpl.content.firstElementChild.cloneNode(true);
}
function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

const root = document.querySelector('.building');
const labels = document.createElement('div'); labels.className = 'building__labels';
const shafts = document.createElement('div'); shafts.className = 'building__shafts';
const calls  = document.createElement('div'); calls.className  = 'building__calls';

const dispatcher = new Dispatcher();
const elevators = [];
const buttons = [];

for (let f = 0; f < FLOORS; f++) {
  const label = cloneTemplate('floor-label-template');
  label.textContent = f === 0 ? 'Ground' : `${f}${ordinalSuffix(f)}`;
  labels.appendChild(label);

  const callRow = cloneTemplate('call-row-template');
  callRow.dataset.floor = String(f);
  calls.appendChild(callRow);
  buttons[f] = new CallButton(f, dispatcher, callRow);
}

for (let i = 0; i < ELEVATORS; i++) {
  const shaft = cloneTemplate('shaft-template');
  shaft.dataset.elevatorId = String(i);
  shafts.appendChild(shaft);
  elevators.push(new Elevator(i, dispatcher, {}));
}

root.appendChild(labels); root.appendChild(shafts); root.appendChild(calls);

elevators.forEach((e, i) => e.attach(shafts.children[i]));
dispatcher.setActors(elevators, buttons);
```

- [ ] **Step 7.3: Manual verification of algorithm and queue**

Run:
```bash
npm run dev
```
Things to verify (test in this order):

1. **Closest assignment:** call floor 0 (Ground). The first elevator should respond (all start at Ground; tie-break by smallest index → 0).
2. **When an elevator is on another floor:** after the first call, call floor 9 while the first elevator is returning or already on some intermediate floor. The closest idle one should respond.
3. **FIFO queue:** call 5 distinct floors in quick succession (5, 7, 3, 9, 1). All 5 elevators start, each to one floor. Call floor 0 and floor 2 while all are traveling. Those queue up. As elevators finish, the ones that go back to `idle` take queued calls in order (0 first, then 2).
4. **Double-click protected:** click the same Call button twice quickly. The second one should do nothing (the button is already in `waiting`).
5. **No errors in the console.**

Stop the server.

- [ ] **Step 7.4: Commit**

```bash
git add src/Dispatcher.js src/main.js
git commit -m "feat: Dispatcher with closest algorithm and FIFO queue"
```

---

## Task 8: `Building` class (bootstrap refactor)

**Files:**
- Create: `src/Building.js`
- Modify: `src/main.js` (now a thin entry point)

- [ ] **Step 8.1: Create `src/Building.js`**

Full contents:
```js
import { FLOORS, ELEVATORS } from './config.js';
import { CallButton } from './CallButton.js';
import { Elevator } from './Elevator.js';
import { Dispatcher } from './Dispatcher.js';

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  return tpl.content.firstElementChild.cloneNode(true);
}

function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function floorName(f) {
  return f === 0 ? 'Ground' : `${f}${ordinalSuffix(f)}`;
}

export class Building {
  constructor(rootElement) {
    this.root = rootElement;
    this.dispatcher = new Dispatcher();
    this.elevators = [];
    this.buttons = [];

    this._buildDom();
    this.dispatcher.setActors(this.elevators, this.buttons);
  }

  _buildDom() {
    const labels = document.createElement('div'); labels.className = 'building__labels';
    const shafts = document.createElement('div'); shafts.className = 'building__shafts';
    const calls  = document.createElement('div'); calls.className  = 'building__calls';

    for (let f = 0; f < FLOORS; f++) {
      const label = cloneTemplate('floor-label-template');
      label.textContent = floorName(f);
      labels.appendChild(label);

      const callRow = cloneTemplate('call-row-template');
      callRow.dataset.floor = String(f);
      calls.appendChild(callRow);
      this.buttons[f] = new CallButton(f, this.dispatcher, callRow);
    }

    for (let i = 0; i < ELEVATORS; i++) {
      const shaft = cloneTemplate('shaft-template');
      shaft.dataset.elevatorId = String(i);
      shafts.appendChild(shaft);
      this.elevators.push(new Elevator(i, this.dispatcher, {}));
    }

    this.root.appendChild(labels);
    this.root.appendChild(shafts);
    this.root.appendChild(calls);

    this.elevators.forEach((e, i) => e.attach(shafts.children[i]));
  }
}
```

- [ ] **Step 8.2: Simplify `src/main.js`**

Replace full contents:
```js
import './styles/main.scss';
import { Building } from './Building.js';

const root = document.querySelector('.building');
new Building(root);
```

- [ ] **Step 8.3: Manual verification**

Run:
```bash
npm run dev
```
Expected: identical behavior to Task 7. Everything keeps working — the refactor doesn't change behavior. Make a call and confirm the elevator travels, arrives, and returns to Call.

Stop the server.

- [ ] **Step 8.4: Commit**

```bash
git add src/Building.js src/main.js
git commit -m "refactor: extract Building.js as bootstrap"
```

---

## Task 9: Live wait-time display during `waiting`

**Files:**
- Modify: `src/Dispatcher.js`

- [ ] **Step 9.1: Add the time ticker to the Dispatcher**

Edit `src/Dispatcher.js`. Change the first import line to:
```js
import { formatTime } from './format.js';
import { TIME_REFRESH_MS } from './config.js';
```

Add at the end of the `constructor`, after initializing properties, this line:
```js
this._startTicker();
```

Add as a new method of the class (after `_pickClosest`):
```js
_startTicker() {
  setInterval(() => this._tick(), TIME_REFRESH_MS);
}

_tick() {
  const now = performance.now();
  for (const [elevator, call] of this.activeCalls) {
    if (elevator.state === 'moving') {
      this.buttons[call.floor].timeEl.textContent = formatTime(now - call.startTime);
    }
  }
}
```

Note: `_tick` only updates floors whose calls are in `moving` state (visible waiting). The `arrived` ones stay frozen — `onArrival` already set the final text and nobody touches it.

- [ ] **Step 9.2: Manual verification**

Run:
```bash
npm run dev
```
Expected:
- Call floor 9 from Ground (distance 9 × 800ms = 7.2s).
- While the elevator goes up, the time span at floor 9 shows "0 sec", "1 sec", "2 sec"... advancing every second.
- On arrival, the span freezes at the final time (~ "7 sec").
- After 2s it goes back to empty.

Stop the server.

- [ ] **Step 9.3: Commit**

```bash
git add src/Dispatcher.js
git commit -m "feat: live wait time display"
```

---

## Task 10: Sound on arrival

**Files:**
- Create: `public/ding.wav` (placeholder — user replaces)
- Modify: `src/Dispatcher.js`

- [ ] **Step 10.1: Get a placeholder ding**

The user should place a short `ding.wav` file at `public/ding.wav`. If they don't have one, quick options:

- Download a free one from freesound.org searching "elevator ding" or "bell short".
- Generate one with an oscillator in any DAW.

To avoid blocking development, create an empty placeholder:
```bash
touch public/ding.wav
```
This keeps the URL valid (no 404) even if no sound plays. Replace the file later.

- [ ] **Step 10.2: Instantiate `Audio` in the Dispatcher**

Edit `src/Dispatcher.js`.

In the `constructor`, add before `this._startTicker();`:
```js
this.ding = new Audio('/ding.wav');
```

In `onArrival`, add as the first line after the validation:
```js
this.ding.currentTime = 0;
this.ding.play().catch(() => { /* autoplay denied or empty file */ });
```

The `.catch(() => {})` avoids an unhandled promise rejection if the file is empty or the browser blocks it (it shouldn't, because there's user gesture, but it's defensive).

- [ ] **Step 10.3: Manual verification**

Run:
```bash
npm run dev
```
Expected:
- If `ding.wav` has valid content: ding plays on each elevator arrival.
- If empty: no sound plays, but nothing breaks either (no console errors beyond a caught DEBUG of failed Audio).

Stop the server.

- [ ] **Step 10.4: Commit**

```bash
git add src/Dispatcher.js public/ding.wav
git commit -m "feat: ding on arrival"
```

---

## Task 11: Polish + final E2E checklist

**Files:**
- Modify: `public/elevator.svg` (user replaces with the Drive one if available)
- Modify: any SCSS adjustment needed after visual inspection

- [ ] **Step 11.1: Replace the elevator SVG**

The user should download the SVG provided by the brief from:
```
https://drive.google.com/file/d/1I9Mvf3DqCvKjtkkCVyo9Z7wUXq_NgO4m/view?usp=sharing
```
and place it at `public/elevator.svg`, replacing the placeholder created in Task 4.

If the provided SVG has its own `fill="..."`, the `filter: brightness(0)` in the SCSS may be inadequate. In that case, adjust `src/styles/_elevator.scss` removing the filters and using the SVG's native colors.

- [ ] **Step 11.2: Replace `public/ding.wav` with a real sound**

Replace the empty file from Task 10 with a real short wav.

- [ ] **Step 11.3: Final E2E checklist**

Run:
```bash
npm run dev
```

Verify one by one (check mentally):

1. **Initial render:** building with 10 floors, 5 elevators at Ground, 10 green "Call" buttons on the right. No errors in console.
2. **Simple call:** click floor 5 → button changes to red "Waiting" → elevator 0 rides up smoothly → on arrival the ding plays → button changes to green "Arrived" with border and shows "X sec" → after 2s back to green "Call".
3. **Live time:** during the trip to floor 5, the second counter ticks up every 1s.
4. **Double-click protected:** click twice on the same button → the second does nothing.
5. **Closest assignment:** after the first call, call floor 6 → the closest idle one should respond.
6. **FIFO queue:** call 5 distinct floors quickly → all 5 elevators start. Call 0 and 1 → they queue up. As the 5 finish, the ones returning to idle take queued calls IN ORDER (0 before 1).
7. **Multiple trips to the same elevator:** click floor 9, wait for it to arrive and return to idle. Click floor 0. The same elevator should ride down to Ground.
8. **Elevator visual state:** during movement it looks different (red) than idle (black) than arrived (green). If the SVG has its own fill, states may differ in another way — adjust SCSS if needed.
9. **Sound:** the ding plays every time an elevator arrives (if the wav has content).

- [ ] **Step 11.4: Create minimal README for the defense**

Create `README.md` in the project root:
```markdown
# Elevators

Implementation of Origami's home task: elevator system simulation with 10 floors and 5 elevators.

## Run

```bash
npm install
npm run dev
```

Opens `http://localhost:5173` automatically.

## Spec and plan

- Design: `docs/superpowers/specs/2026-06-17-elevators-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-17-elevators-implementation.md`

## Architecture at a glance

Four classes with direct coupling by reference:

- `Building` — bootstrap; instantiates and wires.
- `Dispatcher` — brain; receives calls, assigns by proximity, FIFO queue if all busy, coordinates the visual lifecycle.
- `Elevator` — entity; `idle`/`moving`/`arrived` state, movement with CSS transition, notifies the Dispatcher in `onArrival` and `onIdle`.
- `CallButton` — UI; click → `dispatcher.requestElevator(floor)`, `setState` method to reflect state.

## Key decisions

See §13 of the spec for the full list of "expected questions in the defense + answers".
```

- [ ] **Step 11.5: Final commit**

```bash
git add public/elevator.svg public/ding.wav README.md src/styles/
git commit -m "feat: real assets + README + polish adjustments"
```

---

## Self-Review

Final pass through the plan against the spec:

**Spec coverage:**

- §1 V1 scope — covered by Tasks 4 (skeleton), 5 (button), 6 (elevator), 7 (dispatcher), 9 (time), 10 (sound).
- §2 Stack — Task 1.
- §3 File structure — Tasks 1-11.
- §4 HTML templates — Task 4.
- §5 Architecture (4 classes + direct coupling) — Tasks 5, 6, 7, 8.
- §6 Algorithm — Task 7.
- §7 Lifecycle + timing — Task 6.
- §8 Time display — Task 9.
- §9 Layout and SCSS — Tasks 2, 4.
- §10 Sound — Task 10.
- §11 V2 hooks — `Elevator` receives `config = {}` (Task 6). The rest is documented in the spec; V1 has no code for these.
- §12 Do not — respected: no tests, no TS, no SCAN/LOOK, no reassignment.
- §13 Defense — README in Task 11.4 redirects to the spec.

**No placeholders:** reviewed the 11 tasks. There is no "TODO", "implement later", or "similar to Task N". The full code of each file is in the step where it's created/edited.

**Type consistency:**
- `Dispatcher.requestElevator(floor)` — Task 5 (call), Task 7 (def).
- `Dispatcher.onArrival(elevator, durationMs)` and `Dispatcher.onIdle(elevator)` — Task 6 (call), Task 7 (def).
- `Elevator.goTo(floor)` and `Elevator.rest()` — Task 6 (def), Task 7 (call).
- `Elevator.attach(shaftElement)` — Task 6 (def), Task 7 + 8 (call).
- `CallButton.setState(state, timeText)` — Task 5 (def), Task 7 + 9 (call).
- `CallButton.timeEl` — accessed in Task 9 directly; defined in Task 5 constructor.
- `Elevator.state` and `CallButton.state` — used in Dispatcher (Task 7) for filtering and guards; consistent with definition.

All consistent.
