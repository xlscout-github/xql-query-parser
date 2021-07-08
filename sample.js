const { parse } = require("./parser");
// const { pickKeyParsed } = require("./index");

// const pickedKeyParsedResult = pickKeyParsed(
//   `(gasg:("Ford-G" OR "IBM-G" AND "Facebook-G"))`,
//   "gasg"
// );

// console.dir(pickedKeyParsedResult, { depth: null });

const result = parse(`(_v:0.5.0)`);

console.dir(result, { depth: null });
