const { parse } = require("./parser");
// const { EQLgenerator } = require("./EQLgenerator");

let result = parse(`(car  ) bus ("near2" )`);
// (ab:(("自動運転車") OR (Selfdriving car)) NEAR10 (("バッテリー") OR (battery)))
// (rrt OR ratatata) pre2 (shots OR fire OR kill)
// (((asd io) NEAR2 (cde io)))
//const result = parse('(DETECT* nears (CONNECT* prep SOURCE*))');
console.dir(result, { depth: null });

// result = EQLgenerator(result);

// condensed parse
// const result_c = parse(`((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`, true);
// console.dir(result, { depth: null });
// console.dir(result_c, { depth: null });
