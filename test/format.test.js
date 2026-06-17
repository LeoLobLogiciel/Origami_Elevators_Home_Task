import { describe, it, expect } from 'vitest';
import { formatTime } from '../src/format.js';

describe('formatTime', () => {
  it('formats sub-minute durations as "X sec"', () => {
    expect(formatTime(0)).toBe('0 sec');
    expect(formatTime(999)).toBe('0 sec');
    expect(formatTime(5000)).toBe('5 sec');
    expect(formatTime(42500)).toBe('42 sec');
    expect(formatTime(59999)).toBe('59 sec');
  });

  it('formats exactly one minute as "1 min. 0 sec."', () => {
    expect(formatTime(60000)).toBe('1 min. 0 sec.');
  });

  it('formats minutes + seconds', () => {
    expect(formatTime(90000)).toBe('1 min. 30 sec.');
    expect(formatTime(125400)).toBe('2 min. 5 sec.');
    expect(formatTime(610000)).toBe('10 min. 10 sec.');
  });

  it('truncates fractional seconds (does not round up)', () => {
    expect(formatTime(4999)).toBe('4 sec');
    expect(formatTime(5500)).toBe('5 sec');
  });
});
