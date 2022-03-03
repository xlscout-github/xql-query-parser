const { parse } = require("./parser");
const eql = require("./eql");
const { EQLgenerator } = require("./EQLgenerator");

const query = `(ttl:("apple banana" PRE2 orange PRE2 ball))`;

const result = parse(query);

console.dir(result, {
  depth: null,
});

console.dir(EQLgenerator(result), {
  depth: null,
});

// console.dir(eql(query), {
//   depth: null,
// });
