const nearley = require("nearley");
const grammar = require("./grammar");
const { prepare } = require("./prepare");
const { transform, transform_condense } = require("./transform");

function parse(q, condense = false) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

  parser.feed(prepare(q));

  const res = parser.results;

  // console.dir(res, { depth: null });

  if (res[res.length - 1] === null) {
    throw new Error("Empty grouping expression"); // `()`
  }

  return condense
    ? transform_condense(res[res.length - 1])
    : transform(res[res.length - 1]);
}

module.exports = { parse };
