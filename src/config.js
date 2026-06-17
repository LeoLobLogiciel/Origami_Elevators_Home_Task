export const DEFAULTS = Object.freeze({
  FLOORS: 10,
  ELEVATORS: 5,
  FLOOR_DURATION_MS: 800,
  REST_MS: 2000,
  TIME_REFRESH_MS: 1000,
});

export const config = { ...DEFAULTS };

export function resetConfig() {
  Object.assign(config, DEFAULTS);
}
