/**
 * Live map settings.
 *
 * GTA V world coordinates: +x is east, +y is north. The default bounds below
 * cover the whole playable map (Los Santos in the south, Paleto Bay in the north).
 *
 * Using a real map image:
 *   1. Put the image in /public/map/ (e.g. /public/map/gta5-map.jpg).
 *   2. Set `image` to its path.
 *   3. Set `imageBounds` to the world coordinates of the image's edges. Ways to calibrate:
 *      - Stand at the far west and far east edges shown on the image and note your x.
 *      - Stand at the far north and far south edges and note your y.
 *      (Your coordinates arrive from the game with each position update. Hover a blip to see them.)
 *      Many community maps publish these bounds with the image.
 *
 * Without an image the map draws a coordinate grid with region labels.
 */
export const MAP_CONFIG = {
  image: null as string | null,
  imageBounds: { minX: -4500, maxX: 4500, minY: -4500, maxY: 8500 },
  /** Area shown when the map first opens / on "reset". */
  defaultView: { minX: -4500, maxX: 4500, minY: -4500, maxY: 8500 },
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
