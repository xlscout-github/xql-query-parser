const REWRITE = 'top_terms_10000'
const SPAN_MULTI_WILDCARD_REWRITE = 'top_terms_2500'

function makeClause (field, value) {
  if (typeof value === 'string') {
    if (value.startsWith('"') && value.endsWith('"')) {
      return {
        match_phrase: {
          [field]: value.slice(1, -1).trim()
        }
      }
    } else if (value.includes('*') || value.includes('?')) {
      return {
        wildcard: {
          [field]: {
            value: value,
            case_insensitive: true,
            rewrite: REWRITE
          }
        }
      }
    } else {
      return { term: { [field]: value } }
    }
  } else if (
    typeof value === 'object' &&
    value.from &&
    value.to
  ) {
    const range = { [field]: {} }

    if (value.from !== '*') {
      range[field] = { gte: value.from }
    }

    if (value.to !== '*') {
      range[field] = {
        ...range[field],
        lte: value.to
      }
    }

    return { range }
  }
}

function makeProximityClause (field, value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).trim()
    const terms = value.split(/ +/)

    if (terms.length > 1) {
      const clauses = terms.reduce((previousValue, currentValue) => {
        previousValue.push({
          span_term: {
            [field]: currentValue
          }
        })

        return previousValue
      }, [])

      return {
        span_near: {
          clauses,
          in_order: true,
          slop: 0
        }
      }
    } else {
      return {
        span_term: {
          [field]: value
        }
      }
    }
  } else if (value.includes('*') || value.includes('?')) {
    return {
      span_multi: {
        match: {
          wildcard: {
            [field]: {
              value,
              case_insensitive: true,
              rewrite: SPAN_MULTI_WILDCARD_REWRITE
            }
          }
        }
      }
    }
  } else {
    return {
      span_term: {
        [field]: value
      }
    }
  }
}

function adaptMust (must) {
  for (const iterator of must) {
    if (iterator.term) {
      iterator.span_term = iterator.term
      delete iterator.term
    } else if (iterator.wildcard) {
      const [wc] = Object.keys(iterator.wildcard)
      iterator.span_multi = {
        match: {
          wildcard: {
            [wc]: {
              ...iterator.wildcard[wc],
              rewrite: SPAN_MULTI_WILDCARD_REWRITE
            }
          }
        }
      }
      delete iterator.wildcard
    } else if (iterator.match_phrase) {
      const [mp] = Object.keys(iterator.match_phrase)
      const value = iterator.match_phrase[mp]
      const terms = value.split(/ +/)

      if (terms.length > 1) {
        const clauses = terms.reduce(
          (previousValue, currentValue) => {
            previousValue.push({
              span_term: {
                [mp]: currentValue
              }
            })

            return previousValue
          },
          []
        )

        iterator.span_near = {
          clauses,
          in_order: true,
          slop: 0
        }
      } else {
        iterator.span_term = { [mp]: value }
      }

      delete iterator.match_phrase
    } else if (!iterator.span_near) {
      throw new Error('malformed query')
    }
  }

  return must
}

function adaptShould (should) {
  return should.reduce(
    (previousValue, currentValue) => {
      if (currentValue.term) {
        previousValue.push({
          span_term: currentValue.term
        })
      } else if (currentValue.terms) {
        for (const key in currentValue.terms) {
          currentValue.terms[key].forEach(
            (term) => {
              previousValue.push({
                span_term: { [key]: term }
              })
            }
          )
        }
      } else if (currentValue.wildcard) {
        const [wc] = Object.keys(currentValue.wildcard)
        previousValue.push({
          span_multi: {
            match: {
              wildcard: {
                [wc]: {
                  ...currentValue.wildcard[wc],
                  rewrite:
                      SPAN_MULTI_WILDCARD_REWRITE
                }
              }
            }
          }
        })
      } else if (currentValue.match_phrase) {
        const [mp] = Object.keys(currentValue.match_phrase)
        const phrase =
            currentValue.match_phrase[mp]
        const terms = phrase.split(/ +/)

        if (terms.length > 1) {
          previousValue.push({
            span_near: {
              clauses: terms.reduce(
                (previousValue, currentValue) => {
                  previousValue.push({
                    span_term: {
                      [mp]: currentValue
                    }
                  })

                  return previousValue
                },
                []
              ),
              in_order: true,
              slop: 0
            }
          })
        } else {
          previousValue.push({
            span_term: { [mp]: phrase }
          })
        }
      } else if (
        currentValue.bool.must &&
        currentValue.bool.must[0].span_near
      ) {
        previousValue.push(
          currentValue.bool.must[0]
        )
      } else {
        throw new Error('malformed query')
      }

      return previousValue
    },
    []
  )
}

function create (left, right, operator, slop) {
  switch (operator) {
    case 'AND': {
      if (left.bool && right.bool) {
        if (left.bool.must && right.bool.must) {
          const items = new Set()
          const negateItems = new Set()

          for (const item of left.bool.must) {
            items.add(JSON.stringify(item))
          }

          if (left.bool.must_not) {
            for (const item of left.bool.must_not) {
              negateItems.add(JSON.stringify(item))
            }
          }

          for (const item of right.bool.must) {
            const jsonClause = JSON.stringify(item)

            if (!items.has(jsonClause)) {
              left.bool.must.push(item)
            }
          }

          if (left.bool.must_not && right.bool.must_not) {
            for (const item of right.bool.must_not) {
              const jsonClause = JSON.stringify(item)

              if (!negateItems.has(jsonClause)) {
                left.bool.must_not.push(item)
              }
            }
          } else if (right.bool.must_not) {
            left.bool.must_not = right.bool.must_not
          }

          return left
        } else if (left.bool.must) {
          const jsonClause = JSON.stringify(right)
          const items = new Set()

          for (const item of left.bool.must) {
            const json = JSON.stringify(item)

            if (json === jsonClause) return left

            items.add(json)
          }

          if (left.bool.must_not && right.bool.must_not) {
            const negateItems = new Set()

            for (const item of left.bool.must_not) {
              negateItems.add(JSON.stringify(item))
            }

            for (const item of right.bool.must_not) {
              const json = JSON.stringify(item)

              if (!negateItems.has(json)) {
                left.bool.must_not.push(item)
              }
            }
          } else if (right.bool.must_not) {
            left.bool.must_not = right.bool.must_not
          } else {
            left.bool.must.push(right)
          }

          return left
        } else if (right.bool.must) {
          const jsonClause = JSON.stringify(left)
          const items = new Set()

          for (const item of right.bool.must) {
            const json = JSON.stringify(item)

            if (json === jsonClause) return right

            items.add(json)
          }

          if (left.bool.must_not && right.bool.must_not) {
            const negateItems = new Set()

            for (const item of right.bool.must_not) {
              negateItems.add(JSON.stringify(item))
            }

            for (const item of left.bool.must_not) {
              const json = JSON.stringify(item)

              if (!negateItems.has(json)) {
                right.bool.must_not.push(item)
              }
            }
          } else if (left.bool.must_not) {
            right.bool.must_not = left.bool.must_not
          } else {
            right.bool.must.push(left)
          }

          return right
        } else {
          if (left.bool.must_not && right.bool.must_not) {
            const negateItems = new Set()

            for (const item of left.bool.must_not) {
              negateItems.add(JSON.stringify(item))
            }

            for (const item of right.bool.must_not) {
              const jsonClause = JSON.stringify(item)

              if (!negateItems.has(jsonClause)) {
                left.bool.must_not.push(item)
              }
            }

            return left
          }

          return {
            bool: {
              must: [left, right]
            }
          }
        }
      } else if (left.bool) {
        const clause = makeClause(right.key, right.val)

        if (!clause) return left

        if (left.bool.must) {
          const jsonClause = JSON.stringify(clause)

          for (const item of left.bool.must) {
            if (JSON.stringify(item) === jsonClause) {
              return left
            }
          }

          left.bool.must.push(clause)

          return left
        } else if (left.bool.must_not) {
          left.bool.must = [clause]

          return left
        } else {
          return {
            bool: {
              must: [left, clause]
            }
          }
        }
      } else if (right.bool) {
        const clause = makeClause(left.key, left.val)

        if (right.bool.must) {
          const jsonClause = JSON.stringify(clause)

          for (const item of right.bool.must) {
            if (JSON.stringify(item) === jsonClause) {
              return right
            }
          }

          right.bool.must.push(clause)

          return right
        } else if (right.bool.must_not) {
          right.bool.must = [clause]

          return right
        } else {
          return {
            bool: {
              must: [clause, right]
            }
          }
        }
      } else {
        if (JSON.stringify(left) !== JSON.stringify(right)) {
          const booleanQuery = { bool: { must: [] } }

          booleanQuery.bool.must.push(makeClause(left.key, left.val))

          const clause = makeClause(right.key, right.val)

          if (clause) booleanQuery.bool.must.push(clause)

          return booleanQuery
        } else {
          return {
            bool: {
              must: [makeClause(left.key, left.val)]
            }
          }
        }
      }
    }
    case 'OR': {
      if (left.bool && right.bool) {
        if (left.bool.should && right.bool.should) {
          const items = new Set()
          const records = new Map()
          const clauses = {
            TERM: Symbol('term'),
            TERMS: Symbol('terms')
          }

          for (let i = 0; i < left.bool.should.length; i++) {
            items.add(JSON.stringify(left.bool.should[i]))

            if (left.bool.should[i].term) {
              for (const k in left.bool.should[i].term) {
                records.set(k, { i, kind: clauses.TERM })
              }
            } else if (left.bool.should[i].terms) {
              for (const k in left.bool.should[i].terms) {
                records.set(k, { i, kind: clauses.TERMS })
              }
            }
          }

          for (let i = 0; i < right.bool.should.length; i++) {
            if (!items.has(JSON.stringify(right.bool.should[i]))) {
              if (right.bool.should[i].term) {
                for (const k in right.bool.should[i].term) {
                  const record = records.get(k)
                  if (record) {
                    if (record.kind === clauses.TERM) {
                      left.bool.should.splice(record.i, 1, {
                        terms: {
                          [k]: [
                            left.bool.should[record.i].term[k],
                            right.bool.should[i].term[k]
                          ]
                        }
                      })
                    } else if (record.kind === clauses.TERMS) {
                      if (
                        !left.bool.should[record.i].terms[k].includes(
                          right.bool.should[i].term[k]
                        )
                      ) {
                        left.bool.should[record.i].terms[k].push(
                          right.bool.should[i].term[k]
                        )
                      }
                    }
                  } else {
                    left.bool.should.push(right.bool.should[i])
                  }
                }
              } else if (right.bool.should[i].terms) {
                for (const k in right.bool.should[i].terms) {
                  const record = records.get(k)
                  if (record) {
                    if (record.kind === clauses.TERM) {
                      if (
                        !right.bool.should[i].terms[k].includes(left.bool.should[record.i].term[k])
                      ) {
                        right.bool.should[i].terms[k].push(left.bool.should[record.i].term[k])
                      }
                      left.bool.should.splice(record.i, 1, {
                        terms: right.bool.should[i].terms
                      })
                    } else if (record.kind === clauses.TERMS) {
                      for (const item of right.bool.should[i].terms[k]) {
                        if (
                          !left.bool.should[record.i].terms[k].includes(item)
                        ) {
                          left.bool.should[record.i].terms[k].push(item)
                        }
                      }
                    }
                  } else {
                    left.bool.should.push(right.bool.should[i])
                  }
                }
              } else {
                left.bool.should.push(right.bool.should[i])
              }
            }
          }

          return left
        } else if (left.bool.should) {
          const jsonClause = JSON.stringify(right)

          for (const item of left.bool.should) {
            if (JSON.stringify(item) === jsonClause) {
              return left
            }
          }

          left.bool.should.push(right)

          return left
        } else if (right.bool.should) {
          const jsonClause = JSON.stringify(left)

          for (const item of right.bool.should) {
            if (JSON.stringify(item) === jsonClause) {
              return right
            }
          }

          right.bool.should.push(left)

          return right
        } else {
          return {
            bool: {
              should: [left, right]
            }
          }
        }
      } else if (left.bool) {
        const clause = makeClause(right.key, right.val)

        if (left.bool.should) {
          const jsonClause = JSON.stringify(clause)

          for (let i = 0; i < left.bool.should.length; i++) {
            if (JSON.stringify(left.bool.should[i]) === jsonClause) {
              return left
            }

            if (
              clause.term &&
              left.bool.should[i].term &&
              left.bool.should[i].term[right.key]
            ) {
              left.bool.should.splice(i, 1, {
                terms: {
                  [right.key]: [left.bool.should[i].term[right.key], right.val]
                }
              })
              return left
            }

            if (
              clause.term &&
              left.bool.should[i].terms &&
              left.bool.should[i].terms[right.key]
            ) {
              if (!left.bool.should[i].terms[right.key].includes(right.val)) {
                left.bool.should[i].terms[right.key].push(right.val)
              }
              return left
            }
          }

          left.bool.should.push(clause)

          return left
        } else {
          return {
            bool: {
              should: [left, clause]
            }
          }
        }
      } else if (right.bool) {
        const clause = makeClause(left.key, left.val)

        if (right.bool.should) {
          const jsonClause = JSON.stringify(clause)

          for (let i = 0; i < right.bool.should.length; i++) {
            if (JSON.stringify(right.bool.should[i]) === jsonClause) {
              return right
            }

            if (
              clause.term &&
              right.bool.should[i].term &&
              right.bool.should[i].term[left.key]
            ) {
              right.bool.should.splice(i, 1, {
                terms: {
                  [left.key]: [right.bool.should[i].term[left.key], left.val]
                }
              })
              return right
            }

            if (
              clause.term &&
              right.bool.should[i].terms &&
              right.bool.should[i].terms[left.key]
            ) {
              if (!right.bool.should[i].terms[left.key].includes(left.val)) {
                right.bool.should[i].terms[left.key].push(left.val)
              }
              return right
            }
          }

          right.bool.should.push(clause)

          return right
        } else {
          return {
            bool: {
              should: [clause, right]
            }
          }
        }
      } else {
        if (left.key === right.key) {
          if (left.val !== right.val) {
            const booleanQuery = { bool: { should: [] } }

            booleanQuery.bool.should.push(makeClause(left.key, left.val), makeClause(right.key, right.val))

            if (booleanQuery.bool.should.every(value => value.term)) {
              booleanQuery.bool.should = []
              booleanQuery.bool.should.push({
                terms: { [left.key]: [left.val, right.val] }
              })
            }

            return booleanQuery
          } else {
            return {
              bool: {
                should: [makeClause(left.key, left.val)]
              }
            }
          }
        } else {
          const booleanQuery = { bool: { should: [] } }

          booleanQuery.bool.should.push(makeClause(left.key, left.val), makeClause(right.key, right.val))

          return booleanQuery
        }
      }
    }
    case 'NOT': {
      if (left.bool && right.bool) {
        return {
          bool: {
            must: [left],
            must_not: [right]
          }
        }
      } else if (left.bool) {
        const clause = makeClause(right.key, right.val)

        if (left.bool.must_not) {
          const jsonClause = JSON.stringify(clause)

          for (const item of left.bool.must_not) {
            if (JSON.stringify(item) === jsonClause) {
              return left
            }
          }

          left.bool.must_not.push(clause)

          return left
        } else {
          left.bool.must_not = [clause]

          return left
        }
      } else if (right.bool) {
        const clause = makeClause(left.key, left.val)

        if (!clause) {
          return {
            bool: {
              must_not: [right]
            }
          }
        }

        return {
          bool: {
            must: [clause],
            must_not: [right]
          }
        }
      } else {
        const booleanQuery = { bool: { must_not: [] } }

        const clause = makeClause(left.key, left.val)

        if (clause) {
          booleanQuery.bool.must = []
          booleanQuery.bool.must.push(clause)
        }

        booleanQuery.bool.must_not.push(makeClause(right.key, right.val))

        return booleanQuery
      }
    }
    case 'NEAR':
    case 'PRE': {
      if (left.bool && right.bool) {
        let clause
        const inOrder = operator === 'PRE'

        if (Object.keys(left.bool).length > 1 || Object.keys(right.bool).length > 1) {
          throw new Error('malformed query')
        }

        switch (slop) {
          case 'S':
            slop = '15'
            break
          case 'P':
            slop = '50'
        }

        const [cl] = Object.keys(left.bool)

        switch (cl) {
          case 'must': {
            clause = adaptMust(left.bool.must)
            break
          }
          case 'should': {
            clause = [
              {
                span_or: {
                  clauses: adaptShould(left.bool.should)
                }
              }
            ]
            break
          }
          default: {
            throw new Error('malformed query')
          }
        }

        const [clm] = Object.keys(right.bool)

        switch (clm) {
          case 'must': {
            return {
              bool: {
                must: [
                  {
                    span_near: {
                      clauses: [...clause, ...adaptMust(right.bool.must)],
                      slop,
                      in_order: inOrder
                    }
                  }
                ]
              }
            }
          }
          case 'should': {
            return {
              bool: {
                must: [
                  {
                    span_near: {
                      clauses: [
                        ...clause,
                        {
                          span_or: {
                            clauses: adaptShould(right.bool.should)
                          }
                        }
                      ],
                      slop,
                      in_order: inOrder
                    }
                  }
                ]
              }
            }
          }
          default: {
            throw new Error('malformed query')
          }
        }
      } else if (left.bool) {
        const inOrder = operator === 'PRE'

        switch (slop) {
          case 'S':
            slop = '15'
            break
          case 'P':
            slop = '50'
        }

        if (Object.keys(left.bool).length > 1) throw new Error('malformed query')

        const clause = makeProximityClause(right.key, right.val)

        const [cl] = Object.keys(left.bool)

        switch (cl) {
          case 'must': {
            return {
              bool: {
                must: [
                  {
                    span_near: {
                      clauses: [...adaptMust(left.bool.must), clause],
                      slop,
                      in_order: inOrder
                    }
                  }
                ]
              }
            }
          }
          case 'should': {
            return {
              bool: {
                must: [
                  {
                    span_near: {
                      clauses: [
                        {
                          span_or: {
                            clauses: adaptShould(left.bool.should)
                          }
                        },
                        clause
                      ],
                      slop,
                      in_order: inOrder
                    }
                  }
                ]
              }
            }
          }
          default: {
            throw new Error('malformed query')
          }
        }
      } else if (right.bool) {
        const inOrder = operator === 'PRE'

        switch (slop) {
          case 'S':
            slop = '15'
            break
          case 'P':
            slop = '50'
        }

        if (Object.keys(right.bool).length > 1) throw new Error('malformed query')

        const clause = makeProximityClause(left.key, left.val)

        const [cl] = Object.keys(right.bool)

        switch (cl) {
          case 'must': {
            return {
              bool: {
                must: [
                  {
                    span_near: {
                      clauses: [clause, ...adaptMust(right.bool.must)],
                      slop,
                      in_order: inOrder
                    }
                  }
                ]
              }
            }
          }
          case 'should': {
            return {
              bool: {
                must: [
                  {
                    span_near: {
                      clauses: [
                        clause,
                        {
                          span_or: {
                            clauses: adaptShould(right.bool.should)
                          }
                        }
                      ],
                      slop,
                      in_order: inOrder
                    }
                  }
                ]
              }
            }
          }
          default: {
            throw new Error('malformed query')
          }
        }
      } else {
        const inOrder = operator === 'PRE'

        switch (slop) {
          case 'S':
            slop = '15'
            break
          case 'P':
            slop = '50'
        }

        const booleanQuery = {
          bool: {
            must: [{ span_near: { clauses: [], slop, in_order: inOrder } }]
          }
        }

        booleanQuery.bool.must[0].span_near.clauses.push(makeProximityClause(left.key, left.val), makeProximityClause(right.key, right.val))

        return booleanQuery
      }
    }
  }
}

module.exports = create
