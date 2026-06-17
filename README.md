# Elevators

Implementation of Origami's home task: elevator system simulation with 10 floors and 5 elevators.

## Live demos

- **V1** (this branch — strictly the brief): https://leo.lob.com.ar/origami/v1
- **V2** (branch `v2` — extra features for fun, see below): https://leo.lob.com.ar/origami/v2

## Run

```bash
npm install
npm run dev
```

Opens `http://localhost:5173` automatically.

## Test

```bash
npm test
```

Focused unit tests for the time formatter and the closest-elevator algorithm.

## Spec and plan

- Design: [`docs/superpowers/specs/2026-06-17-elevators-design.md`](docs/superpowers/specs/2026-06-17-elevators-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-06-17-elevators-implementation.md`](docs/superpowers/plans/2026-06-17-elevators-implementation.md)

## Architecture at a glance

Four classes with direct coupling by reference:

- **`Building`** — bootstrap; instantiates the actors and wires them.
- **`Dispatcher`** — brain; receives calls, picks the closest idle elevator (via `pickClosest` from `algorithm.js`), FIFO queue if all busy, fires the ding on arrival, drives the live timer for waiting calls.
- **`Elevator`** — entity; `idle`/`moving`/`arrived` states, movement with CSS transition, reports trip duration to the Dispatcher.
- **`CallButton`** — UI; click → `dispatcher.requestElevator(floor)`. Exposes `setState(state)`, `setTime(text)` and `setQueueTime(text)`. State `call` clears both spans.

## Time semantics

Two display surfaces per floor, picked by whether the call has an assigned elevator yet:

- **Queued call (no elevator yet)** → italic counter next to the Call button.
- **Assigned, `waiting`** → counter over the assigned shaft (in the shafts overlay).
- **`arrived`** → frozen value over the assigned shaft, showing the elevator's actual **trip duration** — the metric the brief asks to measure.

## Stack

- Vanilla JS (ES modules), no runtime frameworks
- SCSS with BEM
- Vite (dev server + SCSS compiler)
- Vitest for focused unit tests
- Sound: `HTMLAudioElement`

## Assets

- Elevator icon inlined in `index.html`'s `<template id="shaft-template">`. Source: [Icons8](https://icons8.com/) (free under their license, attribution appreciated).
- `public/ding.wav` — arrival sound from [freesound.org](https://freesound.org).
- `public/favicon.svg` — custom favicon (elevator buttons in the project's palette).

## Key decisions

See §13 of the spec for the full list of "expected questions in the defense + answers".

## V2 branch — extras (not part of the brief)

The `v2` branch builds on the same architecture and adds three extra features for the sake of exploring the design, none of them required by the brief:

- **Per-elevator mode selector** under each shaft column: **Operational** / **Shabbat** / **Out of Service**. Shabbat ignores calls and runs an internal loop stopping at every floor; OOS ignores calls and travels silently to Ground.
- **Auto-home** toggle (visible only in Operational mode): when on, the elevator returns to Ground after one rest delay of idle time.
- **Live control panel** next to the building with sliders for Floors, Elevators, Floor duration and Rest delay. Building changes need an Apply (the building is rebuilt); duration and rest delay take effect on the next trip / rest.

Demo: https://leo.lob.com.ar/origami/v2 — branch: `v2`.
