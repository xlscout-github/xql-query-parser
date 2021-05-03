const nearley = require("nearley");
const grammar = require("./grammar");
const prepareQ = require("./prepareQ");
const transform = require("./transform");

const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

// EXAMPLE
// ((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2

try {
  parser.feed(
    prepareQ(
      `((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`
    )
  );

  const res = parser.results;

  if (res.length === 0) {
    throw new Error("NO parsings found"); // incomplete grouping
  } else if (res.length === 1) {
    console.dir(transform(res[0]), { depth: null });
  } else {
    throw new Error("MULTIPLE parsings found"); // unintended recursion
  }
} catch (error) {
  console.log(error);
}
