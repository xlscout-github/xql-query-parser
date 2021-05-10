const { parse } = require("../parser");

test("should throw error is empty string is passed, no parsing in found", () => {
  expect.assertions(2);

  try {
    parse("");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty("message", "NO parsings found");
  }
});

test("should throw error if anything other than uppercase or lowercase operators passed", () => {
  expect.assertions(1);

  try {
    parse(
      `((desc:("DETECT OBSTACLE" Near5 ('FEELING PAIN' Pre6 XXXTENTACION))))`
    );
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

test("should throw error if anything other than uppercase or lowercase to seperator for date field is passed", () => {
  expect.assertions(1);

  try {
    parse(`pd:[16990101 To 20010316]`);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

test("should throw error if invalid field seperators are passed", () => {
  expect.assertions(1);

  try {
    parse(`desc--en:DETECT*`);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

test("should parse as text field if no field is provided explicitly", () => {
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

test("should correctly parse query provided, operators in lowercase", () => {
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
  const query = `pd:[16990101 TO 20010316] OR ab:[16990101 to 20010316] OR ab-s:[16990101 to 20010316]`;

  expect(parse(query)).toEqual({
    key: "multi",
    opt: "OR",
    child: [
      {
        key: "multi",
        opt: "OR",
        child: [
          { key: "pd", from: "16990101", to: "20010316" },
          { key: "ab", from: "16990101", to: "20010316" },
        ],
      },
      { key: "ab-s", from: "16990101", to: "20010316" },
    ],
  });
});
