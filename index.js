const { parse } = require("./parser");
const { pickKey, getFields } = require("./prepare");
const { EQLgenerator } = require("./EQLgenerator");

function pickKeyParsed(q, field) {
  return pickKey(q, field).map((val) => ({
    ...val,
    parsed: parse(q.substring(val.start, val.end + 1)),
  }));
}

function getUniqueFields(q) {
  const { foundwords } = getFields(q);
  return Array.from(new Set(foundwords));
}

function convertXQLtoEQL(strQry) {
  return EQLgenerator(parse(strQry));
}

module.exports = {
  parse,
  pickKeyParsed,
  getUniqueFields,
  convertXQLtoEQL,
};
