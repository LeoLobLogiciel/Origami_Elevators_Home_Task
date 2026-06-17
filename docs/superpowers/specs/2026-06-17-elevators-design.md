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

**Out of V1 scope:** automated tests, TypeScript, SCAN/LOOK algorithm, dynamic reassignment, persistence, exhaustive ARIA. The future features described in §11 are designed as hooks but not implemented.

## 2. Stack

- **Vanilla JS** (native ES modules, no frameworks).
- **SCSS** with BEM methodology.
- **Vite** as dev server and SCSS compiler.
- **No external libraries** except Vite (dev-only).

Rationale: the brief asks for Vanilla. SCSS is suggested by the brief and familiar to the author from Vue. Vite is the standard tool in the Vue ecosystem, has minimal setup, and only adds SCSS compilation and a dev server.

## 3. File structure

```
elevators/
├── index.html              # root markup + <template> for floor and elevator
├── package.json
├── vite.config.js
├── public/
│   ├── elevator.svg        # provided by the brief (Google Drive)
│   └── ding.wav            # short arrival sound
└── src/
    ├── main.js             # entry point
    ├── config.js           # constants
    ├── Building.js         # bootstrap + wiring
    ├── Dispatcher.js       # queue + algorithm
    ├── Elevator.js         # lifecycle + movement
    ├── CallButton.js       # button UI
    ├── format.js           # ms → "5 sec" / "1 min. 30 sec."
    └── styles/
        ├── main.scss       # @use of partials
        ├── _variables.scss # colors, dims, --floor-height (custom property)
        ├── _layout.scss    # .building, columns
        ├── _floors.scss    # .floor-label
        ├── _elevator.scss  # .shaft + .shaft__elevator + states
        └── _button.scss    # .call-row + .call-button + states
```

**Decision: flat structure, no `core/` or `ui/`.** With 6 JS files, grouping into folders is over-engineering. The filename is the responsibility.

## 4. Markup strategy

HTML is not built from JS. The `index.html` contains the HTML5 `<template>` elements that define the markup for each row type. In `main.js`, on startup, templates are cloned N times.

```html
<template id="elevator-template">
  <div class="shaft__elevator">
    <img src="/elevator.svg" alt="">
  </div>
</template>

<template id="call-row-template">
  <div class="call-row">
    <span class="call-row__time"></span>
    <button class="call-button">Call</button>
  </div>
</template>
```

**Rationale:** the brief's explicit *"No need to build the HTML in JS"* is honored because the markup lives in HTML (`<template>`). JS only calls `template.content.cloneNode(true)`. Changing the number of floors or elevators is a single constant change, not editing 50 lines of HTML.

## 5. Architecture: 4 classes + 1 pattern

### 5.1. Communication pattern

**Direct coupling by reference.** Each class receives in its constructor the references it needs and calls methods directly on them. There is no `EventTarget`, no injected callbacks, no pub/sub.

Rationale: a single pattern across the codebase. Defensible in one sentence: *"each class keeps what it needs and calls methods."* Reproducible on a whiteboard without risk of mixing APIs (`addEventListener`, `dispatchEvent`, `CustomEvent`, `detail`).

### 5.2. Responsibilities

| Class | References received | Responsibility |
|---|---|---|
| `Building` | (none; receives the root DOM) | Instantiates Dispatcher, Elevators, CallButtons. Wires references. It is the bootstrap. |
| `Dispatcher` | (empty at construction; `setActors` afterward) | The system's brain. Receives calls, assigns by proximity, queues if no idle elevators. Coordinates arrivals/idles. Plays the ding. Updates buttons' visual state. Holds the global `setInterval` that refreshes on-screen times. |
| `Elevator` | `id`, `dispatcher`, `config = {}` | Domain entity. Holds `currentFloor` and `state` (`idle`/`moving`/`arrived`). Executes movement via CSS transition. Measures time with `performance.now()`. Notifies the dispatcher on `onArrival` and `onIdle`. The `config` parameter is an optional object; in V1 it has no used keys, but it's present as a hook for V2 (see §11). |
| `CallButton` | `floor`, `dispatcher`, `element` (DOM) | Button UI. Captures clicks → `dispatcher.requestElevator(floor)`. The `setState(state, timeText)` method updates CSS classes and text. |

### 5.3. Wiring in `Building`

```js
class Building {
  constructor(root) {
    this.root = root;
    this.dispatcher = new Dispatcher();

    this.elevators = Array.from({length: ELEVATORS}, (_, i) =>
      new Elevator(i, this.dispatcher, {})
    );

    this.buttons = Array.from({length: FLOORS}, (_, floor) => {
      const element = cloneTemplate('call-row-template');
      return new CallButton(floor, this.dispatcher, element);
    });

    this.dispatcher.setActors(this.elevators, this.buttons);

    // append to root
    this.mount();
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

The Elevator has already changed its own state to `arrived` before notifying (see §7.1). The Dispatcher only coordinates the external effects.

```
1. floor = activeCalls.get(elevator).floor.
2. Play ding (currentTime = 0; play()).
3. button[floor].setState('arrived', formatTime(now - startTime)).
4. elevator.rest() → the Elevator starts its setTimeout(REST_MS) and will notify onIdle when it expires.
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

## 8. Wait time display

### 8.1. Semantics

The number shown next to the button is **the time elapsed since Call was pressed**, not the elevator's travel time.

| Button state | Text in `.call-row__time` |
|---|---|
| `call` | empty |
| `waiting` | time since startTime, updated every 1000ms |
| `arrived` | final time frozen |

### 8.2. Implementation

A single global `setInterval(1000)` lives in the `Dispatcher`. On each tick it iterates `activeCalls` and, for each call in `waiting` state, updates the corresponding floor's text. Calls in `arrived` are not touched (they remain frozen with the previous value).

### 8.3. Format

`format.js` exports `formatTime(ms)`:

- `< 60_000`: `"5 sec"`, `"42 sec"`.
- `>= 60_000`: `"1 min. 30 sec."`.

## 9. Layout and SCSS

### 9.1. DOM

```html
<div class="building">
  <div class="building__labels">
    <div class="floor-label">9th</div>
    ...
    <div class="floor-label">Ground</div>
  </div>

  <div class="building__shafts">
    <div class="shaft" data-elevator-id="0">
      <div class="shaft__elevator shaft__elevator--idle"><img src="elevator.svg"></div>
    </div>
    <!-- × ELEVATORS -->
  </div>

  <div class="building__calls">
    <div class="call-row" data-floor="9">
      <span class="call-row__time"></span>
      <button class="call-button call-button--call">Call</button>
    </div>
    <!-- × FLOORS -->
  </div>
</div>
```

- `.building`: `display: flex` horizontal.
- `.shaft`: `position: relative`; height `calc(var(--floor-height) * 10)`.
- `.shaft__elevator`: `position: absolute; bottom: 0`; moves with `transform: translateY(...)`.

### 9.2. SCSS per component (BEM)

One partial per component. Each partial declares its BEM block and its modifiers.

```
main.scss
├── @use 'variables' as *;
├── @use 'layout';
├── @use 'floors';
├── @use 'elevator';
└── @use 'button';
```

**States as modifiers**, never as JS attributes:

- `.shaft__elevator--idle`, `.shaft__elevator--moving`, `.shaft__elevator--arrived`.
- `.call-button--call`, `.call-button--waiting`, `.call-button--arrived`.

JS only calls `classList.add/remove`. Styling lives 100% in SCSS.

### 9.3. Variables

- `_variables.scss` defines:
  - **CSS custom properties** on `:root` for what JS needs to read: `--floor-height`.
  - **SCSS variables** for everything else: colors (`$color-call`, `$color-waiting`, `$color-arrived`, `$color-elevator-idle`, `$color-elevator-moving`, `$color-elevator-arrived`), button dimensions, font.

## 10. Sound

```js
// In Dispatcher.constructor():
this.ding = new Audio('/ding.wav');

// In onArrival:
this.ding.currentTime = 0;
this.ding.play();
```

- **`HTMLAudioElement`** and not Web Audio API: WAA is for processing; here we only play a sound file.
- **`currentTime = 0`** before `play()`: if the ding is playing and another elevator arrives, without reset the second `play()` is a no-op.
- **Autoplay policy**: the flow starts with a user click → the user gesture is present → allowed.

**Honest limitation to have ready for the defense:** two nearly simultaneous arrivals overlap and clip each other's sound. If it were a real requirement, an `Audio` pool or WAA would be used. For this exercise it's unnecessary.

## 11. Documented hooks for V2

These features are not implemented in V1 but the design leaves room for them to land with local changes.

### 11.1. Shabbat elevator

**Behavior:** does not respond to calls; ignored by the Dispatcher.

**Hook:** the Elevator's `config` parameter (already present in V1, see §5.2) gains the key `acceptsDispatch: boolean` with default `true`. The Dispatcher, when filtering candidates in §6.2 step 3, discards those with `acceptsDispatch === false`. A Shabbat elevator is constructed with `{ acceptsDispatch: false }`.

**Change to implement it:** one line in the Dispatcher filter + parameterize the config.

### 11.2. ON/OFF button per column

**Behavior:** below each shaft, a button toggles the elevator "out of the pool" or "back into the pool."

**Hook:** reuses `acceptsDispatch`. A UI control calls `elevator.setAvailability(boolean)`, which updates the flag and triggers a visual CSS class.

**Change to implement it:** new method on `Elevator`, new button in the template, listener in `Building`. Dispatcher untouched.

### 11.3. Return to Ground after N idle seconds

**Behavior:** configurable per elevator. When entering `idle`, if no one calls it within N seconds, it travels by itself to Ground Floor (floor 0).

**Hook:** `Elevator.config.returnToGround = { enabled: boolean, idleSeconds: number }`. In `Elevator.onIdle()` (after notifying the dispatcher) start a `setTimeout(N * 1000)`. If a `goTo` arrives before it fires, cancel it. If it fires and the elevator is still `idle`, run `this.goTo(0)`.

**Change to implement it:** `setTimeout` logic with cancellation in `Elevator`, Dispatcher untouched.

## 12. Explicit "do not" decisions

| Not doing | Why |
|---|---|
| Automated tests | The point of the exercise is design clarity. With 4 classes and a linear flow the ROI is low and it adds surface area to defend. |
| TypeScript | The brief asks for Vanilla JS. |
| SCAN/LOOK algorithm | The brief asks for "closest", not directional optimization. |
| Dynamic reassignment | Once assigned, no reassignment. Simpler, sufficient. |
| Persistence | Not requested. |
| Exhaustive ARIA | Basic semantics yes: real `<button>`, not `<div onclick>`. |
| `EventTarget` / pub-sub | Single pattern (direct coupling) across the codebase. Defendability over flexibility. |
| Build HTML from JS | The brief forbids it. HTML5 `<template>` covers the DRY need. |

## 13. Notes for the in-person defense

For each major design decision there is a one-sentence answer prepared:

- **Why classes and not functional?** Domain modeling: building, elevator, button, dispatcher. Each has its own state and identity.
- **Why a central Dispatcher and not Elevators that talk to each other?** Mediator pattern. Avoids each Elevator knowing the others. One class concentrates the assignment logic.
- **Why no Vuex/Pinia/custom store?** There is no global state shared between distinct views. There are 5 entities with their own state and a coordinator. A store would be over-engineering.
- **Why CSS transition and not rAF?** The browser sends it to the compositor and it runs on the GPU. rAF would make sense if I needed per-frame computation; here I go from A to B smoothly.
- **Why `performance.now()`?** Monotonic API, doesn't jump with clock changes, sub-millisecond precision.
- **Why FIFO and not closest-in-the-queue?** To avoid starvation. "No calls dropped" implies respecting arrival order.
- **Why `<template>` and not `createElement` nor innerHTML?** The brief asks for it. `<template>` keeps the markup in HTML; JS only clones.
- **How would you test the Elevator alone?** A Dispatcher mock with `onArrival` and `onIdle` methods. DI by constructor.
- **How would you add Shabbat / return-to-Ground / ON-OFF button?** See §11. Each lands with a local change.
