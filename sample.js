const { parse } = require("./parser");
const { EQLgenerator } = require("./EQLgenerator");

let result = parse(
  `((( tac: ((sunitinib OR sutent ) AND (topical OR surface) AND (composition OR formulat*)) AND text: ((treating* OR curi*) AND ((ocular OR eye OR optic OR opthalmic OR visual) near5 (disorder))) AND tac: (("amd" OR "dme" OR "rvo"))) AND ifi_patstat: (pending OR active OR in-force )) AND pnctry: (AU OR CA OR DE OR EP OR ES OR FR OR GB OR JP OR US))`
);

console.dir(result, { depth: null });

result = EQLgenerator(result);

console.dir(result, { depth: null });

// condensed parse
// const result_c = parse(`((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`, true);

// console.dir(result_c, { depth: null });
