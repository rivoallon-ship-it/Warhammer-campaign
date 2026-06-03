export const MAP_CONFIGS = {
  2: {
    width: 5,
    height: 4,
    template: "hex_v1_2p",
    capitalSlots: ["A1", "D5"],
  },
  3: {
    width: 6,
    height: 5,
    template: "hex_v1_3p",
    capitalSlots: ["A1", "A6", "E3"],
  },
  4: {
    width: 7,
    height: 5,
    template: "hex_v1_4p",
    capitalSlots: ["A1", "A7", "E1", "E7"],
  },
  5: {
    width: 8,
    height: 6,
    template: "hex_v1_5p",
    capitalSlots: ["A1", "A8", "F1", "F8", "C4"],
    fortifiedCapitalSlots: ["C4"],
  },
  6: {
    width: 9,
    height: 6,
    template: "hex_v1_6p",
    capitalSlots: ["A1", "A9", "F1", "F9", "C4", "D6"],
    fortifiedCapitalSlots: ["C4", "D6"],
  },
} as const;

export type PlayerCount = keyof typeof MAP_CONFIGS;

export function isSupportedPlayerCount(value: number): value is PlayerCount {
  return value >= 2 && value <= 6 && Number.isInteger(value);
}

export function getMapConfig(playerCount: PlayerCount) {
  return MAP_CONFIGS[playerCount];
}
