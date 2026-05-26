export function getArmyBasePoints(turnNumber: number) {
  if (turnNumber <= 2) return 750;
  if (turnNumber <= 4) return 1000;
  if (turnNumber <= 6) return 1250;

  return 1500;
}
