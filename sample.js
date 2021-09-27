const { parse } = require("./parser");
const eql = require("./eql");
const { EQLgenerator } = require("./EQLgenerator");

console.dir(EQLgenerator(parse("text: FRANZ AND  (FRANZ* NEAR3 KOHLER)")), {
  depth: null,
});

console.dir(eql("text: FRANZ AND  (FRANZ* NEAR3 KOHLER)"), {
  depth: null,
});
