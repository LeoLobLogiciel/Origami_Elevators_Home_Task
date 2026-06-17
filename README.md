# Elevators

Implementación del home task de Origami: simulación de sistema de elevadores con 10 pisos y 5 ascensores.

## Run

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` automáticamente.

## Spec y plan

- Diseño: [`docs/superpowers/specs/2026-06-17-elevators-design.md`](docs/superpowers/specs/2026-06-17-elevators-design.md)
- Plan de implementación: [`docs/superpowers/plans/2026-06-17-elevators-implementation.md`](docs/superpowers/plans/2026-06-17-elevators-implementation.md)

## Arquitectura en una mirada

Cuatro clases con acoplamiento directo por referencia:

- **`Building`** — bootstrap; instancia y cablea.
- **`Dispatcher`** — cerebro; recibe llamadas, asigna por cercanía, encola FIFO si todos ocupados, coordina el lifecycle visual, dispara el ding.
- **`Elevator`** — entidad; estados `idle`/`moving`/`arrived`, movimiento con CSS transition, notifica al Dispatcher en `onArrival` y `onIdle`.
- **`CallButton`** — UI; clic → `dispatcher.requestElevator(floor)`, método `setState` para reflejar estado visual.

## Stack

- Vanilla JS (ES modules), sin frameworks runtime
- SCSS con BEM
- Vite (dev server + SCSS compiler)
- Sonido: `HTMLAudioElement`

## Assets

- `public/elevator.svg` — ícono de elevador (Icons8).
- `public/ding.wav` — sonido de arribo (freesound.org).

## Decisiones clave

Ver §13 del spec — listado de "preguntas esperadas en defensa + respuestas".
