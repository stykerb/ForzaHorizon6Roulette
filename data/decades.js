/**
 * data/decades.js
 * -----------------------------------------------------------------------
 * Car model decades that can be spun by the roulette.
 * See data/raceTypes.js for the "how to add an entry" instructions.
 * -----------------------------------------------------------------------
 */
const DECADES = [
  { id: "1930s", name: "1930s" },
  { id: "1940s", name: "1940s" },
  { id: "1950s", name: "1950s" },
  { id: "1960s", name: "1960s" },
  { id: "1970s", name: "1970s" },
  { id: "1980s", name: "1980s" },
  { id: "1990s", name: "1990s" },
  { id: "2000s", name: "2000s" },
  { id: "2010s", name: "2010s" },
  { id: "2020s", name: "2020s" },
  { id: "concept-future", name: "Concept / Future" },
];

if (typeof module !== "undefined" && module.exports) module.exports = DECADES;
