# Home Task — Elevators (Origami) — Design Spec

**Fecha:** 2026-06-17
**Autor:** Leo
**Contexto:** Home task para entrevista en Origami. Construcción asistida por IA permitida; **defensa presencial sin IA**. El código debe ser entendible y reproducible a mano por el autor. Stack del puesto: Vue.

---

## 1. Alcance V1

Sistema de elevadores en una página web única.

- 10 pisos (Ground Floor + 1° a 9°).
- 5 elevadores, cada uno en su propio carril (shaft) vertical.
- 1 botón "Call" por piso, en una columna a la derecha.
- Estados visuales del botón: `call` (verde), `waiting` (rojo), `arrived` (verde con borde).
- Estados visuales del elevador: `idle` (negro), `moving` (rojo), `arrived` (verde).
- Movimiento suave entre pisos.
- Sonido al llegar al piso destino.
- Cola FIFO si todos los elevadores están ocupados (sin perder llamadas).
- Display del tiempo de espera del que llamó, en vivo durante `waiting`, congelado durante `arrived`.

**Fuera de alcance V1:** tests automatizados, TypeScript, algoritmo SCAN/LOOK, reasignación dinámica, persistencia, ARIA exhaustivo. Las features futuras descritas en §11 se diseñan como hooks pero no se implementan.

## 2. Stack

- **Vanilla JS** (módulos ES nativos, sin frameworks).
- **SCSS** con metodología BEM.
- **Vite** como dev server y compilador SCSS.
- **Sin librerías externas** salvo Vite (dev-only).

Justificación: la consigna pide Vanilla. SCSS es sugerido por la consigna y conocido por el autor desde Vue. Vite es estándar del ecosistema Vue, setup mínimo, agrega solo SCSS compilation y serve.

## 3. Estructura de archivos

```
elevators/
├── index.html              # markup raíz + <template id="..."> para piso y elevador
├── package.json
├── vite.config.js
├── public/
│   ├── elevator.svg        # provisto por la consigna (Google Drive)
│   └── ding.mp3            # sonido corto de arribo
└── src/
    ├── main.js             # entry point
    ├── config.js           # constantes
    ├── Building.js         # bootstrap + wiring
    ├── Dispatcher.js       # cola + algoritmo
    ├── Elevator.js         # lifecycle + movimiento
    ├── CallButton.js       # UI del botón
    ├── format.js           # ms → "5 sec" / "1 min. 30 sec."
    └── styles/
        ├── main.scss       # @use de partials
        ├── _variables.scss # colores, dims, --floor-height (custom property)
        ├── _layout.scss    # .building, columnas
        ├── _floors.scss    # .floor-label
        ├── _elevator.scss  # .shaft + .shaft__elevator + estados
        └── _button.scss    # .call-row + .call-button + estados
```

**Decisión: estructura plana, sin `core/` ni `ui/`.** Con 6 archivos JS, agrupar en carpetas es over-engineering. El nombre del archivo es la responsabilidad.

## 4. Estrategia de markup

El HTML no se construye desde JS. El `index.html` contiene los `<template>` HTML5 que definen el markup de cada tipo de fila. En `main.js`, al iniciar, los templates se clonan N veces.

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

**Justificación:** la consigna explícita *"No need to build the HTML in JS"* se respeta porque el markup vive en HTML (`<template>`). JS solo hace `template.content.cloneNode(true)`. Cambiar la cantidad de pisos o elevadores es modificar una constante en `config.js`, no editar 50 líneas de HTML.

## 5. Arquitectura: 4 clases + 1 patrón

### 5.1. Patrón de comunicación

**Acoplamiento directo por referencia.** Cada clase recibe en su constructor las referencias que necesita y llama métodos directamente sobre ellas. No hay `EventTarget`, ni callbacks inyectados, ni pub/sub.

Justificación: un único patrón en toda la base. Defendible en una sola frase: *"cada clase guarda lo que necesita y llama métodos"*. Reproducible en pizarrón sin riesgo de mezclar APIs (`addEventListener`, `dispatchEvent`, `CustomEvent`, `detail`).

### 5.2. Responsabilidades

| Clase | Referencias que recibe | Responsabilidad |
|---|---|---|
| `Building` | (ninguna; recibe el root DOM) | Instancia Dispatcher, Elevators, CallButtons. Cablea referencias. Es el bootstrap. |
| `Dispatcher` | (vacío al construirse; `setActors` después) | Cerebro del sistema. Recibe llamadas, asigna por cercanía, encola si no hay libres. Coordina arrivals/idles. Reproduce el ding. Actualiza estado visual de los botones. Mantiene el `setInterval` global que actualiza tiempos en pantalla. |
| `Elevator` | `id`, `dispatcher`, `config = {}` | Entidad de dominio. Mantiene `currentFloor` y `state` (`idle`/`moving`/`arrived`). Ejecuta movimiento via CSS transition. Mide tiempo con `performance.now()`. Notifica al dispatcher en `onArrival` y `onIdle`. El parámetro `config` es un objeto opcional; en V1 no tiene claves usadas, pero está presente como hook para V2 (ver §11). |
| `CallButton` | `floor`, `dispatcher`, `element` (DOM) | UI del botón. Captura clicks → `dispatcher.requestElevator(floor)`. Método `setState(state, timeText)` cambia clases CSS y texto. |

### 5.3. Wiring en `Building`

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

    // append a root
    this.mount();
  }
}
```

El Dispatcher se instancia primero sin actores; recibe los arrays después de que existan. Esto evita un ciclo de inicialización en el constructor.

## 6. Algoritmo de asignación

### 6.1. Estado del Elevator

Tres estados mutuamente excluyentes:

- `idle`: no atendiendo ninguna llamada. Quieto en su último piso.
- `moving`: viajando hacia el piso de una llamada asignada.
- `arrived`: llegó al piso, mostrando confirmación (durante `REST_MS`).

Un elevador es candidato a recibir una nueva llamada **solamente cuando está `idle`**. Los 2 segundos en `arrived` cuentan como ocupado.

### 6.2. Cuando entra una llamada al piso F

```
1. Si el botón del piso F ya está en `waiting`:
   → no hacer nada (llamada duplicada ignorada)

2. Marcar botón F como `waiting`. Registrar startTime = performance.now().

3. Filtrar elevadores con state === 'idle'.

4a. Si hay ≥ 1 idle:
    - Elegir el de menor |currentFloor - F|.
    - Desempate: menor índice.
    - Registrar activeCalls[elevator] = { floor: F, startTime }.
    - elevator.goTo(F).

4b. Si no hay ninguno idle:
    - queue.push({ floor: F, startTime }).
```

### 6.3. Cuando un elevador llega (`onArrival(elevator, durationMs)`)

El Elevator ya cambió su propio state a `arrived` antes de notificar (ver §7.1). El Dispatcher solo coordina los efectos externos.

```
1. floor = activeCalls.get(elevator).floor.
2. Reproducir ding (currentTime = 0; play()).
3. button[floor].setState('arrived', formatTime(now - startTime)).
4. elevator.rest() → el Elevator arranca su setTimeout(REST_MS) y notificará onIdle al vencer.
```

### 6.4. Cuando un elevador pasa a idle (`onIdle(elevator)`)

```
1. floor = activeCalls.get(elevator).floor.
2. button[floor].setState('call').
3. activeCalls.delete(elevator).
4. Si queue no está vacía:
   - next = queue.shift().
   - activeCalls.set(elevator, next).
   - elevator.goTo(next.floor).
```

**Por qué la asignación de la cola ocurre en `onIdle` y no en `onArrival`:** durante los 2 segundos en `arrived` el elevador está visualmente confirmando la llegada. Tomar otra llamada en ese momento rompería el ciclo. El costo es 2 segundos de latencia, aceptable.

**Por qué FIFO y no "más cercano al elevador libre":** "no perder llamadas" implica respetar orden de llegada. Reordenar por cercanía cuando se libera un elevador podría postergar indefinidamente al primero en llamar (starvation).

## 7. Lifecycle y temporización del Elevator

### 7.1. Movimiento

CSS transition sobre `transform: translateY(...)`. La duración es dinámica vía CSS custom property.

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

- **`transitionend` con `{ once: true }`**: autodesuscripción, no acumulamos listeners.
- **`performance.now()`** y no `Date.now()`: API monotónica, no salta con cambios de reloj, precisión sub-milisegundo.
- **CSS custom property `--travel-duration`**: la duración se setea desde JS sin tocar el SCSS de animación.

### 7.2. Reposo

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

### 7.3. Altura del piso: source of truth en SCSS

`_variables.scss` define `--floor-height: 60px` como custom property en `:root`. JS la lee al construirse cada Elevator:

```js
const v = getComputedStyle(document.documentElement).getPropertyValue('--floor-height');
this.floorHeightPx = parseFloat(v);
```

Una sola fuente de verdad. Si se modifica el SCSS, JS la pesca al iniciar.

## 8. Display del tiempo de espera

### 8.1. Semántica

El número que aparece junto al botón es **el tiempo transcurrido desde que se presionó Call**, no el tiempo de viaje del elevador.

| Estado del botón | Texto en `.call-row__time` |
|---|---|
| `call` | vacío |
| `waiting` | tiempo desde startTime, actualizado cada 1000ms |
| `arrived` | tiempo final congelado |

### 8.2. Implementación

Un único `setInterval(1000)` global vive en el `Dispatcher`. En cada tick recorre `activeCalls` y para cada llamada en estado `waiting` actualiza el texto del piso correspondiente. Las llamadas en `arrived` no se tocan (quedan congeladas con el valor previo).

### 8.3. Formato

`format.js` exporta `formatTime(ms)`:

- `< 60_000`: `"5 sec"`, `"42 sec"`.
- `>= 60_000`: `"1 min. 30 sec."`.

## 9. Layout y SCSS

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
- `.shaft`: `position: relative`; altura `calc(var(--floor-height) * 10)`.
- `.shaft__elevator`: `position: absolute; bottom: 0`; se mueve con `transform: translateY(...)`.

### 9.2. SCSS por componente (BEM)

Un partial por componente. Cada partial declara su block BEM y sus modifiers.

```
main.scss
├── @use 'variables' as *;
├── @use 'layout';
├── @use 'floors';
├── @use 'elevator';
└── @use 'button';
```

**Estados como modifiers**, jamás como atributos JS:

- `.shaft__elevator--idle`, `.shaft__elevator--moving`, `.shaft__elevator--arrived`.
- `.call-button--call`, `.call-button--waiting`, `.call-button--arrived`.

JS solo hace `classList.add/remove`. El estilo vive 100% en SCSS.

### 9.3. Variables

- `_variables.scss` define:
  - **CSS custom properties** en `:root` para lo que JS necesita leer: `--floor-height`.
  - **SCSS variables** para lo demás: colores (`$color-call`, `$color-waiting`, `$color-arrived`, `$color-elevator-idle`, `$color-elevator-moving`, `$color-elevator-arrived`), dimensiones de botón, fuente.

## 10. Sonido

```js
// En Dispatcher.constructor():
this.ding = new Audio('/ding.mp3');

// En onArrival:
this.ding.currentTime = 0;
this.ding.play();
```

- **`HTMLAudioElement`** y no Web Audio API: WAA es para procesamiento; acá solo reproducimos un mp3.
- **`currentTime = 0`** antes de `play()`: si el ding está sonando y otro elevador llega, sin reset el segundo `play()` es no-op.
- **Autoplay policy**: el flow se inicia con un click del usuario → la user gesture está presente → permitido.

**Limitación honesta a tener lista en defensa:** dos arribos casi simultáneos pisan el sonido entre sí. Si fuera requerimiento real se usaría un pool de `Audio` o WAA. Para este ejercicio es innecesario.

## 11. Hooks documentados para V2

Estas features no se implementan en V1 pero el diseño deja lugar para que entren con cambios locales.

### 11.1. Ascensor de Shabat

**Comportamiento:** no responde a llamados; ignorado por el Dispatcher.

**Hook:** el parámetro `config` del Elevator (ya presente en V1, ver §5.2) gana la clave `acceptsDispatch: boolean` con default `true`. El Dispatcher, al filtrar candidatos en §6.2 paso 3, descarta los que tengan `acceptsDispatch === false`. Un elevador Shabat se construye con `{ acceptsDispatch: false }`.

**Cambio para implementarlo:** una línea en el filtro del Dispatcher + parametrizar el config.

### 11.2. Botón ON/OFF por columna

**Comportamiento:** debajo de cada shaft, un botón que toggle el elevador "fuera del pool" o "dentro del pool".

**Hook:** reutiliza `acceptsDispatch`. Un control de UI llama `elevator.setAvailability(boolean)`, que actualiza el flag y dispara una clase CSS visual.

**Cambio para implementarlo:** método nuevo en `Elevator`, botón nuevo en el template, listener en `Building`. Sin tocar Dispatcher.

### 11.3. Vuelve a PB tras N segundos idle

**Comportamiento:** configurable por elevador. Al pasar a `idle`, si nadie lo llama en N segundos, viaja solo a Ground Floor (piso 0).

**Hook:** `Elevator.config.returnToGround = { enabled: boolean, idleSeconds: number }`. En `Elevator.onIdle()` (después de notificar al dispatcher) arranca un `setTimeout(N * 1000)`. Si llega un `goTo` antes, se cancela. Si vence y sigue `idle`, ejecuta `this.goTo(0)`.

**Cambio para implementarlo:** lógica de `setTimeout` con cancelación en `Elevator`, sin tocar Dispatcher.

## 12. Decisiones explícitas de NO hacer

| No hago | Por qué |
|---|---|
| Tests automatizados | Foco del ejercicio: claridad de diseño. Con 4 clases y un flujo lineal el ROI es bajo y agrega superficie a defender. |
| TypeScript | La consigna pide Vanilla JS. |
| Algoritmo SCAN/LOOK | La consigna pide "más cercano", no optimizado direccional. |
| Reasignación dinámica | Una vez asignado, no se reasigna. Más simple, suficiente. |
| Persistencia | No solicitada. |
| ARIA exhaustivo | Sí semántica básica: `<button>` real, no `<div onclick>`. |
| `EventTarget` / pub-sub | Un único patrón (acoplamiento directo) en toda la base. Defendibilidad sobre flexibilidad. |
| Build HTML desde JS | Consigna lo prohíbe. `<template>` HTML5 cubre la necesidad de DRY. |

## 13. Notas para la defensa presencial

Para cada decisión grande del diseño hay una respuesta de una frase preparada:

- **¿Por qué clases y no functional?** Modelado de dominio: edificio, elevador, botón, dispatcher. Cada uno tiene estado e identidad propios.
- **¿Por qué Dispatcher central y no Elevators que se comunican entre sí?** Patrón Mediator. Evita que cada Elevator conozca a los demás. Una sola clase concentra la lógica de asignación.
- **¿Por qué no Vuex/Pinia/store custom?** No hay estado global compartido entre vistas distintas. Son 5 entidades con su propio estado y un coordinador. Un store sería over-engineering.
- **¿Por qué CSS transition y no rAF?** El browser lo manda al compositor y queda en la GPU. rAF tendría sentido si necesitara calcular cada frame; acá voy de A a B suavemente.
- **¿Por qué `performance.now()`?** API monotónica, no salta con cambios de reloj, precisión sub-milisegundo.
- **¿Por qué FIFO y no más-cercano-en-la-cola?** Para evitar starvation. "No perder llamadas" implica respetar orden de llegada.
- **¿Por qué `<template>` y no `createElement` ni innerHTML?** Consigna lo pide. `<template>` mantiene el markup en HTML, JS solo clona.
- **¿Cómo testearías el Elevator solo?** Mock del Dispatcher con métodos `onArrival` y `onIdle`. Es DI por constructor.
- **¿Cómo agregarías Shabat / vuelve-a-PB / botón ON-OFF?** Ver §11. Cada una entra con cambio local.
