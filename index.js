const { parse } = require('./parser')
const { prepare, pickKey, getFields } = require('./prepare')
const { EQLgenerator } = require('./EQLgenerator')

function pickKeyParsed (q, field, { condense, defOpt, defOptMap, children, eql, transformFn } = {}) {
  return pickKey(q, field).map((val) => ({
    ...val,
    parsed: parse(q.slice(val.start, val.end + 1), condense, { defOpt, defOptMap, children, eql, transformFn })
  }))
}

function getUniqueFields (q) {
  const { words } = getFields(q)
  return [...new Set(words.map((word) => word.slice(0, -1)))]
}

function convertXQLtoEQL (strQry) {
  return EQLgenerator(parse(strQry))
}

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
