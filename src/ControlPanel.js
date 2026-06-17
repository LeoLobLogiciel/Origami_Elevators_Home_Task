import { config, DEFAULTS, resetConfig } from './config.js';

const STRUCTURE_KEYS = ['FLOORS', 'ELEVATORS'];
const LIVE_KEYS = ['FLOOR_DURATION_MS', 'REST_MS'];

const LABELS = {
  FLOORS: 'Floors',
  ELEVATORS: 'Elevators',
  FLOOR_DURATION_MS: 'Floor duration (ms)',
  REST_MS: 'Rest delay (ms)',
};

const BOUNDS = {
  FLOORS: { min: 3, max: 15, step: 1 },
  ELEVATORS: { min: 1, max: 10, step: 1 },
  FLOOR_DURATION_MS: { min: 200, max: 2000, step: 100 },
  REST_MS: { min: 500, max: 5000, step: 100 },
};

export class ControlPanel {
  constructor(rootElement, building) {
    this.root = rootElement;
    this.building = building;
    this._dirtyStructure = false;
    this._inputs = {};

    this._render();
    this._bindEvents();
  }

  _render() {
    const panel = document.createElement('aside');
    panel.className = 'control-panel';
    panel.innerHTML = `
      <h2 class="control-panel__title">Settings</h2>
      <fieldset class="control-panel__group">
        <legend>Building (needs Apply)</legend>
        ${STRUCTURE_KEYS.map(k => this._renderRow(k)).join('')}
        <button type="button" class="control-panel__apply" disabled>Apply</button>
      </fieldset>
      <fieldset class="control-panel__group">
        <legend>Live</legend>
        ${LIVE_KEYS.map(k => this._renderRow(k)).join('')}
      </fieldset>
      <button type="button" class="control-panel__reset">Reset to defaults</button>
    `;
    this.root.appendChild(panel);
    this.panel = panel;
    this.applyBtn = panel.querySelector('.control-panel__apply');
    this.resetBtn = panel.querySelector('.control-panel__reset');
    panel.querySelectorAll('input[data-key]').forEach(input => {
      this._inputs[input.dataset.key] = input;
    });
  }

  _renderRow(key) {
    const { min, max, step } = BOUNDS[key];
    return `
      <label class="control-row control-row--slider">
        <span class="control-row__label">${LABELS[key]}</span>
        <input
          type="range"
          class="control-row__slider"
          data-key="${key}"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${config[key]}"
        />
        <output class="control-row__value" data-output-for="${key}">${config[key]}</output>
      </label>`;
  }

  _bindEvents() {
    STRUCTURE_KEYS.forEach(key => {
      this._inputs[key].addEventListener('input', () => {
        this._dirtyStructure = true;
        this.applyBtn.disabled = false;
        this._updateOutput(key);
      });
    });

    LIVE_KEYS.forEach(key => {
      this._inputs[key].addEventListener('input', () => {
        const v = parseInt(this._inputs[key].value, 10);
        if (!this._validate(key, v)) return;
        config[key] = v;
        this._updateOutput(key);
      });
    });

    this.applyBtn.addEventListener('click', () => {
      let ok = true;
      STRUCTURE_KEYS.forEach(key => {
        const v = parseInt(this._inputs[key].value, 10);
        if (!this._validate(key, v)) { ok = false; return; }
        config[key] = v;
      });
      if (!ok) return;
      this.building.rebuild();
      this._dirtyStructure = false;
      this.applyBtn.disabled = true;
    });

    this.resetBtn.addEventListener('click', () => {
      resetConfig();
      Object.entries(this._inputs).forEach(([key, input]) => {
        input.value = String(DEFAULTS[key]);
        this._updateOutput(key);
      });
      this.building.rebuild();
      this._dirtyStructure = false;
      this.applyBtn.disabled = true;
    });
  }

  _updateOutput(key) {
    const output = this.panel.querySelector(`[data-output-for="${key}"]`);
    if (output) output.textContent = this._inputs[key].value;
  }

  _validate(key, value) {
    const { min, max } = BOUNDS[key];
    if (!Number.isFinite(value) || value < min || value > max) {
      this._inputs[key].value = String(config[key]);
      return false;
    }
    return true;
  }
}
