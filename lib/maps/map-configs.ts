export const MAP_CONFIGS = {
  2: { width: 3, height: 3, template: "auto_2p", capitalSlots: ["A1", "C3"] },
  3: {
    width: 4,
    height: 3,
    template: "auto_3p",
    capitalSlots: ["A1", "A4", "C2"],
  },
  4: {
    width: 4,
    height: 4,
    template: "auto_4p",
    capitalSlots: ["A1", "A4", "D1", "D4"],
  },
  5: {
    width: 5,
    height: 4,
    template: "auto_5p",
    capitalSlots: ["A1", "A5", "D1", "D5", "B3"],
    fortifiedCapitalSlots: ["B3"],
  },
  6: {
    width: 6,
    height: 4,
    template: "auto_6p",
    capitalSlots: ["A1", "A6", "D1", "D6", "B3", "C4"],
    fortifiedCapitalSlots: ["B3", "C4"],
  },
} as const;

export type PlayerCount = keyof typeof MAP_CONFIGS;

export function isSupportedPlayerCount(value: number): value is PlayerCount {
  return value >= 2 && value <= 6 && Number.isInteger(value);
}

export function getMapConfig(playerCount: PlayerCount) {
  return MAP_CONFIGS[playerCount];
}
