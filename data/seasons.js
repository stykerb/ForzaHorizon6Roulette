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
  { id: "spring", name: "Spring", color: "#8bc34a" },
  { id: "summer", name: "Summer", color: "#ff9800" },
  { id: "autumn", name: "Autumn", color: "#8b5a2b" },
  { id: "winter", name: "Winter", color: "#7ec8e3" },
];

if (typeof module !== "undefined" && module.exports) module.exports = SEASONS;
