const { parse } = require("./parser");
const { pickKey } = require("./prepare");

function pickKeyParsed(q, field) {
  const res = pickKey(q, field);

  return res.map((val) => {
    return {
      ...val,
      parsed: parse(q.substring(val.start, val.end + 1)),
    };
  });
}

module.exports = {
  parse,
  pickKeyParsed
};
