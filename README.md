# Elevators

Implementation of Origami's home task: elevator system simulation with 10 floors and 5 elevators.

## Run

```bash
npm install
npm run dev
```

Opens `http://localhost:5173` automatically.

## Spec and plan

- Design: [`docs/superpowers/specs/2026-06-17-elevators-design.md`](docs/superpowers/specs/2026-06-17-elevators-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-06-17-elevators-implementation.md`](docs/superpowers/plans/2026-06-17-elevators-implementation.md)

## Architecture at a glance

Four classes with direct coupling by reference:

- **`Building`** — bootstrap; instantiates and wires.
- **`Dispatcher`** — brain; receives calls, assigns by proximity, FIFO queue if all busy, coordinates the visual lifecycle, fires the ding.
- **`Elevator`** — entity; `idle`/`moving`/`arrived` states, movement with CSS transition, notifies the Dispatcher in `onArrival` and `onIdle`.
- **`CallButton`** — UI; click → `dispatcher.requestElevator(floor)`, `setState` method to reflect visual state.

## Stack

- Vanilla JS (ES modules), no runtime frameworks
- SCSS with BEM
- Vite (dev server + SCSS compiler)
- Sound: `HTMLAudioElement`

## Assets

- `public/elevator.svg` — elevator icon (Icons8).
- `public/ding.wav` — arrival sound (freesound.org).

## Key decisions

See §13 of the spec — list of "expected questions in the defense + answers".
