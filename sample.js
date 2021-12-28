const { parse } = require("./parser");
const eql = require("./eql");
const { EQLgenerator } = require("./EQLgenerator");
const {pickKeyParsed} = require("./")

const result = parse(
  `(text:NOT (apple))`
);

console.dir(result, {
  depth: null,
});

console.dir(EQLgenerator(result), {
  depth: null,
});

// console.dir(
//   eql(
//     `(((((tac:((tracking*))) AND epridate: [16990101 TO 20050102]) AND tac:((location*))) AND tac:((request*))) AND tac:((request*)))`
//   ),
//   {
//     depth: null,
//   }
// );
