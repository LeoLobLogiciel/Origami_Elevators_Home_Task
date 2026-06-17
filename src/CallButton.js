const STATES = ['call', 'waiting', 'arrived'];

export class CallButton {
  constructor(floor, dispatcher, rowElement) {
    this.floor = floor;
    this.dispatcher = dispatcher;
    this.row = rowElement;
    this.button = rowElement.querySelector('.call-button');
    this.timeEl = rowElement.querySelector('.call-row__time');

    this.state = 'call';
    this.button.addEventListener('click', () => {
      this.dispatcher.requestElevator(this.floor);
    });
  }

  setState(state, timeText = '') {
    if (!STATES.includes(state)) {
      throw new Error(`Unknown CallButton state: ${state}`);
    }
    STATES.forEach(s => this.button.classList.remove(`call-button--${s}`));
    this.button.classList.add(`call-button--${state}`);
    this.state = state;

    switch (state) {
      case 'call':    this.button.textContent = 'Call'; break;
      case 'waiting': this.button.textContent = 'Waiting'; break;
      case 'arrived': this.button.textContent = 'Arrived'; break;
    }

    this.timeEl.textContent = timeText;
  }
}
