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

test("should correctly parse query provided", () => {
  const query = `((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2`;

  expect(parse(query)).toEqual({
    key: "multi",
    opt: "OR",
    child: [
      {
        key: "desc",
        val: "multi",
        opt: "NEAR5",
        child: [
          { key: "desc", val: "DETECT*" },
          {
            key: "desc",
            val: "multi",
            opt: "NEAR6",
            child: [
              { key: "desc", val: "CONNECT*" },
              { key: "desc", val: "SOURCE*" },
            ],
          },
        ],
      },
      { key: "pn", val: "US7420295B2" },
    ],
  });
});

test("should correctly parse date query", () => {
  const query = `pd:[16990101 to 20010316] OR ab:[16990101 to 20010316] OR abs:[16990101 to 20010316]`;

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
      { key: "abs", from: "16990101", to: "20010316" },
    ],
  });
});
