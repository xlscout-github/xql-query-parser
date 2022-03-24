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
          {
            wildcard: {
              ttl: {
                value: "mobi*",
                case_insensitive: true,
                rewrite: "top_terms_10000",
              },
            },
          },
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
                        ttl: {
                          value: "mobi*",
                          case_insensitive: true,
                          rewrite: "top_terms_1000",
                        },
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
                        ttl: {
                          value: "mobi*",
                          case_insensitive: true,
                          rewrite: "top_terms_1000",
                        },
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

describe("Miscellaneous Queries", () => {
  it("#1", () => {
    expect(
      esb(
        "(ttl:((((Carrot OR juice) OR (banana NEAR3 shake)) NEAR3 (Fruit* OR Vegetable*))))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_or: {
                    clauses: [
                      {
                        span_or: {
                          clauses: [
                            { span_term: { ttl: "carrot" } },
                            { span_term: { ttl: "juice" } },
                          ],
                        },
                      },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "banana" } },
                            { span_term: { ttl: "shake" } },
                          ],
                          slop: "3",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  span_or: {
                    clauses: [
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "Fruit*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "Vegetable*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              ],
              slop: "3",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it("#2", () => {
    expect(
      esb(
        "(ttl:(((Fruit* OR Vegetable*) NEAR3 ((Carrot OR juice) OR (banana NEAR3 shake)))))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_or: {
                    clauses: [
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "Fruit*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "Vegetable*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
                {
                  span_or: {
                    clauses: [
                      {
                        span_or: {
                          clauses: [
                            { span_term: { ttl: "carrot" } },
                            { span_term: { ttl: "juice" } },
                          ],
                        },
                      },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "banana" } },
                            { span_term: { ttl: "shake" } },
                          ],
                          slop: "3",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
              ],
              slop: "3",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it("#3", () => {
    expect(
      esb(
        "(ttl:((((Carrot OR juice) OR (banana NEAR3 shake)) AND (Fruit* OR Vegetable*))))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [{ terms: { ttl: ["Carrot", "juice"] } }],
                  },
                },
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "banana" } },
                            { span_term: { ttl: "shake" } },
                          ],
                          slop: "3",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            bool: {
              should: [
                {
                  wildcard: {
                    ttl: {
                      value: "Fruit*",
                      case_insensitive: true,
                      rewrite: "top_terms_10000",
                    },
                  },
                },
                {
                  wildcard: {
                    ttl: {
                      value: "Vegetable*",
                      case_insensitive: true,
                      rewrite: "top_terms_10000",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#4", () => {
    expect(
      esb(
        "(ttl:((((Carrot OR juice) OR (banana NEAR3 shake)) AND (Fruit* OR Vegetable*)) NOT (papaya OR melon OR lemon OR plant*)))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          must: [{ terms: { ttl: ["Carrot", "juice"] } }],
                        },
                      },
                      {
                        bool: {
                          must: [
                            {
                              span_near: {
                                clauses: [
                                  { span_term: { ttl: "banana" } },
                                  { span_term: { ttl: "shake" } },
                                ],
                                slop: "3",
                                in_order: false,
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        wildcard: {
                          ttl: {
                            value: "Fruit*",
                            case_insensitive: true,
                            rewrite: "top_terms_10000",
                          },
                        },
                      },
                      {
                        wildcard: {
                          ttl: {
                            value: "Vegetable*",
                            case_insensitive: true,
                            rewrite: "top_terms_10000",
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
        must_not: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [{ terms: { ttl: ["papaya", "melon", "lemon"] } }],
                  },
                },
                {
                  wildcard: {
                    ttl: {
                      value: "plant*",
                      case_insensitive: true,
                      rewrite: "top_terms_10000",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#5", () => {
    expect(
      esb(
        "(ttl:((((Carrot OR juice) OR (banana NEAR3 shake)) AND (Fruit* OR Vegetable*)) NOT ((papaya OR melon OR lemon) NEAR4 (plant*))))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          must: [{ terms: { ttl: ["Carrot", "juice"] } }],
                        },
                      },
                      {
                        bool: {
                          must: [
                            {
                              span_near: {
                                clauses: [
                                  { span_term: { ttl: "banana" } },
                                  { span_term: { ttl: "shake" } },
                                ],
                                slop: "3",
                                in_order: false,
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        wildcard: {
                          ttl: {
                            value: "Fruit*",
                            case_insensitive: true,
                            rewrite: "top_terms_10000",
                          },
                        },
                      },
                      {
                        wildcard: {
                          ttl: {
                            value: "Vegetable*",
                            case_insensitive: true,
                            rewrite: "top_terms_10000",
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
        must_not: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      {
                        span_or: {
                          clauses: [
                            {
                              span_or: {
                                clauses: [
                                  { span_term: { ttl: "papaya" } },
                                  { span_term: { ttl: "melon" } },
                                ],
                              },
                            },
                            { span_term: { ttl: "lemon" } },
                          ],
                        },
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "plant*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                    ],
                    slop: "4",
                    in_order: false,
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#6", () => {
    expect(
      esb("((ttl:(smart NEAR2 (watch OR watches))) AND ttl:(heart NEAR2 rate))")
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "smart" } },
                      {
                        span_or: {
                          clauses: [
                            { span_term: { ttl: "watch" } },
                            { span_term: { ttl: "watches" } },
                          ],
                        },
                      },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "heart" } },
                      { span_term: { ttl: "rate" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#7", () => {
    expect(
      esb(
        "(((ttl:(smart NEAR2 (watch OR watches))) NOT ttl:(heart AND (rate OR pulse* OR oxygen))) AND pd: [20220101 TO 20220307])"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            {
                              span_or: {
                                clauses: [
                                  { span_term: { ttl: "watch" } },
                                  { span_term: { ttl: "watches" } },
                                ],
                              },
                            },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
              ],
              must_not: [
                {
                  bool: {
                    must: [
                      { term: { ttl: "heart" } },
                      {
                        bool: {
                          should: [
                            {
                              bool: {
                                should: [
                                  { term: { ttl: "rate" } },
                                  {
                                    wildcard: {
                                      ttl: {
                                        value: "pulse*",
                                        case_insensitive: true,
                                        rewrite: "top_terms_10000",
                                      },
                                    },
                                  },
                                ],
                              },
                            },
                            { term: { ttl: "oxygen" } },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          { range: { pd: { gte: "20220101", lte: "20220307" } } },
        ],
      },
    });
  });

  it("#8", () => {
    expect(
      esb(
        "(ttl:(((vegetable*) NEAR15 (juice*)) NEARP ((Fruit* OR Vegetable*) NEARS (plant*))))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "vegetable*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "juice*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                    ],
                    slop: "15",
                    in_order: false,
                  },
                },
                {
                  span_near: {
                    clauses: [
                      {
                        span_or: {
                          clauses: [
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: "Fruit*",
                                      case_insensitive: true,
                                      rewrite: "top_terms_1000",
                                    },
                                  },
                                },
                              },
                            },
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: "Vegetable*",
                                      case_insensitive: true,
                                      rewrite: "top_terms_1000",
                                    },
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "plant*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                    ],
                    slop: "15",
                    in_order: false,
                  },
                },
              ],
              slop: "50",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it("#9", () => {
    expect(
      esb(
        "((ttl:(patent NEAR5 (artificial NEAR2 intelligen*))) OR ttl:(patent NEAR5 (machine NEAR2 learn*)))"
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "patent" } },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "artificial" } },
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: "intelligen*",
                                      case_insensitive: true,
                                      rewrite: "top_terms_1000",
                                    },
                                  },
                                },
                              },
                            },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                    slop: "5",
                    in_order: false,
                  },
                },
              ],
            },
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "patent" } },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "machine" } },
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: "learn*",
                                      case_insensitive: true,
                                      rewrite: "top_terms_1000",
                                    },
                                  },
                                },
                              },
                            },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                    slop: "5",
                    in_order: false,
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#10", () => {
    expect(
      esb(
        "(((ttl:(patent NEARS (artificial PRE2 intelligen*))) OR ttl:(patent NEARP (machine PRE2 learn*))) AND pd: [20150101 TO 20220307])"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "patent" } },
                            {
                              span_near: {
                                clauses: [
                                  { span_term: { ttl: "artificial" } },
                                  {
                                    span_multi: {
                                      match: {
                                        wildcard: {
                                          ttl: {
                                            value: "intelligen*",
                                            case_insensitive: true,
                                            rewrite: "top_terms_1000",
                                          },
                                        },
                                      },
                                    },
                                  },
                                ],
                                slop: "2",
                                in_order: true,
                              },
                            },
                          ],
                          slop: "15",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "patent" } },
                            {
                              span_near: {
                                clauses: [
                                  { span_term: { ttl: "machine" } },
                                  {
                                    span_multi: {
                                      match: {
                                        wildcard: {
                                          ttl: {
                                            value: "learn*",
                                            case_insensitive: true,
                                            rewrite: "top_terms_1000",
                                          },
                                        },
                                      },
                                    },
                                  },
                                ],
                                slop: "2",
                                in_order: true,
                              },
                            },
                          ],
                          slop: "50",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          { range: { pd: { gte: "20150101", lte: "20220307" } } },
        ],
      },
    });
  });

  it("#11", () => {
    expect(
      esb(
        "(ttl:((A*) PRE10 ((veg*) NEAR15 (juice*) NEARP (Veg*) NEARS (plant*))))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: {
                          value: "A*",
                          case_insensitive: true,
                          rewrite: "top_terms_1000",
                        },
                      },
                    },
                  },
                },
                {
                  span_near: {
                    clauses: [
                      {
                        span_near: {
                          clauses: [
                            {
                              span_near: {
                                clauses: [
                                  {
                                    span_multi: {
                                      match: {
                                        wildcard: {
                                          ttl: {
                                            value: "veg*",
                                            case_insensitive: true,
                                            rewrite: "top_terms_1000",
                                          },
                                        },
                                      },
                                    },
                                  },
                                  {
                                    span_multi: {
                                      match: {
                                        wildcard: {
                                          ttl: {
                                            value: "juice*",
                                            case_insensitive: true,
                                            rewrite: "top_terms_1000",
                                          },
                                        },
                                      },
                                    },
                                  },
                                ],
                                slop: "15",
                                in_order: false,
                              },
                            },
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: "Veg*",
                                      case_insensitive: true,
                                      rewrite: "top_terms_1000",
                                    },
                                  },
                                },
                              },
                            },
                          ],
                          slop: "50",
                          in_order: false,
                        },
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "plant*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                    ],
                    slop: "15",
                    in_order: false,
                  },
                },
              ],
              slop: "10",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it("#12", () => {
    expect(
      esb(
        "(ttl:((A) PRE10 ((veg*) NEAR15 (juice*) NEARP (Veg*) NEARS (plant*))))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "a" } },
                {
                  span_near: {
                    clauses: [
                      {
                        span_near: {
                          clauses: [
                            {
                              span_near: {
                                clauses: [
                                  {
                                    span_multi: {
                                      match: {
                                        wildcard: {
                                          ttl: {
                                            value: "veg*",
                                            case_insensitive: true,
                                            rewrite: "top_terms_1000",
                                          },
                                        },
                                      },
                                    },
                                  },
                                  {
                                    span_multi: {
                                      match: {
                                        wildcard: {
                                          ttl: {
                                            value: "juice*",
                                            case_insensitive: true,
                                            rewrite: "top_terms_1000",
                                          },
                                        },
                                      },
                                    },
                                  },
                                ],
                                slop: "15",
                                in_order: false,
                              },
                            },
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: "Veg*",
                                      case_insensitive: true,
                                      rewrite: "top_terms_1000",
                                    },
                                  },
                                },
                              },
                            },
                          ],
                          slop: "50",
                          in_order: false,
                        },
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "plant*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                    ],
                    slop: "15",
                    in_order: false,
                  },
                },
              ],
              slop: "10",
              in_order: true,
            },
          },
        ],
      },
    });
  });

  it("#13", () => {
    expect(esb('(ttl:("c" NEARP engine*))')).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: "c" } },
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: {
                          value: "engine*",
                          case_insensitive: true,
                          rewrite: "top_terms_1000",
                        },
                      },
                    },
                  },
                },
              ],
              slop: "50",
              in_order: false,
            },
          },
        ],
      },
    });
  });

  it("#14", () => {
    expect(esb("(xlpat-prob.stat:(efficiency NEAR5 cost NEAR5 time))")).toEqual(
      {
        bool: {
          must: [
            {
              span_near: {
                clauses: [
                  {
                    span_near: {
                      clauses: [
                        { span_term: { "xlpat-prob.stat": "efficiency" } },
                        { span_term: { "xlpat-prob.stat": "cost" } },
                      ],
                      slop: "5",
                      in_order: false,
                    },
                  },
                  { span_term: { "xlpat-prob.stat": "time" } },
                ],
                slop: "5",
                in_order: false,
              },
            },
          ],
        },
      }
    );
  });

  it("#15", () => {
    expect(
      esb("((inv:(Michael OR Jonas)) AND ttl:(wheel PRE1 loader*))")
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [{ terms: { inv: ["Michael", "Jonas"] } }],
            },
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: "wheel" } },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: "loader*",
                                case_insensitive: true,
                                rewrite: "top_terms_1000",
                              },
                            },
                          },
                        },
                      },
                    ],
                    slop: "1",
                    in_order: true,
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#16", () => {
    expect(
      esb("((inv:(Michael OR Jonas)) AND pa:(caterpillar OR Komatsu OR CNH))")
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [{ terms: { inv: ["Michael", "Jonas"] } }],
            },
          },
          {
            bool: {
              must: [{ terms: { pa: ["caterpillar", "Komatsu", "CNH"] } }],
            },
          },
        ],
      },
    });
  });

  it("#17", () => {
    expect(
      esb("((inv:(Michael AND Jonas)) AND pa:(caterpillar OR Komatsu OR CNH))")
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [{ term: { inv: "Michael" } }, { term: { inv: "Jonas" } }],
            },
          },
          {
            bool: {
              must: [{ terms: { pa: ["caterpillar", "Komatsu", "CNH"] } }],
            },
          },
        ],
      },
    });
  });

  it("#18", () => {
    expect(
      esb("((inv:(Michael AND Jonas)) NOT pa:(caterpillar OR Komatsu OR CNH))")
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [{ term: { inv: "Michael" } }, { term: { inv: "Jonas" } }],
            },
          },
        ],
        must_not: [
          {
            bool: {
              must: [{ terms: { pa: ["caterpillar", "Komatsu", "CNH"] } }],
            },
          },
        ],
      },
    });
  });

  it("#19", () => {
    expect(
      esb("((inv:(Michael OR Jonas)) NOT pa:(caterpillar OR Komatsu OR CNH))")
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [{ terms: { inv: ["Michael", "Jonas"] } }],
            },
          },
        ],
        must_not: [
          {
            bool: {
              must: [{ terms: { pa: ["caterpillar", "Komatsu", "CNH"] } }],
            },
          },
        ],
      },
    });
  });

  it("#20", () => {
    expect(
      esb("((inv:(Michael AND Jonas)) OR cited.pn:(KR-101275147-B1))")
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [{ term: { inv: "Michael" } }, { term: { inv: "Jonas" } }],
            },
          },
          { term: { "cited.pn": "KR-101275147-B1" } },
        ],
      },
    });
  });

  it("#21", () => {
    expect(
      esb("(xlpat-litig.defs.name:(caterpillar OR Komatsu OR CNH))")
    ).toEqual({
      bool: {
        must: [
          {
            terms: {
              "xlpat-litig.defs.name": ["caterpillar", "Komatsu", "CNH"],
            },
          },
        ],
      },
    });
  });

  it("#22", () => {
    expect(
      esb(
        "((ttl:((smart NEAR2 watch) AND (pulse OR rate))) AND (cpc:(a61b5) OR ic:(a61b5)))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
          {
            bool: {
              should: [{ term: { cpc: "a61b5" } }, { term: { ic: "a61b5" } }],
            },
          },
        ],
      },
    });
  });

  it("#23", () => {
    expect(
      esb(
        "(((cpc:(a61b5) OR ic:(a61b5))) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [{ term: { cpc: "a61b5" } }, { term: { ic: "a61b5" } }],
            },
          },
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#24", () => {
    expect(
      esb(
        "((ttl:((smart NEAR2 watch) AND (pulse OR rate))) OR (cpc:(a61b5/02 AND G04B47/06 AND G04G21/02) OR ic:(a61b5/02 AND G04B47/06 AND G04G21/02)))"
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        bool: {
                          must: [
                            { term: { cpc: "a61b5/02" } },
                            { term: { cpc: "G04B47/06" } },
                          ],
                        },
                      },
                      { term: { cpc: "G04G21/02" } },
                    ],
                  },
                },
                {
                  bool: {
                    must: [
                      {
                        bool: {
                          must: [
                            { term: { ic: "a61b5/02" } },
                            { term: { ic: "G04B47/06" } },
                          ],
                        },
                      },
                      { term: { ic: "G04G21/02" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#25", () => {
    expect(
      esb(
        "(((cpc:(a61b5/02 AND G04B47/06 AND G04G21/02) OR ic:(a61b5/02 AND G04B47/06 AND G04G21/02))) OR ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        bool: {
                          must: [
                            { term: { cpc: "a61b5/02" } },
                            { term: { cpc: "G04B47/06" } },
                          ],
                        },
                      },
                      { term: { cpc: "G04G21/02" } },
                    ],
                  },
                },
                {
                  bool: {
                    must: [
                      {
                        bool: {
                          must: [
                            { term: { ic: "a61b5/02" } },
                            { term: { ic: "G04B47/06" } },
                          ],
                        },
                      },
                      { term: { ic: "G04G21/02" } },
                    ],
                  },
                },
              ],
            },
          },
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#26", () => {
    expect(
      esb(
        "(((ttl:((smart NEAR2 watch) AND (pulse OR rate))) OR (cpc:(a61b5/02 AND G04B47/06 AND G04G21/02) OR ic:(a61b5/02 AND G04B47/06 AND G04G21/02))) AND ttl:(energ*))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        bool: {
                          must: [
                            {
                              span_near: {
                                clauses: [
                                  { span_term: { ttl: "smart" } },
                                  { span_term: { ttl: "watch" } },
                                ],
                                slop: "2",
                                in_order: false,
                              },
                            },
                          ],
                        },
                      },
                      {
                        bool: {
                          must: [{ terms: { ttl: ["pulse", "rate"] } }],
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          must: [
                            {
                              bool: {
                                must: [
                                  { term: { cpc: "a61b5/02" } },
                                  { term: { cpc: "G04B47/06" } },
                                ],
                              },
                            },
                            { term: { cpc: "G04G21/02" } },
                          ],
                        },
                      },
                      {
                        bool: {
                          must: [
                            {
                              bool: {
                                must: [
                                  { term: { ic: "a61b5/02" } },
                                  { term: { ic: "G04B47/06" } },
                                ],
                              },
                            },
                            { term: { ic: "G04G21/02" } },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            wildcard: {
              ttl: {
                value: "energ*",
                case_insensitive: true,
                rewrite: "top_terms_10000",
              },
            },
          },
        ],
      },
    });
  });

  it("#27", () => {
    expect(
      esb(
        "((ttl:((smart NEAR2 watch) AND (pulse OR rate))) NOT (cpc:(a61b5/02 AND G04B47/06 AND G04G21/02) OR ic:(a61b5/02 AND G04B47/06 AND G04G21/02)))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
        must_not: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        bool: {
                          must: [
                            { term: { cpc: "a61b5/02" } },
                            { term: { cpc: "G04B47/06" } },
                          ],
                        },
                      },
                      { term: { cpc: "G04G21/02" } },
                    ],
                  },
                },
                {
                  bool: {
                    must: [
                      {
                        bool: {
                          must: [
                            { term: { ic: "a61b5/02" } },
                            { term: { ic: "G04B47/06" } },
                          ],
                        },
                      },
                      { term: { ic: "G04G21/02" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#28", () => {
    expect(
      esb(
        "(((cpc:(a61b5/02 AND G04B47/06 AND G04G21/02) OR ic:(a61b5/02 AND G04B47/06 AND G04G21/02))) NOT ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        bool: {
                          must: [
                            { term: { cpc: "a61b5/02" } },
                            { term: { cpc: "G04B47/06" } },
                          ],
                        },
                      },
                      { term: { cpc: "G04G21/02" } },
                    ],
                  },
                },
                {
                  bool: {
                    must: [
                      {
                        bool: {
                          must: [
                            { term: { ic: "a61b5/02" } },
                            { term: { ic: "G04B47/06" } },
                          ],
                        },
                      },
                      { term: { ic: "G04G21/02" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
        must_not: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#29", () => {
    expect(
      esb("((ttl:((smart NEAR2 watch) AND (pulse OR rate))) AND casgs:(boe))")
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
          { term: { casgs: "boe" } },
        ],
      },
    });
  });

  it("#30", () => {
    expect(
      esb("((casgs:(boe)) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))")
    ).toEqual({
      bool: {
        must: [
          { term: { casgs: "boe" } },
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#31", () => {
    expect(
      esb("((ttl:((smart NEAR2 watch) AND (pulse OR rate))) NOT casgs:(boe))")
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
        must_not: [{ term: { casgs: "boe" } }],
      },
    });
  });

  it("#32", () => {
    expect(
      esb(
        "((casgs:(FINNOVATE NEAR2 GROUP)) NOT ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: "finnovate" } },
                      { span_term: { casgs: "group" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
        ],
        must_not: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#33", () => {
    expect(
      esb(
        "((ttl:((smart NEAR2 watch) AND (pulse OR rate))) OR casgs:(FINNOVATE NEAR2 GROUP))"
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: "finnovate" } },
                      { span_term: { casgs: "group" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#34", () => {
    expect(
      esb(
        "((casgs:(FINNOVATE NEAR2 GROUP)) OR ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: "finnovate" } },
                      { span_term: { casgs: "group" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#35", () => {
    expect(
      esb(
        "((ttl:((smart NEAR2 watch) AND (pulse OR rate))) AND pn:(US20200069200A1))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
          { term: { pn: "US20200069200A1" } },
        ],
      },
    });
  });

  it("#36", () => {
    expect(
      esb(
        "((pn:(US20200069200A1)) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        must: [
          { term: { pn: "US20200069200A1" } },
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#37", () => {
    expect(
      esb(
        "((ttl:((smart NEAR2 watch) AND (pulse OR rate))) OR pn:(US20210403048A1))"
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
          { term: { pn: "US20210403048A1" } },
        ],
      },
    });
  });

  it("#38", () => {
    expect(
      esb(
        "((pn:(US20200069200A1)) OR ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        should: [
          { term: { pn: "US20200069200A1" } },
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#39", () => {
    expect(
      esb(
        "((ttl:((smart NEAR2 watch) AND (pulse OR rate))) NOT pn:(US20210403048A1))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
        must_not: [{ term: { pn: "US20210403048A1" } }],
      },
    });
  });

  it("#40", () => {
    expect(
      esb(
        "((pn:(US20210403048A1)) NOT ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        must: [{ term: { pn: "US20210403048A1" } }],
        must_not: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#41", () => {
    expect(
      esb(
        "((ttl:((smart NEAR2 watch) AND (pulse OR rate))) AND epridate: [20000101 TO 20220308])"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
          { range: { epridate: { gte: "20000101", lte: "20220308" } } },
        ],
      },
    });
  });

  it("#42", () => {
    expect(
      esb(
        "((ttl:((smart NEAR2 watch) AND (pulse OR rate))) AND pd: [20000101 TO 20220308])"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
          { range: { pd: { gte: "20000101", lte: "20220308" } } },
        ],
      },
    });
  });

  it("#43", () => {
    expect(
      esb(
        "((pd: [20000101 TO 20220308]) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        must: [
          { range: { pd: { gte: "20000101", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#44", () => {
    expect(
      esb(
        "((ad: [20000101 TO 20220308]) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        must: [
          { range: { ad: { gte: "20000101", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#45", () => {
    expect(
      esb(
        "((epridate: [20000101 TO 20220308]) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        must: [
          { range: { epridate: { gte: "20000101", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#46", () => {
    expect(
      esb(
        "((epridate: [20220201 TO 20220308]) OR ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        should: [
          { range: { epridate: { gte: "20220201", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#47", () => {
    expect(
      esb(
        "((epridate: [20220201 TO 20220308]) NOT ttl:((smart NEAR2 watch) AND (pulse OR rate)))"
      )
    ).toEqual({
      bool: {
        must: [{ range: { epridate: { gte: "20220201", lte: "20220308" } } }],
        must_not: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: "smart" } },
                            { span_term: { ttl: "watch" } },
                          ],
                          slop: "2",
                          in_order: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    must: [{ terms: { ttl: ["pulse", "rate"] } }],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#48", () => {
    expect(
      esb(
        "((epridate: [20220201 TO 20220308]) AND pn:(ES1286585U OR ES1286629U))"
      )
    ).toEqual({
      bool: {
        must: [
          { range: { epridate: { gte: "20220201", lte: "20220308" } } },
          {
            bool: {
              must: [{ terms: { pn: ["ES1286585U", "ES1286629U"] } }],
            },
          },
        ],
      },
    });
  });

  it("#49", () => {
    expect(
      esb(
        "((epridate: [20220201 TO 20220308]) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1))"
      )
    ).toEqual({
      bool: {
        should: [
          { range: { epridate: { gte: "20220201", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: ["ES1286585U", "ES1286629U", "US20210403048A1"],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#50", () => {
    expect(
      esb(
        "((epridate: [20220201 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1))"
      )
    ).toEqual({
      bool: {
        must: [
          { range: { epridate: { gte: "20220201", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: ["ES1286585U", "ES1286629U", "US20210403048A1"],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#51", () => {
    expect(
      esb(
        "((ad: [20220201 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1))"
      )
    ).toEqual({
      bool: {
        must: [
          { range: { ad: { gte: "20220201", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: ["ES1286585U", "ES1286629U", "US20210403048A1"],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#52", () => {
    expect(
      esb(
        "((ad: [20220201 TO 20220308]) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1))"
      )
    ).toEqual({
      bool: {
        should: [
          { range: { ad: { gte: "20220201", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: ["ES1286585U", "ES1286629U", "US20210403048A1"],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#53", () => {
    expect(
      esb(
        "((ad: [20220201 TO 20220308]) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1))"
      )
    ).toEqual({
      bool: {
        must: [{ range: { ad: { gte: "20220201", lte: "20220308" } } }],
        must_not: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: ["ES1286585U", "ES1286629U", "US20210403048A1"],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#54", () => {
    expect(
      esb(
        "((casgs:(FINNOVATE NEAR2 GROUP)) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: "finnovate" } },
                      { span_term: { casgs: "group" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
        ],
        must_not: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: ["ES1286585U", "ES1286629U", "US20210403048A1"],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#55", () => {
    expect(
      esb(
        "((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) NOT casgs:(FINNOVATE NEAR2 GROUP))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
        must_not: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: "finnovate" } },
                      { span_term: { casgs: "group" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#56", () => {
    expect(
      esb(
        "((casgs:(FINNOVATE NEAR2 GROUP)) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: "finnovate" } },
                      { span_term: { casgs: "group" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#57", () => {
    expect(
      esb(
        "((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) AND casgs:(FINNOVATE NEAR2 GROUP))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: "finnovate" } },
                      { span_term: { casgs: "group" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#58", () => {
    expect(
      esb(
        "((casgs:(FINNOVATE NEAR2 GROUP)) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: "finnovate" } },
                      { span_term: { casgs: "group" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#59", () => {
    expect(
      esb(
        "((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) AND casgs:(FINNOVATE NEAR2 GROUP))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: "finnovate" } },
                      { span_term: { casgs: "group" } },
                    ],
                    slop: "2",
                    in_order: false,
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#60", () => {
    expect(
      esb(
        "((an:(16845016)) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        must: [
          { term: { an: "16845016" } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#61", () => {
    expect(
      esb(
        "((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) AND an:(16845016))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
          { term: { an: "16845016" } },
        ],
      },
    });
  });

  it("#62", () => {
    expect(
      esb(
        "((an:(16845016)) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        should: [
          { term: { an: "16845016" } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#63", () => {
    expect(
      esb(
        "((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) OR an:(16845016))"
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
          { term: { an: "16845016" } },
        ],
      },
    });
  });

  it("#64", () => {
    expect(
      esb(
        "((an:(16845016)) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        must: [{ term: { an: "16845016" } }],
        must_not: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#65", () => {
    expect(
      esb(
        "((pd: [20210101 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        must: [
          { range: { pd: { gte: "20210101", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#66", () => {
    expect(
      esb(
        "((ad: [20210101 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        must: [
          { range: { ad: { gte: "20210101", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#67", () => {
    expect(
      esb(
        "((epridate: [20210101 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        must: [
          { range: { epridate: { gte: "20210101", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#68", () => {
    expect(
      esb(
        "((epridate: [20220304 TO 20220308]) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        should: [
          { range: { epridate: { gte: "20220304", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#69", () => {
    expect(
      esb(
        "((ad: [20220304 TO 20220308]) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        should: [
          { range: { ad: { gte: "20220304", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#70", () => {
    expect(
      esb(
        "((pd: [20220304 TO 20220308]) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        should: [
          { range: { pd: { gte: "20220304", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#71", () => {
    expect(
      esb(
        "((pd: [20220304 TO 20220308]) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        must: [{ range: { pd: { gte: "20220304", lte: "20220308" } } }],
        must_not: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#72", () => {
    expect(
      esb(
        "((pd: [20200101 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        must: [
          { range: { pd: { gte: "20200101", lte: "20220308" } } },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#73", () => {
    expect(
      esb(
        "(((cpc:(A47B53) OR ic:(A47B53))) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [{ term: { cpc: "A47B53" } }, { term: { ic: "A47B53" } }],
            },
          },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#74", () => {
    expect(
      esb(
        "((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) AND (cpc:(A47B53) OR ic:(A47B53)))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
          {
            bool: {
              should: [{ term: { cpc: "A47B53" } }, { term: { ic: "A47B53" } }],
            },
          },
        ],
      },
    });
  });

  it("#75", () => {
    expect(
      esb(
        "(((cpc:(A47B53 AND B60R25/01) OR ic:(A47B53 AND B60R25/01))) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))"
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      { term: { cpc: "A47B53" } },
                      { term: { cpc: "B60R25/01" } },
                    ],
                  },
                },
                {
                  bool: {
                    must: [
                      { term: { ic: "A47B53" } },
                      { term: { ic: "B60R25/01" } },
                    ],
                  },
                },
              ],
            },
          },
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#76", () => {
    expect(
      esb(
        "((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) OR (cpc:(A47B53 AND B60R25/01) OR ic:(A47B53 AND B60R25/01)))"
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                    ],
                  },
                },
              ],
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      { term: { cpc: "A47B53" } },
                      { term: { cpc: "B60R25/01" } },
                    ],
                  },
                },
                {
                  bool: {
                    must: [
                      { term: { ic: "A47B53" } },
                      { term: { ic: "B60R25/01" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it("#77", () => {
    expect(
      esb(
        "(((cpc:(A47B53 AND A47B63) OR ic:(A47B53 AND A47B63))) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1 OR GB2454544A))"
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      { term: { cpc: "A47B53" } },
                      { term: { cpc: "A47B63" } },
                    ],
                  },
                },
                {
                  bool: {
                    must: [
                      { term: { ic: "A47B53" } },
                      { term: { ic: "A47B63" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
        must_not: [
          {
            bool: {
              must: [
                {
                  terms: {
                    pn: [
                      "ES1286585U",
                      "ES1286629U",
                      "US20210403048A1",
                      "US20200328824A1",
                      "GB2454544A",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });
});
