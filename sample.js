const { parse } = require("./parser");
const eql = require("./eql");
const { EQLgenerator } = require("./EQLgenerator");

const result = parse(
  `(((((tac:((tracking*))) AND epridate: [16990101 TO 20050102]) AND tac:((location*))) AND tac:((request*))) AND tac:((request*)))`
);

console.dir(result, {
  depth: null,
});

console.dir(EQLgenerator(result), {
  depth: null,
});

console.dir(
  eql(
    `(((((tac:((tracking*))) AND epridate: [16990101 TO 20050102]) AND tac:((location*))) AND tac:((request*))) AND tac:((request*)))`
  ),
  {
    depth: null,
  }
);
