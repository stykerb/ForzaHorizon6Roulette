/**
 * data/raceTypes.js
 * -----------------------------------------------------------------------
 * Race types that can be spun by the "Race Type" wheel. These ids also
 * double as the filter categories for the "Roll a Specific Race" section
 * (see data/individualRaces.js) - each individual race is tagged with one
 * of the `id`s below via its own `typeId` field.
 *
 * `color` matches each type's in-game category color (Road Racing/Cross
 * Country/Touge/Dirt each cover two ids here - Circuit+Sprint, etc. - and
 * share one color, same as in-game). Drag Racing uses a plain red rather
 * than its in-game pink/magenta, kept deliberately distinct from Dirt's
 * orange.
 *
 * HOW TO ADD A NEW ENTRY: see data/races.js.../ same pattern as every
 * other data file - copy an entry, give it a unique `id` (never reused or
 * renamed once shipped), fill in `name`/`desc`, save.
 * -----------------------------------------------------------------------
 */
const RACE_TYPES = [
  { id: "road-circuit", name: "Road Racing - Circuit", desc: "Multi-lap tarmac circuit race.", color: "#2f7fd6" },
  { id: "road-sprint", name: "Road Racing - Sprint", desc: "Point-to-point tarmac race.", color: "#2f7fd6" },
  { id: "street-racing", name: "Street Racing", desc: "Underground night point-to-point sprint through city streets.", color: "#a83fc9" },
  { id: "touge-battle", name: "Touge Battle", desc: "One-on-one mountain pass battle, uphill or downhill.", color: "#1f9e9e" },
  { id: "drag-racing", name: "Drag Racing", desc: "Straight-line strip race.", color: "#d6392f" },
  { id: "dirt-trail", name: "Dirt Racing - Trail", desc: "Race along unpaved trails and forest roads.", color: "#e07b1f" },
  { id: "dirt-scramble", name: "Dirt Racing - Scramble", desc: "Loose, chaotic off-road sprint over rough terrain.", color: "#e07b1f" },
  { id: "cross-country", name: "Cross Country", desc: "Open-terrain, point-to-point off-road race with minimal boundaries.", color: "#2f9e52" },
  { id: "cross-country-circuit", name: "Cross Country - Circuit", desc: "Lapped off-road circuit with minimal boundaries.", color: "#2f9e52" },
];

if (typeof module !== "undefined" && module.exports) module.exports = RACE_TYPES;
