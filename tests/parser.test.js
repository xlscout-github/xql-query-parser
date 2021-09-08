const { parse } = require("../parser");

test("should throw error if empty string is passed", () => {
  expect.assertions(2);

  try {
    parse("");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty("message", "NO parsings found");
  }
});

test('should consider default "text" field if no field is provided explicitly', () => {
  const query = `(DETECT* near5 (CONNECT* pre6 SOURCE*))`;

  expect(parse(query)).toEqual({
    key: "text",
    val: "multi",
    opt: "NEAR",
    span: "5",
    child: [
      { key: "text", val: "DETECT*" },
      {
        key: "text",
        val: "multi",
        opt: "PRE",
        span: "6",
        child: [
          { key: "text", val: "CONNECT*" },
          { key: "text", val: "SOURCE*" },
        ],
      },
    ],
  });
});

test("should correctly parse query provided if operators in lowercase", () => {
  const query = `((desc:(DETECT* near5 (CONNECT* pre6 SOURCE*)))) and (abs: ALPHA* or pn:US7420295B2) not text: ALPHA*`;

  expect(parse(query)).toEqual({
    key: "multi",
    opt: "NOT",
    child: [
      {
        key: "multi",
        opt: "AND",
        child: [
          {
            key: "desc",
            val: "multi",
            opt: "NEAR",
            span: "5",
            child: [
              { key: "desc", val: "DETECT*" },
              {
                key: "desc",
                val: "multi",
                opt: "PRE",
                span: "6",
                child: [
                  { key: "desc", val: "CONNECT*" },
                  { key: "desc", val: "SOURCE*" },
                ],
              },
            ],
          },
          {
            key: "multi",
            opt: "OR",
            child: [
              { key: "abs", val: "ALPHA*" },
              { key: "pn", val: "US7420295B2" },
            ],
          },
        ],
      },
      { key: "text", val: "ALPHA*" },
    ],
  });
});

test("should correctly parse query provided if operators are in uppercase", () => {
  const query = `((desc:(DETECT* NEAR5 (CONNECT* PRE6 SOURCE*)))) AND (abs: ALPHA* OR pn:US7420295B2) NOT text: ALPHA*`;

  expect(parse(query)).toEqual({
    key: "multi",
    opt: "NOT",
    child: [
      {
        key: "multi",
        opt: "AND",
        child: [
          {
            key: "desc",
            val: "multi",
            opt: "NEAR",
            span: "5",
            child: [
              { key: "desc", val: "DETECT*" },
              {
                key: "desc",
                val: "multi",
                opt: "PRE",
                span: "6",
                child: [
                  { key: "desc", val: "CONNECT*" },
                  { key: "desc", val: "SOURCE*" },
                ],
              },
            ],
          },
          {
            key: "multi",
            opt: "OR",
            child: [
              { key: "abs", val: "ALPHA*" },
              { key: "pn", val: "US7420295B2" },
            ],
          },
        ],
      },
      { key: "text", val: "ALPHA*" },
    ],
  });
});

test("should correctly parse string enclosed in quotations", () => {
  const query = `((desc:("DETECT OBSTACLE" near5 ('FEELING PAIN' pre6 XXXTENTACION))))`;

  expect(parse(query)).toEqual({
    key: "desc",
    val: "multi",
    opt: "NEAR",
    span: "5",
    child: [
      { key: "desc", val: '"DETECT OBSTACLE"' },
      {
        key: "desc",
        val: "multi",
        opt: "PRE",
        span: "6",
        child: [
          { key: "desc", val: "'FEELING PAIN'" },
          { key: "desc", val: "XXXTENTACION" },
        ],
      },
    ],
  });
});

test("should correctly parse date query", () => {
  const query = `pd:([16990101 TO 20010316]) OR ab:(([16990101 to 20010316])) OR ab-s:[16990101 to 20010316]`;

  expect(parse(query)).toEqual({
    key: "multi",
    opt: "OR",
    child: [
      {
        key: "multi",
        opt: "OR",
        child: [
          { key: "pd", val: { from: "16990101", to: "20010316" } },
          { key: "ab", val: { from: "16990101", to: "20010316" } },
        ],
      },
      { key: "ab-s", val: { from: "16990101", to: "20010316" } },
    ],
  });
});

test("should correctly parse the query containing asterix character", () => {
  const query = `((desc.*:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`;

  expect(parse(query)).toEqual({
    key: "multi",
    opt: "OR",
    child: [
      {
        key: "desc.*",
        val: "multi",
        span: "5",
        opt: "NEAR",
        child: [
          { key: "desc.*", val: "DETECT*" },
          {
            key: "desc.*",
            val: "multi",
            span: "6",
            opt: "NEAR",
            child: [
              { key: "desc.*", val: "CONNECT*" },
              { key: "desc.*", val: "SOURCE*" },
            ],
          },
        ],
      },
      { key: "pn", val: "US7420295B2" },
    ],
  });
});

test("should correctly parse the query if field signature occur inside quotations", () => {
  const query = `((desc:("DETECT:" near5 (CONNECT* near6 'SOURCE:')))) OR pn:US7420295B2`;

  expect(parse(query)).toEqual({
    key: "multi",
    opt: "OR",
    child: [
      {
        key: "desc",
        val: "multi",
        span: "5",
        opt: "NEAR",
        child: [
          { key: "desc", val: '"DETECT:"' },
          {
            key: "desc",
            val: "multi",
            span: "6",
            opt: "NEAR",
            child: [
              { key: "desc", val: "CONNECT*" },
              { key: "desc", val: "'SOURCE:'" },
            ],
          },
        ],
      },
      { key: "pn", val: "US7420295B2" },
    ],
  });
});

test("should ignore empty grouping expressions", () => {
  const query = `(tac:detect AND (() AND ())) OR () OR (ttl:connect* OR ppl*)`;

  expect(parse(query)).toEqual({
    key: "multi",
    opt: "OR",
    child: [
      { key: "tac", val: "detect" },
      {
        key: "ttl",
        val: "multi",
        opt: "OR",
        child: [
          { key: "ttl", val: "connect*" },
          { key: "ttl", val: "ppl*" },
        ],
      },
    ],
  });
});

test("should throw error if singleton empty brackets are passed", () => {
  expect.assertions(2);

  try {
    parse("()");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty("message", "Empty grouping expression");
  }
});

test("should throw error if combination of empty brackets are passed", () => {
  expect.assertions(2);

  try {
    parse("(() OR ()) AND ()");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty("message", "Empty grouping expressions");
  }
});

test("should parse query if multiple spaces happens to be at the end of a value", () => {
  const query = "(ttl:(  water)    ) AND (ttl:(at er) )";

  expect(parse(query)).toEqual({
    key: "ttl",
    val: "multi",
    opt: "AND",
    child: [
      { key: "ttl", val: "water" },
      {
        key: "ttl",
        val: "multi",
        opt: "AND",
        child: [
          { key: "ttl", val: "at" },
          { key: "ttl", val: "er" },
        ],
      },
    ],
  });
});

test("should parse if query contains various paragraph and sentence proximity operators", () => {
  const query =
    "((ab:(DETECT* NEARP CONNECT* PREP SHOCK) PRES text:MICROWAVE NEARS RADIO*))";

  expect(parse(query)).toEqual({
    key: "multi",
    span: "S",
    opt: "PRE",
    child: [
      {
        key: "ab",
        val: "multi",
        span: "P",
        opt: "PRE",
        child: [
          {
            key: "ab",
            val: "multi",
            span: "P",
            opt: "NEAR",
            child: [
              { key: "ab", val: "DETECT*" },
              { key: "ab", val: "CONNECT*" },
            ],
          },
          { key: "ab", val: "SHOCK" },
        ],
      },
      {
        key: "text",
        val: "multi",
        span: "S",
        opt: "NEAR",
        child: [
          { key: "text", val: "MICROWAVE" },
          { key: "text", val: "RADIO*" },
        ],
      },
    ],
  });
});

test("should parse if single quotes occur inside double quotes or vice versa", () => {
  const query = `((ab:("DETECT' CONNECT'" PREP SHOCK) PRES text:'MICROWAVE" RADIO"'))`;

  expect(parse(query)).toEqual({
    key: "multi",
    span: "S",
    opt: "PRE",
    child: [
      {
        key: "ab",
        val: "multi",
        span: "P",
        opt: "PRE",
        child: [
          { key: "ab", val: `"DETECT' AND CONNECT'"` },
          { key: "ab", val: "SHOCK" },
        ],
      },
      { key: "text", val: `'MICROWAVE" AND RADIO"'` },
    ],
  });
});
