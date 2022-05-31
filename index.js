const { parse } = require('./parser')
const { pickKey, getFields } = require('./prepare')
const { EQLgenerator } = require('./EQLgenerator')

function pickKeyParsed (q, field, condense, props) {
  return pickKey(q, field).map((val) => ({
    ...val,
    parsed: parse(q.slice(val.start, val.end + 1), condense, props)
  }))
}

function getUniqueFields (q) {
  const { foundwords } = getFields(q)
  return Array.from(new Set(foundwords.map((word) => word.slice(0, -1))))
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
