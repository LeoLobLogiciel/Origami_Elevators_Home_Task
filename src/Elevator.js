import { FLOOR_DURATION_MS, REST_MS } from './config.js';

const STATES = ['idle', 'moving', 'arrived'];

export class Elevator {
  constructor(id, dispatcher) {
    this.id = id;
    this.dispatcher = dispatcher;

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
