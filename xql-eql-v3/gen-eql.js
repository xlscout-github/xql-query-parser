const { parse } = require('../parser')

const SPAN_MULTI_WILDCARD_REWRITE = 'top_terms_1000'
const WILDCARD_REWRITE = 'top_terms_10000'

const genIter = (node, nodeTransformer) => {
  let snapshot = {
    node,
    current: {},
    next: {},
    stage: 0
  }
  const stack = [snapshot]

  while (stack.length) {
    snapshot = stack.pop()

    // console.log('SNAPSHOT')
    // console.dir(snapshot, { depth: null })

    switch (snapshot.stage) {
      case 0: {
        const curr = {}
        if (snapshot.node.opt === 'OR') {
          curr.should = []

          snapshot.node.child.forEach((element, i) => {
            if (Array.isArray(element.child)) return

            if (nodeTransformer) {
              nodeTransformer(element)
            }

            const p = {}
            p[element.key] = element.val
            const fp = {}

            if (typeof element.val === 'string') {
              if (element.val.startsWith('"') && element.val.endsWith('"')) {
                fp.match_phrase = { [element.key]: element.val.slice(1, -1).trim() }
              } else if (element.val.includes('*') || element.val.includes('?')) {
                fp.wildcard = {}
                fp.wildcard[element.key] = {
                  value: element.val,
                  case_insensitive: true,
                  rewrite: WILDCARD_REWRITE
                }
              } else {
                fp.term = p
              }
            } else if (typeof element.val === 'object' && (element.val.from && element.val.to)) {
              fp.range = {
                [element.key]: {}
              }

              if (!isNaN(element.val.from)) {
                fp.range[element.key] = {
                  gte: element.val.from
                }
              }

              if (!isNaN(element.val.to)) {
                fp.range[element.key] = {
                  ...fp.range[element.key],
                  lte: element.val.to
                }
              }
            }

            if (i > 0) {
              const [prev = {}] = curr.should
              if ((prev.term && prev.term[element.key]) && fp.term) {
                if (prev.term[element.key] === p[element.key]) return
                prev.terms = {
                  [element.key]: [prev.term[element.key], p[element.key]]
                }
                delete prev.term
                return
              }
            }

            curr.should.push(fp)
          })
        } else if (snapshot.node.opt === 'AND') {
          curr.must = []

          snapshot.node.child.forEach(element => {
            if (Array.isArray(element.child)) return

            if (nodeTransformer) {
              nodeTransformer(element)
            }

            const p = {}
            p[element.key] = element.val
            const fp = {}

            if (typeof element.val === 'string') {
              if (element.val.startsWith('"') && element.val.endsWith('"')) {
                fp.match_phrase = { [element.key]: element.val.slice(1, -1).trim() }
              } else if (element.val.includes('*') || element.val.includes('?')) {
                fp.wildcard = {}
                fp.wildcard[element.key] = {
                  value: element.val,
                  case_insensitive: true,
                  rewrite: WILDCARD_REWRITE
                }
              } else {
                fp.term = p
              }
            } else if (typeof element.val === 'object' && (element.val.from && element.val.to)) {
              fp.range = {
                [element.key]: {}
              }

              if (!isNaN(element.val.from)) {
                fp.range[element.key] = {
                  gte: element.val.from
                }
              }

              if (!isNaN(element.val.to)) {
                fp.range[element.key] = {
                  ...fp.range[element.key],
                  lte: element.val.to
                }
              }
            }

            curr.must.push(fp)
          })
        } else if (snapshot.node.opt === 'NOT') {
          curr.must_not = []

          snapshot.node.child.forEach((element, i) => {
            if (!element || Array.isArray(element.child)) return

            if (!i && !curr.must) {
              curr.must = []
            }

            if (nodeTransformer) {
              nodeTransformer(element)
            }

            const p = {}
            p[element.key] = element.val
            const fp = {}

            if (typeof element.val === 'string') {
              if (element.val.startsWith('"') && element.val.endsWith('"')) {
                fp.match_phrase = { [element.key]: element.val.slice(1, -1).trim() }
              } else if (element.val.includes('*') || element.val.includes('?')) {
                fp.wildcard = {}
                fp.wildcard[element.key] = {
                  value: element.val,
                  case_insensitive: true,
                  rewrite: WILDCARD_REWRITE
                }
              } else {
                fp.term = p
              }
            } else if (typeof element.val === 'object' && (element.val.from && element.val.to)) {
              fp.range = {
                [element.key]: {}
              }

              if (!isNaN(element.val.from)) {
                fp.range[element.key] = {
                  gte: element.val.from
                }
              }

              if (!isNaN(element.val.to)) {
                fp.range[element.key] = {
                  ...fp.range[element.key],
                  lte: element.val.to
                }
              }
            }

            if (!i) curr.must.push(fp)
            else curr.must_not.push(fp)
          })
        } else if (snapshot.node.opt === 'NEAR' || snapshot.node.opt === 'PRE') {
          curr.must = []

          const in_order = snapshot.node.opt === 'PRE'

          let slop

          switch (snapshot.node.span) {
            case 'S':
              slop = '15'
              break
            case 'P':
              slop = '50'
              break
            default:
              slop = snapshot.node.span
          }

          const span_near = { clauses: [], slop, in_order }

          snapshot.node.child.forEach(element => {
            if (Array.isArray(element.child)) return

            if (nodeTransformer) {
              nodeTransformer(element)
            }

            if (element.val.startsWith('"') && element.val.endsWith('"')) {
              element.val = element.val.slice(1, -1).trim()
              const terms = element.val.split(/ +/)

              if (terms.length > 1) {
                const clauses = terms.reduce((previousValue, currentValue) => {
                  previousValue.push({
                    span_term: {
                      [element.key]: currentValue
                    }
                  })

                  return previousValue
                }, [])

                span_near.clauses.push({
                  span_near: {
                    clauses,
                    in_order: true,
                    slop: 0
                  }
                })
              } else {
                const p = {}
                p[element.key] = element.val
                const fp = {}

                fp.span_term = p

                span_near.clauses.push(fp)
              }
            } else {
              const p = {}
              p[element.key] = element.val
              const fp = {}

              if (element.val.includes('*') || element.val.includes('?')) {
                fp.span_multi = { match: { wildcard: {} } }
                fp.span_multi.match.wildcard[element.key] = {
                  value: element.val,
                  case_insensitive: true,
                  rewrite: SPAN_MULTI_WILDCARD_REWRITE
                }
              } else {
                fp.span_term = p
              }

              span_near.clauses.push(fp)
            }
          })

          curr.must.push({ span_near })
        }

        // console.log('CASE 0: BASE')
        // console.dir(curr, { depth: null })

        const top = stack[stack.length - 1]
        if (top) top.next = curr

        if (snapshot.node.child[1] && snapshot.node.child[1].child) {
          stack.push({ node: { opt: snapshot.node.opt }, current: curr, next: {}, stage: 2 })
          stack.push({ node: snapshot.node.child[1], next: {}, stage: 0 })
        }

        if (snapshot.node.child[0] && snapshot.node.child[0].child) {
          stack.push({ node: { opt: snapshot.node.opt }, current: curr, next: {}, stage: 1 })
          stack.push({ node: snapshot.node.child[0], next: {}, stage: 0 })
        }

        if (!stack.length) snapshot.current = curr

        break
      }
      case 1: {
        const keys = Object.keys(snapshot.next)

        if (snapshot.node.opt === 'AND' && ((keys.length > 1) || (keys.length === 1 && keys[0] !== 'must'))) {
          snapshot.current.must.push({ bool: snapshot.next })
        } else if (snapshot.node.opt === 'AND' && keys.length === 1 && keys[0] === 'must') {
          const x = snapshot.current.must.map(i => JSON.stringify(i))
          snapshot.next.must.forEach(s => {
            if (!x.includes(JSON.stringify(s))) {
              snapshot.current.must.push(s)
            }
          })
        } else if (snapshot.node.opt === 'OR' && ((keys.length > 1) || (keys.length === 1 && keys[0] !== 'should'))) {
          snapshot.current.should.push({ bool: snapshot.next })
        } else if (snapshot.node.opt === 'OR' && keys.length === 1 && keys[0] === 'should') {
          const [prev = {}] = snapshot.current.should
          let key
          if (prev.term) key = Object.keys(prev.term)[0]
          const x = snapshot.current.should.map(i => JSON.stringify(i))
          snapshot.next.should.forEach(s => {
            if (s.terms && s.terms[key]) {
              prev.terms = {
                [key]: [prev.term[key]]
              }
              s.terms[key].forEach(t => {
                if (!prev.terms[key].includes(t)) {
                  prev.terms[key].push(t)
                }
              })
              delete prev.term
            } else if (s.term && s.term[key]) {
              if ((prev.term[key] !== s.term[key])) {
                prev.terms = {
                  [key]: [prev.term[key], s.term[key]]
                }
                delete prev.term
              }
            } else {
              if (!x.includes(JSON.stringify(s))) {
                snapshot.current.should.push(s)
              }
            }
          })
        } else if (snapshot.node.opt === 'NOT') {
          const [prev = {}] = snapshot.current.must_not
          let key
          if (prev.term) key = Object.keys(prev.term)[0]

          keys.forEach(k => {
            if (!snapshot.current[k]) snapshot.current[k] = snapshot.next[k]
            else {
              const x = snapshot.current[k].map(i => JSON.stringify(i))
              if (k === 'must_not' && key) {
                prev.terms = {
                  [key]: [prev.term[key]]
                }
              }
              snapshot.next[k].forEach(s => {
                if (!x.includes(JSON.stringify(s))) {
                  if (k === 'must_not' && s.term && s.term[key]) {
                    prev.terms[key].push(s.term[key])
                  } else if (k === 'must_not' && s.terms && s.terms[key]) {
                    s.terms[key].forEach(el => {
                      if (!prev.terms[key].includes(el)) {
                        prev.terms[key].push(el)
                      }
                    })
                  } else snapshot.current[k].push(s)
                }
              })

              if (k === 'must_not' && key) {
                if (prev.terms[key].length > 1) {
                  delete prev.term
                } else delete prev.terms
              }
            }
          })
        } else if ((snapshot.node.opt === 'NEAR' || snapshot.node.opt === 'PRE') && ((keys.length > 1) || (keys.length === 1 && keys[0] === 'must_not'))) {
          throw new Error('malformed query')
        } else if ((snapshot.node.opt === 'NEAR' || snapshot.node.opt === 'PRE') && keys.length === 1 && keys[0] === 'should') {
          snapshot.current.must[0].span_near.clauses.push({
            span_or: {
              clauses: snapshot.next.should.reduce((previousValue, currentValue) => {
                if (currentValue.term) {
                  previousValue.push({
                    span_term: currentValue.term
                  })
                } else if (currentValue.terms) {
                  const key = Object.keys(currentValue.terms)[0]

                  currentValue.terms[key].forEach(term => {
                    previousValue.push({
                      span_term: { [key]: term }
                    })
                  })
                } else if (currentValue.wildcard) {
                  const key = Object.keys(currentValue.wildcard)[0]

                  previousValue.push({
                    span_multi: {
                      match: { wildcard: { [key]: { ...currentValue.wildcard[key], rewrite: SPAN_MULTI_WILDCARD_REWRITE } } }
                    }
                  })
                } else if (currentValue.match_phrase) {
                  const key = Object.keys(currentValue.match_phrase)[0]
                  const phrase = currentValue.match_phrase[key]
                  const terms = phrase.split(/ +/)

                  if (terms.length > 1) {
                    previousValue.push({
                      span_near: {
                        clauses: terms.reduce((previousValue, currentValue) => {
                          previousValue.push({
                            span_term: {
                              [key]: currentValue
                            }
                          })

                          return previousValue
                        }, []),
                        in_order: true,
                        slop: 0
                      }
                    })
                  } else {
                    previousValue.push({
                      span_term: { [key]: phrase }
                    })
                  }
                } else if (currentValue.bool.must && currentValue.bool.must[0].span_near) {
                  previousValue.push(currentValue.bool.must[0])
                } else {
                  throw new Error('malformed query')
                }

                return previousValue
              }, [])
            }
          })
        } else if ((snapshot.node.opt === 'NEAR' || snapshot.node.opt === 'PRE') && keys.length === 1 && keys[0] === 'must') {
          snapshot.next.must.forEach(x => {
            if (x.term) {
              x.span_term = x.term
              delete x.term
            } else if (x.wildcard) {
              const key = Object.keys(x.wildcard)[0]
              x.span_multi = { match: { wildcard: { [key]: { ...x.wildcard[key], rewrite: SPAN_MULTI_WILDCARD_REWRITE } } } }
              delete x.wildcard
            } else if (x.match_phrase) {
              const key = Object.keys(x.match_phrase)[0]
              const phrase = x.match_phrase[key]
              const terms = phrase.split(/ +/)

              if (terms.length > 1) {
                const clauses = terms.reduce((previousValue, currentValue) => {
                  previousValue.push({
                    span_term: {
                      [key]: currentValue
                    }
                  })

                  return previousValue
                }, [])

                x.span_near = {
                  clauses,
                  in_order: true,
                  slop: 0
                }
              } else {
                x.span_term = { [key]: phrase }
              }
              delete x.match_phrase
            } else if (!x.span_near) {
              throw new Error('malformed query')
            }
          })

          snapshot.current.must[0].span_near.clauses.push(...snapshot.next.must)
        }

        break
      }
      case 2: {
        const keys = Object.keys(snapshot.next)

        if (snapshot.node.opt === 'AND' && ((keys.length > 1) || (keys.length === 1 && keys[0] !== 'must'))) {
          snapshot.current.must.push({ bool: snapshot.next })
        } else if (snapshot.node.opt === 'AND' && keys.length === 1 && keys[0] === 'must') {
          const x = snapshot.current.must.map(i => JSON.stringify(i))
          snapshot.next.must.forEach(s => {
            if (!x.includes(JSON.stringify(s))) {
              snapshot.current.must.push(s)
            }
          })
        } else if (snapshot.node.opt === 'OR' && ((keys.length > 1) || (keys.length === 1 && keys[0] !== 'should'))) {
          snapshot.current.should.push({ bool: snapshot.next })
        } else if (snapshot.node.opt === 'OR' && keys.length === 1 && keys[0] === 'should') {
          const [prev] = snapshot.current.should
          let key
          if (prev.term) key = Object.keys(prev.term)[0]
          else if (prev.terms) key = Object.keys(prev.terms)[0]
          const x = snapshot.current.should.map(i => JSON.stringify(i))
          snapshot.next.should.forEach(s => {
            if (prev.term && s.terms && s.terms[key]) {
              prev.terms = {
                [key]: [prev.term[key]]
              }
              s.terms[key].forEach(t => {
                if (!prev.terms[key].includes(t)) {
                  prev.terms[key].push(t)
                }
              })
              delete prev.term
            } else if (prev.terms && s.terms && s.terms[key]) {
              s.terms[key].forEach(t => {
                if (!prev.terms[key].includes(t)) {
                  prev.terms[key].push(t)
                }
              })
            } else if (prev.term && s.term && s.term[key]) {
              if ((prev.term[key] !== s.term[key])) {
                prev.terms = {
                  [key]: [prev.term[key], s.term[key]]
                }
                delete prev.term
              }
            } else if (prev.terms && s.term && s.term[key]) {
              if (!prev.terms[key].includes(s.term[key])) {
                prev.terms[key].push(s.term[key])
              }
            } else {
              if (!x.includes(JSON.stringify(s))) {
                snapshot.current.should.push(s)
              }
            }
          })
        } else if (snapshot.node.opt === 'NOT') {
          snapshot.current.must_not.push({ bool: snapshot.next })
        } else if ((snapshot.node.opt === 'NEAR' || snapshot.node.opt === 'PRE') && ((keys.length > 1) || (keys.length === 1 && keys[0] === 'must_not'))) {
          throw new Error('malformed query')
        } else if ((snapshot.node.opt === 'NEAR' || snapshot.node.opt === 'PRE') && keys.length === 1 && keys[0] === 'should') {
          snapshot.current.must[0].span_near.clauses.push({
            span_or: {
              clauses: snapshot.next.should.reduce((previousValue, currentValue) => {
                if (currentValue.term) {
                  previousValue.push({
                    span_term: currentValue.term
                  })
                } else if (currentValue.terms) {
                  const key = Object.keys(currentValue.terms)[0]

                  currentValue.terms[key].forEach(term => {
                    previousValue.push({
                      span_term: { [key]: term }
                    })
                  })
                } else if (currentValue.wildcard) {
                  const key = Object.keys(currentValue.wildcard)[0]

                  previousValue.push({
                    span_multi: {
                      match: { wildcard: { [key]: { ...currentValue.wildcard[key], rewrite: SPAN_MULTI_WILDCARD_REWRITE } } }
                    }
                  })
                } else if (currentValue.match_phrase) {
                  const key = Object.keys(currentValue.match_phrase)[0]
                  const phrase = currentValue.match_phrase[key]
                  const terms = phrase.split(/ +/)

                  if (terms.length > 1) {
                    previousValue.push({
                      span_near: {
                        clauses: terms.reduce((previousValue, currentValue) => {
                          previousValue.push({
                            span_term: {
                              [key]: currentValue
                            }
                          })

                          return previousValue
                        }, []),
                        in_order: true,
                        slop: 0
                      }
                    })
                  } else {
                    previousValue.push({
                      span_term: { [key]: phrase }
                    })
                  }
                } else if (currentValue.bool.must && currentValue.bool.must[0].span_near) {
                  previousValue.push(currentValue.bool.must[0])
                } else {
                  throw new Error('malformed query')
                }

                return previousValue
              }, [])
            }
          })
        } else if ((snapshot.node.opt === 'NEAR' || snapshot.node.opt === 'PRE') && keys.length === 1 && keys[0] === 'must') {
          snapshot.next.must.forEach(x => {
            if (x.term) {
              x.span_term = x.term
              delete x.term
            } else if (x.wildcard) {
              const key = Object.keys(x.wildcard)[0]
              x.span_multi = { match: { wildcard: { [key]: { ...x.wildcard[key], rewrite: SPAN_MULTI_WILDCARD_REWRITE } } } }
              delete x.wildcard
            } else if (x.match_phrase) {
              const key = Object.keys(x.match_phrase)[0]
              const phrase = x.match_phrase[key]
              const terms = phrase.split(/ +/)

              if (terms.length > 1) {
                const clauses = terms.reduce((previousValue, currentValue) => {
                  previousValue.push({
                    span_term: {
                      [key]: currentValue
                    }
                  })

                  return previousValue
                }, [])

                x.span_near = {
                  clauses,
                  in_order: true,
                  slop: 0
                }
              } else {
                x.span_term = { [key]: phrase }
              }
              delete x.match_phrase
            } else if (!x.span_near) {
              throw new Error('malformed query')
            }
          })

          snapshot.current.must[0].span_near.clauses.push(...snapshot.next.must)
        }

        break
      }
    }
  }

  return snapshot.current
}

const genRec = (node, nodeTransformer) => {
  if (!node || !Array.isArray(node.child)) return

  const result = {}

  if (node.opt === 'OR') {
    result.should = []

    node.child.forEach((element, i) => {
      if (Array.isArray(element.child)) return

      if (nodeTransformer) {
        nodeTransformer(element)
      }

      const p = {}
      p[element.key] = element.val
      const fp = {}

      if (typeof element.val === 'string') {
        if (element.val.startsWith('"') && element.val.endsWith('"')) {
          fp.match_phrase = { [element.key]: element.val.slice(1, -1).trim() }
        } else if (element.val.includes('*') || element.val.includes('?')) {
          fp.wildcard = {}
          fp.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true,
            rewrite: WILDCARD_REWRITE
          }
        } else {
          fp.term = p
        }
      } else if (typeof element.val === 'object' && (element.val.from && element.val.to)) {
        fp.range = {
          [element.key]: {}
        }

        if (!isNaN(element.val.from)) {
          fp.range[element.key] = {
            gte: element.val.from
          }
        }

        if (!isNaN(element.val.to)) {
          fp.range[element.key] = {
            ...fp.range[element.key],
            lte: element.val.to
          }
        }
      }

      if (i > 0) {
        const [prev = {}] = result.should
        if ((prev.term && prev.term[element.key]) && fp.term) {
          if (prev.term[element.key] === p[element.key]) return
          prev.terms = {
            [element.key]: [prev.term[element.key], p[element.key]]
          }
          delete prev.term
          return
        }
      }

      result.should.push(fp)
    })
  } else if (node.opt === 'AND') {
    result.must = []

    node.child.forEach(element => {
      if (Array.isArray(element.child)) return

      if (nodeTransformer) {
        nodeTransformer(element)
      }

      const p = {}
      p[element.key] = element.val
      const fp = {}

      if (typeof element.val === 'string') {
        if (element.val.startsWith('"') && element.val.endsWith('"')) {
          fp.match_phrase = { [element.key]: element.val.slice(1, -1).trim() }
        } else if (element.val.includes('*') || element.val.includes('?')) {
          fp.wildcard = {}
          fp.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true,
            rewrite: WILDCARD_REWRITE
          }
        } else {
          fp.term = p
        }
      } else if (typeof element.val === 'object' && (element.val.from && element.val.to)) {
        fp.range = {
          [element.key]: {}
        }

        if (!isNaN(element.val.from)) {
          fp.range[element.key] = {
            gte: element.val.from
          }
        }

        if (!isNaN(element.val.to)) {
          fp.range[element.key] = {
            ...fp.range[element.key],
            lte: element.val.to
          }
        }
      }

      result.must.push(fp)
    })
  } else if (node.opt === 'NOT') {
    result.must_not = []

    node.child.forEach((element, i) => {
      if (!element || Array.isArray(element.child)) return

      if (!i && !result.must) {
        result.must = []
      }

      if (nodeTransformer) {
        nodeTransformer(element)
      }

      const p = {}
      p[element.key] = element.val
      const fp = {}

      if (typeof element.val === 'string') {
        if (element.val.startsWith('"') && element.val.endsWith('"')) {
          fp.match_phrase = { [element.key]: element.val.slice(1, -1).trim() }
        } else if (element.val.includes('*') || element.val.includes('?')) {
          fp.wildcard = {}
          fp.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true,
            rewrite: WILDCARD_REWRITE
          }
        } else {
          fp.term = p
        }
      } else if (typeof element.val === 'object' && (element.val.from && element.val.to)) {
        fp.range = {
          [element.key]: {}
        }

        if (!isNaN(element.val.from)) {
          fp.range[element.key] = {
            gte: element.val.from
          }
        }

        if (!isNaN(element.val.to)) {
          fp.range[element.key] = {
            ...fp.range[element.key],
            lte: element.val.to
          }
        }
      }

      if (!i) result.must.push(fp)
      else result.must_not.push(fp)
    })
  } else if (node.opt === 'NEAR' || node.opt === 'PRE') {
    result.must = []

    const in_order = node.opt === 'PRE'

    let slop

    switch (node.span) {
      case 'S':
        slop = '15'
        break
      case 'P':
        slop = '50'
        break
      default:
        slop = node.span
    }

    const span_near = { clauses: [], slop, in_order }

    node.child.forEach(element => {
      if (Array.isArray(element.child)) return

      if (nodeTransformer) {
        nodeTransformer(element)
      }

      if (element.val.startsWith('"') && element.val.endsWith('"')) {
        element.val = element.val.slice(1, -1).trim()
        const terms = element.val.split(/ +/)

        if (terms.length > 1) {
          const clauses = terms.reduce((previousValue, currentValue) => {
            previousValue.push({
              span_term: {
                [element.key]: currentValue
              }
            })

            return previousValue
          }, [])

          span_near.clauses.push({
            span_near: {
              clauses,
              in_order: true,
              slop: 0
            }
          })
        } else {
          const p = {}
          p[element.key] = element.val
          const fp = {}

          fp.span_term = p

          span_near.clauses.push(fp)
        }
      } else {
        const p = {}
        p[element.key] = element.val
        const fp = {}

        if (element.val.includes('*') || element.val.includes('?')) {
          fp.span_multi = { match: { wildcard: {} } }
          fp.span_multi.match.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true,
            rewrite: SPAN_MULTI_WILDCARD_REWRITE
          }
        } else {
          fp.span_term = p
        }

        span_near.clauses.push(fp)
      }
    })

    result.must.push({ span_near })
  }

  // console.log('RESULT')
  // console.dir(result, { depth: null })
  // console.log('RESULT')

  let nextClause = null

  // first recur on left subtree
  const left = genRec(node.child[0], nodeTransformer)

  // console.log('LEFT')
  // console.dir(left, { depth: null })
  // console.log('LEFT')

  if (left) {
    nextClause = left
    const ncKeys = Object.keys(nextClause)

    if (node.opt === 'AND' && ((ncKeys.length > 1) || (ncKeys.length === 1 && ncKeys[0] !== 'must'))) {
      result.must.push({ bool: nextClause })
    } else if (node.opt === 'AND' && ncKeys.length === 1 && ncKeys[0] === 'must') {
      const x = result.must.map(i => JSON.stringify(i))
      nextClause.must.forEach(s => {
        if (!x.includes(JSON.stringify(s))) {
          result.must.push(s)
        }
      })
    } else if (node.opt === 'OR' && ((ncKeys.length > 1) || (ncKeys.length === 1 && ncKeys[0] !== 'should'))) {
      result.should.push({ bool: nextClause })
    } else if (node.opt === 'OR' && ncKeys.length === 1 && ncKeys[0] === 'should') {
      const [prev = {}] = result.should
      let key
      if (prev.term) key = Object.keys(prev.term)[0]
      const x = result.should.map(i => JSON.stringify(i))
      nextClause.should.forEach(s => {
        if (s.terms && s.terms[key]) {
          prev.terms = {
            [key]: [prev.term[key]]
          }
          s.terms[key].forEach(t => {
            if (!prev.terms[key].includes(t)) {
              prev.terms[key].push(t)
            }
          })
          delete prev.term
        } else if (s.term && s.term[key]) {
          if ((prev.term[key] !== s.term[key])) {
            prev.terms = {
              [key]: [prev.term[key], s.term[key]]
            }
            delete prev.term
          }
        } else {
          if (!x.includes(JSON.stringify(s))) {
            result.should.push(s)
          }
        }
      })
    } else if (node.opt === 'NOT') {
      const [prev = {}] = result.must_not
      let key
      if (prev.term) key = Object.keys(prev.term)[0]

      ncKeys.forEach(k => {
        if (!result[k]) result[k] = nextClause[k]
        else {
          const x = result[k].map(i => JSON.stringify(i))
          if (k === 'must_not' && key) {
            prev.terms = {
              [key]: [prev.term[key]]
            }
          }
          nextClause[k].forEach(s => {
            if (!x.includes(JSON.stringify(s))) {
              if (k === 'must_not' && s.term && s.term[key]) {
                prev.terms[key].push(s.term[key])
              } else if (k === 'must_not' && s.terms && s.terms[key]) {
                s.terms[key].forEach(el => {
                  if (!prev.terms[key].includes(el)) {
                    prev.terms[key].push(el)
                  }
                })
              } else result[k].push(s)
            }
          })

          if (k === 'must_not' && key) {
            if (prev.terms[key].length > 1) {
              delete prev.term
            } else delete prev.terms
          }
        }
      })
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ((ncKeys.length > 1) || (ncKeys.length === 1 && ncKeys[0] === 'must_not'))) {
      throw new Error('malformed query')
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ncKeys.length === 1 && ncKeys[0] === 'should') {
      result.must[0].span_near.clauses.push({
        span_or: {
          clauses: nextClause.should.reduce((previousValue, currentValue) => {
            if (currentValue.term) {
              previousValue.push({
                span_term: currentValue.term
              })
            } else if (currentValue.terms) {
              const key = Object.keys(currentValue.terms)[0]

              currentValue.terms[key].forEach(term => {
                previousValue.push({
                  span_term: { [key]: term }
                })
              })
            } else if (currentValue.wildcard) {
              const key = Object.keys(currentValue.wildcard)[0]

              previousValue.push({
                span_multi: {
                  match: { wildcard: { [key]: { ...currentValue.wildcard[key], rewrite: SPAN_MULTI_WILDCARD_REWRITE } } }
                }
              })
            } else if (currentValue.match_phrase) {
              const key = Object.keys(currentValue.match_phrase)[0]
              const phrase = currentValue.match_phrase[key]
              const terms = phrase.split(/ +/)

              if (terms.length > 1) {
                previousValue.push({
                  span_near: {
                    clauses: terms.reduce((previousValue, currentValue) => {
                      previousValue.push({
                        span_term: {
                          [key]: currentValue
                        }
                      })

                      return previousValue
                    }, []),
                    in_order: true,
                    slop: 0
                  }
                })
              } else {
                previousValue.push({
                  span_term: { [key]: phrase }
                })
              }
            } else if (currentValue.bool.must && currentValue.bool.must[0].span_near) {
              previousValue.push(currentValue.bool.must[0])
            } else {
              throw new Error('malformed query')
            }

            return previousValue
          }, [])
        }
      })
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ncKeys.length === 1 && ncKeys[0] === 'must') {
      nextClause.must.forEach(x => {
        if (x.term) {
          x.span_term = x.term
          delete x.term
        } else if (x.wildcard) {
          const key = Object.keys(x.wildcard)[0]
          x.span_multi = { match: { wildcard: { [key]: { ...x.wildcard[key], rewrite: SPAN_MULTI_WILDCARD_REWRITE } } } }
          delete x.wildcard
        } else if (x.match_phrase) {
          const key = Object.keys(x.match_phrase)[0]
          const phrase = x.match_phrase[key]
          const terms = phrase.split(/ +/)

          if (terms.length > 1) {
            const clauses = terms.reduce((previousValue, currentValue) => {
              previousValue.push({
                span_term: {
                  [key]: currentValue
                }
              })

              return previousValue
            }, [])

            x.span_near = {
              clauses,
              in_order: true,
              slop: 0
            }
          } else {
            x.span_term = { [key]: phrase }
          }
          delete x.match_phrase
        } else if (!x.span_near) {
          throw new Error('malformed query')
        }
      })

      result.must[0].span_near.clauses.push(...nextClause.must)
    }
  }

  // first recur on right subtree
  const right = genRec(node.child[1], nodeTransformer)
  // console.log('RIGHT')
  // console.dir(right, { depth: null })
  // console.log('RIGHT')

  if (right) {
    nextClause = right
    const ncKeys = Object.keys(nextClause)

    if (node.opt === 'AND' && ((ncKeys.length > 1) || (ncKeys.length === 1 && ncKeys[0] !== 'must'))) {
      result.must.push({ bool: nextClause })
    } else if (node.opt === 'AND' && ncKeys.length === 1 && ncKeys[0] === 'must') {
      const x = result.must.map(i => JSON.stringify(i))
      nextClause.must.forEach(s => {
        if (!x.includes(JSON.stringify(s))) {
          result.must.push(s)
        }
      })
    } else if (node.opt === 'OR' && ((ncKeys.length > 1) || (ncKeys.length === 1 && ncKeys[0] !== 'should'))) {
      result.should.push({ bool: nextClause })
    } else if (node.opt === 'OR' && ncKeys.length === 1 && ncKeys[0] === 'should') {
      const [prev] = result.should
      let key
      if (prev.term) key = Object.keys(prev.term)[0]
      else if (prev.terms) key = Object.keys(prev.terms)[0]
      const x = result.should.map(i => JSON.stringify(i))
      nextClause.should.forEach(s => {
        if (prev.term && s.terms && s.terms[key]) {
          prev.terms = {
            [key]: [prev.term[key]]
          }
          s.terms[key].forEach(t => {
            if (!prev.terms[key].includes(t)) {
              prev.terms[key].push(t)
            }
          })
          delete prev.term
        } else if (prev.terms && s.terms && s.terms[key]) {
          s.terms[key].forEach(t => {
            if (!prev.terms[key].includes(t)) {
              prev.terms[key].push(t)
            }
          })
        } else if (prev.term && s.term && s.term[key]) {
          if ((prev.term[key] !== s.term[key])) {
            prev.terms = {
              [key]: [prev.term[key], s.term[key]]
            }
            delete prev.term
          }
        } else if (prev.terms && s.term && s.term[key]) {
          if (!prev.terms[key].includes(s.term[key])) {
            prev.terms[key].push(s.term[key])
          }
        } else {
          if (!x.includes(JSON.stringify(s))) {
            result.should.push(s)
          }
        }
      })
    } else if (node.opt === 'NOT') {
      result.must_not.push({ bool: nextClause })
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ((ncKeys.length > 1) || (ncKeys.length === 1 && ncKeys[0] === 'must_not'))) {
      throw new Error('malformed query')
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ncKeys.length === 1 && ncKeys[0] === 'should') {
      result.must[0].span_near.clauses.push({
        span_or: {
          clauses: nextClause.should.reduce((previousValue, currentValue) => {
            if (currentValue.term) {
              previousValue.push({
                span_term: currentValue.term
              })
            } else if (currentValue.terms) {
              const key = Object.keys(currentValue.terms)[0]

              currentValue.terms[key].forEach(term => {
                previousValue.push({
                  span_term: { [key]: term }
                })
              })
            } else if (currentValue.wildcard) {
              const key = Object.keys(currentValue.wildcard)[0]

              previousValue.push({
                span_multi: {
                  match: { wildcard: { [key]: { ...currentValue.wildcard[key], rewrite: SPAN_MULTI_WILDCARD_REWRITE } } }
                }
              })
            } else if (currentValue.match_phrase) {
              const key = Object.keys(currentValue.match_phrase)[0]
              const phrase = currentValue.match_phrase[key]
              const terms = phrase.split(/ +/)

              if (terms.length > 1) {
                previousValue.push({
                  span_near: {
                    clauses: terms.reduce((previousValue, currentValue) => {
                      previousValue.push({
                        span_term: {
                          [key]: currentValue
                        }
                      })

                      return previousValue
                    }, []),
                    in_order: true,
                    slop: 0
                  }
                })
              } else {
                previousValue.push({
                  span_term: { [key]: phrase }
                })
              }
            } else if (currentValue.bool.must && currentValue.bool.must[0].span_near) {
              previousValue.push(currentValue.bool.must[0])
            } else {
              throw new Error('malformed query')
            }

            return previousValue
          }, [])
        }
      })
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ncKeys.length === 1 && ncKeys[0] === 'must') {
      nextClause.must.forEach(x => {
        if (x.term) {
          x.span_term = x.term
          delete x.term
        } else if (x.wildcard) {
          const key = Object.keys(x.wildcard)[0]
          x.span_multi = { match: { wildcard: { [key]: { ...x.wildcard[key], rewrite: SPAN_MULTI_WILDCARD_REWRITE } } } }
          delete x.wildcard
        } else if (x.match_phrase) {
          const key = Object.keys(x.match_phrase)[0]
          const phrase = x.match_phrase[key]
          const terms = phrase.split(/ +/)

          if (terms.length > 1) {
            const clauses = terms.reduce((previousValue, currentValue) => {
              previousValue.push({
                span_term: {
                  [key]: currentValue
                }
              })

              return previousValue
            }, [])

            x.span_near = {
              clauses,
              in_order: true,
              slop: 0
            }
          } else {
            x.span_term = { [key]: phrase }
          }
          delete x.match_phrase
        } else if (!x.span_near) {
          throw new Error('malformed query')
        }
      })

      result.must[0].span_near.clauses.push(...nextClause.must)
    }
  }

  return result
}

exports.genEqlIter = (q = '', nodeTransformer) => {
  const tree = parse(q)

  if (!Array.isArray(tree.child)) {
    if (nodeTransformer) {
      nodeTransformer(tree)
    }

    const p = {}
    p[tree.key] = tree.val
    const fp = {}

    if (typeof tree.val === 'string') {
      if (tree.val.startsWith('"') && tree.val.endsWith('"')) {
        fp.match_phrase = { [tree.key]: tree.val.slice(1, -1).trim() }
      } else if (tree.val.includes('*') || tree.val.includes('?')) {
        fp.wildcard = {}
        fp.wildcard[tree.key] = {
          value: tree.val,
          case_insensitive: true,
          rewrite: WILDCARD_REWRITE
        }
      } else {
        fp.term = p
      }
    } else if (typeof tree.val === 'object' && (tree.val.from && tree.val.to)) {
      fp.range = {
        [tree.key]: {}
      }

      if (!isNaN(tree.val.from)) {
        fp.range[tree.key] = {
          gte: tree.val.from
        }
      }

      if (!isNaN(tree.val.to)) {
        fp.range[tree.key] = {
          ...fp.range[tree.key],
          lte: tree.val.to
        }
      }
    }

    return {
      bool: {
        must: [fp]
      }
    }
  }

  return {
    bool: genIter(tree, nodeTransformer)
  }
}

exports.genEqlRec = (q = '', nodeTransformer) => {
  const tree = parse(q)

  if (!Array.isArray(tree.child)) {
    if (nodeTransformer) {
      nodeTransformer(tree)
    }

    const p = {}
    p[tree.key] = tree.val
    const fp = {}

    if (typeof tree.val === 'string') {
      if (tree.val.startsWith('"') && tree.val.endsWith('"')) {
        fp.match_phrase = { [tree.key]: tree.val.slice(1, -1).trim() }
      } else if (tree.val.includes('*') || tree.val.includes('?')) {
        fp.wildcard = {}
        fp.wildcard[tree.key] = {
          value: tree.val,
          case_insensitive: true,
          rewrite: WILDCARD_REWRITE
        }
      } else {
        fp.term = p
      }
    } else if (typeof tree.val === 'object' && (tree.val.from && tree.val.to)) {
      fp.range = {
        [tree.key]: {}
      }

      if (!isNaN(tree.val.from)) {
        fp.range[tree.key] = {
          gte: tree.val.from
        }
      }

      if (!isNaN(tree.val.to)) {
        fp.range[tree.key] = {
          ...fp.range[tree.key],
          lte: tree.val.to
        }
      }
    }

    return {
      bool: {
        must: [fp]
      }
    }
  }

  return {
    bool: genRec(tree, nodeTransformer)
  }
}
