const { parse } = require("./parser");
// const { pickKeyParsed } = require("./index");

// const pickedKeyParsedResult = pickKeyParsed(
//   `(gasg:("Ford-G" OR "IBM-G" AND "Facebook-G"))`,
//   "gasg"
// );

// console.dir(pickedKeyParsedResult, { depth: null });

const result = parse(`((( tac: ((sunitinib OR sutent ) AND (topical OR surface) AND (composition OR formulat*)) AND text: ((treating* OR curi*) AND ((ocular OR eye OR optic OR opthalmic OR visual) near5 (disorder))) AND tac: (("amd" OR "dme" OR "rvo"))) AND ifi_patstat: (pending OR active OR in-force )) AND pnctry: (AU OR CA OR DE OR EP OR ES OR FR OR GB OR JP OR US))`);

console.dir(result, { depth: null });
