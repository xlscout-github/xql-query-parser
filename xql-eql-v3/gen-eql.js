const { parse } = require('../parser')

function gen (node, nodeTransformer) {
  if (!Array.isArray(node.child)) {
    return
  }

  // console.log(node);

  const result = {}

  if (node.opt === 'OR') {
    if (!result.should) {
      result.should = []
    }

    node.child.forEach(element => {
      if (element.val === 'multi') {
        return
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

      result.should.push(fp)
    })
  } else if (node.opt === 'AND' || (node.opt === 'NOT' && !node.child[0].opt)) {
    if (!result.must) {
      result.must = []
    }

    node.child.forEach(element => {
      if (element.val === 'multi') {
        return
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

      result.must.push(fp)
    })
  } else if (node.opt === 'NOT') {
    if (!result.must_not) {
      result.must_not = []
    }

    node.child.forEach(element => {
      if (element.val === 'multi') {
        return
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

      result.must_not.push(fp)
    })
  } else if (node.opt === 'NEAR') {
    if (!result.must) {
      result.must = []
    }

    const span_near = { clauses: [], slop: node.span, in_order: false }

    node.child.forEach(element => {
      if (element.val === 'multi') {
        return
      }

      if (nodeTransformer) {
        nodeTransformer(element)
      }

      const p = {}
      p[element.key] = element.val
      const fp = {}

      if (typeof element.val === 'string') {
        if (element.val.includes('*') || element.val.includes('?')) {
          fp.span_multi = { match: { wildcard: {} } }
          fp.span_multi.match.wildcard[element.key] = {
            value: element.val,
            case_insensitive: true
          }
        } else {
          fp.span_term = p
        }
      } else if (typeof element.val === 'object' && (element.val.from || element.val.to)) {
        fp.range = {}
        fp.range[element.key] = {
          gte: isNaN(element.val.from) ? 0 : element.val.from || 0,
          lte: isNaN(element.val.to) ? 0 : element.val.to || 0
        }
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
    ncKeys = Object.keys(nextClause)

    if (node.opt === 'AND' && ncKeys.length === 1 && ncKeys[0] !== 'must') {
      result.must.push({ bool: nextClause })
    } else if (node.opt === 'AND' && ncKeys.length === 1 && ncKeys[0] === 'must') {
      // if (!hasDupes(result.must, nextClause.must )) {
      //     result.must.push(...nextClause.must)
      // }
      nextClause.must.forEach(s => {
        if (!result.must.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
          result.must.push(s)
        }
      })
      // result.must.push(...nextClause.must)
    } else if (node.opt === 'OR' && ncKeys.length === 1 && ncKeys[0] !== 'should') {
      result.should.push({ bool: nextClause })
    } else if (node.opt === 'OR' && ncKeys.length === 1 && ncKeys[0] === 'should') {
      // if (!hasDupes(result.should, nextClause.should )) {
      //     result.should.push(...nextClause.should)
      // }
      nextClause.should.forEach(s => {
        if (!result.should.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
          result.should.push(s)
        }
      })
      // result.should.push(...nextClause.should)
    }
    // Problematic block below
    // else if (node.opt === 'NOT' && ncKeys.length === 1 && !node.child[1].opt) {
    //     if (!result.must_not) {
    //         result.must_not = []
    //     }

    //     result.must_not.push(...nextClause[ncKeys[0]])

    //     // nextClause.must.forEach(s => {
    //     //     if (!result.must.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
    //     //         result.must.push(s)
    //     //     }
    //     // })
    // }

    else if (node.opt === 'NOT' && ncKeys.length === 1 && ncKeys[0] === 'must_not') {
      // if (!hasDupes(result.must_not, nextClause.must_not )) {
      //     result.must_not.push(...nextClause.must_not)
      // }
      nextClause.must_not.forEach(s => {
        if (!result.must_not.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
          result.must_not.push(s)
        }
      })
      // result.must_not.push(...nextClause.should)
    } else if (node.opt === 'NOT' && ncKeys.length === 1 && ncKeys[0] === 'must') {
      if (!result.must) {
        result.must = []
      }

      // if (!hasDupes(result.must, nextClause.must )) {
      //     result.must.push(...nextClause.must)
      // }
      nextClause.must.forEach(s => {
        if (!result.must.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
          result.must.push(s)
        }
      })
      // result.must.push(...nextClause.should)
    } else if (node.opt === 'NOT' && ncKeys.length === 1 && ncKeys[0] === 'should') {
      if (!result.should) {
        result.should = []
      }

      // if (!hasDupes(result.should, nextClause.should )) {
      //     result.should.push(...nextClause.should)
      // }
      nextClause.should.forEach(s => {
        if (!result.should.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
          result.should.push(s)
        }
      })
      // result.should.push(...nextClause.should)
    } else if (node.opt === 'OR' && ncKeys.length > 1) {
      result.should.push({ bool: nextClause })
    } else if (node.opt === 'NEAR' && ncKeys.length === 1 && ncKeys[0] === 'should') {
      result.must[0].span_near.clauses.push({
        span_or: {
          clauses: nextClause.should.map(x => {
            return {
              span_term: x.term
            }
          })
        }
      })
    } else if (node.opt === 'NEAR' && ncKeys.length === 1 && ncKeys[0] === 'must') {
      nextClause.must.forEach(x => {
        if (x.term) {
          x.span_term = x.term
          delete x.term
        }
      })

      result.must[0].span_near.clauses.push(...nextClause.must)
    }
  }

  // first recur on right subtree
  const right = gen(node.child[1], nodeTransformer)
  if (right) {
    nextClause = right
    ncKeys = Object.keys(nextClause)

    if (node.opt === 'AND' && ncKeys.length === 1 && ncKeys[0] !== 'must') {
      result.must.push({ bool: nextClause })
    } else if (node.opt === 'AND' && ncKeys.length === 1 && ncKeys[0] === 'must') {
      // if (!hasDupes(result.must, nextClause.must )) {
      //     result.must.push(...nextClause.must)
      // }
      nextClause.must.forEach(s => {
        if (!result.must.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
          result.must.push(s)
        }
      })
      // result.must.push(...nextClause.must)
    } else if (node.opt === 'OR' && ncKeys.length === 1 && ncKeys[0] !== 'should') {
      result.should.push({ bool: nextClause })
    } else if (node.opt === 'OR' && ncKeys.length === 1 && ncKeys[0] === 'should') {
      // if (!hasDupes(result.should, nextClause.should )) {
      //     result.should.push(...nextClause.should)
      // }
      nextClause.should.forEach(s => {
        if (!result.should.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
          result.should.push(s)
        }
      })
      // result.should.push(...nextClause.should)
    }
    // Problematic block below
    // else if (node.opt === 'NOT' && ncKeys.length === 1 && !node.child[0].opt) {
    //     if (!result.must_not) {
    //         result.must_not = []
    //     }

    //     result.must_not.push(...nextClause[ncKeys[0]])

    //     // nextClause.must.forEach(s => {
    //     //     if (!result.must.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
    //     //         result.must.push(s)
    //     //     }
    //     // })
    // }
    else if (node.opt === 'NOT' && ncKeys.length === 1 && ncKeys[0] === 'must_not') {
      // if (!hasDupes(result.must_not, nextClause.must_not )) {
      //     result.must_not.push(...nextClause.must_not)
      // }
      nextClause.must_not.forEach(s => {
        if (!result.must_not.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
          result.must_not.push(s)
        }
      })
      // result.must_not.push(...nextClause.should)
    }
    // trouble maker
    else if (node.opt === 'NOT' && ncKeys.length === 1 && (ncKeys[0] === 'should' || ncKeys[0] === 'must') && node.child[1].opt && (node.child[1].opt === 'OR' || node.child[1].opt === 'AND')) {
      if (!result.must_not) {
        result.must_not = []
      }

      const mnq = { bool: {} }
      mnq.bool[ncKeys[0]] = nextClause[ncKeys[0]]
      result.must_not.push(mnq)
    } else if (node.opt === 'NOT' && ncKeys.length === 1 && ncKeys[0] === 'must') {
      if (!result.must) {
        result.must = []
      }

      // if (!hasDupes(result.must, nextClause.must )) {
      //     result.must.push(...nextClause.must)
      // }
      nextClause.must.forEach(s => {
        if (!result.must.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
          result.must.push(s)
        }
      })
      // result.must.push(...nextClause.should)
    } else if (node.opt === 'NOT' && ncKeys.length === 1 && ncKeys[0] === 'should') {
      if (!result.should) {
        result.should = []
      }

      // if (!hasDupes(result.should, nextClause.should )) {
      //     result.should.push(...nextClause.should)
      // }
      nextClause.should.forEach(s => {
        if (!result.should.map(x => JSON.stringify(x)).includes(JSON.stringify(s))) {
          result.should.push(s)
        }
      })
      // result.should.push(...nextClause.should)
    } else if (node.opt === 'NEAR' && ncKeys.length === 1 && ncKeys[0] === 'should') {
      result.must[0].span_near.clauses.push({
        span_or: {
          clauses: nextClause.should.map(x => {
            return {
              span_term: x.term
            }
          })
        }
      })
    } else if (node.opt === 'NEAR' && ncKeys.length === 1 && ncKeys[0] === 'must') {
      nextClause.must.forEach(x => {
        if (x.term) {
          x.span_term = x.term
          delete x.term
        }
      })

      result.must[0].span_near.clauses.push(...nextClause.must)
    }
  }

  return result
}

function finalGen (q = '', nodeTransformer) {
  return {
    bool: {
      ...(gen(parse(q), nodeTransformer))
    }
  }
}

module.exports = finalGen
