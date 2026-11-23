/**
 * Live map settings.
 *
 * GTA V world coordinates: +x is east, +y is north.
 *
 * Map images (public/map/):
 *   gta5-atlas.jpg     2080x2656  overview, always loaded
 *   gta5-atlas-hd.jpg  4160x5312  loaded only when zoomed in
 * Both are crops of the "Atlas" style from Flamm64/GTA-V-World-Map
 * (https://github.com/Flamm64/GTA-V-World-Map, free to modify and reuse). Map art © Rockstar Games.
 *
 * `imageBounds` are the world coordinates of the image edges. They come from
 * that project's game -> pixel calibration (0.0503 px per unit at zoom 2) and
 * were checked against landmarks (Humane Labs, Maze Bank Arena, Fort Zancudo,
 * Paleto Bay SO...). Accuracy is roughly ±100 units, about a city block.
 *
 * To use a different image: replace the files (or the paths) and set
 * `imageBounds` to the new image's edges. Set `image` to null to fall back to
 * the grid with region labels.
 */
export const MAP_CONFIG = {
  image: '/map/gta5-atlas.jpg' as string | null,
  /** Sharper image swapped in when one screen pixel covers less than `hdBelowUnitsPerPx` world units. */
  imageHd: '/map/gta5-atlas-hd.jpg' as string | null,
  hdBelowUnitsPerPx: 5,
  imageBounds: { minX: -4885, maxX: 5453, minY: -4594, maxY: 8606 },
  /** Ocean colour of the image, used to fill around it so the edges blend. */
  oceanColor: '#0fa8d2',
  /** Area shown when the map first opens / on "reset". */
  defaultView: { minX: -4000, maxX: 4600, minY: -4200, maxY: 8000 },
  /** Blips older than this (ms) are drawn faded. */
  staleAfterMs: 15_000,
};

/** Approximate region labels for the grid fallback (world coords). */
export const MAP_LABELS: { name: string; x: number; y: number; size?: 'lg' }[] = [
  { name: 'Los Santos', x: -200, y: -900, size: 'lg' },
  { name: 'Blaine County', x: 1500, y: 4300, size: 'lg' },
  { name: 'LSIA', x: -1150, y: -2800 },
  { name: 'Vespucci', x: -1250, y: -1450 },
  { name: 'Vinewood Hills', x: 100, y: 900 },
  { name: 'Chumash', x: -3150, y: 950 },
  { name: 'Fort Zancudo', x: -2200, y: 3100 },
  { name: 'Harmony', x: 1100, y: 2700 },
  { name: 'Grand Senora Desert', x: 1900, y: 2400 },
  { name: 'Sandy Shores', x: 1850, y: 3700 },
  { name: 'Alamo Sea', x: 1100, y: 4100 },
  { name: 'Grapeseed', x: 1700, y: 4850 },
  { name: 'Mount Chiliad', x: 500, y: 5600 },
  { name: 'Paleto Bay', x: -200, y: 6350 },
  { name: 'Palomino Highlands', x: 2600, y: -900 },
];
