export function pickClosest(elevators, targetFloor) {
  if (elevators.length === 0) {
    throw new Error('pickClosest: no elevators provided');
  }
  let best = elevators[0];
  let bestDist = Math.abs(best.currentFloor - targetFloor);
  for (let i = 1; i < elevators.length; i++) {
    const d = Math.abs(elevators[i].currentFloor - targetFloor);
    if (d < bestDist) {
      best = elevators[i];
      bestDist = d;
    }
  }
  return best;
}
