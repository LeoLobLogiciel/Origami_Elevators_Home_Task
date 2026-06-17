const STATES = ['call', 'waiting', 'arrived'];

const LABELS = {
  call: 'Call',
  waiting: 'Waiting',
  arrived: 'Arrived',
};

export class CallButton {
  constructor(floor, dispatcher, buttonElement, timeElement, queueTimeElement) {
    this.floor = floor;
    this.dispatcher = dispatcher;
    this.button = buttonElement;
    this.timeEl = timeElement;
    this.queueTimeEl = queueTimeElement;

    this.state = 'call';
    const floorLabel = floor === 0 ? 'Ground Floor' : `floor ${floor}`;
    this.button.setAttribute('aria-label', `Call elevator to ${floorLabel}`);

    this.button.addEventListener('click', () => {
      this.dispatcher.requestElevator(this.floor);
    });
  }

  setState(state) {
    if (!STATES.includes(state)) {
      throw new Error(`Unknown CallButton state: ${state}`);
    }
    STATES.forEach(s => this.button.classList.remove(`call-button--${s}`));
    this.button.classList.add(`call-button--${state}`);
    this.state = state;
    this.button.textContent = LABELS[state];
    this.button.disabled = state !== 'call';

    if (state === 'call') {
      this.setTime('');
      this.setQueueTime('');
      this.timeEl.style.removeProperty('--shaft-index');
      this.timeEl.classList.remove('time-cell--assigned');
    }
  }

  setTime(text) {
    this.timeEl.textContent = text;
  }

  setQueueTime(text) {
    if (this.queueTimeEl) this.queueTimeEl.textContent = text;
  }

  setElevatorIndex(index) {
    if (index === null || index === undefined) {
      this.timeEl.style.removeProperty('--shaft-index');
      this.timeEl.classList.remove('time-cell--assigned');
      this.setTime('');
    } else {
      this.timeEl.style.setProperty('--shaft-index', String(index));
      this.timeEl.classList.add('time-cell--assigned');
      this.setQueueTime('');
    }
  }
}
