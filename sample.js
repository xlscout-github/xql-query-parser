const { parse } = require("./parser");
const eql = require("./eql");
const { EQLgenerator } = require("./EQLgenerator");

let result = parse("(human near2 pet) OR (shots OR fire OR kill)");

console.dir(result, { depth: null });

result = EQLgenerator(result);

console.dir(result, { depth: null });

console.dir(eql("(human near2 pet) OR (shots OR fire OR kill)"), {
  depth: null,
});
