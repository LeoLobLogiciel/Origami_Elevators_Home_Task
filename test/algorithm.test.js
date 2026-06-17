import { describe, it, expect } from 'vitest';
import { pickClosest } from '../src/algorithm.js';

describe('pickClosest', () => {
  it('picks the elevator with the smallest distance to the target', () => {
    const elevators = [
      { id: 0, currentFloor: 0 },
      { id: 1, currentFloor: 5 },
      { id: 2, currentFloor: 9 },
    ];
    expect(pickClosest(elevators, 4)).toBe(elevators[1]);
    expect(pickClosest(elevators, 8)).toBe(elevators[2]);
    expect(pickClosest(elevators, 1)).toBe(elevators[0]);
  });

  it('breaks ties by smallest array index', () => {
    const elevators = [
      { id: 0, currentFloor: 2 },
      { id: 1, currentFloor: 4 },
    ];
    // Floor 3 is equidistant from both — should pick index 0.
    expect(pickClosest(elevators, 3)).toBe(elevators[0]);
  });

  it('returns the same elevator when target equals its floor', () => {
    const elevators = [
      { id: 0, currentFloor: 7 },
      { id: 1, currentFloor: 2 },
    ];
    expect(pickClosest(elevators, 7)).toBe(elevators[0]);
  });

  it('throws when the input list is empty', () => {
    expect(() => pickClosest([], 3)).toThrow();
  });
});
