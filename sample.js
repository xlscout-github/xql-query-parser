const { parse } = require("./parser");

const result = parse(`(_v_:0.5.0)`);

console.dir(result, { depth: null });
