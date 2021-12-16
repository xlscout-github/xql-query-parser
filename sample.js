// const { parse } = require("./parser");
const eql = require("./eql");
// const { EQLgenerator } = require("./EQLgenerator");

// const result = parse(`NOT xlpat-litig:*`);

// console.dir(result, {
//   depth: null,
// });

// console.dir(EQLgenerator(result), {
//   depth: null,
// });

console.dir(eql(`ttl: motor OR NOT NOT NOT auto`), {
  depth: null,
});
