import { config } from './config.js';
import { CallButton } from './CallButton.js';
import { Elevator } from './Elevator.js';
import { Dispatcher } from './Dispatcher.js';

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  return tpl.content.firstElementChild.cloneNode(true);
}

function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function floorName(f) {
  return f === 0 ? 'Ground Floor' : `${f}${ordinalSuffix(f)}`;
}

export class Building {
  constructor(rootElement) {
    this.root = rootElement;
    this.dispatcher = new Dispatcher();
    this.elevators = [];
    this.buttons = [];

    this._buildDom();
    this.dispatcher.setActors(this.elevators, this.buttons);
  }

  rebuild() {
    this.dispatcher.destroy();
    this.root.replaceChildren();
    this.dispatcher = new Dispatcher();
    this.elevators = [];
    this.buttons = [];
    this._buildDom();
    this.dispatcher.setActors(this.elevators, this.buttons);
  }

  _buildDom() {
    this.root.style.setProperty('--floors', String(config.FLOORS));

    const labels = document.createElement('div'); labels.className = 'building__labels';
    const shaftsArea = document.createElement('div'); shaftsArea.className = 'building__shafts-area';
    const shafts = document.createElement('div'); shafts.className = 'building__shafts';
    const footers = document.createElement('div'); footers.className = 'building__footers';
    const calls = document.createElement('div'); calls.className = 'building__calls';

    shaftsArea.appendChild(shafts);
    shaftsArea.appendChild(footers);

    const shaftElements = [];
    const footerElements = [];
    for (let i = 0; i < config.ELEVATORS; i++) {
      const shaft = cloneTemplate('shaft-template');
      shaft.dataset.elevatorId = String(i);
      shafts.appendChild(shaft);
      shaftElements.push(shaft);

      const footer = cloneTemplate('shaft-footer-template');
      footer.dataset.elevatorId = String(i);
      footers.appendChild(footer);
      footerElements.push(footer);

      this.elevators.push(new Elevator(i, this.dispatcher));
    }

    const timesOverlay = document.createElement('div');
    timesOverlay.className = 'building__times-overlay';
    shafts.appendChild(timesOverlay);

    for (let f = 0; f < config.FLOORS; f++) {
      const label = cloneTemplate('floor-label-template');
      label.textContent = floorName(f);
      labels.appendChild(label);

      const timeCell = cloneTemplate('time-cell-template');
      timeCell.dataset.floor = String(f);
      timesOverlay.appendChild(timeCell);

      const callRow = cloneTemplate('call-row-template');
      callRow.dataset.floor = String(f);
      calls.appendChild(callRow);

      const buttonEl = callRow.querySelector('.call-button');
      const queueTimeEl = callRow.querySelector('.call-row__queue-time');
      this.buttons[f] = new CallButton(f, this.dispatcher, buttonEl, timeCell, queueTimeEl);
    }

    this.root.appendChild(labels);
    this.root.appendChild(shaftsArea);
    this.root.appendChild(calls);

    this.elevators.forEach((e, i) => e.attach(shaftElements[i], footerElements[i]));
  }
}
