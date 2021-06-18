const nearley = require("nearley");
const grammar = require("./grammar");
const { prepareQ } = require("./prepare");
const { transform } = require("./transform");

// EXAMPLE
// ((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2

function parse(q) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

  parser.feed(prepareQ(q));

  const res = parser.results;

  if (res.length === 0) {
    throw new Error("NO parsings found"); // incomplete grouping
  } else {
    return transform(res[0]);
  }
}

module.exports = { parse };
