const { parse } = require("./parser");

try {
  const result = parse(
    `((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`
  );
  console.dir(result, { depth: null });
} catch (error) {
  console.log(error);
}
