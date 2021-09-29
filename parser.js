const nearley = require("nearley");
const grammar = require("./grammar");
const { prepare } = require("./prepare");
const { transform, transform_condense } = require("./transform");

function parse(q, condense = false) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

  parser.feed(prepare(q));

  const res = parser.results;

  // console.dir(res, { depth: null });

  if (res.length === 0) {
    throw new Error("NO parsings found"); // incomplete grouping
  } else {
    if (res[0] === null) throw new Error("Empty grouping expression"); // `()`
    return condense ? transform_condense(res[0]) : transform(res[0]);
  }
}

module.exports = { parse };
