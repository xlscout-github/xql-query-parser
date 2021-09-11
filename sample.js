const { parse } = require("./parser");
const { EQLgenerator } = require("./EQLgenerator");

let result = parse(
  `((ttl:((smart pre1 (watch OR watches)) NEAR5 (wearable* OR device*))) AND pd: [20000101 TO 20210910])`
);

//const result = parse('(DETECT* nears (CONNECT* prep SOURCE*))');
console.dir(result, { depth: null });

result = EQLgenerator(result);

// condensed parse
// const result_c = parse(`((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`, true);
console.log(JSON.stringify(result));
// console.dir(result_c, { depth: null });
