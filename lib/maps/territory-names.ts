import type { TerritoryType } from "@/types/campaign";

export const TERRITORY_NAMES: Record<TerritoryType, string[]> = {
  capital: [
    "Bastion du Nord",
    "Citadelle de l'Est",
    "Forteresse de l'Ouest",
    "Porte du Sud",
    "Bastion Central",
    "Rempart des Cendres",
  ],
  dragon: [
    "Nid des Dragons",
    "Pic des Cendres",
    "Caverne du Vieux Wyrm",
    "Crete des Ecailles",
    "Sanctuaire des Ailes",
  ],
  giant: [
    "Camp des Geants",
    "Plaine des Titans",
    "Taverne des Ossements",
    "Gorge du Colosse",
    "Marteau des Terres Brisees",
  ],
  village: [
    "Village Brule",
    "Hameau des Brumes",
    "Marche des Exiles",
    "Refuge des Pecheurs",
    "Poste des Cendres",
  ],
  ruins: [
    "Ruines Celestes",
    "Temple Englouti",
    "Sanctuaire Fendu",
    "Tombeau des Rois Perdus",
    "Autel des Couronnes",
  ],
  fort: [
    "Fort du Tonnerre",
    "Bastion Rouge",
    "Muraille des Vents",
    "Tour de Guet Brisee",
    "Rempart des Eclats",
  ],
  magic_tower: [
    "Tour Arcanique",
    "Observatoire d'Azyr",
    "Fleche des Orages",
    "Spire des Astres",
  ],
  wild: [
    "Foret des Murmures",
    "Canyon Rouge",
    "Marais Hurlant",
    "Landes Grises",
    "Bois des Lueurs",
  ],
};

export function getTerritoryName(type: TerritoryType, index: number) {
  const names = TERRITORY_NAMES[type];

  return names[index % names.length];
}
