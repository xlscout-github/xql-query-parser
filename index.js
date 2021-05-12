const { parse } = require("./parser");

try {
  const result = parse(`name:/joh?n(ath[oa]n)/ jhon OR desc: /78909/ 89/20 AND abs: none/*`);
  console.dir(result, { depth: null });
} catch (error) {
  console.log(error);
}
