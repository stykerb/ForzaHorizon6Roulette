/**
 * data/classes.js
 * -----------------------------------------------------------------------
 * Forza Horizon 6 performance classes, lowest to highest, with their PI
 * bands and colours. FH6 changed these from FH5 (added the R class,
 * shifted every band down) - update the ranges here again if a future
 * game update ever rebalances them.
 *
 * `color` matches each class's in-game HUD icon color (gray is reserved
 * in-game for the "unknown/locked" tile, not D).
 * -----------------------------------------------------------------------
 */
const PERFORMANCE_CLASSES = [
  { id: "d", name: "D", pi: "100-400", color: "#29abe2" },
  { id: "c", name: "C", pi: "401-500", color: "#ffc72c" },
  { id: "b", name: "B", pi: "501-600", color: "#f7941d" },
  { id: "a", name: "A", pi: "601-700", color: "#ed1c4c" },
  { id: "s1", name: "S1", pi: "701-800", color: "#9b4fdb" },
  { id: "s2", name: "S2", pi: "801-900", color: "#3b6fd4" },
  { id: "r", name: "R", pi: "901-998", color: "#e0299b" },
  { id: "x", name: "X", pi: "999+", color: "#39b54a" },
];

if (typeof module !== "undefined" && module.exports) module.exports = PERFORMANCE_CLASSES;
