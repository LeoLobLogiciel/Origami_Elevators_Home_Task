import './styles/main.scss';
import { FLOORS, ELEVATORS } from './config.js';

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
  return f === 0 ? 'Ground' : `${f}${ordinalSuffix(f)}`;
}

function renderSkeleton(rootSelector) {
  const root = document.querySelector(rootSelector);

  const labels = document.createElement('div');
  labels.className = 'building__labels';

  const shafts = document.createElement('div');
  shafts.className = 'building__shafts';

  const calls = document.createElement('div');
  calls.className = 'building__calls';

  for (let f = 0; f < FLOORS; f++) {
    const label = cloneTemplate('floor-label-template');
    label.textContent = floorName(f);
    labels.appendChild(label);

    const callRow = cloneTemplate('call-row-template');
    callRow.dataset.floor = String(f);
    calls.appendChild(callRow);
  }

  for (let i = 0; i < ELEVATORS; i++) {
    const shaft = cloneTemplate('shaft-template');
    shaft.dataset.elevatorId = String(i);
    shaft.querySelector('.shaft__id').textContent = `#${i + 1}`;
    shafts.appendChild(shaft);
  }

  root.appendChild(labels);
  root.appendChild(shafts);
  root.appendChild(calls);
}

renderSkeleton('.building');
