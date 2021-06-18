const { parse } = require("./parser");
// const { pickKeyParsed } = require("./index");

// const pickedKeyParsedResult = pickKeyParsed(
//   `(gasg:("Ford-G" OR "IBM-G" AND "Facebook-G"))`,
//   "gasg"
// );

// console.dir(pickedKeyParsedResult, { depth: null });

const result = parse(`pd:[16990101 TO 20010316] OR ab:[16990101 to 20010316] OR ab-s:[16990101 to 20010316]`);

console.dir(result, { depth: null });
