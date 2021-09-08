const { parse } = require("./parser");
const { pickKey } = require("./prepare");
const { EQLgenerator } = require("./EQLgenerator");

function pickKeyParsed(q, field) {
  return pickKey(q, field).map((val) => ({
    ...val,
    parsed: parse(q.substring(val.start, val.end + 1)),
  }));
}

function convertXQLtoEQL(strQry) {
  return EQLgenerator(parse(strQry));
}

module.exports = {
  parse,
  pickKeyParsed,
  convertXQLtoEQL,
};
