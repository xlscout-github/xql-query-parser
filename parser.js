const nearley = require('nearley')
const grammar = require('./grammar')
const { prepare } = require('./prepare')
const { transform, transform_condense } = require('./transform')

function parse (q, condense = false, opt = { children: true, eql: false, transformFn: null }) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))

  parser.feed(prepare(q))

  const [tree] = parser.results

  // console.dir(tree, { depth: null })

  return condense ? transform_condense(tree) : transform(tree, opt)
}

module.exports = { parse }
