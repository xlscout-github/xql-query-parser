const { parse } = require("./parser");

console.dir(parse(`pdyear:(([2020 TO *])) AND ipc.grp:(Telefônicas)`), {
  depth: null,
});
