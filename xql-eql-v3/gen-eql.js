const { parse } = require('../parser')

function gen (node, nodeTransformer) {
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
        if (element.val.startsWith('"') && element.val.endsWith('"')) {
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

  // console.log('RESULT')
  // console.dir(result, { depth: null })
  // console.log('RESULT')

  let nextClause = null

  // first recur on left subtree
  const left = gen(node.child[0], nodeTransformer)

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

  // console.log('TREE')
  // console.dir(tree, { depth: null })

  if (!Array.isArray(tree.child)) {
    if (nodeTransformer) {
      nodeTransformer(tree)
    }

    const p = {}
    p[tree.key] = tree.val
    const fp = {}

    if (typeof tree.val === 'string') {
      if (tree.val.startsWith('"') && tree.val.endsWith('"')) {
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
        must: [fp]
      }
    }
  }

  return {
    bool: gen(tree, nodeTransformer)
  }
}

module.exports = finalGen
