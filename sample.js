const { parse } = require("./parser");

const result = parse(`((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`);

console.dir(result, { depth: null });

const result_c = parse(`((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`, true);

console.dir(result_c, { depth: null });
