const { parse } = require("./parser");

// core parse

//const result = parse('(DETECT* nears (CONNECT* prep SOURCE*))');

const res= parse("(abc nearps xyz)");
console.dir(res, { depth: null });

// condensed parse
// const result_c = parse(`((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`, true);

// console.dir(result_c, { depth: null });
