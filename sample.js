const { parse } = require("./parser");
const eql = require("./eql");
const { EQLgenerator } = require("./EQLgenerator");

let result = parse("text: FRANZ AND  (FRANZ* NEAR3 KOHLER)");

console.dir(result, { depth: null });

result = EQLgenerator(result);

console.dir(result, { depth: null });

console.dir(eql("text: FRANZ AND  (FRANZ* NEAR3 KOHLER)"), {
  depth: null,
});
