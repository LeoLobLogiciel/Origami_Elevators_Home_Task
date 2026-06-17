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
