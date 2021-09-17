const { prepareQ } = require("../prepare");

test("single field: should enclose field along with value in parenthesis", () => {
  const query = "desc:(DETECT* ) near5 (CONNECT* near6 SOURCE*)";

  expect(prepareQ(query)).toBe(
    "(desc:(DETECT* ) near5 (CONNECT* near6 SOURCE*))"
  );
});

test("multiple fields: should enclose field along with value in parenthesis", () => {
  const query =
    "((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2";

  expect(prepareQ(query)).toBe(
    "(((desc:(DETECT* near5 (CONNECT* near6 SOURCE*))))) OR (pn:US7420295B2)"
  );
});

test("should return query as it is if no field signature is found", () => {
  const query = "DETECT* near5 (CONNECT* near6 SOURCE*)";

  expect(prepareQ(query)).toBe("DETECT* near5 (CONNECT* near6 SOURCE*)");
});

test('should consider default operator "AND" within value if operator is not specified', () => {
  const query = "desc:DETECT* (CONNECT* SOURCE*)";

  expect(prepareQ(query)).toBe("(desc:DETECT* AND (CONNECT* AND SOURCE*))");
});

test("should not add default operator in case of date fields", () => {
  const query =
    "pd:[16990101 to 20010316] OR ab:[16990101 to 20010316] OR abs:[16990101 to 20010316]";

  expect(prepareQ(query)).toBe(
    "(pd:[16990101 to 20010316]) OR (ab:[16990101 to 20010316]) OR (abs:[16990101 to 20010316])"
  );
});

test("should throw error in case of unbalanced circular brackets", () => {
  const query = `((desc:(DETECT* near5 (CONNECT* near6 SOURCE*))) OR pn:US7420295B2`;

  expect.assertions(2);

  try {
    prepareQ(query);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty("message", "Unbalanced Brackets");
  }
});

test("should not throw error if unbalanced circular brackets are inside quotations", () => {
  const query = `(tac:"((detect" AND (() AND ())) OR () OR (ttl:"c))onnect*" OR ppl*)`;

  expect(prepareQ(query)).toBe(
    `((tac:"((detect" AND (() AND ())) OR ()) OR ((ttl:"c))onnect*" OR ppl*))`
  );
});

test("should not throw error if unbalanced square brackets are inside quotations", () => {
  const query = `(tac:"[[detect" AND (() AND ())) OR () OR (ttl:"connect]]*" OR ppl*)`;

  expect(prepareQ(query)).toBe(
    `((tac:"[[detect" AND (() AND ())) OR ()) OR ((ttl:"connect]]*" OR ppl*))`
  );
});

test("should throw error in case of mismatched brackets", () => {
  const query = `((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pd:(16990101 to 20010316]`;

  expect.assertions(2);

  try {
    prepareQ(query);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty("message", "Unbalanced Brackets");
  }
});

test("should throw error in case of unbalanced square brackets", () => {
  const query = `((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pd:[16990101 to 20010316`;

  expect.assertions(2);

  try {
    prepareQ(query);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty("message", "Unbalanced Brackets");
  }
});

test("should throw error if consective operators are passed", () => {
  expect.assertions(2);

  try {
    prepareQ("(car  ) bus OR near2 autonomous");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty(
      "message",
      "Consective operators Are not allowed"
    );
  }
});

test("should throw error if consective operators are present at the end", () => {
  expect.assertions(2);

  try {
    prepareQ("(car  ) bus OR near2");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty(
      "message",
      "Consective operators Are not allowed"
    );
  }
});
