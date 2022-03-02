const genEQL = require('./gen-eql')

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
