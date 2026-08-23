/**
 * data/raceTypes.js
 * -----------------------------------------------------------------------
 * Race types that can be spun by the "Race Type" wheel. These ids also
 * double as the filter categories for the "Roll a Specific Race" section
 * (see data/individualRaces.js) - each individual race is tagged with one
 * of the `id`s below via its own `typeId` field.
 *
 * HOW TO ADD A NEW ENTRY: see data/races.js.../ same pattern as every
 * other data file - copy an entry, give it a unique `id` (never reused or
 * renamed once shipped), fill in `name`/`desc`, save.
 * -----------------------------------------------------------------------
 */
const RACE_TYPES = [
  { id: "road-circuit", name: "Road Racing - Circuit", desc: "Multi-lap tarmac circuit race." },
  { id: "road-sprint", name: "Road Racing - Sprint", desc: "Point-to-point tarmac race." },
  { id: "street-racing", name: "Street Racing", desc: "Underground night point-to-point sprint through city streets." },
  { id: "touge-battle", name: "Touge Battle", desc: "One-on-one mountain pass battle, uphill or downhill." },
  { id: "drag-racing", name: "Drag Racing", desc: "Straight-line strip race." },
  { id: "dirt-trail", name: "Dirt Racing - Trail", desc: "Race along unpaved trails and forest roads." },
  { id: "dirt-scramble", name: "Dirt Racing - Scramble", desc: "Loose, chaotic off-road sprint over rough terrain." },
  { id: "cross-country", name: "Cross Country", desc: "Open-terrain, point-to-point off-road race with minimal boundaries." },
  { id: "cross-country-circuit", name: "Cross Country - Circuit", desc: "Lapped off-road circuit with minimal boundaries." },
];

if (typeof module !== "undefined" && module.exports) module.exports = RACE_TYPES;
