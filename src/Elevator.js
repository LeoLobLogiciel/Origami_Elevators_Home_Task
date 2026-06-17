import { config } from './config.js';

const STATES = ['idle', 'moving', 'arrived'];
const MODES = ['operational', 'shabbat', 'oos'];

export class Elevator {
  constructor(id, dispatcher, config = {}) {
    this.id = id;
    this.dispatcher = dispatcher;
    this.config = config;

    this.mode = config.mode ?? 'operational';
    this.pendingMode = null;
    this.autoReturnEnabled = false;

    this.currentFloor = 0;
    this.state = 'idle';
    this.element = null;
    this.shaft = null;
    this.footer = null;

    this._shabbatDirection = 1;
    this._autoReturnTimerId = null;
  }

  get acceptsDispatch() {
    return this.mode === 'operational';
  }

  attach(shaftElement, footerElement) {
    this.shaft = shaftElement;
    this.footer = footerElement;
    this.element = shaftElement.querySelector('.shaft__elevator');
    this.element.style.setProperty('--travel-duration', '0ms');
    this.element.style.setProperty('--floor', '0');
    this._applyStateClass();
    this._setupFooter();
    this._updateModeVisual();
    if (this.mode === 'shabbat') this._shabbatStep();
    else if (this.mode === 'oos' && this.currentFloor !== 0) this._oosTravel();
  }

  _setupFooter() {
    if (!this.footer) return;

    const radios = this.footer.querySelectorAll('.mode-control input[type=radio]');
    radios.forEach(r => {
      r.name = `mode-${this.id}`;
      r.checked = r.value === this.mode;
      r.addEventListener('change', () => {
        if (r.checked) this.setMode(r.value);
      });
    });

    this._autoReturnCheck = this.footer.querySelector('.auto-return__check');
    if (this._autoReturnCheck) {
      this._autoReturnCheck.checked = this.autoReturnEnabled;
      this._autoReturnCheck.addEventListener('change', () => {
        this.setAutoReturnEnabled(this._autoReturnCheck.checked);
      });
    }
  }

  setMode(newMode) {
    if (!MODES.includes(newMode)) throw new Error(`Unknown mode: ${newMode}`);
    if (this.mode === newMode && !this.pendingMode) return;

    if (this.state === 'idle') {
      this.pendingMode = null;
      this._applyMode(newMode);
    } else {
      this.pendingMode = newMode;
    }
    this._reflectModeInUi();
  }

  _applyMode(newMode) {
    const previousMode = this.mode;
    this.mode = newMode;
    this._cancelAutoReturnTimer();
    this._updateModeVisual();
    this._reflectModeInUi();

    if (newMode !== 'operational') {
      this.autoReturnEnabled = false;
      if (this._autoReturnCheck) this._autoReturnCheck.checked = false;
    }

    if (newMode === 'shabbat') {
      this._shabbatStep();
      return;
    }

    if (newMode === 'oos') {
      if (this.currentFloor !== 0) this._oosTravel();
      return;
    }

    // operational
    if (previousMode !== 'operational' && this.state === 'idle') {
      this.dispatcher.onIdle(this);
    }
    if (this.state === 'idle' && this.autoReturnEnabled && this.currentFloor !== 0) {
      this._scheduleAutoReturn();
    }
  }

  _reflectModeInUi() {
    if (!this.footer) return;
    const desired = this.pendingMode ?? this.mode;
    const radios = this.footer.querySelectorAll('.mode-control input[type=radio]');
    radios.forEach(r => { r.checked = r.value === desired; });
    this.footer.classList.toggle('shaft-footer--operational', this.mode === 'operational');
    this.footer.classList.toggle('shaft-footer--pending', !!this.pendingMode);
  }

  _updateModeVisual() {
    if (!this.shaft) return;
    this.shaft.classList.remove('shaft--shabbat', 'shaft--oos');
    if (this.mode === 'shabbat') this.shaft.classList.add('shaft--shabbat');
    if (this.mode === 'oos') this.shaft.classList.add('shaft--oos');
  }

  setAutoReturnEnabled(value) {
    this.autoReturnEnabled = value;
    this._cancelAutoReturnTimer();
    if (value && this.mode === 'operational' && this.state === 'idle' && this.currentFloor !== 0) {
      this._scheduleAutoReturn();
    }
  }

  goTo(targetFloor, opts = {}) {
    if (this.state !== 'idle') {
      throw new Error(`Elevator ${this.id}: goTo called while state=${this.state}`);
    }
    this._cancelAutoReturnTimer();

    const distance = Math.abs(targetFloor - this.currentFloor);
    const durationMs = distance * config.FLOOR_DURATION_MS;
    const start = performance.now();
    const silent = !!opts.silent;
    const shabbat = !!opts.shabbat;

    this.state = 'moving';
    this._applyStateClass();

    this.element.style.setProperty('--travel-duration', `${durationMs}ms`);
    this.element.style.setProperty('--floor', String(targetFloor));

    const onEnd = () => {
      const elapsedMs = performance.now() - start;
      this.currentFloor = targetFloor;
      this.state = 'arrived';
      this._applyStateClass();

      if (silent || shabbat) {
        setTimeout(() => {
          this.state = 'idle';
          this._applyStateClass();
          this._afterInternalTrip({ shabbat });
        }, config.REST_MS);
      } else {
        this.dispatcher.onArrival(this, elapsedMs);
      }
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

      if (this.pendingMode) {
        const next = this.pendingMode;
        this.pendingMode = null;
        this._applyMode(next);
        return;
      }

      if (this.state === 'idle' && this.mode === 'operational' && this.autoReturnEnabled && this.currentFloor !== 0) {
        this._scheduleAutoReturn();
      }
    }, config.REST_MS);
  }

  _afterInternalTrip({ shabbat }) {
    if (this.pendingMode) {
      const next = this.pendingMode;
      this.pendingMode = null;
      this._applyMode(next);
      return;
    }
    if (shabbat && this.mode === 'shabbat') {
      this._shabbatStep();
    }
  }

  _shabbatStep() {
    if (this.state !== 'idle') return;
    let next = this.currentFloor + this._shabbatDirection;
    if (next >= config.FLOORS) {
      this._shabbatDirection = -1;
      next = this.currentFloor + this._shabbatDirection;
    } else if (next < 0) {
      this._shabbatDirection = 1;
      next = this.currentFloor + this._shabbatDirection;
    }
    this.goTo(next, { shabbat: true });
  }

  _oosTravel() {
    if (this.state !== 'idle') return;
    this.goTo(0, { silent: true });
  }

  _scheduleAutoReturn() {
    this._cancelAutoReturnTimer();
    this._autoReturnTimerId = setTimeout(() => {
      this._autoReturnTimerId = null;
      if (this.mode === 'operational' && this.state === 'idle' && this.currentFloor !== 0) {
        this.goTo(0, { silent: true });
      }
    }, config.REST_MS);
  }

  _cancelAutoReturnTimer() {
    if (this._autoReturnTimerId !== null) {
      clearTimeout(this._autoReturnTimerId);
      this._autoReturnTimerId = null;
    }
  }

  _applyStateClass() {
    STATES.forEach(s => this.element.classList.remove(`shaft__elevator--${s}`));
    this.element.classList.add(`shaft__elevator--${this.state}`);
  }
}
