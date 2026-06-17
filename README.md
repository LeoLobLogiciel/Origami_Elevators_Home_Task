# Elevators

Implementation of Origami's home task: elevator system simulation with 10 floors and 5 elevators.

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
- **`CallButton`** — UI; click → `dispatcher.requestElevator(floor)`. Exposes `setState(state)` and `setTime(text)`. State `call` clears the time automatically.

## Time semantics

A single time cell per floor, with two distinct semantics depending on state:

- While **waiting**: live counter of how long the user has been waiting since pressing Call.
- When **arrived**: frozen value showing the elevator's actual trip duration (the metric the brief asks to measure).

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
