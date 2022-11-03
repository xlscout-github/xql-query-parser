const REWRITE = 'top_terms_10000'
const SPAN_MULTI_WILDCARD_REWRITE = 'top_terms_2500'
const TERM = 'term'
const TERMS = 'terms'

// makeClause func creates a query for a field by assessing its value.
function makeClause (field, value) {
  if (typeof value === 'string') {
    if (value.startsWith('"') && value.endsWith('"')) {
      // form match_phrase query if value is enclosed in quotations.
      return {
        match_phrase: {
          [field]: value.slice(1, -1).trim()
        }
      }
    } else if (value.includes('*') || value.includes('?')) {
      // form wildcard query if wildcard operators exists.
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
      // otherwise form term query.
      return { term: { [field]: value } }
    }
  } else if (
    typeof value === 'object' &&
    value.from &&
    value.to
  ) {
    // form range query for date.
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

// makeProximityClause func creates a span query for a field by assessing its value.
function makeProximityClause (field, value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    // form multiple span_term elements which are in order and at 0 distance from one another
    // if value is enclosed in quotations.
    value = value.slice(1, -1).trim()
    const terms = value.split(/ +/)

    if (terms.length > 1) {
      const clauses = terms.reduce((acc, currentValue) => {
        acc.push({
          span_term: {
            [field]: currentValue
          }
        })

        return acc
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
    // form a wildcard query wrapped in span_multi if wildcard operators exists.
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
    // otherwise form a span_term.
    return {
      span_term: {
        [field]: value
      }
    }
  }
}

// adaptMust func converts a must clause in accordance with span query.
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

// adaptShould func converts a should clause in accordance with span query.
function adaptShould (should) {
  return should.reduce(
    (acc, currentValue) => {
      if (currentValue.term) {
        acc.push({
          span_term: currentValue.term
        })
      } else if (currentValue.terms) {
        for (const key in currentValue.terms) {
          currentValue.terms[key].forEach(
            (term) => {
              acc.push({
                span_term: { [key]: term }
              })
            }
          )
        }
      } else if (currentValue.wildcard) {
        const [wc] = Object.keys(currentValue.wildcard)

        acc.push({
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
        const phrase = currentValue.match_phrase[mp]
        const terms = phrase.split(/ +/)

        if (terms.length > 1) {
          acc.push({
            span_near: {
              clauses: terms.reduce(
                (acc, currentValue) => {
                  acc.push({
                    span_term: {
                      [mp]: currentValue
                    }
                  })

                  return acc
                },
                []
              ),
              in_order: true,
              slop: 0
            }
          })
        } else {
          acc.push({
            span_term: { [mp]: phrase }
          })
        }
      } else if (
        currentValue.bool.must &&
        currentValue.bool.must[0].span_near
      ) {
        acc.push(
          currentValue.bool.must[0]
        )
      } else {
        throw new Error('malformed query')
      }

      return acc
    },
    []
  )
}

// create func combines both operands provided into a single structure based on
// operator provided, forming a elasticsearch boolean query.
function create (left, right, operator, slop) {
  switch (operator) {
    case 'AND': {
      // if both operands are boolean queries.
      if (left.bool && right.bool) {
        // if both operands have must clauses.
        if (left.bool.must && right.bool.must) {
          const items = new Set()

          // collect elements from left operand.
          for (const item of left.bool.must) {
            items.add(JSON.stringify(item))
          }

          for (const item of right.bool.must) {
            const jsonClause = JSON.stringify(item)

            // add elements to left must clause only if they dosen't exist.
            if (!items.has(jsonClause)) {
              left.bool.must.push(item)
            }
          }

          // if both operands have must_not clauses
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
          } else if (right.bool.must_not) {
            // if only right operand has must_not clause.
            left.bool.must_not = right.bool.must_not
          }

          return left
        } else if (left.bool.must) {
          // if only left operand has a must clause.
          const jsonClause = JSON.stringify(right)

          for (const item of left.bool.must) {
            const json = JSON.stringify(item)

            // return, if right operand already exists within the left's must clause.
            if (json === jsonClause) return left
          }

          // if must_not clause exists in both operands.
          if (left.bool.must_not && right.bool.must_not) {
            const negateItems = new Set()

            // collect elements from left operand's must_not clause.
            for (const item of left.bool.must_not) {
              negateItems.add(JSON.stringify(item))
            }

            for (const item of right.bool.must_not) {
              const json = JSON.stringify(item)

              // add elements to left must_not clause only if they dosen't exist.
              if (!negateItems.has(json)) {
                left.bool.must_not.push(item)
              }
            }
          } else if (right.bool.must_not) {
            // if must_not clause exists only in right operand.
            left.bool.must_not = right.bool.must_not
          } else {
            left.bool.must.push(right)
          }

          return left
        } else if (right.bool.must) {
          // if only right operand has a must clause.
          const jsonClause = JSON.stringify(left)

          for (const item of right.bool.must) {
            const json = JSON.stringify(item)

            if (json === jsonClause) return right
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
          // if none operands have a must clause.
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
        // if only left operand is a boolean query.
        const clause = makeClause(right.key, right.val)

        // if left operand has a must clause.
        if (left.bool.must) {
          const jsonClause = JSON.stringify(clause)

          for (const item of left.bool.must) {
            const json = JSON.stringify(item)

            // return, if the right clause already exists with left's must clause.
            if (json === jsonClause) return left
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
        // if only right operand is a boolean query.
        const clause = makeClause(left.key, left.val)

        if (right.bool.must) {
          const jsonClause = JSON.stringify(clause)

          for (const item of right.bool.must) {
            const json = JSON.stringify(item)

            if (json === jsonClause) return right
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
        // if none operands are yet part of a boolean query.
        // if both operands are different from one another.
        if (JSON.stringify(left) !== JSON.stringify(right)) {
          const booleanQuery = { bool: { must: [] } }

          booleanQuery.bool.must.push(makeClause(left.key, left.val))

          const clause = makeClause(right.key, right.val)

          // check existance of right clause since it can be none existent in case of
          // singleton query.
          if (clause) booleanQuery.bool.must.push(clause)

          return booleanQuery
        } else {
          // pick just one operand and form query if both are similar.
          return {
            bool: {
              must: [makeClause(left.key, left.val)]
            }
          }
        }
      }
    }
    case 'OR': {
      // if both operands are boolean queries.
      if (left.bool && right.bool) {
        // if both operands have should clauses.
        if (left.bool.should && right.bool.should) {
          const items = new Set()
          const records = new Map()

          for (let i = 0; i < left.bool.should.length; i++) {
            // collect elements from left operand's should clause.
            items.add(JSON.stringify(left.bool.should[i]))

            // store keys within term and terms with their position and type.
            if (left.bool.should[i].term) {
              const [k] = Object.keys(left.bool.should[i].term)
              records.set(k, { i, kind: TERM })
            } else if (left.bool.should[i].terms) {
              const [k] = Object.keys(left.bool.should[i].terms)
              records.set(k, { i, kind: TERMS })
            }
          }

          for (let i = 0; i < right.bool.should.length; i++) {
            // if the element does not exist in the left operand.
            if (!items.has(JSON.stringify(right.bool.should[i]))) {
              // if current element is a term query.
              if (right.bool.should[i].term) {
                const [k] = Object.keys(right.bool.should[i].term)
                const record = records.get(k)

                // if element with the same key exist in left operand.
                if (record) {
                  if (record.kind === TERM) {
                    // convert to terms query.
                    left.bool.should.splice(record.i, 1, {
                      terms: {
                        [k]: [
                          left.bool.should[record.i].term[k],
                          right.bool.should[i].term[k]
                        ]
                      }
                    })
                  } else if (record.kind === TERMS) {
                    // add if element dosen't exist in left operand.
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
              } else if (right.bool.should[i].terms) {
                // if element is a terms query.
                const [k] = Object.keys(right.bool.should[i].terms)
                const record = records.get(k)

                // if element with the same key exist in left operand.
                if (record) {
                  if (record.kind === TERM) {
                    // add left's term in right if it dosen't exist.
                    if (
                      !right.bool.should[i].terms[k].includes(left.bool.should[record.i].term[k])
                    ) {
                      right.bool.should[i].terms[k].push(left.bool.should[record.i].term[k])
                    }

                    left.bool.should.splice(record.i, 1, {
                      terms: right.bool.should[i].terms
                    })
                  } else if (record.kind === TERMS) {
                    // set missing terms from right operand to left.
                    // for (const item of right.bool.should[i].terms[k]) {
                    //   if (
                    //     !left.bool.should[record.i].terms[k].includes(item)
                    //   ) {
                    //     left.bool.should[record.i].terms[k].push(item)
                    //   }
                    // }
                    left.bool.should[record.i].terms[k] = [...new Set([...left.bool.should[record.i].terms[k], ...right.bool.should[i].terms[k]])]
                  }
                } else {
                  left.bool.should.push(right.bool.should[i])
                }
              } else {
                left.bool.should.push(right.bool.should[i])
              }
            }
          }

          return left
        } else if (left.bool.should) {
          // if only left operand has a should clause.
          const jsonClause = JSON.stringify(right)

          for (const item of left.bool.should) {
            const json = JSON.stringify(item)

            // return, if right operand already exists within the left's should clause.
            if (json === jsonClause) return left
          }

          left.bool.should.push(right)

          return left
        } else if (right.bool.should) {
          // if only right operand has a should clause.
          const jsonClause = JSON.stringify(left)

          for (const item of right.bool.should) {
            const json = JSON.stringify(item)

            // return, if left operand already exists within the right's should clause.
            if (json === jsonClause) return right
          }

          right.bool.should.push(left)

          return right
        } else {
          // if none operands have a should clause.
          return {
            bool: {
              should: [left, right]
            }
          }
        }
      } else if (left.bool) {
        // if only left operand is a boolean query.
        const clause = makeClause(right.key, right.val)

        // if left operand has a should clause.
        if (left.bool.should) {
          const jsonClause = JSON.stringify(clause)

          for (let i = 0; i < left.bool.should.length; i++) {
            const json = JSON.stringify(left.bool.should[i])

            // return, if right operand already exists within the left's should clause.
            if (json === jsonClause) return left

            // if the query formed for right operand is a term query and
            // the current value within should is also a term query with
            // the same key.
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

            // if the query formed for right operand is a term query and
            // the current value within should is a terms query with
            // the same key.
            if (
              clause.term &&
              left.bool.should[i].terms &&
              left.bool.should[i].terms[right.key]
            ) {
              // add value if it dosen't exist.
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
        // if only right operand is a boolean query.
        const clause = makeClause(left.key, left.val)

        if (right.bool.should) {
          const jsonClause = JSON.stringify(clause)

          for (let i = 0; i < right.bool.should.length; i++) {
            const json = JSON.stringify(right.bool.should[i])

            if (json === jsonClause) return right

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
        // if none operands are yet part of a boolean query.
        // if keys of both operands are equal to one another.
        if (left.key === right.key) {
          // if value of both operands are different from one another.
          if (left.val !== right.val) {
            const booleanQuery = { bool: { should: [] } }

            booleanQuery.bool.should.push(makeClause(left.key, left.val), makeClause(right.key, right.val))

            // if both operands form a term query convert it into terms query instead.
            if (booleanQuery.bool.should.every(value => value.term)) {
              booleanQuery.bool.should.splice(0, booleanQuery.bool.should.length)
              booleanQuery.bool.should.push({
                terms: { [left.key]: [left.val, right.val] }
              })
            }

            return booleanQuery
          } else {
            // if value is same pick any operand.
            return {
              bool: {
                should: [makeClause(left.key, left.val)]
              }
            }
          }
        } else {
          // if keys of both operands are different from one another.
          const booleanQuery = { bool: { should: [] } }

          booleanQuery.bool.should.push(makeClause(left.key, left.val), makeClause(right.key, right.val))

          return booleanQuery
        }
      }
    }
    case 'NOT': {
      // if both operands are boolean queries.
      if (left.bool && right.bool) {
        return {
          bool: {
            must: [left],
            must_not: [right]
          }
        }
      } else if (left.bool) {
        // if only left operand is a boolean query.
        const clause = makeClause(right.key, right.val)

        if (left.bool.must_not) {
          const jsonClause = JSON.stringify(clause)

          for (const item of left.bool.must_not) {
            const json = JSON.stringify(item)

            // return, if element exists in left operand's must_not clause.
            if (json === jsonClause) return left
          }

          left.bool.must_not.push(clause)

          return left
        } else {
          left.bool.must_not = [clause]

          return left
        }
      } else if (right.bool) {
        // if only right operand is a boolean query.
        const clause = makeClause(left.key, left.val)

        return {
          bool: {
            must: [clause],
            must_not: [right]
          }
        }
      } else {
        // if none operands are yet part of a boolean query.
        const booleanQuery = { bool: { must_not: [] } }

        const clause = makeClause(left.key, left.val)

        // left operand will not exist for independent NOT.
        if (clause) {
          booleanQuery.bool.must = [clause]
        }

        booleanQuery.bool.must_not.push(makeClause(right.key, right.val))

        return booleanQuery
      }
    }
    case 'NEAR':
    case 'PRE': {
      // in_order will be true for PRE operator otherwise false.
      const inOrder = operator === 'PRE'

      // NEARS corresponds to NEAR15.
      // NEARP corresponds to NEAR50.
      switch (slop) {
        case 'S':
          slop = '15'
          break
        case 'P':
          slop = '50'
      }

      if (left.bool && right.bool) {
        // if both operands are boolean queries.
        // error if multiple clauses exist in operands.
        if (Object.keys(left.bool).length > 1 || Object.keys(right.bool).length > 1) throw new Error('malformed query')

        let clause

        const [cl] = Object.keys(left.bool)

        // form query by converting left operand in accordance with span query.
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

        // form query by converting right operand in accordance with span query.
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
        // if only left operand is a boolean query.
        // error if multiple clauses exist.
        if (Object.keys(left.bool).length > 1) throw new Error('malformed query')

        const clause = makeProximityClause(right.key, right.val)

        const [cl] = Object.keys(left.bool)

        // form query by converting left operand in accordance with span query.
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
        // if only right operand is a boolean query.
        // error if multiple clauses exist.
        if (Object.keys(right.bool).length > 1) throw new Error('malformed query')

        const clause = makeProximityClause(left.key, left.val)

        const [cl] = Object.keys(right.bool)

        // form query by converting right operand in accordance with span query.
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
        // if none operands are yet part of a boolean query.
        return {
          bool: {
            must: [{
              span_near: {
                clauses: [
                  makeProximityClause(left.key, left.val),
                  makeProximityClause(right.key, right.val)],
                slop,
                in_order: inOrder
              }
            }]
          }
        }
      }
    }
  }
}

module.exports = create
