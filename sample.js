const { parse } = require("./parser");
// const { pickKeyParsed } = require("./index");

// const pickedKeyParsedResult = pickKeyParsed(
//   `(gasg:("Ford-G" OR "IBM-G" AND "Facebook-G"))`,
//   "gasg"
// );

// console.dir(pickedKeyParsedResult, { depth: null });

const result = parse(`cpc.\\*: (G06F30\\/27 OR A41G5\\/02 OR H01M8\\/04992) OR ipc.\\*: (G06F30\\/27 OR A41G5\\/02 OR H01M8\\/04992)`);

console.dir(result, { depth: null });
