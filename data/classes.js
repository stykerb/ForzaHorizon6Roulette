/**
 * data/classes.js
 * -----------------------------------------------------------------------
 * Forza performance classes, lowest to highest. These map to the game's
 * Performance Index (PI) bands and colours - update the ranges here if a
 * future game update ever rebalances them.
 * -----------------------------------------------------------------------
 */
const PERFORMANCE_CLASSES = [
  { id: "d", name: "D", pi: "100-500", color: "#8a8a8a" },
  { id: "c", name: "C", pi: "501-600", color: "#3fae4b" },
  { id: "b", name: "B", pi: "601-700", color: "#e0c930" },
  { id: "a", name: "A", pi: "701-800", color: "#e8912a" },
  { id: "s1", name: "S1", pi: "801-900", color: "#e0402f" },
  { id: "s2", name: "S2", pi: "901-998", color: "#d63b8f" },
  { id: "x", name: "X", pi: "999+", color: "#3b8fe0" },
];

if (typeof module !== "undefined" && module.exports) module.exports = PERFORMANCE_CLASSES;
