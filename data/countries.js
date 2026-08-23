/**
 * data/countries.js
 * -----------------------------------------------------------------------
 * Countries of origin represented in the FH6 car roster.
 * See data/races.js for the "how to add an entry" instructions.
 * -----------------------------------------------------------------------
 */
const COUNTRIES = [
  { id: "japan", name: "Japan" },
  { id: "usa", name: "United States" },
  { id: "germany", name: "Germany" },
  { id: "italy", name: "Italy" },
  { id: "uk", name: "United Kingdom" },
  { id: "france", name: "France" },
  { id: "sweden", name: "Sweden" },
  { id: "south-korea", name: "South Korea" },
  { id: "czech-republic", name: "Czech Republic" },
  { id: "spain", name: "Spain" },
  { id: "netherlands", name: "Netherlands" },
  { id: "croatia", name: "Croatia" },
  { id: "australia", name: "Australia" },
  { id: "china", name: "China" },
  { id: "russia", name: "Russia" },
];

if (typeof module !== "undefined" && module.exports) module.exports = COUNTRIES;
