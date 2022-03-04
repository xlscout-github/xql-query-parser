const { parse } = require('../parser')

function gen (node, nodeTransformer) {
  if (!node || !Array.isArray(node.child)) return

  const result = {}

  if (node.opt === 'OR') {
    result.should = []

    node.child.forEach(element => {
      if (Array.isArray(element.child)) return

      if (nodeTransformer) {
        nodeTransformer(element)
      }

      const p = {}
      p[element.key] = element.val
      const fp = {}

      if (typeof element.val === 'string') {
        if ((element.val.startsWith('"') && element.val.endsWith('"')) ||
      (element.val.startsWith("'") && element.val.endsWith("'"))) {
          fp.match_phrase = p
        } else if (element.val.includes('*') || element.val.includes('?')) {
          fp.wildcard = {}
          fp.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true
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
        if ((element.val.startsWith('"') && element.val.endsWith('"')) ||
        (element.val.startsWith("'") && element.val.endsWith("'"))) {
          fp.match_phrase = p
        } else if (element.val.includes('*') || element.val.includes('?')) {
          fp.wildcard = {}
          fp.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true
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
        if ((element.val.startsWith('"') && element.val.endsWith('"')) ||
      (element.val.startsWith("'") && element.val.endsWith("'"))) {
          fp.match_phrase = p
        } else if (element.val.includes('*') || element.val.includes('?')) {
          fp.wildcard = {}
          fp.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true
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

      if ((element.val.startsWith('"') && element.val.endsWith('"')) ||
      (element.val.startsWith("'") && element.val.endsWith("'"))) {
        element.val = element.val.slice(1, -1).trim()
        const terms = element.val.split(/ +/)

        if (terms.length > 1) {
          const clauses = terms.reduce((previousValue, currentValue) => {
            if (currentValue.includes('*') || currentValue.includes('?')) {
              previousValue.push({
                span_multi: {
                  match: {
                    wildcard: {
                      [element.key]: {
                        value: currentValue,
                        case_insensitive: true
                      }
                    }
                  }
                }
              })
            } else {
              previousValue.push({
                span_term: {
                  [element.key]: currentValue
                }
              })
            }

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

          if (element.val.includes('*') || element.val.includes('?')) {
            fp.span_multi = { match: { wildcard: {} } }
            fp.span_multi.match.wildcard[element.key] = {
              value: element.val,
              case_insensitive: true
            }
          } else {
            fp.span_term = p
          }

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
            case_insensitive: true
          }
        } else {
          fp.span_term = p
        }

        span_near.clauses.push(fp)
      }
    })

    result.must.push({ span_near })
  }

  let nextClause = null

  // first recur on left subtree
  const left = gen(node.child[0], nodeTransformer)

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
      const x = result.should.map(i => JSON.stringify(i))
      nextClause.should.forEach(s => {
        if (!x.includes(JSON.stringify(s))) {
          result.should.push(s)
        }
      })
    } else if (node.opt === 'NOT') {
      ncKeys.forEach(key => {
        if (!result[key]) result[key] = nextClause[key]
        else {
          const x = result[key].map(i => JSON.stringify(i))
          nextClause[key].forEach(s => {
            if (!x.includes(JSON.stringify(s))) {
              result[key].push(s)
            }
          })
        }
      })
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ((ncKeys.length > 1) || (ncKeys.length === 1 && ncKeys[0] === 'must_not'))) {
      throw new Error('malformed query')
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ncKeys.length === 1 && ncKeys[0] === 'should') {
      result.must[0].span_near.clauses.push({
        span_or: {
          clauses: nextClause.should.map(x => {
            if (x.term) {
              return {
                span_term: x.term
              }
            } else if (x.wildcard) {
              return {
                span_multi: {
                  match: x
                }
              }
            } else if (x.bool.must && x.bool.must[0].span_near) {
              return x.bool.must[0]
            } else {
              throw new Error('malformed query')
            }
          })
        }
      })
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ncKeys.length === 1 && ncKeys[0] === 'must') {
      nextClause.must.forEach(x => {
        if (x.term) {
          x.span_term = x.term
          delete x.term
        } else if (x.wildcard) {
          x.span_multi = { match: { wildcard: x.wildcard } }
          delete x.wildcard
        } else if (!x.span_near) {
          throw new Error('malformed query')
        }
      })

      result.must[0].span_near.clauses.push(...nextClause.must)
    }
  }

  // first recur on right subtree
  const right = gen(node.child[1], nodeTransformer)

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
      const x = result.should.map(i => JSON.stringify(i))
      nextClause.should.forEach(s => {
        if (!x.includes(JSON.stringify(s))) {
          result.should.push(s)
        }
      })
    } else if (node.opt === 'NOT') {
      result.must_not.push({ bool: nextClause })
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ((ncKeys.length > 1) || (ncKeys.length === 1 && ncKeys[0] === 'must_not'))) {
      throw new Error('malformed query')
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ncKeys.length === 1 && ncKeys[0] === 'should') {
      result.must[0].span_near.clauses.push({
        span_or: {
          clauses: nextClause.should.map(x => {
            if (x.term) {
              return {
                span_term: x.term
              }
            } else if (x.wildcard) {
              return {
                span_multi: {
                  match: x
                }
              }
            } else if (x.bool.must && x.bool.must[0].span_near) {
              return x.bool.must[0]
            } else {
              throw new Error('malformed query')
            }
          })
        }
      })
    } else if ((node.opt === 'NEAR' || node.opt === 'PRE') && ncKeys.length === 1 && ncKeys[0] === 'must') {
      nextClause.must.forEach(x => {
        if (x.term) {
          x.span_term = x.term
          delete x.term
        } else if (x.wildcard) {
          x.span_multi = { match: { wildcard: x.wildcard } }
          delete x.wildcard
        } else if (!x.span_near) {
          throw new Error('malformed query')
        }
      })

      result.must[0].span_near.clauses.push(...nextClause.must)
    }
  }

  return result
}

function finalGen (q = '', nodeTransformer) {
  const tree = parse(q)

  if (!Array.isArray(tree.child)) {
    if (nodeTransformer) {
      nodeTransformer(tree)
    }

    const p = {}
    p[tree.key] = tree.val
    const fp = {}

    if (typeof tree.val === 'string') {
      if ((tree.val.startsWith('"') && tree.val.endsWith('"')) ||
      (tree.val.startsWith("'") && tree.val.endsWith("'"))) {
        fp.match_phrase = p
      } else if (tree.val.includes('*') || tree.val.includes('?')) {
        fp.wildcard = {}
        fp.wildcard[tree.key] = {
          value: tree.val,
          case_insensitive: true
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
        must: fp
      }
    }
  }

  return {
    bool: gen(tree, nodeTransformer)
  }
}

module.exports = finalGen
