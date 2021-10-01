const { parse } = require("./parser");
const eql = require("./eql");
const { EQLgenerator } = require("./EQLgenerator");

const result = parse(`"autonomous vehicle" near10 (battery OR charg*)`);

console.dir(result, {
  depth: null,
});

console.dir(EQLgenerator(result), {
  depth: null,
});

console.dir(eql(`"autonomous vehicle" near10 (battery OR charg*)`), {
  depth: null,
});
