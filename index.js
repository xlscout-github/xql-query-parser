const { parse } = require('./parser')
const { pickKey, getFields } = require('./prepare')
const { EQLgenerator } = require('./EQLgenerator')

function pickKeyParsed (q, field, { condense, defOpt, children, eql, transformFn } = {}) {
  return pickKey(q, field).map((val) => ({
    ...val,
    parsed: parse(q.slice(val.start, val.end + 1), condense, { defOpt, children, eql, transformFn })
  }))
}

function getUniqueFields (q) {
  const { foundwords } = getFields(q)
  return [...new Set(foundwords.map((word) => word.slice(0, -1)))]
}

function convertXQLtoEQL (strQry) {
  return EQLgenerator(parse(strQry))
}

function elasticBuilder (q, transformFn, { defOpt } = {}) {
  return parse(q, false, { defOpt, eql: true, transformFn })
}

module.exports = {
  parse,
  pickKey,
  pickKeyParsed,
  getUniqueFields,
  convertXQLtoEQL,
  elasticBuilder
}
