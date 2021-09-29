const { parse } = require("./parser");
const eql = require("./eql");
const { EQLgenerator } = require("./EQLgenerator");

const result = parse(`(text:( "FRANZ KOHLER"~3 OR KOHLER))`);

console.dir(result, {
  depth: null,
});

console.dir(EQLgenerator(result), {
  depth: null,
});

console.dir(eql(`(text:("FRANZ KOHLER"~3 OR KOHLER))`), {
  depth: null,
});
