const { parse } = require('../parser')

function gen (node, nodeTransformer) {
  if (!node || !Array.isArray(node.child)) return

  const result = {}

  if (node.opt === 'OR') {
    if (!result.should) {
      result.should = []
    }

    node.child.forEach(element => {
      if (Array.isArray(element.child)) return

      if (nodeTransformer) {
        nodeTransformer(element)
      }

      const p = {}
      p[element.key] = element.val
      const fp = {}

      if (typeof element.val === 'string') {
        if (element.val.includes('*') || element.val.includes('?')) {
          fp.wildcard = {}
          fp.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true
          }
        } else {
          fp.term = p
        }
      } else if (typeof element.val === 'object' && (element.val.from || element.val.to)) {
        fp.range = {}
        fp.range[element.key] = {
          gte: isNaN(element.val.from) ? 0 : element.val.from || 0,
          lte: isNaN(element.val.to) ? 0 : element.val.to || 0
        }
      }

      result.should.push(fp)
    })
  } else if (node.opt === 'AND') {
    if (!result.must) {
      result.must = []
    }

    node.child.forEach(element => {
      if (Array.isArray(element.child)) return

      if (nodeTransformer) {
        nodeTransformer(element)
      }

      const p = {}
      p[element.key] = element.val
      const fp = {}

      if (typeof element.val === 'string') {
        if (element.val.includes('*') || element.val.includes('?')) {
          fp.wildcard = {}
          fp.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true
          }
        } else {
          fp.term = p
        }
      } else if (typeof element.val === 'object' && (element.val.from || element.val.to)) {
        fp.range = {}
        fp.range[element.key] = {
          gte: isNaN(element.val.from) ? 0 : element.val.from || 0,
          lte: isNaN(element.val.to) ? 0 : element.val.to || 0
        }
      }

      result.must.push(fp)
    })
  } else if (node.opt === 'NOT') {
    if (!result.must_not) {
      result.must_not = []
    }

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
        if (element.val.includes('*') || element.val.includes('?')) {
          fp.wildcard = {}
          fp.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true
          }
        } else {
          fp.term = p
        }
      } else if (typeof element.val === 'object' && (element.val.from || element.val.to)) {
        fp.range = {}
        fp.range[element.key] = {
          gte: isNaN(element.val.from) ? 0 : element.val.from || 0,
          lte: isNaN(element.val.to) ? 0 : element.val.to || 0
        }
      }

      if (!i) result.must.push(fp)
      else result.must_not.push(fp)
    })
  } else if (node.opt === 'NEAR' || node.opt === 'PRE') {
    if (!result.must) {
      result.must = []
    }

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
      if (tree.val.includes('*') || tree.val.includes('?')) {
        fp.wildcard = {}
        fp.wildcard[tree.key] = {
          value: tree.val,
          case_insensitive: true
        }
      } else {
        fp.term = p
      }
    } else if (typeof tree.val === 'object' && (tree.val.from || tree.val.to)) {
      fp.range = {}
      fp.range[tree.key] = {
        gte: isNaN(tree.val.from) ? 0 : tree.val.from || 0,
        lte: isNaN(tree.val.to) ? 0 : tree.val.to || 0
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
