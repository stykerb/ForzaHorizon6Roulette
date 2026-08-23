/**
 * data/seasons.js
 * -----------------------------------------------------------------------
 * Festival seasons that can be spun by the roulette. Independent of every
 * other category - no cascade, no weighting (there's no "car count" to
 * weight by here), just a plain equal-odds pick.
 * See data/raceTypes.js for the "how to add an entry" instructions.
 * -----------------------------------------------------------------------
 */
const SEASONS = [
  { id: "spring", name: "Spring" },
  { id: "summer", name: "Summer" },
  { id: "autumn", name: "Autumn" },
  { id: "winter", name: "Winter" },
];

if (typeof module !== "undefined" && module.exports) module.exports = SEASONS;
