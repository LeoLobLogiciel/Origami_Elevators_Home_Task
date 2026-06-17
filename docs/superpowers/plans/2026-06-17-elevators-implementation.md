# Elevators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el sistema de elevadores descrito en `docs/superpowers/specs/2026-06-17-elevators-design.md` — V1 con 10 pisos, 5 elevadores, cola FIFO, movimiento suave y display de tiempo de espera.

**Architecture:** Vanilla JS con módulos ES. Cuatro clases (`Building`, `Dispatcher`, `Elevator`, `CallButton`) con acoplamiento directo por referencia. SCSS modular con BEM. Templates HTML5 + clonado para el markup. CSS transition para el movimiento. `performance.now()` para medir tiempo. `HTMLAudioElement` para el ding.

**Tech Stack:** Vanilla JS (ES modules), SCSS, Vite (dev server + SCSS compiler), sin dependencias runtime.

**Sobre tests:** el spec decide no incluir tests automatizados en V1 (decisión explícita §12 del spec). Cada task termina con un paso de **verificación manual** que reemplaza el ciclo TDD por un ciclo de validación visual/funcional en el browser. Esto es intencional, no un olvido.

---

## File Structure (locked in by spec §3)

```
elevators/
├── .gitignore
├── package.json
├── vite.config.js
├── index.html              # markup raíz + <template> de elevator y call-row
├── public/
│   ├── elevator.svg        # placeholder en V1; usuario reemplaza con el del Drive
│   └── ding.mp3            # placeholder en V1; usuario reemplaza con sonido real
└── src/
    ├── main.js             # entry point — instancia Building
    ├── config.js           # FLOORS, ELEVATORS, FLOOR_DURATION_MS, REST_MS
    ├── Building.js         # bootstrap + wiring
    ├── Dispatcher.js       # cola + algoritmo + setInterval de tiempo
    ├── Elevator.js         # lifecycle + movimiento CSS
    ├── CallButton.js       # UI del botón + setState
    ├── format.js           # formatTime(ms)
    └── styles/
        ├── main.scss
        ├── _variables.scss
        ├── _layout.scss
        ├── _floors.scss
        ├── _elevator.scss
        └── _button.scss
```

11 tasks. Cada una produce código verificable independientemente. Commit al final de cada task.

---

## Task 1: Bootstrap del proyecto

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`

- [ ] **Step 1.1: Inicializar git**

Run en el working directory:
```bash
git init
git add docs/
git commit -m "chore: include design spec"
```
Expected: commit creado con el spec dentro.

- [ ] **Step 1.2: Crear `.gitignore`**

Contenido completo:
```
node_modules/
dist/
.DS_Store
*.log
.vite/
```

- [ ] **Step 1.3: Crear `package.json`**

Contenido completo:
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

- [ ] **Step 1.4: Crear `vite.config.js`**

Contenido completo:
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

- [ ] **Step 1.5: Crear `index.html` con esqueleto mínimo**

Contenido completo:
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

- [ ] **Step 1.6: Crear `src/main.js` placeholder**

Contenido completo:
```js
console.log('Elevators boot');
```

- [ ] **Step 1.7: Instalar dependencias y verificar**

Run:
```bash
npm install
npm run dev
```
Expected: Vite arranca, browser abre `http://localhost:5173`, se ve "Elevator Exercise" como título y en consola "Elevators boot". Cortar el server con Ctrl+C.

- [ ] **Step 1.8: Commit**

```bash
git add .gitignore package.json package-lock.json vite.config.js index.html src/main.js
git commit -m "chore: bootstrap vite + module entry point"
```

---

## Task 2: Config + SCSS base con variables y layout vacío

**Files:**
- Create: `src/config.js`
- Create: `src/styles/main.scss`
- Create: `src/styles/_variables.scss`
- Create: `src/styles/_layout.scss`
- Modify: `src/main.js` (importar el SCSS)
- Modify: `index.html` (placeholder se ve)

- [ ] **Step 2.1: Crear `src/config.js` con constantes**

Contenido completo:
```js
export const FLOORS = 10;
export const ELEVATORS = 5;
export const FLOOR_DURATION_MS = 800;
export const REST_MS = 2000;
export const TIME_REFRESH_MS = 1000;
```

- [ ] **Step 2.2: Crear `src/styles/_variables.scss`**

Contenido completo:
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

- [ ] **Step 2.3: Crear `src/styles/_layout.scss`**

Contenido completo:
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

Nota: `column-reverse` para labels y calls porque el piso 0 (Ground) va abajo y el 9° va arriba. Los datos los iteramos 0..9 pero visualmente quedan al revés.

- [ ] **Step 2.4: Crear `src/styles/main.scss` como entry**

Contenido completo:
```scss
@use 'variables';
@use 'layout';
```

- [ ] **Step 2.5: Importar SCSS desde `src/main.js`**

Reemplazar contenido completo de `src/main.js`:
```js
import './styles/main.scss';

console.log('Elevators boot');
```

- [ ] **Step 2.6: Verificación manual**

Run:
```bash
npm run dev
```
Expected:
- La página se carga con fondo gris claro (`#ebebeb`).
- El título "Elevator Exercise" se ve centrado.
- No hay errores en consola.

Cortar el server.

- [ ] **Step 2.7: Commit**

```bash
git add src/config.js src/styles/ src/main.js
git commit -m "feat: scss base con variables y layout vacío"
```

---

## Task 3: `format.js` con helper de tiempo

**Files:**
- Create: `src/format.js`
- Modify: `src/main.js` (verificación rápida en consola)

- [ ] **Step 3.1: Crear `src/format.js`**

Contenido completo:
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

- [ ] **Step 3.2: Verificar en consola**

Reemplazar el contenido de `src/main.js` temporalmente:
```js
import './styles/main.scss';
import { formatTime } from './format.js';

console.log(formatTime(5000));     // esperado: "5 sec"
console.log(formatTime(42500));    // esperado: "42 sec"
console.log(formatTime(60000));    // esperado: "1 min. 0 sec."
console.log(formatTime(90000));    // esperado: "1 min. 30 sec."
console.log(formatTime(125400));   // esperado: "2 min. 5 sec."
```

Run:
```bash
npm run dev
```
Expected: en la consola del browser aparecen los 5 valores como se indica arriba. Sin errores.

Cortar el server.

- [ ] **Step 3.3: Volver `src/main.js` a su estado base**

Reemplazar contenido de `src/main.js`:
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

## Task 4: Templates HTML + esqueleto del building renderizado (sin clases)

Este task agrega los `<template>` y el código de clonado mínimo, sin clases todavía. El objetivo es ver el grid del building (10 filas × 5 columnas + labels + botones inertes) renderizado en pantalla.

**Files:**
- Modify: `index.html`
- Create: `src/styles/_floors.scss`
- Create: `src/styles/_elevator.scss`
- Create: `src/styles/_button.scss`
- Modify: `src/styles/main.scss`
- Modify: `src/main.js`

- [ ] **Step 4.1: Reemplazar contenido completo de `index.html`**

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

- [ ] **Step 4.2: Crear `src/styles/_floors.scss`**

Contenido completo:
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

- [ ] **Step 4.3: Crear `src/styles/_elevator.scss`**

Contenido completo:
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

Nota: los `filter` son una forma rápida de tintar el SVG cuando se carga como `<img>`. Si el SVG provisto tiene fill propio, esto se ajusta en Task 11 (polish).

- [ ] **Step 4.4: Crear `src/styles/_button.scss`**

Contenido completo:
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

- [ ] **Step 4.5: Actualizar `src/styles/main.scss`**

Reemplazar contenido completo:
```scss
@use 'variables';
@use 'layout';
@use 'floors';
@use 'elevator';
@use 'button';
```

- [ ] **Step 4.6: Crear elevator.svg placeholder**

Crear `public/elevator.svg` con contenido completo (cuadrado simple — vas a reemplazarlo con el del Drive después):
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 52">
  <rect x="2" y="2" width="28" height="48" fill="currentColor" stroke="#000" stroke-width="2"/>
  <line x1="16" y1="2" x2="16" y2="50" stroke="#fff" stroke-width="1"/>
</svg>
```

- [ ] **Step 4.7: Reemplazar `src/main.js` con clonado de templates**

Contenido completo:
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

- [ ] **Step 4.8: Verificación manual**

Run:
```bash
npm run dev
```
Expected:
- Se ve un edificio centrado en la pantalla.
- Columna izquierda: labels "9th, 8th, 7th, 6th, 5th, 4th, 3rd, 2nd, 1st, Ground" (de arriba a abajo).
- Centro: 5 carriles verticales (shafts) con un cuadradito negro en la base de cada uno.
- Columna derecha: 10 botones verdes que dicen "Call" alineados con los pisos.
- Los clicks en los botones no hacen nada (no hay lógica aún).
- No hay errores en consola.

Cortar el server.

- [ ] **Step 4.9: Commit**

```bash
git add index.html src/main.js src/styles/ public/elevator.svg
git commit -m "feat: render skeleton del building con templates"
```

---

## Task 5: Clase `CallButton`

**Files:**
- Create: `src/CallButton.js`
- Modify: `src/main.js` (instanciar y verificar manualmente)

- [ ] **Step 5.1: Crear `src/CallButton.js`**

Contenido completo:
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

- [ ] **Step 5.2: Verificación manual con dispatcher fake**

Reemplazar `src/main.js` temporalmente para verificar `CallButton` en aislamiento:
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
- Cada clic en un botón "Call" lo cambia a rojo "Waiting".
- Otro clic lo cambia a "Arrived" (blanco con borde verde) y aparece "3 sec" en la columna de tiempo.
- Otro clic lo vuelve a "Call" verde, el tiempo se vacía.
- Console: cada clic loguea `requestElevator <floor>`.

Cortar el server.

- [ ] **Step 5.3: Commit (sin volver main.js — lo dejamos así porque Task 6 lo va a refactor de nuevo)**

```bash
git add src/CallButton.js src/main.js
git commit -m "feat: CallButton con estados y verificación manual"
```

---

## Task 6: Clase `Elevator` con movimiento CSS

**Files:**
- Create: `src/Elevator.js`
- Modify: `src/main.js` (verificación manual del movimiento)

- [ ] **Step 6.1: Crear `src/Elevator.js`**

Contenido completo:
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

Nota: el `if (distance === 0)` cubre el caso "llamada al mismo piso donde el elevador ya está". CSS no dispara `transitionend` si no hay cambio de transform → forzamos con `setTimeout(0)`.

- [ ] **Step 6.2: Verificación manual con dispatcher fake**

Reemplazar `src/main.js` temporalmente:
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
- Click en "Call" del piso 5: el primer elevador sube suavemente al piso 5 (~4 segundos).
- Al llegar, botón pasa a "Arrived" con un tiempo (ej "4 sec"), el elevador queda 2 segundos.
- Después de 2s el botón vuelve a "Call".
- Click en otros pisos sigue funcionando, agarrando un elevador idle.
- Si todos están ocupados, en consola aparece "no idle" y el botón no cambia (esto es el bug que arregla el Dispatcher real).

Cortar el server.

- [ ] **Step 6.3: Commit**

```bash
git add src/Elevator.js src/main.js
git commit -m "feat: Elevator con movimiento CSS y lifecycle"
```

---

## Task 7: Clase `Dispatcher` con algoritmo y cola

**Files:**
- Create: `src/Dispatcher.js`
- Modify: `src/main.js` (usar el Dispatcher real)

- [ ] **Step 7.1: Crear `src/Dispatcher.js`**

Contenido completo (sin sonido ni timer de display todavía — eso entra en tasks 9 y 10):
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

- [ ] **Step 7.2: Reemplazar `src/main.js` con el wiring usando Dispatcher real**

Contenido completo:
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

- [ ] **Step 7.3: Verificación manual del algoritmo y la cola**

Run:
```bash
npm run dev
```
Cosas a verificar (probar en este orden):

1. **Asignación más cercana:** llamar al piso 0 (Ground). Debería responder el primer elevador (todos están en Ground inicialmente; desempate por menor índice → el 0).
2. **Cuando un elevador está en otro piso:** después de la primera llamada, llamar al piso 9 mientras el primer elevador está volviendo o ya en algún piso intermedio. Debería responder el más cercano libre.
3. **Cola FIFO:** llamar a 5 pisos distintos en rápida sucesión (5, 7, 3, 9, 1). Los 5 elevadores arrancan, cada uno a un piso. Llamar al piso 0 y al piso 2 mientras todos viajan. Esos quedan encolados. Al ir terminando, los elevadores que vuelven a `idle` toman las llamadas de la cola en orden (0 primero, luego 2).
4. **Doble click protegido:** clickear dos veces seguidas el mismo botón Call. La segunda no debería hacer nada (el botón ya está en `waiting`).
5. **No hay errores en consola.**

Cortar el server.

- [ ] **Step 7.4: Commit**

```bash
git add src/Dispatcher.js src/main.js
git commit -m "feat: Dispatcher con algoritmo más cercano y cola FIFO"
```

---

## Task 8: Clase `Building` (refactor del bootstrap)

**Files:**
- Create: `src/Building.js`
- Modify: `src/main.js` (queda como entry point delgado)

- [ ] **Step 8.1: Crear `src/Building.js`**

Contenido completo:
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

- [ ] **Step 8.2: Simplificar `src/main.js`**

Reemplazar contenido completo:
```js
import './styles/main.scss';
import { Building } from './Building.js';

const root = document.querySelector('.building');
new Building(root);
```

- [ ] **Step 8.3: Verificación manual**

Run:
```bash
npm run dev
```
Expected: comportamiento idéntico al Task 7. Todo sigue funcionando — el refactor no cambia behavior. Hacer una llamada y confirmar que el elevador viaja, llega y vuelve a Call.

Cortar el server.

- [ ] **Step 8.4: Commit**

```bash
git add src/Building.js src/main.js
git commit -m "refactor: extraer Building.js como bootstrap"
```

---

## Task 9: Display del tiempo en vivo durante `waiting`

**Files:**
- Modify: `src/Dispatcher.js`

- [ ] **Step 9.1: Agregar el ticker de tiempo al Dispatcher**

Editar `src/Dispatcher.js`. Cambiar la primera línea de imports a:
```js
import { formatTime } from './format.js';
import { TIME_REFRESH_MS } from './config.js';
```

Agregar al final del `constructor`, después de inicializar las propiedades, esta línea:
```js
this._startTicker();
```

Agregar como método nuevo de la clase (después de `_pickClosest`):
```js
_startTicker() {
  setInterval(() => this._tick(), TIME_REFRESH_MS);
}

_tick() {
  const now = performance.now();
  for (const [elevator, call] of this.activeCalls) {
    if (elevator.state === 'moving') {
      this.buttons[call.floor].setState('waiting');
      this.buttons[call.floor].timeEl.textContent = formatTime(now - call.startTime);
    }
  }
}
```

Nota: el `_tick` solo actualiza pisos cuyas llamadas están en estado `moving` (waiting visible). Los `arrived` quedan congelados — `onArrival` ya seteó el texto final y nadie lo toca.

Hay un detalle: estamos llamando `setState('waiting')` cada tick, lo cual reescribe el texto del botón. Para evitar borrar el `timeText`, mejoremos `setState` no tocar `timeEl` si se llama con `timeText` vacío y el estado no cambió. Pero más simple: solo actualizar el span de tiempo directamente.

Refactor: dejar `_tick` así:
```js
_tick() {
  const now = performance.now();
  for (const [elevator, call] of this.activeCalls) {
    if (elevator.state === 'moving') {
      this.buttons[call.floor].timeEl.textContent = formatTime(now - call.startTime);
    }
  }
}
```

El `setState('waiting')` original (en `requestElevator`) ya dejó el botón en estado correcto; el tick solo refresca el texto del tiempo. El `setState('arrived', ...)` final, cuando llega, sobreescribe ese texto con el valor congelado.

- [ ] **Step 9.2: Verificación manual**

Run:
```bash
npm run dev
```
Expected:
- Llamar al piso 9 desde el Ground (distancia 9 × 800ms = 7.2s).
- Mientras el elevador sube, el span de tiempo del piso 9 muestra "0 sec", "1 sec", "2 sec"… avanzando cada segundo.
- Al llegar, el span se congela con el tiempo final (~ "7 sec").
- Después de 2s vuelve a vacío.

Cortar el server.

- [ ] **Step 9.3: Commit**

```bash
git add src/Dispatcher.js
git commit -m "feat: display del tiempo de espera en vivo"
```

---

## Task 10: Sonido al llegar

**Files:**
- Create: `public/ding.mp3` (placeholder — el usuario reemplaza)
- Modify: `src/Dispatcher.js`

- [ ] **Step 10.1: Conseguir un ding placeholder**

El usuario debe colocar un archivo `ding.mp3` corto en `public/ding.mp3`. Si no tiene uno, opciones rápidas:

- Descargar uno gratuito de freesound.org buscando "elevator ding" o "bell short".
- Generar uno con un oscilador en cualquier DAW.

Para no bloquear el desarrollo, crear un placeholder vacío:
```bash
touch public/ding.mp3
```
Esto deja la URL válida (no 404) aunque el sonido no se escuche. Más tarde reemplazar el archivo.

- [ ] **Step 10.2: Instanciar `Audio` en el Dispatcher**

Editar `src/Dispatcher.js`.

En el `constructor`, agregar antes de `this._startTicker();`:
```js
this.ding = new Audio('/ding.mp3');
```

En el método `onArrival`, agregar como primera línea después de la validación:
```js
this.ding.currentTime = 0;
this.ding.play().catch(() => { /* autoplay denied or empty file */ });
```

El `.catch(() => {})` evita una unhandled promise rejection si el archivo está vacío o si el browser bloqueó (no debería, porque hay user gesture, pero es defensivo).

- [ ] **Step 10.3: Verificación manual**

Run:
```bash
npm run dev
```
Expected:
- Si `ding.mp3` tiene contenido válido: suena al llegar cada elevador.
- Si está vacío: no suena nada, pero tampoco rompe nada (sin errores en consola más allá del DEBUG de Audio fallido, que está catcheado).

Cortar el server.

- [ ] **Step 10.4: Commit**

```bash
git add src/Dispatcher.js public/ding.mp3
git commit -m "feat: ding al llegar"
```

---

## Task 11: Polish + checklist E2E final

**Files:**
- Modify: `public/elevator.svg` (el usuario reemplaza con el del Drive si lo tiene)
- Modify: cualquier ajuste de SCSS según hace falta tras la inspección visual

- [ ] **Step 11.1: Reemplazar el SVG del elevador**

El usuario debe descargar el SVG provisto en la consigna desde:
```
https://drive.google.com/file/d/1I9Mvf3DqCvKjtkkCVyo9Z7wUXq_NgO4m/view?usp=sharing
```
y colocarlo en `public/elevator.svg`, reemplazando el placeholder creado en Task 4.

Si el SVG provisto tiene `fill="..."` propio, el `filter: brightness(0)` del SCSS puede ser inadecuado. En ese caso, ajustar `src/styles/_elevator.scss` removiendo los filters y usando colores nativos del SVG.

- [ ] **Step 11.2: Reemplazar `public/ding.mp3` con un sonido real**

Reemplazar el archivo vacío de Task 10 por un mp3 corto real.

- [ ] **Step 11.3: Checklist E2E final**

Run:
```bash
npm run dev
```

Verificar uno por uno (marcar mentalmente):

1. **Render inicial:** edificio con 10 pisos, 5 elevadores en Ground, 10 botones "Call" verdes a la derecha. Sin errores en consola.
2. **Llamada simple:** click en piso 5 → botón pasa a "Waiting" rojo → elevador 0 sube suavemente → al llegar suena el ding → botón pasa a "Arrived" verde con borde y muestra "X sec" → pasados 2s vuelve a "Call" verde.
3. **Tiempo en vivo:** durante el viaje al piso 5, el número de segundos se va incrementando cada 1s.
4. **Doble click protegido:** click dos veces seguidas en el mismo botón → la segunda no hace nada.
5. **Asignación más cercana:** después de la primera llamada, llamar al piso 6 → debería responder el más cercano libre.
6. **Cola FIFO:** llamar a 5 pisos distintos rápido → los 5 elevadores arrancan. Llamar al 0 y al 1 → quedan encolados. Al ir terminando los 5, los que vuelven a idle toman las llamadas encoladas EN ORDEN (0 antes que 1).
7. **Múltiples viajes al mismo elevador:** click en piso 9, esperar que llegue y vuelva a idle. Click en piso 0. El mismo elevador debería bajar a Ground.
8. **Estado visual del elevador:** durante movimiento se ve diferente (rojo) que en idle (negro) que en arrived (verde). Si el SVG tiene fill propio, los estados pueden distinguirse de otra forma — ajustar SCSS si hace falta.
9. **Sonido:** se escucha el ding cada vez que un elevador llega (si el mp3 tiene contenido).

- [ ] **Step 11.4: Crear README mínimo para defensa**

Crear `README.md` en la raíz del proyecto:
```markdown
# Elevators

Implementación del home task de Origami: simulación de sistema de elevadores con 10 pisos y 5 ascensores.

## Run

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` automáticamente.

## Spec y plan

- Diseño: `docs/superpowers/specs/2026-06-17-elevators-design.md`
- Plan de implementación: `docs/superpowers/plans/2026-06-17-elevators-implementation.md`

## Arquitectura en una mirada

Cuatro clases con acoplamiento directo por referencia:

- `Building` — bootstrap; instancia y cablea.
- `Dispatcher` — cerebro; recibe llamadas, asigna por cercanía, encola FIFO si todos ocupados, coordina el lifecycle visual.
- `Elevator` — entidad; estado `idle`/`moving`/`arrived`, movimiento con CSS transition, notifica al Dispatcher en `onArrival` y `onIdle`.
- `CallButton` — UI; click → `dispatcher.requestElevator(floor)`, método `setState` para reflejar estado.

## Decisiones clave

Ver §13 del spec para el listado completo de "preguntas esperadas en defensa + respuestas".
```

- [ ] **Step 11.5: Commit final**

```bash
git add public/elevator.svg public/ding.mp3 README.md src/styles/
git commit -m "feat: assets reales + README + ajustes de polish"
```

---

## Self-Review

Recorrida final del plan vs el spec:

**Coverage del spec:**

- §1 Alcance V1 — cubierto por Tasks 4 (skeleton), 5 (button), 6 (elevator), 7 (dispatcher), 9 (tiempo), 10 (sonido).
- §2 Stack — Task 1.
- §3 Estructura de archivos — Tasks 1-11.
- §4 Templates HTML — Task 4.
- §5 Arquitectura (4 clases + acoplamiento directo) — Tasks 5, 6, 7, 8.
- §6 Algoritmo — Task 7.
- §7 Lifecycle + temporización — Task 6.
- §8 Display de tiempo — Task 9.
- §9 Layout y SCSS — Tasks 2, 4.
- §10 Sonido — Task 10.
- §11 Hooks V2 — `Elevator` recibe `config = {}` (Task 6). El resto queda en documentación del spec; en V1 no hay código.
- §12 No hacer — respetado: sin tests, sin TS, sin SCAN/LOOK, sin reasignación.
- §13 Defensa — el README en Task 11.4 redirige al spec.

**Sin placeholders:** revisé las 11 tasks. No hay "TODO", "implementar después" ni "similar a Task N". El código completo de cada archivo está en el step donde se crea/edita.

**Type consistency:**
- `Dispatcher.requestElevator(floor)` — Task 5 (call), Task 7 (def).
- `Dispatcher.onArrival(elevator, durationMs)` y `Dispatcher.onIdle(elevator)` — Task 6 (call), Task 7 (def).
- `Elevator.goTo(floor)` y `Elevator.rest()` — Task 6 (def), Task 7 (call).
- `Elevator.attach(shaftElement)` — Task 6 (def), Task 7 + 8 (call).
- `CallButton.setState(state, timeText)` — Task 5 (def), Task 7 + 9 (call).
- `CallButton.timeEl` — accedido en Task 9 directamente; está definido en Task 5 constructor.
- `Elevator.state` y `CallButton.state` — usados en Dispatcher (Task 7) para filtrado y guard; coinciden con definición.

Todo cierra.
