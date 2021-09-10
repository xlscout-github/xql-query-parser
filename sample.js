const { parse } = require("./parser");
// pdyear:(([2020 TO *])) AND ipc.grp:(Telefônicas)
console.dir(parse(`pdyear:(([2020 TO *])) AND ipc.grp:(Telefônicas)`), {
  depth: null,
});
