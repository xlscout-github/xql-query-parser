const { parse } = require('./parser')
const { pickKey, getFields } = require('./prepare')
const { EQLgenerator } = require('./EQLgenerator')

function pickKeyParsed (q, field) {
  return pickKey(q, field).map((val) => ({
    ...val,
    parsed: parse(q.substring(val.start, val.end + 1))
  }))
}

function getUniqueFields (q) {
  const { foundwords } = getFields(q)
  return Array.from(new Set(foundwords.map((word) => word.slice(0, -1))))
}

function convertXQLtoEQL (strQry) {
  return EQLgenerator(parse(strQry))
}

function elasticBuilder (q, transformFn) {
  return parse(q, false, { eql: true, transformFn })
}

module.exports = {
  parse,
  pickKey,
  pickKeyParsed,
  getUniqueFields,
  convertXQLtoEQL,
  elasticBuilder
}
