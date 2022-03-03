const genEQL = require('./gen-eql')

describe('Proximity Queries', () => {
  it('Check Sentence Slop', () => {
    const query = '(ttl:(apple NEARS banana))'
    const pq = genEQL(query)

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
    const pq = genEQL(query)

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
    const pq = genEQL(query)

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
                              ttl: { value: 'app*', case_insensitive: true }
                            }
                          }
                        }
                      },
                      { span_term: { ttl: 'tree' } }
                    ],
                    in_order: true,
                    slop: 0
                  }
                },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'de*', case_insensitive: true } }
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
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                { span_term: { ttl: 'tree' } },
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'de*', case_insensitive: true } }
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
})

describe('PN Queries', () => {
  it('Check PN search query', () => {
    const query = '(pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845))'
    const pq = genEQL(query, (node) => {
      if (node.key === 'pn') {
        node.key = 'pn-nok.keyword'
      }
    })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            term: {
              'pn-nok.keyword': 'US7545845'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'WO2019165110'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'EP3856098'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'WO2020251708'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'US20200233814'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'US9774086'
            }
          }
        ]
      }
    })
  })

  it('Check PN search query with succeeding "NOT" operator', () => {
    const query = '((pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)) NOT (ttl:(wireless)))'
    const pq = genEQL(query, (node) => {
      if (node.key === 'pn') {
        node.key = 'pn-nok.keyword'
      }
    })

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            term: {
              ttl: 'wireless'
            }
          }
        ],
        should: [
          {
            term: {
              'pn-nok.keyword': 'US7545845'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'WO2019165110'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'EP3856098'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'WO2020251708'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'US20200233814'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'US9774086'
            }
          }
        ]
      }
    })
  })

  it('Check PN search query with preceding "NOT" operator', () => {
    const query = '((ttl:(wireless)) NOT (pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)))'
    const pq = genEQL(query, (node) => {
      if (node.key === 'pn') {
        node.key = 'pn-nok.keyword'
      }
    })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'wireless'
            }
          }
        ],
        must_not: [
          {
            bool: {
              should: [
                {
                  term: {
                    'pn-nok.keyword': 'US7545845'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'WO2019165110'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'EP3856098'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'WO2020251708'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'US20200233814'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'US9774086'
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
    const pq = genEQL(query, (node) => {
      if (node.key === 'pn') {
        node.key = 'pn-nok.keyword'
      }
    })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'wireless'
            }
          },
          {
            bool: {
              should: [
                {
                  term: {
                    'pn-nok.keyword': 'US7545845'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'WO2019165110'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'EP3856098'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'WO2020251708'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'US20200233814'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'US9774086'
                  }
                }
              ]
            }
          }
        ]
      }
    })
  })

  it('Check PN search query with preceding "AND" operator', () => {
    const query = '((ttl:(wireless)) AND (pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)))'
    const pq = genEQL(query, (node) => {
      if (node.key === 'pn') {
        node.key = 'pn-nok.keyword'
      }
    })

    expect(pq).toEqual({
      bool: {
        must: [
          {
            term: {
              ttl: 'wireless'
            }
          },
          {
            bool: {
              should: [
                {
                  term: {
                    'pn-nok.keyword': 'US7545845'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'WO2019165110'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'EP3856098'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'WO2020251708'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'US20200233814'
                  }
                },
                {
                  term: {
                    'pn-nok.keyword': 'US9774086'
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
    const pq = genEQL(query, (node) => {
      if (node.key === 'pn') {
        node.key = 'pn-nok.keyword'
      }
    })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            term: {
              ttl: 'wireless'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'US7545845'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'WO2019165110'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'EP3856098'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'WO2020251708'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'US20200233814'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'US9774086'
            }
          }
        ]
      }
    })
  })

  it('Check PN search query with preceding "OR" operator', () => {
    const query = '((ttl:(wireless)) OR (pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)))'
    const pq = genEQL(query, (node) => {
      if (node.key === 'pn') {
        node.key = 'pn-nok.keyword'
      }
    })

    expect(pq).toEqual({
      bool: {
        should: [
          {
            term: {
              ttl: 'wireless'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'US7545845'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'WO2019165110'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'EP3856098'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'WO2020251708'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'US20200233814'
            }
          },
          {
            term: {
              'pn-nok.keyword': 'US9774086'
            }
          }
        ]
      }
    })
  })
})

describe('Singleton Queries', () => {
  it('Check Singleton Search Text Query', () => {
    const query = '(ttl:(mobile))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: { must: { term: { ttl: 'mobile' } } }
    })
  })

  it('Check Singleton Search Text Wildcard Query', () => {
    const query = '(ttl:(mobi*))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: { wildcard: { ttl: { value: 'mobi*', case_insensitive: true } } }
      }
    })
  })

  it('Check Singleton Search Date Query', () => {
    const query = '(pd:[20220218 TO 20220228])'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: { range: { pd: { gte: '20220218', lte: '20220228' } } }
      }
    })
  })
})

describe('Left Recursive Queries', () => {
  it('Check "AND" when left is a composite query', () => {
    const query = '(ttl:((apple NOT banana) AND ball))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
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

  it('Check "AND" when left is bool query other than must', () => {
    const query = '(ttl:((apple OR banana) AND ball))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { ttl: 'ball' } },
          {
            bool: {
              should: [{ term: { ttl: 'apple' } }, { term: { ttl: 'banana' } }]
            }
          }
        ]
      }
    })
  })

  it('Check "AND" when left is bool must query', () => {
    const query = '(ttl:((apple AND banana) AND ball))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { ttl: 'ball' } },
          { term: { ttl: 'apple' } },
          { term: { ttl: 'banana' } }
        ]
      }
    })
  })

  it('Check "AND" when left is bool must query while ignoring duplicates', () => {
    const query = '(ttl:((apple AND ball) AND ball))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [{ term: { ttl: 'ball' } }, { term: { ttl: 'apple' } }]
      }
    })
  })

  it('Check "OR" when left is a composite query', () => {
    const query = '(ttl:((apple NOT banana) OR ball))'
    const pq = genEQL(query)

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

  it('Check "OR" when left is a bool query other than should', () => {
    const query = '(ttl:((apple AND banana) OR ball))'
    const pq = genEQL(query)

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

  it('Check "OR" when left is a bool should query', () => {
    const query = '(ttl:((apple OR banana OR orange) OR ball))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        should: [
          { term: { ttl: 'ball' } },
          { term: { ttl: 'orange' } },
          { term: { ttl: 'apple' } },
          { term: { ttl: 'banana' } }
        ]
      }
    })
  })

  it('Check "OR" when left is a bool should query while ignoring duplicates', () => {
    const query = '(ttl:((apple OR ball OR orange) OR ball))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        should: [
          { term: { ttl: 'ball' } },
          { term: { ttl: 'orange' } },
          { term: { ttl: 'apple' } }
        ]
      }
    })
  })

  it('Check "NOT" when left has bool must_not query', () => {
    const query = '(ttl:(apple NOT orange NOT ball))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must_not: [{ term: { ttl: 'ball' } }, { term: { ttl: 'orange' } }],
        must: [{ term: { ttl: 'apple' } }]
      }
    })
  })

  it('Check "NOT" when left has bool must_not query while ignoring duplicates', () => {
    const query = '(ttl:(apple NOT orange NOT orange))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must_not: [{ term: { ttl: 'orange' } }],
        must: [{ term: { ttl: 'apple' } }]
      }
    })
  })

  it('Check "NEAR" when left is a composite query', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(apple NOT orange NEAR2 ball))'
      genEQL(query)
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
      genEQL(query)
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "NEAR" when left is a bool should query', () => {
    const query = '(ttl:(apple OR oran* NEAR2 bal*))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'bal*', case_insensitive: true } }
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
                              ttl: { value: 'oran*', case_insensitive: true }
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

  it('Check "NEAR" when left is a bool should query containing span_near clause', () => {
    const query = '(ttl:(apple NEAR2 banana OR orange NEAR2 ball))'
    const pq = genEQL(query)

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
                      { span_term: { ttl: 'orange' } },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'apple' } },
                            { span_term: { ttl: 'banana' } }
                          ],
                          slop: '2',
                          in_order: false
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

  it('Check "NEAR" when left is a bool should query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(apple AND banana OR orange NEAR2 ball))'
      genEQL(query)
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "NEAR" when left is a bool must query', () => {
    const query = '(ttl:(apple AND oran* NEAR2 ball))'
    const pq = genEQL(query)

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
                      wildcard: { ttl: { value: 'oran*', case_insensitive: true } }
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

  it('Check "NEAR" when left is a bool must query containing span_near clause', () => {
    const query = '(ttl:(apple NEAR2 orange NEAR2 ball))'
    const pq = genEQL(query)

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
      const query = '(ttl:(apple OR banana AND orange NEAR2 ball))'
      genEQL(query)
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
      genEQL(query)
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
      genEQL(query)
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when left is a bool should query', () => {
    const query = '(ttl:(apple OR oran* PRE2 bal*))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'bal*', case_insensitive: true } }
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
                              ttl: { value: 'oran*', case_insensitive: true }
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

  it('Check "PRE" when left is a bool should query containing span_near clause', () => {
    const query = '(ttl:(apple PRE2 banana OR orange PRE2 ball))'
    const pq = genEQL(query)

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
                      { span_term: { ttl: 'orange' } },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'apple' } },
                            { span_term: { ttl: 'banana' } }
                          ],
                          slop: '2',
                          in_order: true
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

  it('Check "PRE" when left is a bool should query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:(apple AND banana OR orange PRE2 ball))'
      genEQL(query)
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when left is a bool must query', () => {
    const query = '(ttl:(apple AND oran* NEAR2 ball))'
    const pq = genEQL(query)

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
                      wildcard: { ttl: { value: 'oran*', case_insensitive: true } }
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

  it('Check "PRE" when left is a bool must query containing span_near clause', () => {
    const query = '(ttl:(apple PRE2 orange PRE2 ball))'
    const pq = genEQL(query)

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
      const query = '(ttl:(apple OR banana AND orange PRE2 ball))'
      genEQL(query)
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })
})

describe('Right Recursive Queries', () => {
  it('Check "AND" when right is a composite query', () => {
    const query = '(ttl:(ball AND (apple NOT banana)))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
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

  it('Check "AND" when right is bool query other than must', () => {
    const query = '(ttl:(ball AND (apple OR banana)))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { ttl: 'ball' } },
          {
            bool: {
              should: [{ term: { ttl: 'apple' } }, { term: { ttl: 'banana' } }]
            }
          }
        ]
      }
    })
  })

  it('Check "AND" when right is bool must query', () => {
    const query = '(ttl:(ball AND (apple AND banana)))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          { term: { ttl: 'ball' } },
          { term: { ttl: 'apple' } },
          { term: { ttl: 'banana' } }
        ]
      }
    })
  })

  it('Check "AND" when right is bool must query while ignoring duplicates', () => {
    const query = '(ttl:(ball AND (apple AND ball)))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [{ term: { ttl: 'ball' } }, { term: { ttl: 'apple' } }]
      }
    })
  })

  it('Check "OR" when right is a composite query', () => {
    const query = '(ttl:(ball OR (apple NOT banana)))'
    const pq = genEQL(query)

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
    const pq = genEQL(query)

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
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        should: [
          { term: { ttl: 'ball' } },
          { term: { ttl: 'orange' } },
          { term: { ttl: 'apple' } },
          { term: { ttl: 'banana' } }
        ]
      }
    })
  })

  it('Check "OR" when right is a bool should query while ignoring duplicates', () => {
    const query = '(ttl:(ball OR (apple OR ball OR orange)))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        should: [
          { term: { ttl: 'ball' } },
          { term: { ttl: 'orange' } },
          { term: { ttl: 'apple' } }
        ]
      }
    })
  })

  it('Check "NOT"', () => {
    const query = '(ttl:((apple NOT tree) NOT (orange OR banana)))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must_not: [
          { term: { ttl: 'tree' } },
          {
            bool: {
              should: [{ term: { ttl: 'orange' } }, { term: { ttl: 'banana' } }]
            }
          }
        ],
        must: [{ term: { ttl: 'apple' } }]
      }
    })
  })

  it('Check "NEAR" when right is a composite query', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:((ball NEAR2 (apple NOT orange))))'
      genEQL(query)
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
      genEQL(query)
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "NEAR" when right is a bool should query', () => {
    const query = '(ttl:((bal* NEAR2 (apple OR oran*))))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'bal*', case_insensitive: true } }
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
                              ttl: { value: 'oran*', case_insensitive: true }
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
    const pq = genEQL(query)

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
                      { span_term: { ttl: 'orange' } },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'apple' } },
                            { span_term: { ttl: 'banana' } }
                          ],
                          slop: '2',
                          in_order: false
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

  it('Check "NEAR" when right is a bool should query not containing span_near clause', () => {
    expect.assertions(1)

    try {
      const query = '(ttl:((bal* NEAR2 (apple AND banana OR orange))))'
      genEQL(query)
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "NEAR" when right is a bool must query', () => {
    const query = '(ttl:((ball NEAR2 (apple AND oran*))))'
    const pq = genEQL(query)

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
                      wildcard: { ttl: { value: 'oran*', case_insensitive: true } }
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
    const pq = genEQL(query)

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
      genEQL(query)
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
      genEQL(query)
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
      genEQL(query)
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when right is a bool should query', () => {
    const query = '(ttl:((bal* PRE2 (apple OR oran*))))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          {
            span_near: {
              clauses: [
                {
                  span_multi: {
                    match: {
                      wildcard: { ttl: { value: 'bal*', case_insensitive: true } }
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
                              ttl: { value: 'oran*', case_insensitive: true }
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
    const pq = genEQL(query)

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
                      { span_term: { ttl: 'orange' } },
                      {
                        span_near: {
                          clauses: [
                            { span_term: { ttl: 'apple' } },
                            { span_term: { ttl: 'banana' } }
                          ],
                          slop: '2',
                          in_order: true
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
      genEQL(query)
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })

  it('Check "PRE" when right is a bool must query', () => {
    const query = '(ttl:((ball PRE2 (apple AND oran*))))'
    const pq = genEQL(query)

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
                      wildcard: { ttl: { value: 'oran*', case_insensitive: true } }
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
    const pq = genEQL(query)

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
      genEQL(query)
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'malformed query'
      )
    }
  })
})

describe('"AND", "OR", "NOT" query combinations', () => {
  it('Check combination of "AND", "OR", "NOT"', () => {
    const query = '(ttl:((mobile AND phone) OR screen NOT aluminum))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            term: {
              ttl: 'aluminum'
            }
          }
        ],
        should: [
          {
            term: {
              ttl: 'screen'
            }
          },
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
          }
        ]
      }
    })
  })
})

describe('Wildcard with "AND", "OR", "NOT" Queries', () => {
  it('Check Wildcard with "AND" Query', () => {
    const query = '(ttl:(wireles? AND communicatio*))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          {
            wildcard: {
              ttl: {
                value: 'wireles?',
                case_insensitive: true
              }
            }
          },
          {
            wildcard: {
              ttl: {
                value: 'communicatio*',
                case_insensitive: true
              }
            }
          }
        ]
      }
    })
  })

  it('Check Wildcard with "AND" and "OR" Query', () => {
    const query = '(ttl:(wireles? AND communicatio?) OR (ttl:(netwo* AND sign*)))'
    const pq = genEQL(query)

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
                      case_insensitive: true
                    }
                  }
                },
                {
                  wildcard: {
                    ttl: {
                      value: 'communicatio?',
                      case_insensitive: true
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
                      case_insensitive: true
                    }
                  }
                },
                {
                  wildcard: {
                    ttl: {
                      value: 'sign*',
                      case_insensitive: true
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
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must_not: [
          {
            bool: {
              must: [
                {
                  wildcard: {
                    ttl: {
                      value: 'netwo*',
                      case_insensitive: true
                    }
                  }
                },
                {
                  wildcard: {
                    ttl: {
                      value: 'sign*',
                      case_insensitive: true
                    }
                  }
                }
              ]
            }
          }
        ],
        must: [
          {
            wildcard: {
              ttl: {
                value: 'wireles?',
                case_insensitive: true
              }
            }
          },
          {
            wildcard: {
              ttl: {
                value: 'communicatio?',
                case_insensitive: true
              }
            }
          }
        ]
      }
    })
  })

  it('Check Wildcard with "AND", "OR" and "NOT" Queries', () => {
    const query = '(((ttl:(wireles? AND communicatio?)) NOT (ttl:(netwo* AND sign*)) OR (ttl:(car AND wash))))'
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        should: [
          {
            bool: {
              must_not: [
                {
                  bool: {
                    must: [
                      {
                        wildcard: {
                          ttl: {
                            value: 'netwo*',
                            case_insensitive: true
                          }
                        }
                      },
                      {
                        wildcard: {
                          ttl: {
                            value: 'sign*',
                            case_insensitive: true
                          }
                        }
                      }
                    ]
                  }
                }
              ],
              must: [
                {
                  wildcard: {
                    ttl: {
                      value: 'wireles?',
                      case_insensitive: true
                    }
                  }
                },
                {
                  wildcard: {
                    ttl: {
                      value: 'communicatio?',
                      case_insensitive: true
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
    const pq = genEQL(query)

    expect(pq).toEqual({
      bool: {
        must: [
          {
            range: {
              pd: {
                gte: '20220101',
                lte: '20220105'
              }
            }
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must_not: [
                      {
                        bool: {
                          must: [
                            {
                              wildcard: {
                                ttl: {
                                  value: 'netwo*',
                                  case_insensitive: true
                                }
                              }
                            },
                            {
                              wildcard: {
                                ttl: {
                                  value: 'sign*',
                                  case_insensitive: true
                                }
                              }
                            }
                          ]
                        }
                      }
                    ],
                    must: [
                      {
                        wildcard: {
                          ttl: {
                            value: 'wireles?',
                            case_insensitive: true
                          }
                        }
                      },
                      {
                        wildcard: {
                          ttl: {
                            value: 'communicatio?',
                            case_insensitive: true
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
          }
        ]
      }
    })
  })
})
