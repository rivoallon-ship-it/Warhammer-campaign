const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type TerritoryCoordinate = {
  code: string;
  positionX: number;
  positionY: number;
};

export type TerritoryAdjacency = {
  territoryCode: string;
  adjacentTerritoryCode: string;
};

export function getTerritoryCode(positionX: number, positionY: number) {
  const rowLetter = ROW_LETTERS[positionY - 1];

  if (!rowLetter) {
    throw new Error("Unsupported map height.");
  }

  return `${rowLetter}${positionX}`;
}

export function generateTerritoryCoordinates(width: number, height: number) {
  const coordinates: TerritoryCoordinate[] = [];

  for (let positionY = 1; positionY <= height; positionY += 1) {
    for (let positionX = 1; positionX <= width; positionX += 1) {
      coordinates.push({
        code: getTerritoryCode(positionX, positionY),
        positionX,
        positionY,
      });
    }
  }

  return coordinates;
}

export function generateOrthogonalAdjacencies(width: number, height: number) {
  const adjacencies: TerritoryAdjacency[] = [];

  for (const coordinate of generateTerritoryCoordinates(width, height)) {
    const candidates = [
      { positionX: coordinate.positionX - 1, positionY: coordinate.positionY },
      { positionX: coordinate.positionX + 1, positionY: coordinate.positionY },
      { positionX: coordinate.positionX, positionY: coordinate.positionY - 1 },
      { positionX: coordinate.positionX, positionY: coordinate.positionY + 1 },
    ];

    candidates.forEach((candidate) => {
      if (
        candidate.positionX < 1 ||
        candidate.positionX > width ||
        candidate.positionY < 1 ||
        candidate.positionY > height
      ) {
        return;
      }

      adjacencies.push({
        territoryCode: coordinate.code,
        adjacentTerritoryCode: getTerritoryCode(
          candidate.positionX,
          candidate.positionY,
        ),
      });
    });
  }

  return adjacencies;
}

export function generateHexAdjacencies(width: number, height: number) {
  const adjacencies: TerritoryAdjacency[] = [];

  for (const coordinate of generateTerritoryCoordinates(width, height)) {
    const isEvenRow = coordinate.positionY % 2 === 0;
    const diagonalOffset = isEvenRow ? 1 : -1;
    const candidates = [
      { positionX: coordinate.positionX - 1, positionY: coordinate.positionY },
      { positionX: coordinate.positionX + 1, positionY: coordinate.positionY },
      { positionX: coordinate.positionX, positionY: coordinate.positionY - 1 },
      { positionX: coordinate.positionX, positionY: coordinate.positionY + 1 },
      {
        positionX: coordinate.positionX + diagonalOffset,
        positionY: coordinate.positionY - 1,
      },
      {
        positionX: coordinate.positionX + diagonalOffset,
        positionY: coordinate.positionY + 1,
      },
    ];

    candidates.forEach((candidate) => {
      if (
        candidate.positionX < 1 ||
        candidate.positionX > width ||
        candidate.positionY < 1 ||
        candidate.positionY > height
      ) {
        return;
      }

      adjacencies.push({
        territoryCode: coordinate.code,
        adjacentTerritoryCode: getTerritoryCode(
          candidate.positionX,
          candidate.positionY,
        ),
      });
    });
  }

  return adjacencies;
}

export function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function sortByStableSeed<T>(
  items: T[],
  seed: string,
  getKey: (item: T) => string,
) {
  return [...items].sort((left, right) => {
    const leftHash = stableHash(`${seed}:${getKey(left)}`);
    const rightHash = stableHash(`${seed}:${getKey(right)}`);

    if (leftHash === rightHash) {
      return getKey(left).localeCompare(getKey(right), "fr");
    }

    return leftHash - rightHash;
  });
}
