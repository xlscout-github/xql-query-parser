const esb = require("./esb");

describe("Singleton Queries", () => {
  it("Check Singleton Search Text Query", () => {
    expect(esb("(ttl:(mobile))")).toEqual({
      bool: { must: [{ term: { ttl: "mobile" } }] },
    });
  });

  it("Check Singleton Phrase Text Query in quotes", () => {
    expect(esb('(ttl:("apple grader"))')).toEqual({
      bool: { must: [{ match_phrase: { ttl: "apple grader" } }] },
    });
  });

  it("Check Singleton Search Text Wildcard Query", () => {
    expect(esb("(ttl:(mobi*))")).toEqual({
      bool: {
        must: [
          { wildcard: { ttl: { value: "mobi*", case_insensitive: true } } },
        ],
      },
    });
  });

  it("Check Singleton Search Date Query", () => {
    expect(esb("(pd:[20220218 TO 20220228])")).toEqual({
      bool: {
        must: [{ range: { pd: { gte: "20220218", lte: "20220228" } } }],
      },
    });
  });

  it("Check Singleton Search Date Query with unspecified lower bound", () => {
    expect(esb("(pd:[* TO 20220228])")).toEqual({
      bool: {
        must: [{ range: { pd: { lte: "20220228" } } }],
      },
    });
  });

  it("Check Singleton Search Date Query with unspecified upper bound", () => {
    expect(esb("(pd:[20220218 TO *])")).toEqual({
      bool: {
        must: [{ range: { pd: { gte: "20220218" } } }],
      },
    });
  });
});

describe('"AND" Queries', () => {
  it("Base case", () => {
    expect(esb("(ttl:(mobile AND telephone))")).toEqual({
      bool: {
        must: [{ term: { ttl: "mobile" } }, { term: { ttl: "telephone" } }],
      },
    });
  });

  it('Combined with "OR"', () => {
    expect(esb("(ttl:(mobile OR telephone AND wireless))")).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [{ terms: { ttl: ["mobile", "telephone"] } }],
            },
          },
          { term: { ttl: "wireless" } },
        ],
      },
    });
  });
});

describe('"OR" Queries', () => {
  it("Base case", () => {
    expect(esb("(ttl:(mobile OR telephone))")).toEqual({
      bool: {
        must: [{ terms: { ttl: ["mobile", "telephone"] } }],
      },
    });
  });

  it('Combined with "AND"', () => {
    expect(esb("(ttl:(mobile AND telephone OR wireless))")).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                { term: { ttl: "mobile" } },
                { term: { ttl: "telephone" } },
              ],
            },
          },
          { term: { ttl: "wireless" } },
        ],
      },
    });
  });

  it('Combined with leading "NOT"', () => {
    expect(esb("(ttl:(NOT mobile OR wireless))")).toEqual({
      bool: {
        should: [
          {
            bool: {
              must_not: [{ term: { ttl: "mobile" } }],
            },
          },
          { term: { ttl: "wireless" } },
        ],
      },
    });
  });
});

describe('"NOT" Queries', () => {
  it("Base case", () => {
    expect(esb("(ttl:(mobile NOT telephone))")).toEqual({
      bool: {
        must: [{ term: { ttl: "mobile" } }],
        must_not: [{ term: { ttl: "telephone" } }],
      },
    });
  });

  it('Preceding "NOT"', () => {
    expect(esb("(ttl:(NOT mobile))")).toEqual({
      bool: {
        must_not: [{ term: { ttl: "mobile" } }],
      },
    });
  });
});

describe('"NEAR" Queries', () => {
  it("Base case", () => {
    expect(esb("(ttl:(mobile NEAR2 telephone))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "mobile" } },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "2",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it("With Phrase", () => {
    expect(esb('(ttl:("mobile phone" NEAR2 telephone))')).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "mobile" } },
                      { span_term: { ttl: "phone" } },
                    ],
                    slop: 0,
                    in_order: true,
                  },
                },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "2",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it("With single keyword in Phrase", () => {
    expect(esb('(ttl:("mobile" NEAR2 telephone))')).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "mobile" } },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "2",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it("With Wildcard", () => {
    expect(esb("(ttl:(mobi* NEAR2 telephone))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: { value: "mobi*", case_insensitive: true },
                      },
                    },
                  },
                },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "2",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it("With Sentence Slop", () => {
    expect(esb("(ttl:(mobile NEARS telephone))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "mobile" } },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "15",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it("With Paragraph Slop", () => {
    expect(esb("(ttl:(mobile NEARP telephone))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "mobile" } },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "50",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it("Invalid Operator Present", () => {
    expect.assertions(1);

    try {
      esb("(ttl:(mobile NOT telephone NEAR2 wireless))");
    } catch (error) {
      expect(error).toHaveProperty("message", "Operator NOT Not Allowed!");
    }
  });

  it("Malformed Query combining different fields", () => {
    expect.assertions(1);

    try {
      esb("(ttl:(mobile)) NEAR2 (pa:(wireless))");
    } catch (error) {
      expect(error).toHaveProperty(
        "message",
        "NEAR Operator must be scoped to the same field"
      );
    }
  });

  it('Combined with another "NEAR"', () => {
    expect(esb("(ttl:(mobile NEAR2 telephone NEAR2 wireless))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "mobile" } },
                      { span_term: { ttl: "telephone" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
                { span_term: { ttl: "wireless" } },
              ],
              slop: "2",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it('Combined with "PRE"', () => {
    expect(esb("(ttl:(mobile PRE2 telephone NEAR2 wireless))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "mobile" } },
                      { span_term: { ttl: "telephone" } },
                    ],
                    slop: "2",
                    in_order: true,
                  },
                },
                { span_term: { ttl: "wireless" } },
              ],
              slop: "2",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it('Combined with "OR"', () => {
    expect(esb("(ttl:(mobile OR telephone NEAR2 wireless))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_or: {
                    clauses: [
                      { span_term: { ttl: "mobile" } },
                      { span_term: { ttl: "telephone" } },
                    ],
                  },
                },
                { span_term: { ttl: "wireless" } },
              ],
              slop: "2",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it('Combined with "AND"', () => {
    expect(esb("(ttl:(mobile AND telephone NEAR2 wireless))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "mobile" } },
                { span_term: { ttl: "telephone" } },
                { span_term: { ttl: "wireless" } },
              ],
              slop: "2",
              in_order: false,
            },
          },
        ],
      },
    });
  });
});

describe('"PRE" Queries', () => {
  it("Base case", () => {
    expect(esb("(ttl:(mobile PRE2 telephone))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "mobile" } },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "2",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it("With Phrase", () => {
    expect(esb('(ttl:("mobile phone" PRE2 telephone))')).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "mobile" } },
                      { span_term: { ttl: "phone" } },
                    ],
                    slop: 0,
                    in_order: true,
                  },
                },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "2",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it("With single keyword in Phrase", () => {
    expect(esb('(ttl:("mobile" PRE2 telephone))')).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "mobile" } },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "2",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it("With Wildcard", () => {
    expect(esb("(ttl:(mobi* PRE2 telephone))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: { value: "mobi*", case_insensitive: true },
                      },
                    },
                  },
                },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "2",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it("With Sentence Slop", () => {
    expect(esb("(ttl:(mobile PRES telephone))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "mobile" } },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "15",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it("With Paragraph Slop", () => {
    expect(esb("(ttl:(mobile PREP telephone))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "mobile" } },
                { span_term: { ttl: "telephone" } },
              ],
              slop: "50",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it("Invalid Operator Present", () => {
    expect.assertions(1);

    try {
      esb("(ttl:(mobile NOT telephone PRE2 wireless))");
    } catch (error) {
      expect(error).toHaveProperty("message", "Operator NOT Not Allowed!");
    }
  });

  it("Malformed Query combining different fields", () => {
    expect.assertions(1);

    try {
      esb("(ttl:(mobile)) PRE2 (pa:(wireless))");
    } catch (error) {
      expect(error).toHaveProperty(
        "message",
        "PRE Operator must be scoped to the same field"
      );
    }
  });

  it('Combined with another "PRE"', () => {
    expect(esb("(ttl:(mobile PRE2 telephone PRE2 wireless))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "mobile" } },
                      { span_term: { ttl: "telephone" } },
                    ],
                    slop: "2",
                    in_order: true,
                  },
                },
                { span_term: { ttl: "wireless" } },
              ],
              slop: "2",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it('Combined with "NEAR"', () => {
    expect(esb("(ttl:(mobile NEAR2 telephone PRE2 wireless))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "mobile" } },
                      { span_term: { ttl: "telephone" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
                { span_term: { ttl: "wireless" } },
              ],
              slop: "2",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it('Combined with "OR"', () => {
    expect(esb("(ttl:(mobile OR telephone PRE2 wireless))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_or: {
                    clauses: [
                      { span_term: { ttl: "mobile" } },
                      { span_term: { ttl: "telephone" } },
                    ],
                  },
                },
                { span_term: { ttl: "wireless" } },
              ],
              slop: "2",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it('Combined with "AND"', () => {
    expect(esb("(ttl:(mobile AND telephone PRE2 wireless))")).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "mobile" } },
                { span_term: { ttl: "telephone" } },
                { span_term: { ttl: "wireless" } },
              ],
              slop: "2",
              in_order: true,
            },
          },
        ],
      },
    });
  });
});
