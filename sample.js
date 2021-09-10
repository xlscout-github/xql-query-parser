const { parse } = require("./parser");
// const { EQLgenerator } = require("./EQLgenerator");

let result = parse(`pdyear:(([2020 TO *])) AND ipc.grp:(G06F30)`);

console.dir(result, { depth: null });

// result = EQLgenerator(result);

// condensed parse
// const result_c = parse(`((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`, true);

// console.dir(result_c, { depth: null });
