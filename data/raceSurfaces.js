/**
 * data/raceSurfaces.js
 * -----------------------------------------------------------------------
 * Groups data/raceTypes.js ids into the real-world FH "surfaces" a
 * Championship (3 races run back to back with one car) picks from - a
 * championship can mix Circuit and Sprint variants of the same surface
 * (e.g. Road Racing - Circuit and Road Racing - Sprint), but never crosses
 * surfaces unless Anarchy Mode is on.
 *
 * Touge Battle and Drag Racing deliberately have no entry here - FH6 never
 * builds a multi-race Championship out of either, so the Championship
 * generator (js/app.js) never picks them, in either mode.
 *
 * HOW TO ADD A NEW ENTRY: same pattern as every other data file. `typeIds`
 * references one or more ids in data/raceTypes.js.
 * -----------------------------------------------------------------------
 */
const RACE_SURFACES = [
  { id: "road", name: "Road Racing", typeIds: ["road-circuit", "road-sprint"] },
  { id: "street", name: "Street Racing", typeIds: ["street-racing"] },
  { id: "dirt", name: "Dirt Racing", typeIds: ["dirt-trail", "dirt-scramble"] },
  { id: "cross-country", name: "Cross Country", typeIds: ["cross-country", "cross-country-circuit"] },
];

if (typeof module !== "undefined" && module.exports) module.exports = RACE_SURFACES;
