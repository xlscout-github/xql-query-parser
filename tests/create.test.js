const { parse } = require('../parser')

describe('Proximity Queries', () => {
  it('Check Sentence Slop', () => {
    const query = '(ttl:(apple NEARS banana))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'apple' } },
                { span_term: { ttl: 'banana' } }
              ],
              slop: '15',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check Paragraph Slop', () => {
    const query = '(ttl:(apple PREP banana))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'apple' } },
                { span_term: { ttl: 'banana' } }
              ],
              slop: '50',
              in_order: true
            }
          }
        ]
      }
    })
  })

  it('Check Phrase with multiple terms', () => {
    const query = '(ttl:("app* tree" NEAR2 de*))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'app*' } },
                      { span_term: { ttl: 'tree' } }
                    ],
                    in_order: true,
                    slop: 0
                  }
                },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'de*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check Phrase with single term', () => {
    const query = '(ttl:("tree" NEAR2 "de*"))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'tree' } },
                { span_term: { ttl: 'de*' } }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })
})

describe('Terms Queries', () => {
  it('Check Terms Query while ignore duplicates on creation with non left-right recursion', () => {
    const query = '(pn:(US9774086 OR US9774086))'
    const pq = parse(query, false, {
      eql: true,
      transformFn: (node) => {
        if (node.key === 'pn') {
          node.key = 'pn-nok.keyword'
        }
      }
    })

    expect(pq).toEqual({
      bool: {
        should: [{ term: { 'pn-nok.keyword': 'US9774086' } }]
      }
    })
  })

  it('Check Terms Query on left recursive duplicate query with duplicate non-recursive right term', () => {
    const query = '(pa:(coco OR coco) OR coco)'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [{ term: { pa: 'coco' } }]
      }
    })
  })

  it('Check Terms Query on right recursive duplicate query with duplicate non-recursive left term', () => {
    const query = '(pa:(coco OR (coco OR coco)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [{ term: { pa: 'coco' } }]
      }
    })
  })

  it('Check Terms Query on left recursive duplicate query with non-recursive right term', () => {
    const query = '(pa:(coco OR coco) OR milk)'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { terms: { pa: ['coco', 'milk'] } }
        ]
      }
    })
  })

  it('Check Terms Query on right recursive duplicate query with non-recursive left term', () => {
    const query = '(pa:(milk OR (coco OR coco)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { terms: { pa: ['coco', 'milk'] } }
        ]
      }
    })
  })

  it('Check Terms Query if left and right both are compound queries', () => {
    const query = '(pa:(coco OR powder) OR (milk OR cream))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { terms: { pa: ['coco', 'powder', 'milk', 'cream'] } }
        ]
      }
    })
  })

  it('Check Terms Query if left is compound query and right is a duplicate compound query', () => {
    const query = '(pa:((milk OR powder) OR (coco OR coco)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { terms: { pa: ['milk', 'powder', 'coco'] } }
        ]
      }
    })
  })

  it('Check Terms Query if left is compound query and right is a duplicate compound query with duplicate values between them', () => {
    const query = '(pa:((milk OR coco) OR (coco OR coco)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { terms: { pa: ['milk', 'coco'] } }
        ]
      }
    })
  })

  it('Check Terms Query if left and right both are compound queries with duplicate values between them', () => {
    const query = '(pa:(coco OR mocha) OR (coco OR powder))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { terms: { pa: ['coco', 'mocha', 'powder'] } }
        ]
      }
    })
  })
})

describe('PN Queries', () => {
  it('Check PN search query', () => {
    const query = '(pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845))'
    const pq = parse(query, false, {
      eql: true,
      transformFn: (node) => {
        if (node.key === 'pn') {
          node.key = 'pn-nok.keyword'
        }
      }
    })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              'pn-nok.keyword': [
                'US20200233814',
                'US9774086',
                'WO2020251708',
                'EP3856098',
                'WO2019165110',
                'US7545845'
              ]
            }
          }
        ]
      }
    })
  })

  it('Check PN search query with succeeding "NOT" operator', () => {
    const query = '((pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)) NOT (ttl:(wireless)))'
    const pq = parse(query, false, {
      eql: true,
      transformFn: (node) => {
        if (node.key === 'pn') {
          node.key = 'pn-nok.keyword'
        }
      }
    })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              'pn-nok.keyword': [
                'US20200233814',
                'US9774086',
                'WO2020251708',
                'EP3856098',
                'WO2019165110',
                'US7545845'
              ]
            }
          }
        ],
        must_not: [
          {
            term: {
              ttl: 'wireless'
            }
          }
        ]
      }
    })
  })

  it('Check PN search query with preceding "NOT" operator', () => {
    const query = '((ttl:(wireless)) NOT (pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)))'
    const pq = parse(query, false, {
      eql: true,
      transformFn: (node) => {
        if (node.key === 'pn') {
          node.key = 'pn-nok.keyword'
        }
      }
    })

    expect(pq).toEqual({
      bool: {
        must: [{ term: { ttl: 'wireless' } }],
        must_not: [
          {
            bool: {
              should: [
                {
                  terms: {
                    'pn-nok.keyword': [
                      'US20200233814',
                      'US9774086',
                      'WO2020251708',
                      'EP3856098',
                      'WO2019165110',
                      'US7545845'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('Check PN search query with succeeding "AND" operator', () => {
    const query = '((pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)) AND (ttl:(wireless)))'
    const pq = parse(query, false, {
      eql: true,
      transformFn: (node) => {
        if (node.key === 'pn') {
          node.key = 'pn-nok.keyword'
        }
      }
    })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  terms: {
                    'pn-nok.keyword': [
                      'US20200233814',
                      'US9774086',
                      'WO2020251708',
                      'EP3856098',
                      'WO2019165110',
                      'US7545845'
                    ]
                  }
                }
              ]
            }
          },
          { term: { ttl: 'wireless' } }
        ]
      }
    })
  })

  it('Check PN search query with preceding "AND" operator', () => {
    const query = '((ttl:(wireless)) AND (pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)))'
    const pq = parse(query, false, {
      eql: true,
      transformFn: (node) => {
        if (node.key === 'pn') {
          node.key = 'pn-nok.keyword'
        }
      }
    })

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { ttl: 'wireless' } },
          {
            bool: {
              should: [
                {
                  terms: {
                    'pn-nok.keyword': [
                      'US20200233814',
                      'US9774086',
                      'WO2020251708',
                      'EP3856098',
                      'WO2019165110',
                      'US7545845'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('Check PN search query with succeeding "OR" operator', () => {
    const query = '((pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)) OR (ttl:(wireless)))'
    const pq = parse(query, false, {
      eql: true,
      transformFn: (node) => {
        if (node.key === 'pn') {
          node.key = 'pn-nok.keyword'
        }
      }
    })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              'pn-nok.keyword': [
                'US20200233814',
                'US9774086',
                'WO2020251708',
                'EP3856098',
                'WO2019165110',
                'US7545845'
              ]
            }
          },
          { term: { ttl: 'wireless' } }
        ]
      }
    })
  })

  it('Check PN search query with preceding "OR" operator', () => {
    const query = '((ttl:(wireless)) OR (pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)))'
    const pq = parse(query, false, {
      eql: true,
      transformFn: (node) => {
        if (node.key === 'pn') {
          node.key = 'pn-nok.keyword'
        }
      }
    })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              'pn-nok.keyword': [
                'US20200233814',
                'US9774086',
                'WO2020251708',
                'EP3856098',
                'WO2019165110',
                'US7545845'
              ]
            }
          },
          { term: { ttl: 'wireless' } }
        ]
      }
    })
  })
})

describe('Singleton Queries', () => {
  it('Check Singleton Search Text Query', () => {
    const query = '(ttl:(mobile))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: { must: [{ term: { ttl: 'mobile' } }] }
    })
  })

  it('Check Singleton Phrase Text Query in quotes', () => {
    const query = '(ttl:("apple grader"))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: { must: [{ match_phrase: { ttl: 'apple grader' } }] }
    })
  })

  it('Check Singleton Search Text Wildcard Query', () => {
    const query = '(ttl:(mobi*))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ wildcard: { ttl: { value: 'mobi*', case_insensitive: true, rewrite: 'top_terms_10000' } } }]
      }
    })
  })

  it('Check Singleton Search Date Query', () => {
    const query = '(pd:[20220218 TO 20220228])'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ range: { pd: { gte: '20220218', lte: '20220228' } } }]
      }
    })
  })
})

describe('"OR" Queries', () => {
  it('Check Phrase Text Query in quotes', () => {
    const query = '(ttl:(apple OR "coconut jam"))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { term: { ttl: 'apple' } },
          { match_phrase: { ttl: 'coconut jam' } }
        ]
      }
    })
  })

  it('Check Combination with Range Query', () => {
    const query = '(ttl:("dragon ball") OR pd:([20200825 TO 20201027]))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { match_phrase: { ttl: 'dragon ball' } },
          { range: { pd: { gte: '20200825', lte: '20201027' } } }
        ]
      }
    })
  })

  it('Check Combination with Range Query with unspecified bounds', () => {
    const query = '(ttl:("dragon ball") OR pd:([* TO *]))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { match_phrase: { ttl: 'dragon ball' } },
          { range: { pd: {} } }
        ]
      }
    })
  })
})

describe('"AND" Queries', () => {
  it('Check Phrase Text Query in quotes', () => {
    const query = '(ttl:(banana AND "stuffed bunny"))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { ttl: 'banana' } },
          { match_phrase: { ttl: 'stuffed bunny' } }
        ]
      }
    })
  })

  it('Check Combination with Range Query', () => {
    const query = '(ttl:("dragon ball") AND pd:([* TO *]))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { match_phrase: { ttl: 'dragon ball' } },
          { range: { pd: {} } }
        ]
      }
    })
  })
})

describe('"NOT" Queries', () => {
  it('Check Phrase Text Query in quotes', () => {
    const query = '(ttl:(apple NOT "apple tree"))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [{ match_phrase: { ttl: 'apple tree' } }],
        must: [{ term: { ttl: 'apple' } }]
      }
    })
  })

  it('Check Combination with Range Query', () => {
    const query = '(ttl:("dragon ball") NOT pd:([20200825 TO 20201027]))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          { range: { pd: { gte: '20200825', lte: '20201027' } } }
        ],
        must: [{ match_phrase: { ttl: 'dragon ball' } }]
      }
    })
  })

  it('Check Combination with Range Query with unspecified bounds', () => {
    const query = '(ttl:("dragon ball") NOT pd:([* TO *]))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ match_phrase: { ttl: 'dragon ball' } }],
        must_not: [
          { range: { pd: {} } }
        ]
      }
    })
  })

  it('Check Combination with Wildcard Query', () => {
    const query = '(ttl:("dragon ball" NOT game*))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          { wildcard: { ttl: { value: 'game*', case_insensitive: true, rewrite: 'top_terms_10000' } } }
        ],
        must: [{ match_phrase: { ttl: 'dragon ball' } }]
      }
    })
  })

  it('Check Wrapping of Terms with leading "NOT"', () => {
    const query = 'ttl: NOT apple NOT banana NOT orange'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            term: {
              ttl: 'apple'
            }
          },
          {
            term: {
              ttl: 'banana'
            }
          },
          {
            term: {
              ttl: 'orange'
            }
          }
        ]
      }
    })
  })

  it('Check Wrapping of Terms with leading "NOT" containing duplicate', () => {
    const query = 'ttl: NOT apple NOT banana NOT banana'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            term: {
              ttl: 'apple'
            }
          },
          {
            term: {
              ttl: 'banana'
            }
          }
        ]
      }
    })
  })

  it('Check Wrapping of Terms without leading "NOT"', () => {
    const query = 'ttl: apple NOT banana NOT orange'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'apple'
            }
          }
        ],
        must_not: [
          {
            term: {
              ttl: 'banana'
            }
          },
          {
            term: {
              ttl: 'orange'
            }
          }
        ]
      }
    })
  })

  it('Check Wrapping of Terms without leading "NOT" containing duplicate', () => {
    const query = 'ttl: apple NOT banana NOT banana'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ term: { ttl: 'apple' } }],
        must_not: [{ term: { ttl: 'banana' } }]

      }
    })
  })
})

describe('Left Recursive Queries', () => {
  it('Check "AND" when left is a composite query', () => {
    const query = '(ttl:((apple NOT banana) AND ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'apple'
            }
          },
          {
            term: {
              ttl: 'ball'
            }
          }
        ],
        must_not: [
          {
            term: {
              ttl: 'banana'
            }
          }
        ]
      }
    })
  })

  it('Check "AND" when left is bool query other than must', () => {
    const query = '(ttl:((apple OR banana) AND ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                { terms: { ttl: ['apple', 'banana'] } }
              ]
            }
          },
          { term: { ttl: 'ball' } }
        ]
      }
    })
  })

  it('Check "AND" when left is bool must query', () => {
    const query = '(ttl:((apple AND banana) AND ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { ttl: 'apple' } },
          { term: { ttl: 'banana' } },
          { term: { ttl: 'ball' } }
        ]
      }
    })
  })

  it('Check "AND" when left is bool must query while ignoring duplicates', () => {
    const query = '(ttl:((apple AND ball) AND ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ term: { ttl: 'apple' } }, { term: { ttl: 'ball' } }]
      }
    })
  })

  it('Check "OR" when left is a composite query', () => {
    const query = '(ttl:((apple NOT banana) OR ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must_not: [{ term: { ttl: 'banana' } }],
              must: [{ term: { ttl: 'apple' } }]
            }
          },
          { term: { ttl: 'ball' } }
        ]
      }
    })
  })

  it('Check "OR" when left is a bool query other than should', () => {
    const query = '(ttl:((apple AND banana) OR ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [{ term: { ttl: 'apple' } }, { term: { ttl: 'banana' } }]
            }
          },
          { term: { ttl: 'ball' } }
        ]
      }
    })
  })

  it('Check "OR" when left is a bool should query', () => {
    const query = '(ttl:((apple OR banana OR orange) OR ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { terms: { ttl: ['apple', 'banana', 'orange', 'ball'] } }
        ]
      }
    })
  })

  it('Check "OR" when left is a bool should query while ignoring duplicates', () => {
    const query = '(ttl:((apple OR ball OR orange) OR ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { terms: { ttl: ['apple', 'ball', 'orange'] } }
        ]
      }
    })
  })

  it('Check "OR" when left is a bool should query while ignoring duplicate phrases', () => {
    const query = '(pa:("coco" OR powder) OR "coco")'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [{ match_phrase: { pa: 'coco' } }, { term: { pa: 'powder' } }]
      }
    })
  })

  it('Check "NOT" when left has bool must_not query', () => {
    const query = '(ttl:(apple NOT orange NOT ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'apple'
            }
          }
        ],
        must_not: [
          {
            term: {
              ttl: 'orange'
            }
          },
          {
            term: {
              ttl: 'ball'
            }
          }
        ]
      }
    })
  })

  it('Check "NOT" when left has bool must_not query while ignoring duplicates', () => {
    const query = '(ttl:(apple NOT orange NOT orange))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ term: { ttl: 'apple' } }],
        must_not: [{ term: { ttl: 'orange' } }]
      }
    })
  })

  it('Check "NEAR" when left is a composite query', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(apple NOT orange NEAR2 ball))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "NEAR" when left is a bool must_not query', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(NOT orange NEAR2 ball))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "NEAR" when left is a bool should query', () => {
    const query = '(ttl:(apple OR oran* NEAR2 bal*))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [

                {
                  span_or: {
                    clauses: [
                      { span_term: { ttl: 'apple' } },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'oran*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'bal*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "NEAR" when left is a bool should query containing span_near clause', () => {
    const query = '(ttl:(apple NEAR2 banana OR orange NEAR2 ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_or: {
                    clauses: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'apple' } },
                            { span_term: { ttl: 'banana' } }
                          ],
                          slop: '2',
                          in_order: false
                        }
                      },
                      { span_term: { ttl: 'orange' } }
                    ]
                  }
                },
                { span_term: { ttl: 'ball' } }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "NEAR" when left is a bool should query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(apple AND banana OR orange NEAR2 ball))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "NEAR" when left is a bool must query', () => {
    const query = '(ttl:(apple AND oran* NEAR2 ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'apple' } },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'oran*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                },
                { span_term: { ttl: 'ball' } }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "NEAR" when left is a bool must query containing span_near clause', () => {
    const query = '(ttl:(apple NEAR2 orange NEAR2 ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'apple' } },
                      { span_term: { ttl: 'orange' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                { span_term: { ttl: 'ball' } }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "NEAR" when left is a bool must query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(apple OR banana AND orange NEAR2 ball))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when left is a composite query', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(apple NOT orange PRE2 ball))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when left is a bool must_not query', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(NOT orange PRE2 ball))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when left is a bool should query', () => {
    const query = '(ttl:(apple OR oran* PRE2 bal*))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [

                {
                  span_or: {
                    clauses: [
                      { span_term: { ttl: 'apple' } },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'oran*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'bal*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                }
              ],
              slop: '2',
              in_order: true
            }
          }
        ]
      }
    })
  })

  it('Check "PRE" when left is a bool should query containing span_near clause', () => {
    const query = '(ttl:(apple PRE2 banana OR orange PRE2 ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_or: {
                    clauses: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'apple' } },
                            { span_term: { ttl: 'banana' } }
                          ],
                          slop: '2',
                          in_order: true
                        }
                      },
                      { span_term: { ttl: 'orange' } }
                    ]
                  }
                },
                { span_term: { ttl: 'ball' } }
              ],
              slop: '2',
              in_order: true
            }
          }
        ]
      }
    })
  })

  it('Check "PRE" when left is a bool should query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(apple AND banana OR orange PRE2 ball))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when left is a bool must query', () => {
    const query = '(ttl:(apple AND oran* NEAR2 ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'apple' } },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'oran*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                },

                { span_term: { ttl: 'ball' } }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "PRE" when left is a bool must query containing span_near clause', () => {
    const query = '(ttl:(apple PRE2 orange PRE2 ball))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'apple' } },
                      { span_term: { ttl: 'orange' } }
                    ],
                    slop: '2',
                    in_order: true
                  }
                },
                { span_term: { ttl: 'ball' } }
              ],
              slop: '2',
              in_order: true
            }
          }
        ]
      }
    })
  })

  it('Check "PRE" when left is a bool must query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(apple OR banana AND orange PRE2 ball))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "OR" Compound Query including Phrase with one term', () => {
    const query = '(ttl: (electr* OR "AC") NEAR3 vehicle*)'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
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
                              ttl: { value: 'electr*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      },
                      { span_term: { ttl: 'AC' } }
                    ]
                  }
                },
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: { value: 'vehicle*', case_insensitive: true, rewrite: 'top_terms_2500' }
                      }
                    }
                  }
                }
              ],
              slop: '3',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "OR" Compound Query including Phrase with multiple terms', () => {
    const query = '(ttl: (electr* OR "AC DC") NEAR3 vehicle*)'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
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
                              ttl: { value: 'electr*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'AC' } },
                            { span_term: { ttl: 'DC' } }
                          ],
                          in_order: true,
                          slop: 0
                        }
                      }
                    ]
                  }
                },
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: { value: 'vehicle*', case_insensitive: true, rewrite: 'top_terms_2500' }
                      }
                    }
                  }
                }
              ],
              slop: '3',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "AND" Compound Query including Phrase with one term', () => {
    const query = '(ttl: (electr* AND "battery") NEAR3 vehicle*)'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [

                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'electr*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                },
                { span_term: { ttl: 'battery' } },
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: { value: 'vehicle*', case_insensitive: true, rewrite: 'top_terms_2500' }
                      }
                    }
                  }
                }
              ],
              slop: '3',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "AND" Compound Query including Phrase with multiple terms', () => {
    const query = '(ttl: (electr* AND "battery charging") NEAR3 vehicle*)'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'electr*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                },
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'battery' } },
                      { span_term: { ttl: 'charging' } }
                    ],
                    in_order: true,
                    slop: 0
                  }
                },
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: { value: 'vehicle*', case_insensitive: true, rewrite: 'top_terms_2500' }
                      }
                    }
                  }
                }
              ],
              slop: '3',
              in_order: false
            }
          }
        ]
      }
    })
  })
})

describe('Right Recursive Queries', () => {
  it('Check "AND" when right is a composite query', () => {
    const query = '(ttl:(ball AND (apple NOT banana)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { ttl: 'apple' } },
          { term: { ttl: 'ball' } }
        ],
        must_not: [{ term: { ttl: 'banana' } }]
      }
    })
  })

  it('Check "AND" when right is bool query other than must', () => {
    const query = '(ttl:(ball AND (apple OR banana)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { ttl: 'ball' } },
          {
            bool: {
              should: [
                { terms: { ttl: ['apple', 'banana'] } }
              ]
            }
          }
        ]
      }
    })
  })

  it('Check "AND" when right is bool must query', () => {
    const query = '(ttl:(ball AND (apple AND banana)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { ttl: 'apple' } },
          { term: { ttl: 'banana' } },
          { term: { ttl: 'ball' } }
        ]
      }
    })
  })

  it('Check "AND" when right is bool must query while ignoring duplicates', () => {
    const query = '(ttl:(ball AND (apple AND ball)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ term: { ttl: 'apple' } }, { term: { ttl: 'ball' } }]
      }
    })
  })

  it('Check "OR" when right is a bool should query while ignoring duplicate phrases', () => {
    const query = '(pa:"coco" OR ("coco" OR powder))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [{ match_phrase: { pa: 'coco' } }, { term: { pa: 'powder' } }]
      }
    })
  })

  it('Check "OR" when right is a composite query', () => {
    const query = '(ttl:(ball OR (apple NOT banana)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { term: { ttl: 'ball' } },
          {
            bool: {
              must_not: [{ term: { ttl: 'banana' } }],
              must: [{ term: { ttl: 'apple' } }]
            }
          }
        ]
      }
    })
  })

  it('Check "OR" when right is a bool query other than should', () => {
    const query = '(ttl:(ball OR (apple AND banana)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { term: { ttl: 'ball' } },
          {
            bool: {
              must: [{ term: { ttl: 'apple' } }, { term: { ttl: 'banana' } }]
            }
          }
        ]
      }
    })
  })

  it('Check "OR" when right is a bool should query', () => {
    const query = '(ttl:(ball OR (apple OR banana OR orange)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { terms: { ttl: ['apple', 'banana', 'orange', 'ball'] } }
        ]
      }
    })
  })

  it('Check "OR" when right is a bool should query while ignoring duplicates', () => {
    const query = '(ttl:(ball OR (apple OR ball OR orange)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { terms: { ttl: ['apple', 'ball', 'orange'] } }
        ]
      }
    })
  })

  it('Check "NOT"', () => {
    const query = '(ttl:((apple NOT tree) NOT (orange OR banana)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  term: {
                    ttl: 'apple'
                  }
                }
              ],
              must_not: [
                {
                  term: {
                    ttl: 'tree'
                  }
                }
              ]
            }
          }
        ],
        must_not: [
          {
            bool: {
              should: [
                {
                  terms: {
                    ttl: [
                      'orange',
                      'banana'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('Check "NEAR" when right is a composite query', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:((ball NEAR2 (apple NOT orange))))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "NEAR" when right is a bool must_not query', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:((ball NEAR2 (NOT orange))))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "NEAR" when right is a bool should query', () => {
    const query = '(ttl:((bal* NEAR2 (apple OR oran*))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'bal*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                },
                {
                  span_or: {
                    clauses: [
                      { span_term: { ttl: 'apple' } },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'oran*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "NEAR" when right is a bool should query containing span_near clause', () => {
    const query = '(ttl:((ball NEAR2 (apple NEAR2 banana OR orange))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'ball' } },
                {
                  span_or: {
                    clauses: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'apple' } },
                            { span_term: { ttl: 'banana' } }
                          ],
                          slop: '2',
                          in_order: false
                        }
                      },
                      { span_term: { ttl: 'orange' } }
                    ]
                  }
                }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "NEAR" when right is a bool should query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:((bal* NEAR2 (apple AND banana OR orange))))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "NEAR" when right is a bool must query', () => {
    const query = '(ttl:((ball NEAR2 (apple AND oran*))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'ball' } },
                { span_term: { ttl: 'apple' } },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'oran*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "NEAR" when right is a bool must query containing span_near clause', () => {
    const query = '(ttl:((ball NEAR2 (apple NEAR2 orange))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'ball' } },
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'apple' } },
                      { span_term: { ttl: 'orange' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "NEAR" when left is a bool must query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:((ball NEAR2 (apple OR banana AND orange))))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when right is a composite query', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:((ball PRE2 (apple NOT orange))))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when right is a bool must_not query', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:((ball PRE2 (NOT orange))))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when right is a bool should query', () => {
    const query = '(ttl:((bal* PRE2 (apple OR oran*))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'bal*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                },
                {
                  span_or: {
                    clauses: [
                      { span_term: { ttl: 'apple' } },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'oran*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              ],
              slop: '2',
              in_order: true
            }
          }
        ]
      }
    })
  })

  it('Check "PRE" when right is a bool should query containing span_near clause', () => {
    const query = '(ttl:((ball PRE2 (apple PRE2 banana OR orange))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_term: {
                    ttl: 'ball'
                  }
                },
                {
                  span_or: {
                    clauses: [
                      {
                        span_near: {
                          clauses: [
                            {
                              span_term: {
                                ttl: 'apple'
                              }
                            },
                            {
                              span_term: {
                                ttl: 'banana'
                              }
                            }
                          ],
                          slop: '2',
                          in_order: true
                        }
                      },
                      {
                        span_term: {
                          ttl: 'orange'
                        }
                      }
                    ]
                  }
                }
              ],
              slop: '2',
              in_order: true
            }
          }
        ]
      }
    })
  })

  it('Check "PRE" when right is a bool should query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:((bal* PRE2 (apple AND banana OR orange))))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when right is a bool must query', () => {
    const query = '(ttl:((ball PRE2 (apple AND oran*))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'ball' } },
                { span_term: { ttl: 'apple' } },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'oran*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                }
              ],
              slop: '2',
              in_order: true
            }
          }
        ]
      }
    })
  })

  it('Check "PRE" when right is a bool must query containing span_near clause', () => {
    const query = '(ttl:((ball PRE2 (apple PRE2 orange))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'ball' } },
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'apple' } },
                      { span_term: { ttl: 'orange' } }
                    ],
                    slop: '2',
                    in_order: true
                  }
                }
              ],
              slop: '2',
              in_order: true
            }
          }
        ]
      }
    })
  })

  it('Check "PRE" when left is a bool must query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:((ball PRE2 (apple OR banana AND orange))))'
      parse(query, false, { eql: true })
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "OR" Compound Query including Phrase with one term', () => {
    const query = '(ttl: vehicle* NEAR3 (electr* OR "AC"))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: { value: 'vehicle*', case_insensitive: true, rewrite: 'top_terms_2500' }
                      }
                    }
                  }
                },
                {
                  span_or: {
                    clauses: [
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'electr*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      },
                      { span_term: { ttl: 'AC' } }
                    ]
                  }
                }
              ],
              slop: '3',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "OR" Compound Query including Phrase with multiple terms', () => {
    const query = '(ttl: vehicle* NEAR3 (electr* OR "AC DC"))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: { value: 'vehicle*', case_insensitive: true, rewrite: 'top_terms_2500' }
                      }
                    }
                  }
                },
                {
                  span_or: {
                    clauses: [
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'electr*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'AC' } },
                            { span_term: { ttl: 'DC' } }
                          ],
                          in_order: true,
                          slop: 0
                        }
                      }
                    ]
                  }
                }
              ],
              slop: '3',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "AND" Compound Query including Phrase with one term', () => {
    const query = '(ttl: vehicle* NEAR3 (electr* AND "battery"))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: { value: 'vehicle*', case_insensitive: true, rewrite: 'top_terms_2500' }
                      }
                    }
                  }
                },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'electr*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                },
                { span_term: { ttl: 'battery' } }
              ],
              slop: '3',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('Check "AND" Compound Query including Phrase with multiple terms', () => {
    const query = '(ttl: vehicle* NEAR3 (electr* AND "battery charging"))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: {
                        ttl: { value: 'vehicle*', case_insensitive: true, rewrite: 'top_terms_2500' }
                      }
                    }
                  }
                },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'electr*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                },
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'battery' } },
                      { span_term: { ttl: 'charging' } }
                    ],
                    in_order: true,
                    slop: 0
                  }
                }
              ],
              slop: '3',
              in_order: false
            }
          }
        ]
      }
    })
  })
})

describe('"AND", "OR", "NOT" query combinations', () => {
  it('Check combination of "AND", "OR", "NOT"', () => {
    const query = '(ttl:((mobile AND phone) OR screen NOT aluminum))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  term: {
                    ttl: 'mobile'
                  }
                },
                {
                  term: {
                    ttl: 'phone'
                  }
                }
              ]
            }
          },
          {
            term: {
              ttl: 'screen'
            }
          }
        ],
        must_not: [
          {
            term: {
              ttl: 'aluminum'
            }
          }
        ]
      }
    })
  })
})

describe('Wildcard with "AND", "OR", "NOT" Queries', () => {
  it('Check Wildcard with "AND" Query', () => {
    const query = '(ttl:(wireles? AND communicatio*))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            wildcard: {
              ttl: {
                value: 'wireles?',
                case_insensitive: true,
                rewrite: 'top_terms_10000'
              }
            }
          },
          {
            wildcard: {
              ttl: {
                value: 'communicatio*',
                case_insensitive: true,
                rewrite: 'top_terms_10000'
              }
            }
          }
        ]
      }
    })
  })

  it('Check Wildcard with "AND" and "OR" Query', () => {
    const query = '(ttl:(wireles? AND communicatio?) OR (ttl:(netwo* AND sign*)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  wildcard: {
                    ttl: {
                      value: 'wireles?',
                      case_insensitive: true,
                      rewrite: 'top_terms_10000'
                    }
                  }
                },
                {
                  wildcard: {
                    ttl: {
                      value: 'communicatio?',
                      case_insensitive: true,
                      rewrite: 'top_terms_10000'
                    }
                  }
                }
              ]
            }
          },
          {
            bool: {
              must: [
                {
                  wildcard: {
                    ttl: {
                      value: 'netwo*',
                      case_insensitive: true,
                      rewrite: 'top_terms_10000'
                    }
                  }
                },
                {
                  wildcard: {
                    ttl: {
                      value: 'sign*',
                      case_insensitive: true,
                      rewrite: 'top_terms_10000'
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('Check Wildcard with "AND" and "NOT" Query', () => {
    const query = '(ttl:(wireles? AND communicatio?) NOT (ttl:(netwo* AND sign*)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {

        must: [
          {
            bool: {
              must: [{
                wildcard: {
                  ttl: {
                    value: 'wireles?',
                    case_insensitive: true,
                    rewrite: 'top_terms_10000'
                  }
                }
              },
              {
                wildcard: {
                  ttl: {
                    value: 'communicatio?',
                    case_insensitive: true,
                    rewrite: 'top_terms_10000'
                  }
                }
              }]
            }
          }
        ],
        must_not: [
          {
            bool: {
              must: [
                {
                  wildcard: {
                    ttl: {
                      value: 'netwo*',
                      case_insensitive: true,
                      rewrite: 'top_terms_10000'
                    }
                  }
                },
                {
                  wildcard: {
                    ttl: {
                      value: 'sign*',
                      case_insensitive: true,
                      rewrite: 'top_terms_10000'
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('Check Wildcard with "AND", "OR" and "NOT" Queries', () => {
    const query = '(((ttl:(wireles? AND communicatio?)) NOT (ttl:(netwo* AND sign*)) OR (ttl:(car AND wash))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [{
                      wildcard: {
                        ttl: {
                          value: 'wireles?',
                          case_insensitive: true,
                          rewrite: 'top_terms_10000'
                        }
                      }
                    },
                    {
                      wildcard: {
                        ttl: {
                          value: 'communicatio?',
                          case_insensitive: true,
                          rewrite: 'top_terms_10000'
                        }
                      }
                    }]
                  }
                }

              ],
              must_not: [
                {
                  bool: {
                    must: [
                      {
                        wildcard: {
                          ttl: {
                            value: 'netwo*',
                            case_insensitive: true,
                            rewrite: 'top_terms_10000'
                          }
                        }
                      },
                      {
                        wildcard: {
                          ttl: {
                            value: 'sign*',
                            case_insensitive: true,
                            rewrite: 'top_terms_10000'
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            bool: {
              must: [
                {
                  term: {
                    ttl: 'car'
                  }
                },
                {
                  term: {
                    ttl: 'wash'
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })
})

describe('Range Queries', () => {
  it('Check Range with Wildcard, "AND", "OR" and "NOT" Queries', () => {
    const query = '((((ttl:(wireles? AND communicatio?)) NOT ttl:(netwo* AND sign*)) OR ttl:(car AND wash)) AND pd:[20220101 TO 20220105])'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
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
                              wildcard: {
                                ttl: {
                                  value: 'wireles?',
                                  case_insensitive: true,
                                  rewrite: 'top_terms_10000'
                                }
                              }
                            },
                            {
                              wildcard: {
                                ttl: {
                                  value: 'communicatio?',
                                  case_insensitive: true,
                                  rewrite: 'top_terms_10000'
                                }
                              }
                            }
                          ]
                        }
                      }
                    ],
                    must_not: [
                      {
                        bool: {
                          must: [
                            {
                              wildcard: {
                                ttl: {
                                  value: 'netwo*',
                                  case_insensitive: true,
                                  rewrite: 'top_terms_10000'
                                }
                              }
                            },
                            {
                              wildcard: {
                                ttl: {
                                  value: 'sign*',
                                  case_insensitive: true,
                                  rewrite: 'top_terms_10000'
                                }
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  bool: {
                    must: [
                      {
                        term: {
                          ttl: 'car'
                        }
                      },
                      {
                        term: {
                          ttl: 'wash'
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            range: {
              pd: {
                gte: '20220101',
                lte: '20220105'
              }
            }
          }
        ]
      }
    })
  })

  it('Check Range with unspecified lower bound', () => {
    const query = '(pd:([* TO 20201027]))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ range: { pd: { lte: '20201027' } } }]
      }
    })
  })

  it('Check Range with unspecified upper bound', () => {
    const query = '(pd:([20200825 TO *]))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ range: { pd: { gte: '20200825' } } }]
      }
    })
  })

  it('Check Range with unspecified lower bound and upper bound', () => {
    const query = '(pd:([* TO *]))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: { must: [{ range: { pd: {} } }] }
    })
  })
})

describe('Miscellaneous Queries', () => {
  it('#1', () => {
    const query = '(ttl:((((Carrot OR juice) OR (banana NEAR3 shake)) NEAR3 (Fruit* OR Vegetable*))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_or: {
                    clauses: [
                      { span_term: { ttl: 'Carrot' } },
                      { span_term: { ttl: 'juice' } },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'banana' } },
                            { span_term: { ttl: 'shake' } }
                          ],
                          slop: '3',
                          in_order: false
                        }
                      }
                    ]
                  }
                },
                {
                  span_or: {
                    clauses: [
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'Fruit*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: 'Vegetable*',
                                case_insensitive: true,
                                rewrite: 'top_terms_2500'
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              ],
              slop: '3',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('#2', () => {
    const query = '(ttl:(((Fruit* OR Vegetable*) NEAR3 ((Carrot OR juice) OR (banana NEAR3 shake)))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
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
                              ttl: { value: 'Fruit*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: {
                                value: 'Vegetable*',
                                case_insensitive: true,
                                rewrite: 'top_terms_2500'
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  span_or: {
                    clauses: [
                      { span_term: { ttl: 'Carrot' } },
                      { span_term: { ttl: 'juice' } },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'banana' } },
                            { span_term: { ttl: 'shake' } }
                          ],
                          slop: '3',
                          in_order: false
                        }
                      }
                    ]
                  }
                }

              ],
              slop: '3',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('#3', () => {
    const query = '(ttl:((((Carrot OR juice) OR (banana NEAR3 shake)) AND (Fruit* OR Vegetable*))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                { terms: { ttl: ['Carrot', 'juice'] } },
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'banana' } },
                            { span_term: { ttl: 'shake' } }
                          ],
                          slop: '3',
                          in_order: false
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            bool: {
              should: [
                {
                  wildcard: { ttl: { value: 'Fruit*', case_insensitive: true, rewrite: 'top_terms_10000' } }
                },
                {
                  wildcard: { ttl: { value: 'Vegetable*', case_insensitive: true, rewrite: 'top_terms_10000' } }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#4', () => {
    const query = '(ttl:((((Carrot OR juice) OR (banana NEAR3 shake)) AND (Fruit* OR Vegetable*)) NOT (papaya OR melon OR lemon OR plant*)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [{
                bool: {
                  should: [
                    { terms: { ttl: ['Carrot', 'juice'] } },
                    {
                      bool: {
                        must: [
                          {
                            span_near: {
                              clauses: [
                                { span_term: { ttl: 'banana' } },
                                { span_term: { ttl: 'shake' } }
                              ],
                              slop: '3',
                              in_order: false
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              },
              {
                bool: {
                  should: [
                    {
                      wildcard: { ttl: { value: 'Fruit*', case_insensitive: true, rewrite: 'top_terms_10000' } }
                    },
                    {
                      wildcard: { ttl: { value: 'Vegetable*', case_insensitive: true, rewrite: 'top_terms_10000' } }
                    }
                  ]
                }
              }]
            }
          }
        ],
        must_not: [
          {
            bool: {
              should: [

                { terms: { ttl: ['papaya', 'melon', 'lemon'] } },
                {
                  wildcard: { ttl: { value: 'plant*', case_insensitive: true, rewrite: 'top_terms_10000' } }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#5', () => {
    const query = '(ttl:((((Carrot OR juice) OR (banana NEAR3 shake)) AND (Fruit* OR Vegetable*)) NOT ((papaya OR melon OR lemon) NEAR4 (plant*))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['Carrot', 'juice'] } },
                      {
                        bool: {
                          must: [
                            {
                              span_near: {
                                clauses: [
                                  { span_term: { ttl: 'banana' } },
                                  { span_term: { ttl: 'shake' } }
                                ],
                                slop: '3',
                                in_order: false
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  bool: {
                    should: [
                      {
                        wildcard: { ttl: { value: 'Fruit*', case_insensitive: true, rewrite: 'top_terms_10000' } }
                      },
                      {
                        wildcard: { ttl: { value: 'Vegetable*', case_insensitive: true, rewrite: 'top_terms_10000' } }
                      }
                    ]
                  }
                }
              ]
            }
          }
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
                            { span_term: { ttl: 'papaya' } },
                            { span_term: { ttl: 'melon' } },
                            { span_term: { ttl: 'lemon' } }
                          ]
                        }
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'plant*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      }
                    ],
                    slop: '4',
                    in_order: false
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#6', () => {
    const query = '((ttl:(smart NEAR2 (watch OR watches))) AND ttl:(heart NEAR2 rate))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                {
                  span_or: {
                    clauses: [
                      { span_term: { ttl: 'watch' } },
                      { span_term: { ttl: 'watches' } }
                    ]
                  }
                }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'heart' } },
                { span_term: { ttl: 'rate' } }
              ],
              slop: '2',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('#7', () => {
    const query = '(((ttl:(smart NEAR2 (watch OR watches))) NOT ttl:(heart AND (rate OR pulse* OR oxygen))) AND pd: [20220101 TO 20220307])'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [{
                span_near: {
                  clauses: [
                    { span_term: { ttl: 'smart' } },
                    {
                      span_or: {
                        clauses: [
                          { span_term: { ttl: 'watch' } },
                          { span_term: { ttl: 'watches' } }
                        ]
                      }
                    }
                  ],
                  slop: '2',
                  in_order: false
                }
              }]
            }
          },
          { range: { pd: { gte: '20220101', lte: '20220307' } } }
        ],
        must_not: [
          {
            bool: {
              must: [
                { term: { ttl: 'heart' } },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['rate', 'oxygen'] } },
                      {
                        wildcard: {
                          ttl: { value: 'pulse*', case_insensitive: true, rewrite: 'top_terms_10000' }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#8', () => {
    const query = '(ttl:(((vegetable*) NEAR15 (juice*)) NEARP ((Fruit* OR Vegetable*) NEARS (plant*))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
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
                                value: 'vegetable*',
                                case_insensitive: true,
                                rewrite: 'top_terms_2500'
                              }
                            }
                          }
                        }
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'juice*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      }
                    ],
                    slop: '15',
                    in_order: false
                  }
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
                                      value: 'Fruit*',
                                      case_insensitive: true,
                                      rewrite: 'top_terms_2500'
                                    }
                                  }
                                }
                              }
                            },
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: 'Vegetable*',
                                      case_insensitive: true,
                                      rewrite: 'top_terms_2500'
                                    }
                                  }
                                }
                              }
                            }
                          ]
                        }
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'plant*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      }
                    ],
                    slop: '15',
                    in_order: false
                  }
                }
              ],
              slop: '50',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('#9', () => {
    const query = '((ttl:(patent NEAR5 (artificial NEAR2 intelligen*))) OR ttl:(patent NEAR5 (machine NEAR2 learn*)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'patent' } },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'artificial' } },
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: 'intelligen*',
                                      case_insensitive: true,
                                      rewrite: 'top_terms_2500'
                                    }
                                  }
                                }
                              }
                            }
                          ],
                          slop: '2',
                          in_order: false
                        }
                      }
                    ],
                    slop: '5',
                    in_order: false
                  }
                }
              ]
            }
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'patent' } },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'machine' } },
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: 'learn*',
                                      case_insensitive: true,
                                      rewrite: 'top_terms_2500'
                                    }
                                  }
                                }
                              }
                            }
                          ],
                          slop: '2',
                          in_order: false
                        }
                      }
                    ],
                    slop: '5',
                    in_order: false
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#10', () => {
    const query = '(((ttl:(patent NEARS (artificial PRE2 intelligen*))) OR ttl:(patent NEARP (machine PRE2 learn*))) AND pd: [20150101 TO 20220307])'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
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
                            { span_term: { ttl: 'patent' } },
                            {
                              span_near: {
                                clauses: [
                                  { span_term: { ttl: 'artificial' } },
                                  {
                                    span_multi: {
                                      match: {
                                        wildcard: {
                                          ttl: {
                                            value: 'intelligen*',
                                            case_insensitive: true,
                                            rewrite: 'top_terms_2500'
                                          }
                                        }
                                      }
                                    }
                                  }
                                ],
                                slop: '2',
                                in_order: true
                              }
                            }
                          ],
                          slop: '15',
                          in_order: false
                        }
                      }
                    ]
                  }
                },
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'patent' } },
                            {
                              span_near: {
                                clauses: [
                                  { span_term: { ttl: 'machine' } },
                                  {
                                    span_multi: {
                                      match: {
                                        wildcard: {
                                          ttl: {
                                            value: 'learn*',
                                            case_insensitive: true,
                                            rewrite: 'top_terms_2500'
                                          }
                                        }
                                      }
                                    }
                                  }
                                ],
                                slop: '2',
                                in_order: true
                              }
                            }
                          ],
                          slop: '50',
                          in_order: false
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          { range: { pd: { gte: '20150101', lte: '20220307' } } }
        ]
      }
    })
  })

  it('#11', () => {
    const query = '(ttl:((A*) PRE10 ((veg*) NEAR15 (juice*) NEARP (Veg*) NEARS (plant*))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'A*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
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
                                            value: 'veg*',
                                            case_insensitive: true,
                                            rewrite: 'top_terms_2500'
                                          }
                                        }
                                      }
                                    }
                                  },
                                  {
                                    span_multi: {
                                      match: {
                                        wildcard: {
                                          ttl: {
                                            value: 'juice*',
                                            case_insensitive: true,
                                            rewrite: 'top_terms_2500'
                                          }
                                        }
                                      }
                                    }
                                  }
                                ],
                                slop: '15',
                                in_order: false
                              }
                            },
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: 'Veg*',
                                      case_insensitive: true,
                                      rewrite: 'top_terms_2500'
                                    }
                                  }
                                }
                              }
                            }
                          ],
                          slop: '50',
                          in_order: false
                        }
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'plant*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      }
                    ],
                    slop: '15',
                    in_order: false
                  }
                }

              ],
              slop: '10',
              in_order: true
            }
          }
        ]
      }
    })
  })

  it('#12', () => {
    const query = '(ttl:((A) PRE10 ((veg*) NEAR15 (juice*) NEARP (Veg*) NEARS (plant*))))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'A' } },
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
                                            value: 'veg*',
                                            case_insensitive: true,
                                            rewrite: 'top_terms_2500'
                                          }
                                        }
                                      }
                                    }
                                  },
                                  {
                                    span_multi: {
                                      match: {
                                        wildcard: {
                                          ttl: {
                                            value: 'juice*',
                                            case_insensitive: true,
                                            rewrite: 'top_terms_2500'
                                          }
                                        }
                                      }
                                    }
                                  }
                                ],
                                slop: '15',
                                in_order: false
                              }
                            },
                            {
                              span_multi: {
                                match: {
                                  wildcard: {
                                    ttl: {
                                      value: 'Veg*',
                                      case_insensitive: true,
                                      rewrite: 'top_terms_2500'
                                    }
                                  }
                                }
                              }
                            }
                          ],
                          slop: '50',
                          in_order: false
                        }
                      },
                      {
                        span_multi: {
                          match: {
                            wildcard: {
                              ttl: { value: 'plant*', case_insensitive: true, rewrite: 'top_terms_2500' }
                            }
                          }
                        }
                      }
                    ],
                    slop: '15',
                    in_order: false
                  }
                }
              ],
              slop: '10',
              in_order: true
            }
          }
        ]
      }
    })
  })

  it('#13', () => {
    const query = '(ttl:("c" NEARP engine*))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'c' } },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'engine*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                }
              ],
              slop: '50',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('#14', () => {
    const query = '(xlpat-prob.stat:(efficiency NEAR5 cost NEAR5 time))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { 'xlpat-prob.stat': 'efficiency' } },
                      { span_term: { 'xlpat-prob.stat': 'cost' } }
                    ],
                    slop: '5',
                    in_order: false
                  }
                },

                { span_term: { 'xlpat-prob.stat': 'time' } }
              ],
              slop: '5',
              in_order: false
            }
          }
        ]
      }
    })
  })

  it('#15', () => {
    const query = '((inv:(Michael OR Jonas)) AND ttl:(wheel PRE1 loader*))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [

          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'wheel' } },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'loader*', case_insensitive: true, rewrite: 'top_terms_2500' } }
                    }
                  }
                }
              ],
              slop: '1',
              in_order: true
            }
          },
          {
            bool: {
              should: [
                { terms: { inv: ['Michael', 'Jonas'] } }
              ]
            }
          }
        ]
      }
    })
  })

  it('#16', () => {
    const query = '((inv:(Michael OR Jonas)) AND pa:(caterpillar OR Komatsu OR CNH))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                { terms: { inv: ['Michael', 'Jonas'] } }
              ]
            }
          },
          {
            bool: {
              should: [
                { terms: { pa: ['caterpillar', 'Komatsu', 'CNH'] } }
              ]
            }
          }
        ]
      }
    })
  })

  it('#17', () => {
    const query = '((inv:(Michael AND Jonas)) AND pa:(caterpillar OR Komatsu OR CNH))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { inv: 'Michael' } },
          { term: { inv: 'Jonas' } },
          {
            bool: {
              should: [
                { terms: { pa: ['caterpillar', 'Komatsu', 'CNH'] } }
              ]
            }
          }
        ]
      }
    })
  })

  it('#18', () => {
    const query = '((inv:(Michael AND Jonas)) NOT pa:(caterpillar OR Komatsu OR CNH))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ bool: { must: [{ term: { inv: 'Michael' } }, { term: { inv: 'Jonas' } }] } }],
        must_not: [
          {
            bool: {
              should: [
                { terms: { pa: ['caterpillar', 'Komatsu', 'CNH'] } }
              ]
            }
          }
        ]
      }
    })
  })

  it('#19', () => {
    const query = '((inv:(Michael OR Jonas)) NOT pa:(caterpillar OR Komatsu OR CNH))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{
          bool: {
            should: [
              { terms: { inv: ['Michael', 'Jonas'] } }
            ]
          }
        }],
        must_not: [
          {
            bool: {
              should: [
                { terms: { pa: ['caterpillar', 'Komatsu', 'CNH'] } }
              ]
            }
          }
        ]
      }
    })
  })

  it('#20', () => {
    const query = '((inv:(Michael AND Jonas)) OR cited.pn:(KR-101275147-B1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [{ term: { inv: 'Michael' } }, { term: { inv: 'Jonas' } }]
            }
          },
          { term: { 'cited.pn': 'KR-101275147-B1' } }
        ]
      }
    })
  })

  it('#21', () => {
    const query = '(xlpat-litig.defs.name:(caterpillar OR Komatsu OR CNH))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              'xlpat-litig.defs.name': ['caterpillar', 'Komatsu', 'CNH']
            }
          }
        ]
      }
    })
  })

  it('#22', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) AND (cpc:(a61b5) OR ic:(a61b5)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          {
            bool: {
              should: [{ term: { cpc: 'a61b5' } }, { term: { ic: 'a61b5' } }]
            }
          }
        ]
      }
    })
  })

  it('#23', () => {
    const query = '(((cpc:(a61b5) OR ic:(a61b5))) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          {
            bool: {
              should: [{ term: { cpc: 'a61b5' } }, { term: { ic: 'a61b5' } }]
            }
          }
        ]
      }
    })
  })

  it('#24', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) OR (cpc:(a61b5/02 AND G04B47/06 AND G04G21/02) OR ic:(a61b5/02 AND G04B47/06 AND G04G21/02)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                { term: { cpc: 'a61b5/02' } },
                { term: { cpc: 'G04B47/06' } },
                { term: { cpc: 'G04G21/02' } }
              ]
            }
          },
          {
            bool: {
              must: [
                { term: { ic: 'a61b5/02' } },
                { term: { ic: 'G04B47/06' } },
                { term: { ic: 'G04G21/02' } }
              ]
            }
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#25', () => {
    const query = '(((cpc:(a61b5/02 AND G04B47/06 AND G04G21/02) OR ic:(a61b5/02 AND G04B47/06 AND G04G21/02))) OR ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                { term: { cpc: 'a61b5/02' } },
                { term: { cpc: 'G04B47/06' } },
                { term: { cpc: 'G04G21/02' } }
              ]
            }
          },
          {
            bool: {
              must: [
                { term: { ic: 'a61b5/02' } },
                { term: { ic: 'G04B47/06' } },
                { term: { ic: 'G04G21/02' } }
              ]
            }
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#26', () => {
    const query = '(((ttl:((smart NEAR2 watch) AND (pulse OR rate))) OR (cpc:(a61b5/02 AND G04B47/06 AND G04G21/02) OR ic:(a61b5/02 AND G04B47/06 AND G04G21/02))) AND ttl:(energ*))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      { term: { cpc: 'a61b5/02' } },
                      { term: { cpc: 'G04B47/06' } },
                      { term: { cpc: 'G04G21/02' } }
                    ]
                  }
                },
                {
                  bool: {
                    must: [
                      { term: { ic: 'a61b5/02' } },
                      { term: { ic: 'G04B47/06' } },
                      { term: { ic: 'G04G21/02' } }
                    ]
                  }
                },
                {
                  bool: {
                    must: [
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'smart' } },
                            { span_term: { ttl: 'watch' } }
                          ],
                          slop: '2',
                          in_order: false
                        }
                      },
                      {
                        bool: {
                          should: [
                            { terms: { ttl: ['pulse', 'rate'] } }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            wildcard: { ttl: { value: 'energ*', case_insensitive: true, rewrite: 'top_terms_10000' } }
          }
        ]
      }
    })
  })

  it('#27', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) NOT (cpc:(a61b5/02 AND G04B47/06 AND G04G21/02) OR ic:(a61b5/02 AND G04B47/06 AND G04G21/02)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [{
                span_near: {
                  clauses: [
                    { span_term: { ttl: 'smart' } },
                    { span_term: { ttl: 'watch' } }
                  ],
                  slop: '2',
                  in_order: false
                }
              },
              {
                bool: {
                  should: [
                    { terms: { ttl: ['pulse', 'rate'] } }
                  ]
                }
              }]
            }
          }
        ],
        must_not: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      { term: { cpc: 'a61b5/02' } },
                      { term: { cpc: 'G04B47/06' } },
                      { term: { cpc: 'G04G21/02' } }
                    ]
                  }
                },
                {
                  bool: {
                    must: [
                      { term: { ic: 'a61b5/02' } },
                      { term: { ic: 'G04B47/06' } },
                      { term: { ic: 'G04G21/02' } }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#28', () => {
    const query = '(((cpc:(a61b5/02 AND G04B47/06 AND G04G21/02) OR ic:(a61b5/02 AND G04B47/06 AND G04G21/02))) NOT ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      { term: { cpc: 'a61b5/02' } },
                      { term: { cpc: 'G04B47/06' } },
                      { term: { cpc: 'G04G21/02' } }
                    ]
                  }
                },
                {
                  bool: {
                    must: [
                      { term: { ic: 'a61b5/02' } },
                      { term: { ic: 'G04B47/06' } },
                      { term: { ic: 'G04G21/02' } }
                    ]
                  }
                }
              ]
            }
          }],
        must_not: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#29', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) AND casgs:(boe))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          { term: { casgs: 'boe' } }
        ]
      }
    })
  })

  it('#30', () => {
    const query = '((casgs:(boe)) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          { term: { casgs: 'boe' } }
        ]
      }
    })
  })

  it('#31', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) NOT casgs:(boe))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          }
        ],
        must_not: [{ term: { casgs: 'boe' } }]
      }
    })
  })

  it('#32', () => {
    const query = '((casgs:(FINNOVATE NEAR2 GROUP)) NOT ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [{
                span_near: {
                  clauses: [
                    { span_term: { casgs: 'FINNOVATE' } },
                    { span_term: { casgs: 'GROUP' } }
                  ],
                  slop: '2',
                  in_order: false
                }
              }]
            }
          }

        ],
        must_not: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#33', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) OR casgs:(FINNOVATE NEAR2 GROUP))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: 'FINNOVATE' } },
                      { span_term: { casgs: 'GROUP' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#34', () => {
    const query = '((casgs:(FINNOVATE NEAR2 GROUP)) OR ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: 'FINNOVATE' } },
                      { span_term: { casgs: 'GROUP' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                }
              ]
            }
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#35', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) AND pn:(US20200069200A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          { term: { pn: 'US20200069200A1' } }
        ]
      }
    })
  })

  it('#36', () => {
    const query = '((pn:(US20200069200A1)) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          { term: { pn: 'US20200069200A1' } }
        ]
      }
    })
  })

  it('#37', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) OR pn:(US20210403048A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          },
          { term: { pn: 'US20210403048A1' } }
        ]
      }
    })
  })

  it('#38', () => {
    const query = '((pn:(US20200069200A1)) OR ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { term: { pn: 'US20200069200A1' } },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#39', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) NOT pn:(US20210403048A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_term: {
                    ttl: 'smart'
                  }
                },
                {
                  span_term: {
                    ttl: 'watch'
                  }
                }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                {
                  terms: {
                    ttl: [
                      'pulse',
                      'rate'
                    ]
                  }
                }
              ]
            }
          }
        ],
        must_not: [
          {
            term: {
              pn: 'US20210403048A1'
            }
          }
        ]
      }
    })
  })

  it('#40', () => {
    const query = '((pn:(US20210403048A1)) NOT ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          }
        ],
        must: [{ term: { pn: 'US20210403048A1' } }]
      }
    })
  })

  it('#41', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) AND epridate: [20000101 TO 20220308])'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          { range: { epridate: { gte: '20000101', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#42', () => {
    const query = '((ttl:((smart NEAR2 watch) AND (pulse OR rate))) AND pd: [20000101 TO 20220308])'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          { range: { pd: { gte: '20000101', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#43', () => {
    const query = '((pd: [20000101 TO 20220308]) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          { range: { pd: { gte: '20000101', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#44', () => {
    const query = '((ad: [20000101 TO 20220308]) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          { range: { ad: { gte: '20000101', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#45', () => {
    const query = '((epridate: [20000101 TO 20220308]) AND ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'smart' } },
                { span_term: { ttl: 'watch' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                { terms: { ttl: ['pulse', 'rate'] } }
              ]
            }
          },
          { range: { epridate: { gte: '20000101', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#46', () => {
    const query = '((epridate: [20220201 TO 20220308]) OR ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          { range: { epridate: { gte: '20220201', lte: '20220308' } } },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#47', () => {
    const query = '((epridate: [20220201 TO 20220308]) NOT ttl:((smart NEAR2 watch) AND (pulse OR rate)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { ttl: 'smart' } },
                      { span_term: { ttl: 'watch' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                },
                {
                  bool: {
                    should: [
                      { terms: { ttl: ['pulse', 'rate'] } }
                    ]
                  }
                }
              ]
            }
          }
        ],
        must: [
          { range: { epridate: { gte: '20220201', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#48', () => {
    const query = '((epridate: [20220201 TO 20220308]) AND pn:(ES1286585U OR ES1286629U))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { range: { epridate: { gte: '20220201', lte: '20220308' } } },
          {
            bool: {
              should: [
                { terms: { pn: ['ES1286585U', 'ES1286629U'] } }
              ]
            }
          }
        ]
      }
    })
  })

  it('#49', () => {
    const query = '((epridate: [20220201 TO 20220308]) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              pn: ['ES1286585U',
                'ES1286629U',
                'US20210403048A1']
            }
          },
          { range: { epridate: { gte: '20220201', lte: '20220308' } } }

        ]
      }
    })
  })

  it('#50', () => {
    const query = '((epridate: [20220201 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { range: { epridate: { gte: '20220201', lte: '20220308' } } },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: ['ES1286585U',
                      'ES1286629U',
                      'US20210403048A1']
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#51', () => {
    const query = '((ad: [20220201 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { range: { ad: { gte: '20220201', lte: '20220308' } } },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: ['ES1286585U',
                      'ES1286629U',
                      'US20210403048A1']
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#52', () => {
    const query = '((ad: [20220201 TO 20220308]) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              pn: ['ES1286585U',
                'ES1286629U',
                'US20210403048A1']
            }
          },
          { range: { ad: { gte: '20220201', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#53', () => {
    const query = '((ad: [20220201 TO 20220308]) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { range: { ad: { gte: '20220201', lte: '20220308' } } }
        ],
        must_not: [
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: ['ES1286585U',
                      'ES1286629U',
                      'US20210403048A1']
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#54', () => {
    const query = '((casgs:(FINNOVATE NEAR2 GROUP)) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      {
                        span_term: {
                          casgs: 'FINNOVATE'
                        }
                      },
                      {
                        span_term: {
                          casgs: 'GROUP'
                        }
                      }
                    ],
                    slop: '2',
                    in_order: false
                  }
                }
              ]
            }
          }
        ],
        must_not: [
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1']
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#55', () => {
    const query = '((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) NOT casgs:(FINNOVATE NEAR2 GROUP))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ],
        must_not: [
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      {
                        span_term: {
                          casgs: 'FINNOVATE'
                        }
                      },
                      {
                        span_term: {
                          casgs: 'GROUP'
                        }
                      }
                    ],
                    slop: '2',
                    in_order: false
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#56', () => {
    const query = '((casgs:(FINNOVATE NEAR2 GROUP)) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { casgs: 'FINNOVATE' } },
                { span_term: { casgs: 'GROUP' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#57', () => {
    const query = '((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) AND casgs:(FINNOVATE NEAR2 GROUP))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { casgs: 'FINNOVATE' } },
                { span_term: { casgs: 'GROUP' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#58', () => {
    const query = '((casgs:(FINNOVATE NEAR2 GROUP)) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              pn: [
                'ES1286585U',
                'ES1286629U',
                'US20210403048A1',
                'US20200328824A1'
              ]
            }
          },
          {
            bool: {
              must: [
                {
                  span_near: {
                    clauses: [
                      { span_term: { casgs: 'FINNOVATE' } },
                      { span_term: { casgs: 'GROUP' } }
                    ],
                    slop: '2',
                    in_order: false
                  }
                }
              ]
            }
          }

        ]
      }
    })
  })

  it('#59', () => {
    const query = '((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) AND casgs:(FINNOVATE NEAR2 GROUP))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { casgs: 'FINNOVATE' } },
                { span_term: { casgs: 'GROUP' } }
              ],
              slop: '2',
              in_order: false
            }
          },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }

        ]
      }
    })
  })

  it('#60', () => {
    const query = '((an:(16845016)) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { an: '16845016' } },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#61', () => {
    const query = '((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) AND an:(16845016))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          },
          { term: { an: '16845016' } }
        ]
      }
    })
  })

  it('#62', () => {
    const query = '((an:(16845016)) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              pn: [
                'ES1286585U',
                'ES1286629U',
                'US20210403048A1',
                'US20200328824A1'
              ]
            }
          },
          { term: { an: '16845016' } }
        ]
      }
    })
  })

  it('#63', () => {
    const query = '((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) OR an:(16845016))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              pn: [
                'ES1286585U',
                'ES1286629U',
                'US20210403048A1',
                'US20200328824A1'
              ]
            }
          },
          { term: { an: '16845016' } }
        ]
      }
    })
  })

  it('#64', () => {
    const query = '((an:(16845016)) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [{ term: { an: '16845016' } }],
        must_not: [
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#65', () => {
    const query = '((pd: [20210101 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { range: { pd: { gte: '20210101', lte: '20220308' } } },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#66', () => {
    const query = '((ad: [20210101 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { range: { ad: { gte: '20210101', lte: '20220308' } } },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#67', () => {
    const query = '((epridate: [20210101 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { range: { epridate: { gte: '20210101', lte: '20220308' } } },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#68', () => {
    const query = '((epridate: [20220304 TO 20220308]) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              pn: [
                'ES1286585U',
                'ES1286629U',
                'US20210403048A1',
                'US20200328824A1'
              ]
            }
          },
          { range: { epridate: { gte: '20220304', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#69', () => {
    const query = '((ad: [20220304 TO 20220308]) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              pn: [
                'ES1286585U',
                'ES1286629U',
                'US20210403048A1',
                'US20200328824A1'
              ]
            }
          },
          { range: { ad: { gte: '20220304', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#70', () => {
    const query = '((pd: [20220304 TO 20220308]) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              pn: [
                'ES1286585U',
                'ES1286629U',
                'US20210403048A1',
                'US20200328824A1'
              ]
            }
          },
          { range: { pd: { gte: '20220304', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#71', () => {
    const query = '((pd: [20220304 TO 20220308]) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ],
        must: [
          { range: { pd: { gte: '20220304', lte: '20220308' } } }
        ]
      }
    })
  })

  it('#72', () => {
    const query = '((pd: [20200101 TO 20220308]) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          { range: { pd: { gte: '20200101', lte: '20220308' } } },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#73', () => {
    const query = '(((cpc:(A47B53) OR ic:(A47B53))) AND pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [{ term: { cpc: 'A47B53' } }, { term: { ic: 'A47B53' } }]
            }
          },
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#74', () => {
    const query = '((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) AND (cpc:(A47B53) OR ic:(A47B53)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1'
                    ]
                  }
                }
              ]
            }
          },
          {
            bool: {
              should: [{ term: { cpc: 'A47B53' } }, { term: { ic: 'A47B53' } }]
            }
          }
        ]
      }
    })
  })

  it('#75', () => {
    const query = '(((cpc:(A47B53 AND B60R25/01) OR ic:(A47B53 AND B60R25/01))) OR pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                { term: { cpc: 'A47B53' } },
                { term: { cpc: 'B60R25/01' } }
              ]
            }
          },
          {
            bool: {
              must: [{ term: { ic: 'A47B53' } }, { term: { ic: 'B60R25/01' } }]
            }
          },
          {
            terms: {
              pn: [
                'ES1286585U',
                'ES1286629U',
                'US20210403048A1',
                'US20200328824A1'
              ]
            }
          }
        ]
      }
    })
  })

  it('#76', () => {
    const query = '((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1)) OR (cpc:(A47B53 AND B60R25/01) OR ic:(A47B53 AND B60R25/01)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              pn: [
                'ES1286585U',
                'ES1286629U',
                'US20210403048A1',
                'US20200328824A1'

              ]
            }
          },
          {
            bool: {
              must: [
                { term: { cpc: 'A47B53' } },
                { term: { cpc: 'B60R25/01' } }
              ]
            }
          },
          {
            bool: {
              must: [{ term: { ic: 'A47B53' } }, { term: { ic: 'B60R25/01' } }]
            }
          }
        ]
      }
    })
  })

  it('#77', () => {
    const query = '(((cpc:(A47B53 AND A47B63) OR ic:(A47B53 AND A47B63))) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1 OR GB2454544A))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      {
                        term: {
                          cpc: 'A47B53'
                        }
                      },
                      {
                        term: {
                          cpc: 'A47B63'
                        }
                      }
                    ]
                  }
                },
                {
                  bool: {
                    must: [
                      {
                        term: {
                          ic: 'A47B53'
                        }
                      },
                      {
                        term: {
                          ic: 'A47B63'
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ],
        must_not: [
          {
            bool: {
              should: [
                {
                  terms: {
                    pn: [
                      'ES1286585U',
                      'ES1286629U',
                      'US20210403048A1',
                      'US20200328824A1',
                      'GB2454544A'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#78', () => {
    const query = '(ttl: (apple NOT banana NOT pineapple) AND (apple NOT banana NOT grapes))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            term: {
              ttl: 'banana'
            }
          },
          {
            term: {
              ttl: 'pineapple'
            }
          },
          {
            term: {
              ttl: 'grapes'
            }
          }
        ],
        must: [
          {
            term: {
              ttl: 'apple'
            }
          }
        ]
      }
    })
  })

  it('#79', () => {
    const query = '(ttl: (apple AND apple) AND (apple NOT banana NOT grapes))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'apple'
            }
          }
        ],
        must_not: [
          {
            term: {
              ttl: 'banana'
            }
          },
          {
            term: {
              ttl: 'grapes'
            }
          }
        ]
      }
    })
  })

  it('#80', () => {
    const query = '(ttl: (apple AND apple AND (mango OR pineapple)) AND (mango OR pineapple))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'apple'
            }
          },
          {
            bool: {
              should: [
                {
                  terms: {
                    ttl: [
                      'mango',
                      'pineapple'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#81', () => {
    const query = '(ttl: (apple AND apple) AND (NOT mango NOT pineapple))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'apple'
            }
          }
        ],
        must_not: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            term: {
              ttl: 'pineapple'
            }
          }
        ]
      }
    })
  })

  it('#82', () => {
    const query = '(ttl: (apple AND apple NOT mango NOT rainbow) AND (NOT mango NOT pineapple))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'apple'
            }
          }
        ],
        must_not: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            term: {
              ttl: 'rainbow'
            }
          },
          {
            term: {
              ttl: 'pineapple'
            }
          }
        ]
      }
    })
  })

  it('#83', () => {
    const query = '(ttl: (NOT mango NOT pineapple) AND (apple AND apple NOT mango NOT rainbow))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'apple'
            }
          }
        ],
        must_not: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            term: {
              ttl: 'rainbow'
            }
          },
          {
            term: {
              ttl: 'pineapple'
            }
          }
        ]
      }
    })
  })

  it('#84', () => {
    const query = '(ttl: (NOT mango NOT pineapple) AND (apple AND apple))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'apple'
            }
          }
        ],
        must_not: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            term: {
              ttl: 'pineapple'
            }
          }
        ]
      }
    })
  })

  it('#85', () => {
    const query = '(ttl: (mango OR pineapple) AND (apple AND apple AND (mango OR pineapple)))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'apple'
            }
          },
          {
            bool: {
              should: [
                {
                  terms: {
                    ttl: [
                      'mango',
                      'pineapple'
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#86', () => {
    const query = '(ttl: (NOT mango NOT pineapple) AND (NOT apple NOT mango))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            term: {
              ttl: 'pineapple'
            }
          },
          {
            term: {
              ttl: 'apple'
            }
          }
        ]
      }
    })
  })

  it('#87', () => {
    const query = '(ttl: (NOT mango NOT pineapple) AND (apple))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            term: {
              ttl: 'pineapple'
            }
          }
        ],
        must: [
          {
            term: {
              ttl: 'apple'
            }
          }
        ]
      }
    })
  })

  it('#88', () => {
    const query = '(ttl: (apple) AND (NOT mango NOT pineapple))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            term: {
              ttl: 'pineapple'
            }
          }
        ],
        must: [
          {
            term: {
              ttl: 'apple'
            }
          }
        ]
      }
    })
  })

  it('#89', () => {
    const query = '(ttl: (NOT apple) OR (mango OR NOT apple))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            bool: {
              must_not: [
                {
                  term: {
                    ttl: 'apple'
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#90', () => {
    const query = '(ttl: (mango OR NOT apple) OR (NOT apple))'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            bool: {
              must_not: [
                {
                  term: {
                    ttl: 'apple'
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('#91', () => {
    const query = '(((ttl:(mango)) OR (pa:(mango))) OR text:pineapple OR pineapple)'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            term: {
              pa: 'mango'
            }
          },
          {
            term: {
              text: 'pineapple'
            }
          }
        ]
      }
    })
  })

  it('#92', () => {
    const query = '(((ttl:(mango)) OR (pa:(mango))) OR pa:pineapple OR apple)'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            terms: {
              pa: [
                'pineapple',
                'apple',
                'mango'
              ]
            }
          }
        ]
      }
    })
  })

  it('#93', () => {
    const query = '(((ttl:(mango)) OR (pa:(mango OR rainbow))) OR pa:pineapple OR apple)'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            terms: {
              pa: [
                'mango',
                'rainbow',
                'pineapple',
                'apple'
              ]
            }
          },
          {
            term: {
              ttl: 'mango'
            }
          }
        ]
      }
    })
  })

  it('#94', () => {
    const query = '(((ttl:(mango)) OR (pa:(rainbow))) OR pa:pineapple OR pineapple)'
    const pq = parse(query, false, { eql: true })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            term: {
              ttl: 'mango'
            }
          },
          {
            terms: {
              pa: [
                'rainbow',
                'pineapple'
              ]
            }
          }
        ]
      }
    })
  })
})
