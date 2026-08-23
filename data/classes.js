/**
 * data/classes.js
 * -----------------------------------------------------------------------
 * Forza Horizon 6 performance classes, lowest to highest, with their PI
 * bands and colours. FH6 changed these from FH5 (added the R class,
 * shifted every band down) - update the ranges here again if a future
 * game update ever rebalances them.
 * -----------------------------------------------------------------------
 */
const PERFORMANCE_CLASSES = [
  { id: "d", name: "D", pi: "100-400", color: "#8a8a8a" },
  { id: "c", name: "C", pi: "401-500", color: "#3fae4b" },
  { id: "b", name: "B", pi: "501-600", color: "#e0c930" },
  { id: "a", name: "A", pi: "601-700", color: "#e8912a" },
  { id: "s1", name: "S1", pi: "701-800", color: "#e0402f" },
  { id: "s2", name: "S2", pi: "801-900", color: "#d63b8f" },
  { id: "r", name: "R", pi: "901-998", color: "#8b3fe0" },
  { id: "x", name: "X", pi: "999+", color: "#3b8fe0" },
];

if (typeof module !== "undefined" && module.exports) module.exports = PERFORMANCE_CLASSES;
