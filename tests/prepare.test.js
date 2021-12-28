const { prepare } = require("../prepare");

test("single field: should enclose field along with value in parenthesis", () => {
  const query = "desc:(DETECT* ) near5 (CONNECT* near6 SOURCE*)";

  expect(prepare(query)).toBe(
    "((desc:(DETECT* ) near5 (CONNECT* near6 SOURCE*)))"
  );
});

test("multiple fields: should enclose field along with value in parenthesis", () => {
  const query =
    "((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2";

  expect(prepare(query)).toBe(
    "((((desc:(DETECT* near5 (CONNECT* near6 SOURCE*))))) OR (pn:US7420295B2))"
  );
});

test("should return query as it is if no field signature is found", () => {
  const query = "DETECT* near5 (CONNECT* near6 SOURCE*)";

  expect(prepare(query)).toBe("(DETECT* near5 (CONNECT* near6 SOURCE*))");
});

test('should consider default operator "AND" within value if operator is not specified', () => {
  const query = "desc:DETECT* (CONNECT* SOURCE*)";

  expect(prepare(query)).toBe("((desc:DETECT* AND (CONNECT* AND SOURCE*)))");
});

test("should not add default operator in case of date fields", () => {
  const query =
    "pd:[16990101 to 20010316] OR ab:[16990101 to 20010316] OR abs:[16990101 to 20010316]";

  expect(prepare(query)).toBe(
    "((pd:[16990101 to 20010316]) OR (ab:[16990101 to 20010316]) OR (abs:[16990101 to 20010316]))"
  );
});

test("should throw error in case of unbalanced circular brackets", () => {
  const query = `((desc:(DETECT* near5 (CONNECT* near6 SOURCE*))) OR pn:US7420295B2`;

  expect.assertions(2);

  try {
    prepare(query);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty("message", "Unbalanced Brackets");
  }
});

test("should not throw error if unbalanced circular brackets are inside quotations", () => {
  const query = `(tac:"((detect") OR (ttl:"c))onnect*" OR ppl*)`;

  expect(prepare(query)).toBe(
    `(((tac:"((detect")) OR ((ttl:"c))onnect*" OR ppl*)))`
  );
});

test("should not throw error if unbalanced square brackets are inside quotations", () => {
  const query = `(tac:"[[detect") OR (ttl:"connect]]*" OR ppl*)`;

  expect(prepare(query)).toBe(
    `(((tac:"[[detect")) OR ((ttl:"connect]]*" OR ppl*)))`
  );
});

test("should throw error in case of mismatched brackets", () => {
  const query = `((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pd:(16990101 to 20010316]`;

  expect.assertions(2);

  try {
    prepare(query);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty("message", "Unbalanced Brackets");
  }
});

test("should throw error in case of unbalanced square brackets", () => {
  const query = `((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pd:[16990101 to 20010316`;

  expect.assertions(2);

  try {
    prepare(query);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty("message", "Unbalanced Brackets");
  }
});

test("should throw error if consecutive operators are present", () => {
  expect.assertions(2);

  try {
    prepare("(car  ) bus OR near2 autonomous");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty(
      "message",
      "consecutive operators are not allowed"
    );
  }
});

test("should throw error if consecutive operators are present at the end", () => {
  expect.assertions(2);

  try {
    prepare("(car  ) bus OR near2");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty(
      "message",
      "consecutive operators are not allowed"
    );
  }
});

test("should throw error if trailing operators are present", () => {
  expect.assertions(2);

  try {
    prepare("(car  ) bus (near2 )");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty(
      "message",
      "trailing operators are not allowed"
    );
  }
});

test("should convert tilde proximity searches, if phrase is in the begining", () => {
  const query = `(text:( ("FRANZ KOHLER"~3) OR KOHLER))`;

  expect(prepare(query)).toBe(`(((text:( ((FRANZ NEAR3 KOHLER)) OR KOHLER))))`);
});

test("should convert tilde proximity searches, if phrase is at the end", () => {
  const query = `(text:(FRANZ AND "FRANZ KOHLER"~3))`;

  expect(prepare(query)).toBe(`(((text:(FRANZ AND (FRANZ NEAR3 KOHLER)))))`);
});

test("should convert tilde proximity searches, if phrase is at the end and the term before it is not a operator", () => {
  const query = `(text:(FRANZ AND KOHLER ("FRANZ KOHLER"~3)))`;

  expect(prepare(query)).toBe(
    `(((text:(FRANZ AND KOHLER AND ((FRANZ NEAR3 KOHLER))))))`
  );
});

test("should throw error if single term is specified in tilde proximity search", () => {
  expect.assertions(2);

  try {
    prepare(`(text:(FRANZ AND "FRANZ"~3))`);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty(
      "message",
      "Proximity search requires at least 2 terms"
    );
  }
});

test("should convert tilde proximity searches, if phrase is in the middle", () => {
  const query = `(text:(FRANZ OR "FRANZ KOHLER"~3 OR KOHLER))`;

  expect(prepare(query)).toBe(
    `(((text:(FRANZ OR (FRANZ NEAR3 KOHLER) OR KOHLER))))`
  );
});

test("should convert tilde proximity searches, if phrase is in the middle and the term before it is not a operator", () => {
  const query = `(text:(FRANZ ("FRANZ KOHLER"~3) OR KOHLER))`;

  expect(prepare(query)).toBe(
    `(((text:(FRANZ AND ((FRANZ NEAR3 KOHLER)) OR KOHLER))))`
  );
});
