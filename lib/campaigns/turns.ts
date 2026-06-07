export function getArmyBasePoints(turnNumber: number) {
  return Math.min(Math.max(turnNumber - 1, 0) * 200, 2000);
}
