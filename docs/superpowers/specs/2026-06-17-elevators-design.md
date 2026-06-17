# Home Task — Elevators (Origami) — Design Spec

**Date:** 2026-06-17
**Author:** Leo
**Context:** Home task for an interview at Origami. AI-assisted construction is allowed; **the evaluation is in person, without AI**. The code must be understandable and reproducible by the author from memory. The role uses Vue.

---

## 1. V1 Scope

Single-page elevator system.

- 10 floors (Ground Floor + 1st to 9th).
- 5 elevators, each in its own vertical shaft.
- 1 Call button per floor in a column on the right.
- Button visual states: `call` (green), `waiting` (red), `arrived` (green with border).
- Elevator visual states: `idle` (black), `moving` (red), `arrived` (green).
- Smooth movement between floors.
- Sound when arriving at the destination floor.
- FIFO queue when all elevators are busy (no calls dropped).
- Display of the caller's wait time, live during `waiting`, frozen during `arrived`.

**In V1 scope** (in addition to the above): a focused unit-test suite covering the time formatter (`formatTime`) and the closest-elevator algorithm (`pickClosest`). Basic accessibility: real `<button>` elements with `aria-label`, `aria-live` on the time cells, `disabled` on buttons while a call is in flight.

**Out of V1 scope:** integration/E2E tests, TypeScript, SCAN/LOOK algorithm, dynamic reassignment, persistence, exhaustive ARIA. The future features described in §11 are sketched at the design level but no code hooks are pre-installed (YAGNI).

## 2. Stack

- **Vanilla JS** (native ES modules, no frameworks).
- **SCSS** with BEM methodology.
- **Vite** as dev server and SCSS compiler.
- **Vitest** for focused unit tests (dev-only).
- **No runtime libraries** — the production bundle contains only the project's own JS and CSS.

Rationale: the brief asks for Vanilla. SCSS is suggested by the brief and familiar to the author from Vue. Vite is the standard tool in the Vue ecosystem, has minimal setup, and only adds SCSS compilation and a dev server.

## 3. File structure

```
elevators/
├── index.html              # root markup + <template>s for shaft, time-cell, call-row, floor-label
├── package.json
├── vite.config.js
├── vitest.config.js
├── public/
│   ├── ding.wav            # short arrival sound (freesound.org)
│   └── favicon.svg         # elevator-buttons favicon
└── src/
    ├── main.js             # entry point
    ├── config.js           # constants
    ├── algorithm.js        # pure functions (pickClosest)
    ├── Building.js         # bootstrap + wiring + DOM scaffolding
    ├── Dispatcher.js       # queue + algorithm + audio + live timer
    ├── Elevator.js         # lifecycle + movement + trip-time measurement
    ├── CallButton.js       # button UI + state + time display
    ├── format.js           # ms → "5 sec" / "1 min. 30 sec."
    └── styles/
        ├── main.scss       # @use of partials
        ├── _variables.scss # colors, dims, --floor-height (custom property)
        ├── _layout.scss    # .building, columns, title, responsive
        ├── _floors.scss    # .floor-label
        ├── _elevator.scss  # .shaft (with grid lines) + .shaft__elevator + states
        ├── _times.scss     # .time-cell (per-floor time display)
        └── _button.scss    # .call-row + .call-button + states

test/
├── format.test.js
└── algorithm.test.js
```

**Decision: flat structure, no `core/` or `ui/`.** With 6 JS files, grouping into folders is over-engineering. The filename is the responsibility.

## 4. Markup strategy

Visible markup lives in HTML, not in JS. The `index.html` contains:

- The static skeleton: `<h1>`, the empty `<div class="building">`.
- Four `<template>` elements for the repeating row types: `floor-label`, `shaft` (with the SVG inlined for color control via `currentColor`), `time-cell`, `call-row`.

```html
<template id="shaft-template">
  <div class="shaft">
    <div class="shaft__elevator shaft__elevator--idle">
      <svg fill="currentColor" ...>...</svg>
    </div>
  </div>
</template>

<template id="time-cell-template">
  <div class="time-cell" aria-live="polite"></div>
</template>

<template id="call-row-template">
  <div class="call-row">
    <button type="button" class="call-button call-button--call">Call</button>
  </div>
</template>
```

In `Building._buildDom()`, JS:
- Clones the templates N times to fill the columns.
- Creates three thin container `div`s (`.building__labels`, `.building__shafts`, `.building__times`, `.building__calls`) with `document.createElement` — minimal scaffolding so the cloned children have a parent to live in. No content markup is built from JS.

**Rationale:** the brief's *"No need to build the HTML in JS"* is honored because all visible row markup lives in HTML templates. The four container divs are pure structural scaffolding (no labels, no copy, no SVG). Changing the number of floors or elevators is a one-line constant change.

## 5. Architecture: 4 classes + 1 pattern

### 5.1. Communication pattern

**Direct coupling by reference.** Each class receives in its constructor the references it needs and calls methods directly on them. There is no `EventTarget`, no injected callbacks, no pub/sub.

Rationale: a single pattern across the codebase. Defensible in one sentence: *"each class keeps what it needs and calls methods."* Reproducible on a whiteboard without risk of mixing APIs (`addEventListener`, `dispatchEvent`, `CustomEvent`, `detail`).

### 5.2. Responsibilities

| Class | References received | Responsibility |
|---|---|---|
| `Building` | (none; receives the root DOM) | Instantiates Dispatcher, Elevators, CallButtons. Wires references. It is the bootstrap. |
| `Dispatcher` | (empty at construction; `setActors` afterward) | The system's brain. Receives calls, assigns by proximity, queues if no idle elevators. Coordinates arrivals/idles. Plays the ding. Updates buttons' visual state. Holds the global `setInterval` that refreshes on-screen times. |
| `Elevator` | `id`, `dispatcher` | Domain entity. Holds `currentFloor` and `state` (`idle`/`moving`/`arrived`). Executes movement via CSS transition. Measures trip duration with `performance.now()` and passes it to `dispatcher.onArrival(this, durationMs)`. |
| `CallButton` | `floor`, `dispatcher`, `buttonElement`, `timeElement` | UI for one floor. Captures clicks → `dispatcher.requestElevator(floor)`. Exposes `setState(state)` (changes class, label, `disabled`, and clears the time when state is `call`) and `setTime(text)` (updates the per-floor time cell). Owns its own DOM access; the Dispatcher never touches the elements directly. |

### 5.3. Wiring in `Building`

```js
class Building {
  constructor(rootElement) {
    this.root = rootElement;
    this.dispatcher = new Dispatcher();
    this.elevators = [];
    this.buttons = [];

    this._buildDom();
    this.dispatcher.setActors(this.elevators, this.buttons);
  }

  _buildDom() {
    // Create the four column containers, fill them by cloning templates per floor /
    // per elevator, then append everything to the root.
    // For each floor: a label, a time cell, a call-row; the button + time cell are
    // handed to a CallButton instance.
    // For each elevator: a shaft; the shaft DOM is later passed to elevator.attach().
  }
}
```

The Dispatcher is instantiated first without actors; it receives the arrays after they exist. This avoids an initialization cycle in the constructor.

## 6. Assignment algorithm

### 6.1. Elevator state

Three mutually exclusive states:

- `idle`: not handling any call. Stationary at its last floor.
- `moving`: traveling toward the floor of an assigned call.
- `arrived`: reached the floor, showing confirmation (during `REST_MS`).

An elevator is a candidate for a new call **only when it is `idle`**. The 2 seconds in `arrived` count as busy.

### 6.2. When a call comes in for floor F

```
1. If the button at floor F is already in `waiting`:
   → do nothing (duplicate call ignored)

2. Mark button F as `waiting`. Record startTime = performance.now().

3. Filter elevators with state === 'idle'.

4a. If at least one is idle:
    - Pick the one with the smallest |currentFloor - F|.
    - Tie-break: smallest index.
    - Record activeCalls[elevator] = { floor: F, startTime }.
    - elevator.goTo(F).

4b. If none is idle:
    - queue.push({ floor: F, startTime }).
```

### 6.3. When an elevator arrives (`onArrival(elevator, durationMs)`)

The Elevator has already changed its own state to `arrived` before notifying (see §7.1). The Dispatcher coordinates the external effects and shows the **trip duration** the Elevator just reported.

```
1. floor = activeCalls.get(elevator).floor.
2. Play ding (currentTime = 0; play()).
3. button[floor].setState('arrived')             // visual state, also disables the button.
4. button[floor].setTime(formatTime(durationMs)) // the actual time the elevator took to get here.
5. elevator.rest() → the Elevator starts its setTimeout(REST_MS) and will notify onIdle when it expires.
```

### 6.4. When an elevator becomes idle (`onIdle(elevator)`)

```
1. floor = activeCalls.get(elevator).floor.
2. button[floor].setState('call').
3. activeCalls.delete(elevator).
4. If queue is not empty:
   - next = queue.shift().
   - activeCalls.set(elevator, next).
   - elevator.goTo(next.floor).
```

**Why queue assignment happens in `onIdle` and not in `onArrival`:** during the 2 seconds in `arrived` the elevator is visually confirming arrival. Taking another call at that moment would break the cycle. The cost is 2 seconds of latency, which is acceptable.

**Why FIFO and not "closest to the freed elevator":** "no calls dropped" implies respecting arrival order. Reordering by proximity when an elevator frees up could indefinitely postpone the first caller (starvation).

## 7. Elevator lifecycle and timing

### 7.1. Movement

CSS transition on `transform: translateY(...)`. Duration is dynamic via CSS custom property.

```scss
.shaft__elevator {
  position: absolute;
  bottom: 0;
  transition: transform var(--travel-duration, 0ms) ease-in-out;
}
```

```js
goTo(targetFloor) {
  const distance = Math.abs(targetFloor - this.currentFloor);
  const durationMs = distance * FLOOR_DURATION_MS;
  const start = performance.now();

  this.state = 'moving';
  this.element.classList.remove('shaft__elevator--idle', 'shaft__elevator--arrived');
  this.element.classList.add('shaft__elevator--moving');

  this.element.style.setProperty('--travel-duration', `${durationMs}ms`);
  this.element.style.transform = `translateY(${-targetFloor * this.floorHeightPx}px)`;

  this.element.addEventListener('transitionend', () => {
    const elapsedMs = performance.now() - start;
    this.currentFloor = targetFloor;
    this.state = 'arrived';
    this.element.classList.remove('shaft__elevator--moving');
    this.element.classList.add('shaft__elevator--arrived');
    this.dispatcher.onArrival(this, elapsedMs);
  }, { once: true });
}
```

- **`transitionend` with `{ once: true }`**: self-unsubscription, no listener buildup.
- **`performance.now()`** instead of `Date.now()`: monotonic API, doesn't jump with clock changes, sub-millisecond precision.
- **CSS custom property `--travel-duration`**: the duration is set from JS without touching the animation SCSS.

### 7.2. Rest

```js
rest() {
  setTimeout(() => {
    this.state = 'idle';
    this.element.classList.remove('shaft__elevator--arrived');
    this.element.classList.add('shaft__elevator--idle');
    this.dispatcher.onIdle(this);
  }, REST_MS);
}
```

### 7.3. Floor height: source of truth in SCSS

`_variables.scss` defines `--floor-height: 60px` as a custom property on `:root`. JS reads it when each Elevator is constructed:

```js
const v = getComputedStyle(document.documentElement).getPropertyValue('--floor-height');
this.floorHeightPx = parseFloat(v);
```

A single source of truth. If the SCSS is modified, JS picks it up on startup.

## 8. Time display

### 8.1. Semantics

A single `.time-cell` per floor lives in a dedicated column between the shafts and the call buttons. Its content depends on the call's state, with two distinct semantics intentionally compressed into one display:

| Button state | What the time cell shows |
|---|---|
| `call` | empty |
| `waiting` (or queued) | live counter of elapsed wait time since the user pressed Call (updated every 1000ms) |
| `arrived` | the elevator's **trip duration** — `durationMs` measured by the Elevator with `performance.now()`. Frozen for the 2s rest. |

This satisfies both the brief's literal requirement (*"Measure the time it took the elevator to reach the designated floor"* — shown on arrival) and the mockup (which shows live elapsed time on `waiting` rows).

### 8.2. Implementation

A single global `setInterval(TIME_REFRESH_MS)` lives in the `Dispatcher` (id stored as `_tickerId`, cleared by `destroy()`). On each tick it iterates `activeCalls` and the `queue` and calls `button.setTime(formatTime(...))` for floors whose elevator is `moving` or whose call is still queued. Calls in `arrived` are not touched (they keep the trip duration written by `onArrival`).

The Dispatcher never accesses the time DOM element directly — it goes through `CallButton.setTime()`. The encapsulation of the CallButton's DOM is preserved.

### 8.3. Format

`format.js` exports `formatTime(ms)`:

- `< 60_000`: `"5 sec"`, `"42 sec"`.
- `>= 60_000`: `"1 min. 30 sec."`.

Truncation uses `Math.floor` (a stopwatch-like display).

## 9. Layout and SCSS

### 9.1. DOM

```html
<main id="app">
  <h1 class="app-title">Elevator Exercise</h1>
  <div class="building">
    <div class="building__labels">       <!-- floor names "9th" ... "Ground" -->
      <div class="floor-label">9th</div>
      ...
      <div class="floor-label">Ground</div>
    </div>

    <div class="building__shafts">       <!-- 5 vertical shafts -->
      <div class="shaft" data-elevator-id="0">
        <div class="shaft__elevator shaft__elevator--idle">
          <svg fill="currentColor">...</svg>
        </div>
      </div>
      <!-- × ELEVATORS -->
    </div>

    <div class="building__times">        <!-- per-floor time cells -->
      <div class="time-cell" data-floor="9" aria-live="polite"></div>
      ...
    </div>

    <div class="building__calls">        <!-- per-floor call buttons -->
      <div class="call-row" data-floor="9">
        <button class="call-button call-button--call" aria-label="Call elevator to floor 9">Call</button>
      </div>
      <!-- × FLOORS -->
    </div>
  </div>
</main>
```

- `.building`: `display: flex` horizontal with four columns: labels, shafts, times, calls.
- `.building__labels`, `.building__times`, `.building__calls`: `flex-direction: column-reverse` so floor 0 renders at the bottom while iterating data 0..9.
- `.shaft`: `position: relative`; height `calc(var(--floor-height) * 10)`. Background is a `repeating-linear-gradient` that draws a horizontal hair-line at each floor boundary, matching the mockup.
- `.shaft__elevator`: `position: absolute; bottom: 0`; moves with `transform: translateY(...)`.
- Responsive: a `@media (max-width: 640px)` block in `_layout.scss` shrinks `--floor-height`, `--shaft-width` and column widths so the building fits on phones without overflow.

### 9.2. SCSS per component (BEM)

One partial per component. Each partial declares its BEM block and its modifiers.

```
main.scss
├── @use 'variables';
├── @use 'layout';
├── @use 'floors';
├── @use 'elevator';
├── @use 'times';
└── @use 'button';
```

**States as modifiers**, never as JS attributes:

- `.shaft__elevator--idle`, `.shaft__elevator--moving`, `.shaft__elevator--arrived`.
- `.call-button--call`, `.call-button--waiting`, `.call-button--arrived`.

JS only calls `classList.add/remove` and sets `textContent`. Styling lives 100% in SCSS.

### 9.3. Variables

- `_variables.scss` defines:
  - **CSS custom properties** on `:root` for what JS needs to read: `--floor-height`.
  - **SCSS variables** for everything else: colors (`$color-call`, `$color-waiting`, `$color-arrived`, `$color-elevator-idle`, `$color-elevator-moving`, `$color-elevator-arrived`), button dimensions, font.

## 10. Sound

```js
// In Dispatcher.constructor():
this.ding = typeof Audio === 'undefined'
  ? null
  : new Audio(`${import.meta.env.BASE_URL}ding.wav`);

// In onArrival → _playDing():
if (this.ding) {
  this.ding.currentTime = 0;
  this.ding.play().catch(() => {});
}
```

Using `import.meta.env.BASE_URL` makes the asset path correct both in dev (`/`) and when the bundle is deployed to a subpath like `/origami/v1/`. The `typeof Audio === 'undefined'` guard makes the Dispatcher constructible in Node (Vitest) without mocking Audio.

- **`HTMLAudioElement`** and not Web Audio API: WAA is for processing; here we only play a sound file.
- **`currentTime = 0`** before `play()`: if the ding is playing and another elevator arrives, without reset the second `play()` is a no-op.
- **Autoplay policy**: the flow starts with a user click → the user gesture is present → allowed.

**Honest limitation to have ready for the defense:** two nearly simultaneous arrivals overlap and clip each other's sound. If it were a real requirement, an `Audio` pool or WAA would be used. For this exercise it's unnecessary.

## 11. Sketches for V2 (no code preinstalled — YAGNI)

These features are not implemented in V1 and **no hooks are preinstalled in the codebase** (no unused `config` parameter, no dormant flags). Each one is sketched here so the future implementation has a starting point.

### 11.1. Shabbat elevator

**Behavior:** does not respond to calls; ignored by the Dispatcher.

**Change to implement it:** add an `acceptsDispatch` boolean to `Elevator` (constructor param with default `true`). In `Dispatcher.requestElevator` step 3, filter idle elevators by `acceptsDispatch === true`. A Shabbat elevator is constructed with `acceptsDispatch: false`. Estimated change: ~3 lines.

### 11.2. ON/OFF button per column

**Behavior:** below each shaft, a button toggles the elevator "out of the pool" or "back into the pool."

**Change to implement it:** reuse the same `acceptsDispatch` flag from §11.1, expose `elevator.setAvailability(boolean)` to flip it, add a new template `<template id="shaft-toggle-template">` and wire it in `Building`. Dispatcher untouched.

### 11.3. Return to Ground after N idle seconds

**Behavior:** configurable per elevator. When entering `idle`, if no one calls it within N seconds, it travels by itself to Ground Floor (floor 0).

**Change to implement it:** add a constructor parameter `returnToGround = { enabled, idleSeconds }` to `Elevator`. In `Elevator.rest()` (the path that turns `arrived` → `idle`), if enabled, after the dispatcher's `onIdle` returns and the elevator stays idle, start a `setTimeout`. If a `goTo` arrives before it fires, cancel it. If it fires and the elevator is still `idle`, run `this.goTo(0)`.

## 12. Explicit "do not" decisions

| Not doing | Why |
|---|---|
| Full integration / E2E test suite | The focused unit tests in V1 cover the pure logic (formatter, algorithm). DOM/audio integration tests have lower ROI for this scope. |
| TypeScript | The brief asks for Vanilla JS. |
| SCAN/LOOK algorithm | The brief asks for "closest", not directional optimization. |
| Dynamic reassignment | Once assigned, no reassignment. Simpler, sufficient. |
| Persistence | Not requested. |
| Exhaustive ARIA | Basic accessibility in V1: real `<button>`, `aria-label` with floor name, `aria-live` on time cells, `disabled` while a call is in flight. |
| `EventTarget` / pub-sub | Single pattern (direct coupling) across the codebase. Defendability over flexibility. |
| Build HTML from JS | The brief forbids it. HTML5 `<template>` covers the DRY need; container divs are scaffolding only. |
| Preinstalled hooks for V2 | YAGNI. The Elevator constructor has no `config` parameter today. When a V2 feature lands, the change is local and explicit (see §11). |

## 13. Notes for the in-person defense

For each major design decision there is a one-sentence answer prepared:

- **Why classes and not functional?** Domain modeling: building, elevator, button, dispatcher. Each has its own state and identity.
- **Why a central Dispatcher and not Elevators that talk to each other?** Mediator pattern. Avoids each Elevator knowing the others. One class concentrates the assignment logic.
- **Why no Vuex/Pinia/custom store?** There is no global state shared between distinct views. There are 5 entities with their own state and a coordinator. A store would be over-engineering.
- **Why CSS transition and not rAF?** The browser sends it to the compositor and it runs on the GPU. rAF would make sense if I needed per-frame computation; here I go from A to B smoothly.
- **Why `performance.now()`?** Monotonic API, doesn't jump with clock changes, sub-millisecond precision.
- **Why FIFO and not closest-in-the-queue?** To avoid starvation. "No calls dropped" implies respecting arrival order.
- **Why `<template>` and not `createElement` nor innerHTML?** The brief asks for it. `<template>` keeps the markup in HTML; JS only clones.
- **How would you test the Elevator alone?** A Dispatcher mock with `onArrival` and `onIdle` methods. DI by constructor. (The current unit tests cover pure logic — `formatTime` and `pickClosest` — without DOM.)
- **How would you add Shabbat / return-to-Ground / ON-OFF button?** See §11. Each lands with a local, explicit change; no hooks reserved upfront.
- **Why does the time cell show two different things (wait vs trip)?** See §8.1. The brief asks for trip duration; the mockup shows live wait. Same display, distinct semantics by state — both requirements satisfied.
- **Why does the Dispatcher use `import.meta.env.BASE_URL` for the audio path?** Because the bundle can be deployed to a subpath (e.g. `/origami/v1/`). A hard-coded `/ding.wav` would 404 in that case.
