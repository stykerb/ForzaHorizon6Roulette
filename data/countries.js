/**
 * data/countries.js
 * -----------------------------------------------------------------------
 * Countries of origin represented in the FH6 car roster.
 * See data/raceTypes.js for the "how to add an entry" instructions.
 * -----------------------------------------------------------------------
 */
const COUNTRIES = [
  { id: "australia", name: "Australia" },
  { id: "austria", name: "Austria" },
  { id: "canada", name: "Canada" },
  { id: "china", name: "China" },
  { id: "croatia", name: "Croatia" },
  { id: "denmark", name: "Denmark" },
  { id: "france", name: "France" },
  { id: "germany", name: "Germany" },
  { id: "italy", name: "Italy" },
  { id: "japan", name: "Japan" },
  { id: "korea", name: "Korea" },
  { id: "sweden", name: "Sweden" },
  { id: "uk", name: "UK" },
  { id: "usa", name: "USA" },
];

if (typeof module !== "undefined" && module.exports) module.exports = COUNTRIES;
