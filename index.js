const { parse } = require('./parser')
const { prepare, pickKey, getFields } = require('./prepare')
const { EQLgenerator } = require('./EQLgenerator')

// pickKeyParsed parsing a portion of query narrowed down by field provided,
// It returns an array as a field can be present in various sections of the query.
// Along with the parsed out it returns the subject field, its value,
// the start and end indices of the subquery.
function pickKeyParsed (q, field, { condense, defOpt, defOptMap, children, eql, transformFn } = {}) {
  return pickKey(q, field).map((val) => ({
    ...val,
    parsed: parse(q.slice(val.start, val.end + 1), condense, { defOpt, defOptMap, children, eql, transformFn })
  }))
}

// getUniqueFields returns unique fields in a query
function getUniqueFields (q) {
  const { words } = getFields(q)
  return [...new Set(words.map((word) => word.trimEnd().slice(0, -1)))]
}

// @deprecated since version 3, generates elastic search boolean query for the input query.
function convertXQLtoEQL (strQry) {
  return EQLgenerator(parse(strQry))
}

// elasticBuilder is a helper func for invoking parse with some preset arguments,
// It returns elastic search boolean query based on query and configuration options provided.
function elasticBuilder (q, transformFn, { defOpt, defOptMap } = {}) {
  return parse(q, false, { defOpt, defOptMap, eql: true, transformFn })
}

module.exports = {
  parse,
  prepare,
  pickKey,
  pickKeyParsed,
  getUniqueFields,
  convertXQLtoEQL,
  elasticBuilder
}
