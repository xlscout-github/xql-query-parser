const { parse } = require("./parser");
const { prepare: preProcess, elasticBuilder } = require("./");

console.dir(
  elasticBuilder(
    `oasgs.name.keyword:(\"ＫＯＮＩＮＫＬＩＪＫＥ ＰＨＩＬＩＰＳ Ｎ．Ｖ．\" OR \"ＢＡＳＦ ＳＥ\" OR \"ＲＯＢＥＲＴ ＢＯＳＣＨ ＧＭＢＨ\" OR \"ＨＵＡＷＥＩ ＴＥＣＨＮＯＬＯＧＩＥＳ ＣＯ．，ＬＴＤ．\" OR \"Ｅ．Ｉ．ＤＵ ＰＯＮＴ ＤＥ ＮＥＭＯＵＲＳ ＡＮＤ ＣＯＭＰＡＮＹ\" OR \"Ｆ． ＨＯＦＦＭＡＮＮ−ＬＡ ＲＯＣＨＥ ＡＫＴＩＥＮＧＥＳＥＬＬＳＣＨＡＦＴ\" OR \"ＴＨＯＭＳＯＮ ＬＩＣＥＮＳＩＮＧ\" OR \"ＡＰＰＬＩＥＤ ＭＡＴＥＲＩＡＬＳ，ＩＮＣＯＲＰＯＲＡＴＥＤ\" OR \"ＩＮＴＥＲＮＡＴＩＯＮＡＬ ＢＵＳＩＮＥＳＳ ＭＡＣＨＩＮＥＳ ＣＯＲＰＯＲＡＴＩＯＮ\" OR \"ＭＥＲＣＫ ＰＡＴＥＮＴ ＧＥＳＥＬＬＳＣＨＡＦＴ ＭＩＴ ＢＥＳＣＨＲＡＥＮＫＴＥＲ ＨＡＦＴＵＮＧ\" OR \"ＩＮＴＥＲＮＡＴＩＯＮＡＬ ＢＵＳＩＮＥＳＳ ＭＡＳＣＨＩＮＥＳ ＣＯＲＰＯＲＡＴＩＯＮ\" OR \"ＴＨＥ ＢＯＥＩＮＧ ＣＯＭＰＡＮＹ\" OR \"日立ＡＳＴＥＭＯ株式会社\" OR \"ＢＥＣＴＯＮ， ＤＩＣＫＩＮＳＯＮ ＡＮＤ ＣＯＭＰＡＮＹ\" OR \"ＢＲＩＳＴＯＬ−ＭＹＥＲＳ ＳＱＵＩＢＢ ＣＯＭＰＡＮＹ\" OR \"ＡＬＩＢＡＢＡ ＧＲＯＵＰ ＨＯＬＤＩＮＧ ＬＩＭＩＴＥＤ\" OR \"ＯＳＲＡＭ ＯＰＴＯ ＳＥＭＩＣＯＮＤＵＣＴＯＲＳ ＧＭＢＨ\" OR \"ＺＴＥ ＣＯＲＰＯＲＡＴＩＯＮ\")`
  ),
  { depth: null }
);

// const query = "pn: (US-5652895-(A))";
// const query = "pn: (US-5652895 ())";
// const query = "pn: (US-5652895 (JP)\"\")";
// const query = "pn: US-5652895-A \"";
const query = 'pn: (US-5652895-A (("()))  ") "uiuiu"))';

console.time("MANUAL");

const queryConfig = preProcess(
  "(((pn:(EP-2137994-A4))) AND ((pn:US-9966065-B2)))",
  { defOpt: "OR" }
);

console.log(queryConfig);

const isPurePN =
  queryConfig.fields.length === 1 &&
  queryConfig.fields[0].trimEnd().slice(0, -1) === "pn" &&
  (queryConfig.operators.size === 0 ||
    (queryConfig.operators.size === 1 && queryConfig.operators.has("OR")));

console.log("IS PURE PN?", isPurePN);

if (isPurePN) {
  // console.log(
  //   "raw query value",
  //   queryConfig.q.slice(
  //     queryConfig.startIndices[0],
  //     queryConfig.endIndices[0] + 1
  //   )
  // );
  const terms = queryConfig.q
    .slice(queryConfig.startIndices[0], queryConfig.endIndices[0] + 1)
    .replace(/[()](?=(?:(?:[^"]*"){2})*[^"]*$)/g, "")
    .split(/\s+or\s+/i);

  console.timeEnd("MANUAL");

  console.dir(
    {
      bool: {
        should: [
          {
            terms: {
              pn: terms,
            },
          },
        ],
      },
    },
    {
      depth: null,
    }
  );

  console.log(
    terms.map((term) => {
      if (term.startsWith('"') && term.endsWith('"')) {
        term = term.slice(1, -1).trim();
        console.log(term);
        if (/[\s()]/.test(term)) {
          throw new Error("invalid");
        }
      }
      return term;
    })
  );
}

// console.time("CORE");

// const result = parse(query, false, {
//   defOpt: "AND",
//   defOptMap: { pn: "OR" },
//   eql: true,
//   // transformFn: (node) => {
//   //   // console.dir(node);
//   //   count++;
//   // },
// });

// console.timeEnd("CORE");

// console.dir(result, {
//   depth: null,
// });
