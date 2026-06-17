import { formatTime } from './format.js';
import { config } from './config.js';
import { pickClosest } from './algorithm.js';

export class Dispatcher {
  constructor() {
    this.elevators = [];
    this.buttons = [];
    this.queue = [];
    this.activeCalls = new Map();
    this.ding = this._loadDing();
    this._tickerId = setInterval(() => this._tick(), config.TIME_REFRESH_MS);
  }

  destroy() {
    if (this._tickerId !== null) {
      clearInterval(this._tickerId);
      this._tickerId = null;
    }
  }

  restartTicker() {
    if (this._tickerId !== null) clearInterval(this._tickerId);
    this._tickerId = setInterval(() => this._tick(), config.TIME_REFRESH_MS);
  }

  setActors(elevators, buttons) {
    this.elevators = elevators;
    this.buttons = buttons;
  }

  requestElevator(floor) {
    if (this.buttons[floor].state !== 'call') return;

    const startTime = performance.now();
    this.buttons[floor].setState('waiting');

    const idle = this.elevators.filter(e => e.state === 'idle' && e.acceptsDispatch);
    if (idle.length === 0) {
      this.queue.push({ floor, startTime });
      this.buttons[floor].setElevatorIndex(null);
      this.buttons[floor].setQueueTime(formatTime(0));
      return;
    }

    const closest = pickClosest(idle, floor);
    this.activeCalls.set(closest, { floor, startTime });
    this.buttons[floor].setElevatorIndex(closest.id);
    closest.goTo(floor);
  }

  onArrival(elevator, durationMs) {
    const call = this.activeCalls.get(elevator);
    if (!call) {
      throw new Error(`Dispatcher: arrival from elevator ${elevator.id} with no active call`);
    }
    this._playDing();
    this.buttons[call.floor].setState('arrived');
    this.buttons[call.floor].setTime(formatTime(durationMs));
    elevator.rest();
  }

  onIdle(elevator) {
    const call = this.activeCalls.get(elevator);
    if (call) {
      this.buttons[call.floor].setState('call');
      this.activeCalls.delete(elevator);
    }

    if (elevator.acceptsDispatch && this.queue.length > 0) {
      const next = this.queue.shift();
      this.activeCalls.set(elevator, next);
      this.buttons[next.floor].setElevatorIndex(elevator.id);
      elevator.goTo(next.floor);
    }
  }

  _tick() {
    const now = performance.now();
    for (const [elevator, call] of this.activeCalls) {
      if (elevator.state === 'moving') {
        this.buttons[call.floor].setTime(formatTime(now - call.startTime));
      }
    }
    for (const call of this.queue) {
      this.buttons[call.floor].setQueueTime(formatTime(now - call.startTime));
    }
  }

  _loadDing() {
    if (typeof Audio === 'undefined') return null;
    return new Audio(`${import.meta.env.BASE_URL}ding.wav`);
  }

  _playDing() {
    if (!this.ding) return;
    this.ding.currentTime = 0;
    this.ding.play().catch(() => {});
  }
}
