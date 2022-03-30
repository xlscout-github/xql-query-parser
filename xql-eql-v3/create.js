const cloneDeep = require('lodash.clonedeep')

const REWRITE = 'top_terms_10000'
const SPAN_MULTI_WILDCARD_REWRITE = 'top_terms_1000'

function create (left, right, operator, slop) {
  switch (operator) {
    case 'AND': {
      if (left.bool && right.bool) {
        if (left.bool.must && right.bool.must) {
          const copy = cloneDeep(left)
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
              copy.bool.must.push(item)
            }
          }

          if (left.bool.must_not && right.bool.must_not) {
            for (const item of right.bool.must_not) {
              const jsonClause = JSON.stringify(item)

              if (!negateItems.has(jsonClause)) {
                copy.bool.must_not.push(item)
              }
            }
          } else if (right.bool.must_not) {
            copy.bool.must_not = right.bool.must_not
          }

          return copy
        } else if (left.bool.must) {
          const copy = cloneDeep(left)
          const jsonClause = JSON.stringify(right)
          const items = new Set()

          for (const item of left.bool.must) {
            const json = JSON.stringify(item)

            if (json === jsonClause) return copy

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
                copy.bool.must_not.push(item)
              }
            }
          } else if (right.bool.must_not) {
            copy.bool.must_not = right.bool.must_not
          } else {
            copy.bool.must.push(right)
          }

          return copy
        } else if (right.bool.must) {
          const copy = cloneDeep(right)
          const jsonClause = JSON.stringify(left)
          const items = new Set()

          for (const item of right.bool.must) {
            const json = JSON.stringify(item)

            if (json === jsonClause) return copy

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
                copy.bool.must_not.push(item)
              }
            }
          } else if (left.bool.must_not) {
            copy.bool.must_not = left.bool.must_not
          } else {
            copy.bool.must.push(left)
          }

          return copy
        } else {
          if (left.bool.must_not && right.bool.must_not) {
            const copy = cloneDeep(left)
            const negateItems = new Set()

            for (const item of left.bool.must_not) {
              negateItems.add(JSON.stringify(item))
            }

            for (const item of right.bool.must_not) {
              const jsonClause = JSON.stringify(item)

              if (!negateItems.has(jsonClause)) {
                copy.bool.must_not.push(item)
              }
            }

            return copy
          }

          return {
            bool: {
              must: [left, right]
            }
          }
        }
      } else if (left.bool) {
        let clause

        if (typeof right.val === 'string') {
          if (right.val.startsWith('"') && right.val.endsWith('"')) {
            clause = {
              match_phrase: {
                [right.key]: right.val.slice(1, -1).trim()
              }
            }
          } else if (right.val.includes('*') || right.val.includes('?')) {
            clause = {
              wildcard: {
                [right.key]: {
                  value: right.val,
                  case_insensitive: true,
                  rewrite: REWRITE
                }
              }
            }
          } else {
            clause = { term: { [right.key]: right.val } }
          }
        } else if (
          typeof right.val === 'object' &&
          right.val.from &&
          right.val.to
        ) {
          const range = { [right.key]: {} }

          if (right.val.from !== '*') {
            range[right.key] = { gte: right.val.from }
          }

          if (right.val.to !== '*') {
            range[right.key] = {
              ...range[right.key],
              lte: right.val.to
            }
          }

          clause = { range }
        }

        if (left.bool.must) {
          const copy = cloneDeep(left)
          const jsonClause = JSON.stringify(clause)

          for (const item of copy.bool.must) {
            if (JSON.stringify(item) === jsonClause) {
              return copy
            }
          }

          copy.bool.must.push(clause)

          return copy
        } else if (left.bool.must_not) {
          const copy = cloneDeep(left)

          copy.bool.must = [clause]

          return copy
        } else {
          return {
            bool: {
              must: [left, clause]
            }
          }
        }
      } else if (right.bool) {
        let clause

        if (typeof left.val === 'string') {
          if (left.val.startsWith('"') && left.val.endsWith('"')) {
            clause = {
              match_phrase: {
                [left.key]: left.val.slice(1, -1).trim()
              }
            }
          } else if (left.val.includes('*') || left.val.includes('?')) {
            clause = {
              wildcard: {
                [left.key]: {
                  value: left.val,
                  case_insensitive: true,
                  rewrite: REWRITE
                }
              }
            }
          } else {
            clause = { term: { [left.key]: left.val } }
          }
        } else if (
          typeof left.val === 'object' &&
          left.val.from &&
          left.val.to
        ) {
          const range = { [left.key]: {} }

          if (left.val.from !== '*') {
            range[left.key] = { gte: left.val.from }
          }

          if (left.val.to !== '*') {
            range[left.key] = {
              ...range[left.key],
              lte: left.val.to
            }
          }

          clause = { range }
        }

        if (right.bool.must) {
          const copy = cloneDeep(right)
          const jsonClause = JSON.stringify(clause)

          for (const item of copy.bool.must) {
            if (JSON.stringify(item) === jsonClause) {
              return copy
            }
          }

          copy.bool.must.push(clause)

          return copy
        } else if (right.bool.must_not) {
          const copy = cloneDeep(right)

          copy.bool.must = [clause]

          return copy
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

          if (typeof left.val === 'string') {
            if (left.val.startsWith('"') && left.val.endsWith('"')) {
              booleanQuery.bool.must.push({
                match_phrase: {
                  [left.key]: left.val.slice(1, -1).trim()
                }
              })
            } else if (left.val.includes('*') || left.val.includes('?')) {
              booleanQuery.bool.must.push({
                wildcard: {
                  [left.key]: {
                    value: left.val,
                    case_insensitive: true,
                    rewrite: REWRITE
                  }
                }
              })
            } else {
              booleanQuery.bool.must.push({ term: { [left.key]: left.val } })
            }
          } else if (
            typeof left.val === 'object' &&
            left.val.from &&
            left.val.to
          ) {
            const range = { [left.key]: {} }

            if (left.val.from !== '*') {
              range[left.key] = { gte: left.val.from }
            }

            if (left.val.to !== '*') {
              range[left.key] = {
                ...range[left.key],
                lte: left.val.to
              }
            }

            booleanQuery.bool.must.push({ range })
          }

          if (typeof right.val === 'string') {
            if (right.val.startsWith('"') && right.val.endsWith('"')) {
              booleanQuery.bool.must.push({
                match_phrase: {
                  [right.key]: right.val.slice(1, -1).trim()
                }
              })
            } else if (right.val.includes('*') || right.val.includes('?')) {
              booleanQuery.bool.must.push({
                wildcard: {
                  [right.key]: {
                    value: right.val,
                    case_insensitive: true,
                    rewrite: REWRITE
                  }
                }
              })
            } else {
              booleanQuery.bool.must.push({ term: { [right.key]: right.val } })
            }
          } else if (
            typeof right.val === 'object' &&
            right.val.from &&
            right.val.to
          ) {
            const range = { [right.key]: {} }

            if (right.val.from !== '*') {
              range[right.key] = { gte: right.val.from }
            }

            if (right.val.to !== '*') {
              range[right.key] = {
                ...range[right.key],
                lte: right.val.to
              }
            }

            booleanQuery.bool.must.push({ range })
          }

          return booleanQuery
        } else {
          if (typeof left.val === 'string') {
            if (left.val.startsWith('"') && left.val.endsWith('"')) {
              return {
                bool: {
                  must: [
                    {
                      match_phrase: {
                        [left.key]: left.val.slice(1, -1).trim()
                      }
                    }
                  ]
                }
              }
            } else if (left.val.includes('*') || left.val.includes('?')) {
              return {
                bool: {
                  must: [
                    {
                      wildcard: {
                        [left.key]: {
                          value: left.val,
                          case_insensitive: true,
                          rewrite: REWRITE
                        }
                      }
                    }
                  ]
                }
              }
            } else {
              return {
                bool: {
                  must: [{ term: { [left.key]: left.val } }]
                }
              }
            }
          } else if (
            typeof left.val === 'object' &&
            left.val.from &&
            left.val.to
          ) {
            const range = { [left.key]: {} }

            if (left.val.from !== '*') {
              range[left.key] = { gte: left.val.from }
            }

            if (left.val.to !== '*') {
              range[left.key] = {
                ...range[left.key],
                lte: left.val.to
              }
            }

            return {
              bool: {
                must: [{ range }]
              }
            }
          }
        }
      }
    }
    case 'OR': {
      if (left.bool && right.bool) {
        if (left.bool.should && right.bool.should) {
          const copy = cloneDeep(left)
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
                      copy.bool.should.splice(record.i, 1, {
                        terms: {
                          [k]: [
                            copy.bool.should[record.i].term[k],
                            right.bool.should[i].term[k]
                          ]
                        }
                      })
                    } else if (record.kind === clauses.TERMS) {
                      if (
                        !copy.bool.should[record.i].terms[k].includes(
                          right.bool.should[i].term[k]
                        )
                      ) {
                        copy.bool.should[record.i].terms[k].push(
                          right.bool.should[i].term[k]
                        )
                      }
                    }
                  } else {
                    copy.bool.should.push(right.bool.should[i])
                  }
                }
              } else if (right.bool.should[i].terms) {
                for (const k in right.bool.should[i].terms) {
                  const record = records.get(k)
                  if (record) {
                    if (record.kind === clauses.TERM) {
                      const terms = cloneDeep(right.bool.should[i].terms)
                      if (
                        !terms[k].includes(copy.bool.should[record.i].term[k])
                      ) {
                        terms[k].push(copy.bool.should[record.i].term[k])
                      }
                      copy.bool.should.splice(record.i, 1, {
                        terms
                      })
                    } else if (record.kind === clauses.TERMS) {
                      for (const item of right.bool.should[i].terms[k]) {
                        if (
                          !copy.bool.should[record.i].terms[k].includes(item)
                        ) {
                          copy.bool.should[record.i].terms[k].push(item)
                        }
                      }
                    }
                  } else {
                    copy.bool.should.push(right.bool.should[i])
                  }
                }
              } else {
                copy.bool.should.push(right.bool.should[i])
              }
            }
          }

          return copy
        } else if (left.bool.should) {
          const copy = cloneDeep(left)
          const jsonClause = JSON.stringify(right)

          for (item of left.bool.should) {
            if (JSON.stringify(item) === jsonClause) {
              return copy
            }
          }

          copy.bool.should.push(right)

          return copy
        } else if (right.bool.should) {
          const copy = cloneDeep(right)
          const jsonClause = JSON.stringify(left)

          for (item of right.bool.should) {
            if (JSON.stringify(item) === jsonClause) {
              return copy
            }
          }

          copy.bool.should.push(left)

          return copy
        } else {
          return {
            bool: {
              should: [left, right]
            }
          }
        }
      } else if (left.bool) {
        let clause

        if (typeof right.val === 'string') {
          if (right.val.startsWith('"') && right.val.endsWith('"')) {
            clause = {
              match_phrase: {
                [right.key]: right.val.slice(1, -1).trim()
              }
            }
          } else if (right.val.includes('*') || right.val.includes('?')) {
            clause = {
              wildcard: {
                [right.key]: {
                  value: right.val,
                  case_insensitive: true,
                  rewrite: REWRITE
                }
              }
            }
          } else {
            clause = { term: { [right.key]: right.val } }
          }
        } else if (
          typeof right.val === 'object' &&
          right.val.from &&
          right.val.to
        ) {
          const range = { [right.key]: {} }

          if (right.val.from !== '*') {
            range[right.key] = { gte: right.val.from }
          }

          if (right.val.to !== '*') {
            range[right.key] = {
              ...range[right.key],
              lte: right.val.to
            }
          }

          clause = { range }
        }

        if (left.bool.should) {
          const copy = cloneDeep(left)
          const jsonClause = JSON.stringify(clause)

          for (let i = 0; i < copy.bool.should.length; i++) {
            if (JSON.stringify(copy.bool.should[i]) === jsonClause) {
              return copy
            }

            if (
              clause.term &&
              copy.bool.should[i].term &&
              copy.bool.should[i].term[right.key]
            ) {
              copy.bool.should.splice(i, 1, {
                terms: {
                  [right.key]: [copy.bool.should[i].term[right.key], right.val]
                }
              })
              return copy
            }

            if (
              clause.term &&
              copy.bool.should[i].terms &&
              copy.bool.should[i].terms[right.key]
            ) {
              if (!copy.bool.should[i].terms[right.key].includes(right.val)) {
                copy.bool.should[i].terms[right.key].push(right.val)
              }
              return copy
            }
          }

          copy.bool.should.push(clause)

          return copy
        } else {
          return {
            bool: {
              should: [left, clause]
            }
          }
        }
      } else if (right.bool) {
        let clause

        if (typeof left.val === 'string') {
          if (left.val.startsWith('"') && left.val.endsWith('"')) {
            clause = {
              match_phrase: {
                [left.key]: left.val.slice(1, -1).trim()
              }
            }
          } else if (left.val.includes('*') || left.val.includes('?')) {
            clause = {
              wildcard: {
                [left.key]: {
                  value: left.val,
                  case_insensitive: true,
                  rewrite: REWRITE
                }
              }
            }
          } else {
            clause = { term: { [left.key]: left.val } }
          }
        } else if (
          typeof left.val === 'object' &&
          left.val.from &&
          left.val.to
        ) {
          const range = { [left.key]: {} }

          if (left.val.from !== '*') {
            range[left.key] = { gte: left.val.from }
          }

          if (left.val.to !== '*') {
            range[left.key] = {
              ...range[left.key],
              lte: left.val.to
            }
          }

          clause = { range }
        }

        if (right.bool.should) {
          const copy = cloneDeep(right)
          const jsonClause = JSON.stringify(clause)

          for (let i = 0; i < copy.bool.should.length; i++) {
            if (JSON.stringify(copy.bool.should[i]) === jsonClause) {
              return copy
            }

            if (
              clause.term &&
              copy.bool.should[i].term &&
              copy.bool.should[i].term[left.key]
            ) {
              copy.bool.should.splice(i, 1, {
                terms: {
                  [left.key]: [copy.bool.should[i].term[left.key], left.val]
                }
              })
              return copy
            }

            if (
              clause.term &&
              copy.bool.should[i].terms &&
              copy.bool.should[i].terms[left.key]
            ) {
              if (!copy.bool.should[i].terms[left.key].includes(left.val)) {
                copy.bool.should[i].terms[left.key].push(left.val)
              }
              return copy
            }
          }

          copy.bool.should.push(clause)

          return copy
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

            if (typeof left.val === 'string') {
              if (left.val.startsWith('"') && left.val.endsWith('"')) {
                booleanQuery.bool.should.push({
                  match_phrase: {
                    [left.key]: left.val.slice(1, -1).trim()
                  }
                })
              } else if (left.val.includes('*') || left.val.includes('?')) {
                booleanQuery.bool.should.push({
                  wildcard: {
                    [left.key]: {
                      value: left.val,
                      case_insensitive: true,
                      rewrite: REWRITE
                    }
                  }
                })
              } else {
                booleanQuery.bool.should.push({
                  term: { [left.key]: left.val }
                })
              }
            } else if (
              typeof left.val === 'object' &&
              left.val.from &&
              left.val.to
            ) {
              const range = { [left.key]: {} }

              if (left.val.from !== '*') {
                range[left.key] = { gte: left.val.from }
              }

              if (left.val.to !== '*') {
                range[left.key] = {
                  ...range[left.key],
                  lte: left.val.to
                }
              }

              booleanQuery.bool.should.push({ range })
            }

            if (typeof right.val === 'string') {
              if (right.val.startsWith('"') && right.val.endsWith('"')) {
                booleanQuery.bool.should.push({
                  match_phrase: {
                    [right.key]: right.val.slice(1, -1).trim()
                  }
                })
              } else if (right.val.includes('*') || right.val.includes('?')) {
                booleanQuery.bool.should.push({
                  wildcard: {
                    [right.key]: {
                      value: right.val,
                      case_insensitive: true,
                      rewrite: REWRITE
                    }
                  }
                })
              } else {
                if (booleanQuery.bool.should[0].term) {
                  booleanQuery.bool.should.splice(0, 1, {
                    terms: { [right.key]: [left.val, right.val] }
                  })
                } else {
                  booleanQuery.bool.should.push({
                    term: { [right.key]: right.val }
                  })
                }
              }
            } else if (
              typeof right.val === 'object' &&
              right.val.from &&
              right.val.to
            ) {
              const range = { [right.key]: {} }

              if (right.val.from !== '*') {
                range[right.key] = { gte: right.val.from }
              }

              if (right.val.to !== '*') {
                range[right.key] = {
                  ...range[right.key],
                  lte: right.val.to
                }
              }

              booleanQuery.bool.should.push({ range })
            }

            return booleanQuery
          } else {
            if (typeof left.val === 'string') {
              if (left.val.startsWith('"') && left.val.endsWith('"')) {
                return {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          [left.key]: left.val.slice(1, -1).trim()
                        }
                      }
                    ]
                  }
                }
              } else if (left.val.includes('*') || left.val.includes('?')) {
                return {
                  bool: {
                    should: [
                      {
                        wildcard: {
                          [left.key]: {
                            value: left.val,
                            case_insensitive: true,
                            rewrite: REWRITE
                          }
                        }
                      }
                    ]
                  }
                }
              } else {
                return {
                  bool: {
                    should: [{ term: { [left.key]: left.val } }]
                  }
                }
              }
            } else if (
              typeof left.val === 'object' &&
              left.val.from &&
              left.val.to
            ) {
              const range = { [left.key]: {} }

              if (left.val.from !== '*') {
                range[left.key] = { gte: left.val.from }
              }

              if (left.val.to !== '*') {
                range[left.key] = {
                  ...range[left.key],
                  lte: left.val.to
                }
              }

              return {
                bool: {
                  should: [{ range }]
                }
              }
            }
          }
        } else {
          const booleanQuery = { bool: { should: [] } }

          if (typeof left.val === 'string') {
            if (left.val.startsWith('"') && left.val.endsWith('"')) {
              booleanQuery.bool.should.push({
                match_phrase: {
                  [left.key]: left.val.slice(1, -1).trim()
                }
              })
            } else if (left.val.includes('*') || left.val.includes('?')) {
              booleanQuery.bool.should.push({
                wildcard: {
                  [left.key]: {
                    value: left.val,
                    case_insensitive: true,
                    rewrite: REWRITE
                  }
                }
              })
            } else {
              booleanQuery.bool.should.push({ term: { [left.key]: left.val } })
            }
          } else if (
            typeof left.val === 'object' &&
            left.val.from &&
            left.val.to
          ) {
            const range = { [left.key]: {} }

            if (left.val.from !== '*') {
              range[left.key] = { gte: left.val.from }
            }

            if (left.val.to !== '*') {
              range[left.key] = {
                ...range[left.key],
                lte: left.val.to
              }
            }

            booleanQuery.bool.should.push({ range })
          }

          if (typeof right.val === 'string') {
            if (right.val.startsWith('"') && right.val.endsWith('"')) {
              booleanQuery.bool.should.push({
                match_phrase: {
                  [right.key]: right.val.slice(1, -1).trim()
                }
              })
            } else if (right.val.includes('*') || right.val.includes('?')) {
              booleanQuery.bool.should.push({
                wildcard: {
                  [right.key]: {
                    value: right.val,
                    case_insensitive: true,
                    rewrite: REWRITE
                  }
                }
              })
            } else {
              booleanQuery.bool.should.push({
                term: { [right.key]: right.val }
              })
            }
          } else if (
            typeof right.val === 'object' &&
            right.val.from &&
            right.val.to
          ) {
            const range = { [right.key]: {} }

            if (right.val.from !== '*') {
              range[right.key] = { gte: right.val.from }
            }

            if (right.val.to !== '*') {
              range[right.key] = {
                ...range[right.key],
                lte: right.val.to
              }
            }

            booleanQuery.bool.should.push({ range })
          }

          return booleanQuery
        }
      }
    }
    case 'NOT': {
      if (left == null) {
        if (right.bool) {
          return {
            bool: {
              must_not: [right]
            }
          }
        } else {
          let clause

          if (typeof right.val === 'string') {
            if (right.val.startsWith('"') && right.val.endsWith('"')) {
              clause = {
                match_phrase: {
                  [right.key]: right.val.slice(1, -1).trim()
                }
              }
            } else if (right.val.includes('*') || right.val.includes('?')) {
              clause = {
                wildcard: {
                  [right.key]: {
                    value: right.val,
                    case_insensitive: true,
                    rewrite: REWRITE
                  }
                }
              }
            } else {
              clause = { term: { [right.key]: right.val } }
            }
          } else if (
            typeof right.val === 'object' &&
            right.val.from &&
            right.val.to
          ) {
            const range = { [right.key]: {} }

            if (right.val.from !== '*') {
              range[right.key] = { gte: right.val.from }
            }

            if (right.val.to !== '*') {
              range[right.key] = {
                ...range[right.key],
                lte: right.val.to
              }
            }

            clause = { range }
          }

          return {
            bool: {
              must_not: [clause]
            }
          }
        }
      }

      if (left.bool && right.bool) {
        return {
          bool: {
            must: [left],
            must_not: [right]
          }
        }
      } else if (left.bool) {
        let clause

        if (typeof right.val === 'string') {
          if (right.val.startsWith('"') && right.val.endsWith('"')) {
            clause = {
              match_phrase: {
                [right.key]: right.val.slice(1, -1).trim()
              }
            }
          } else if (right.val.includes('*') || right.val.includes('?')) {
            clause = {
              wildcard: {
                [right.key]: {
                  value: right.val,
                  case_insensitive: true,
                  rewrite: REWRITE
                }
              }
            }
          } else {
            clause = { term: { [right.key]: right.val } }
          }
        } else if (
          typeof right.val === 'object' &&
          right.val.from &&
          right.val.to
        ) {
          const range = { [right.key]: {} }

          if (right.val.from !== '*') {
            range[right.key] = { gte: right.val.from }
          }

          if (right.val.to !== '*') {
            range[right.key] = {
              ...range[right.key],
              lte: right.val.to
            }
          }

          clause = { range }
        }

        return {
          bool: {
            must: [left],
            must_not: [clause]
          }
        }
      } else if (right.bool) {
        let clause

        if (typeof left.val === 'string') {
          if (left.val.startsWith('"') && left.val.endsWith('"')) {
            clause = {
              match_phrase: {
                [left.key]: left.val.slice(1, -1).trim()
              }
            }
          } else if (left.val.includes('*') || left.val.includes('?')) {
            clause = {
              wildcard: {
                [left.key]: {
                  value: left.val,
                  case_insensitive: true,
                  rewrite: REWRITE
                }
              }
            }
          } else {
            clause = { term: { [left.key]: left.val } }
          }
        } else if (
          typeof left.val === 'object' &&
          left.val.from &&
          left.val.to
        ) {
          const range = { [left.key]: {} }

          if (left.val.from !== '*') {
            range[left.key] = { gte: left.val.from }
          }

          if (left.val.to !== '*') {
            range[left.key] = {
              ...range[left.key],
              lte: left.val.to
            }
          }

          clause = { range }
        }

        return {
          bool: {
            must: [clause],
            must_not: [right]
          }
        }
      } else {
        const booleanQuery = { bool: { must: [], must_not: [] } }

        if (typeof left.val === 'string') {
          if (left.val.startsWith('"') && left.val.endsWith('"')) {
            booleanQuery.bool.must.push({
              match_phrase: {
                [left.key]: left.val.slice(1, -1).trim()
              }
            })
          } else if (left.val.includes('*') || left.val.includes('?')) {
            booleanQuery.bool.must.push({
              wildcard: {
                [left.key]: {
                  value: left.val,
                  case_insensitive: true,
                  rewrite: REWRITE
                }
              }
            })
          } else {
            booleanQuery.bool.must.push({ term: { [left.key]: left.val } })
          }
        } else if (
          typeof left.val === 'object' &&
          left.val.from &&
          left.val.to
        ) {
          const range = { [left.key]: {} }

          if (left.val.from !== '*') {
            range[left.key] = { gte: left.val.from }
          }

          if (left.val.to !== '*') {
            range[left.key] = {
              ...range[left.key],
              lte: left.val.to
            }
          }

          booleanQuery.bool.must.push({ range })
        }

        if (typeof right.val === 'string') {
          if (right.val.startsWith('"') && right.val.endsWith('"')) {
            booleanQuery.bool.must_not.push({
              match_phrase: {
                [right.key]: right.val.slice(1, -1).trim()
              }
            })
          } else if (right.val.includes('*') || right.val.includes('?')) {
            booleanQuery.bool.must_not.push({
              wildcard: {
                [right.key]: {
                  value: right.val,
                  case_insensitive: true,
                  rewrite: REWRITE
                }
              }
            })
          } else {
            booleanQuery.bool.must_not.push({
              term: { [right.key]: right.val }
            })
          }
        } else if (
          typeof right.val === 'object' &&
          right.val.from &&
          right.val.to
        ) {
          const range = { [right.key]: {} }

          if (right.val.from !== '*') {
            range[right.key] = { gte: right.val.from }
          }

          if (right.val.to !== '*') {
            range[right.key] = {
              ...range[right.key],
              lte: right.val.to
            }
          }

          booleanQuery.bool.must_not.push({ range })
        }

        return booleanQuery
      }
    }
    case 'NEAR':
    case 'PRE': {
      if (left.bool && right.bool) {
        let clause
        let copy = cloneDeep(left)
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

        for (const k in left.bool) {
          switch (k) {
            case 'must': {
              for (const iterator of copy.bool[k]) {
                if (iterator.term) {
                  iterator.span_term = iterator.term
                  delete iterator.term
                } else if (iterator.wildcard) {
                  for (const k in iterator.wildcard) {
                    iterator.span_multi = {
                      match: {
                        wildcard: {
                          [k]: {
                            ...iterator.wildcard[k],
                            rewrite: SPAN_MULTI_WILDCARD_REWRITE
                          }
                        }
                      }
                    }
                    delete iterator.wildcard
                  }
                } else if (iterator.match_phrase) {
                  for (const k in iterator.match_phrase) {
                    const value = iterator.match_phrase[k]
                    const terms = value.split(/ +/)

                    if (terms.length > 1) {
                      const clauses = terms.reduce(
                        (previousValue, currentValue) => {
                          previousValue.push({
                            span_term: {
                              [k]: currentValue
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
                      iterator.span_term = { [k]: value }
                    }

                    delete iterator.match_phrase
                  }
                } else if (!iterator.span_near) {
                  throw new Error('malformed query')
                }
              }

              clause = copy.bool.must
              break
            }
            case 'should': {
              clause = [
                {
                  span_or: {
                    clauses: copy.bool[k].reduce(
                      (previousValue, currentValue) => {
                        if (currentValue.term) {
                          previousValue.push({
                            span_term: currentValue.term
                          })
                        } else if (currentValue.terms) {
                          for (const key in currentValue.terms) {
                            currentValue.terms[key].forEach((term) => {
                              previousValue.push({
                                span_term: { [key]: term }
                              })
                            })
                          }
                        } else if (currentValue.wildcard) {
                          for (const key in currentValue.wildcard) {
                            previousValue.push({
                              span_multi: {
                                match: {
                                  wildcard: {
                                    [key]: {
                                      ...currentValue.wildcard[key],
                                      rewrite: SPAN_MULTI_WILDCARD_REWRITE
                                    }
                                  }
                                }
                              }
                            })
                          }
                        } else if (currentValue.match_phrase) {
                          for (const key in currentValue.match_phrase) {
                            const phrase = currentValue.match_phrase[key]
                            const terms = phrase.split(/ +/)

                            if (terms.length > 1) {
                              previousValue.push({
                                span_near: {
                                  clauses: terms.reduce(
                                    (previousValue, currentValue) => {
                                      previousValue.push({
                                        span_term: {
                                          [key]: currentValue
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
                                span_term: { [key]: phrase }
                              })
                            }
                          }
                        } else if (
                          currentValue.bool.must &&
                          currentValue.bool.must[0].span_near
                        ) {
                          previousValue.push(currentValue.bool.must[0])
                        } else {
                          throw new Error('malformed query')
                        }

                        return previousValue
                      },
                      []
                    )
                  }
                }
              ]
              break
            }
            default: {
              throw new Error('malformed query')
            }
          }
        }

        copy = cloneDeep(right)

        for (const k in right.bool) {
          switch (k) {
            case 'must': {
              for (const iterator of copy.bool[k]) {
                if (iterator.term) {
                  iterator.span_term = iterator.term
                  delete iterator.term
                } else if (iterator.wildcard) {
                  for (const k in iterator.wildcard) {
                    iterator.span_multi = {
                      match: {
                        wildcard: {
                          [k]: {
                            ...iterator.wildcard[k],
                            rewrite: SPAN_MULTI_WILDCARD_REWRITE
                          }
                        }
                      }
                    }
                    delete iterator.wildcard
                  }
                } else if (iterator.match_phrase) {
                  for (const k in iterator.match_phrase) {
                    const value = iterator.match_phrase[k]
                    const terms = value.split(/ +/)

                    if (terms.length > 1) {
                      const clauses = terms.reduce(
                        (previousValue, currentValue) => {
                          previousValue.push({
                            span_term: {
                              [k]: currentValue
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
                      iterator.span_term = { [k]: value }
                    }

                    delete iterator.match_phrase
                  }
                } else if (!iterator.span_near) {
                  throw new Error('malformed query')
                }
              }

              return {
                bool: {
                  must: [
                    {
                      span_near: {
                        clauses: [...clause, ...copy.bool.must],
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
                              clauses: copy.bool[k].reduce(
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
                                    for (const key in currentValue.wildcard) {
                                      previousValue.push({
                                        span_multi: {
                                          match: {
                                            wildcard: {
                                              [key]: {
                                                ...currentValue.wildcard[key],
                                                rewrite:
                                                  SPAN_MULTI_WILDCARD_REWRITE
                                              }
                                            }
                                          }
                                        }
                                      })
                                    }
                                  } else if (currentValue.match_phrase) {
                                    for (const key in currentValue.match_phrase) {
                                      const phrase =
                                        currentValue.match_phrase[key]
                                      const terms = phrase.split(/ +/)

                                      if (terms.length > 1) {
                                        previousValue.push({
                                          span_near: {
                                            clauses: terms.reduce(
                                              (previousValue, currentValue) => {
                                                previousValue.push({
                                                  span_term: {
                                                    [key]: currentValue
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
                                          span_term: { [key]: phrase }
                                        })
                                      }
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
        }
      } else if (left.bool) {
        const copy = cloneDeep(left)
        const inOrder = operator === 'PRE'

        switch (slop) {
          case 'S':
            slop = '15'
            break
          case 'P':
            slop = '50'
        }

        if (Object.keys(left.bool).length > 1) throw new Error('malformed query')

        let clause

        if (right.val.startsWith('"') && right.val.endsWith('"')) {
          const value = right.val.slice(1, -1).trim()
          const terms = value.split(/ +/)

          if (terms.length > 1) {
            const clauses = terms.reduce((previousValue, currentValue) => {
              previousValue.push({
                span_term: {
                  [right.key]: currentValue
                }
              })

              return previousValue
            }, [])

            clause = {
              span_near: {
                clauses,
                in_order: true,
                slop: 0
              }
            }
          } else {
            clause = {
              span_term: {
                [right.key]: value
              }
            }
          }
        } else if (right.val.includes('*') || right.val.includes('?')) {
          clause = {
            span_multi: {
              match: {
                wildcard: {
                  [right.key]: {
                    value: right.val,
                    case_insensitive: true,
                    rewrite: SPAN_MULTI_WILDCARD_REWRITE
                  }
                }
              }
            }
          }
        } else {
          clause = {
            span_term: {
              [right.key]: right.val
            }
          }
        }

        for (const k in left.bool) {
          switch (k) {
            case 'must': {
              for (const iterator of copy.bool[k]) {
                if (iterator.term) {
                  iterator.span_term = iterator.term
                  delete iterator.term
                } else if (iterator.wildcard) {
                  for (const k in iterator.wildcard) {
                    iterator.span_multi = {
                      match: {
                        wildcard: {
                          [k]: {
                            ...iterator.wildcard[k],
                            rewrite: SPAN_MULTI_WILDCARD_REWRITE
                          }
                        }
                      }
                    }
                    delete iterator.wildcard
                  }
                } else if (iterator.match_phrase) {
                  for (const k in iterator.match_phrase) {
                    const value = iterator.match_phrase[k]
                    const terms = value.split(/ +/)

                    if (terms.length > 1) {
                      const clauses = terms.reduce(
                        (previousValue, currentValue) => {
                          previousValue.push({
                            span_term: {
                              [k]: currentValue
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
                      iterator.span_term = { [k]: phrase }
                    }

                    delete iterator.match_phrase
                  }
                } else if (!iterator.span_near) {
                  throw new Error('malformed query')
                }
              }

              return {
                bool: {
                  must: [
                    {
                      span_near: {
                        clauses: [...copy.bool.must, clause],
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
                              clauses: copy.bool[k].reduce(
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
                                    for (const key in currentValue.wildcard) {
                                      previousValue.push({
                                        span_multi: {
                                          match: {
                                            wildcard: {
                                              [key]: {
                                                ...currentValue.wildcard[key],
                                                rewrite:
                                                  SPAN_MULTI_WILDCARD_REWRITE
                                              }
                                            }
                                          }
                                        }
                                      })
                                    }
                                  } else if (currentValue.match_phrase) {
                                    for (const key in currentValue.match_phrase) {
                                      const phrase =
                                        currentValue.match_phrase[key]
                                      const terms = phrase.split(/ +/)

                                      if (terms.length > 1) {
                                        previousValue.push({
                                          span_near: {
                                            clauses: terms.reduce(
                                              (previousValue, currentValue) => {
                                                previousValue.push({
                                                  span_term: {
                                                    [key]: currentValue
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
                                          span_term: { [key]: phrase }
                                        })
                                      }
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
        }
      } else if (right.bool) {
        const copy = cloneDeep(right)
        const inOrder = operator === 'PRE'

        switch (slop) {
          case 'S':
            slop = '15'
            break
          case 'P':
            slop = '50'
        }

        if (Object.keys(right.bool).length > 1) throw new Error('malformed query')

        let clause

        if (left.val.startsWith('"') && left.val.endsWith('"')) {
          const value = left.val.slice(1, -1).trim()
          const terms = value.split(/ +/)

          if (terms.length > 1) {
            const clauses = terms.reduce((previousValue, currentValue) => {
              previousValue.push({
                span_term: {
                  [left.key]: currentValue
                }
              })

              return previousValue
            }, [])

            clause = {
              span_near: {
                clauses,
                in_order: true,
                slop: 0
              }
            }
          } else {
            clause = {
              span_term: {
                [left.key]: value
              }
            }
          }
        } else if (left.val.includes('*') || left.val.includes('?')) {
          clause = {
            span_multi: {
              match: {
                wildcard: {
                  [left.key]: {
                    value: left.val,
                    case_insensitive: true,
                    rewrite: SPAN_MULTI_WILDCARD_REWRITE
                  }
                }
              }
            }
          }
        } else {
          clause = {
            span_term: {
              [left.key]: left.val
            }
          }
        }

        for (const k in right.bool) {
          switch (k) {
            case 'must': {
              for (const iterator of copy.bool[k]) {
                if (iterator.term) {
                  iterator.span_term = iterator.term
                  delete iterator.term
                } else if (iterator.wildcard) {
                  for (const k in iterator.wildcard) {
                    iterator.span_multi = {
                      match: {
                        wildcard: {
                          [k]: {
                            ...iterator.wildcard[k],
                            rewrite: SPAN_MULTI_WILDCARD_REWRITE
                          }
                        }
                      }
                    }
                    delete iterator.wildcard
                  }
                } else if (iterator.match_phrase) {
                  for (const k in iterator.match_phrase) {
                    const value = iterator.match_phrase[k]
                    const terms = value.split(/ +/)

                    if (terms.length > 1) {
                      const clauses = terms.reduce(
                        (previousValue, currentValue) => {
                          previousValue.push({
                            span_term: {
                              [k]: currentValue
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
                      iterator.span_term = { [k]: value }
                    }

                    delete iterator.match_phrase
                  }
                } else if (!iterator.span_near) {
                  throw new Error('malformed query')
                }
              }

              return {
                bool: {
                  must: [
                    {
                      span_near: {
                        clauses: [clause, ...copy.bool.must],
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
                              clauses: copy.bool[k].reduce(
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
                                    for (const key in currentValue.wildcard) {
                                      previousValue.push({
                                        span_multi: {
                                          match: {
                                            wildcard: {
                                              [key]: {
                                                ...currentValue.wildcard[key],
                                                rewrite:
                                                  SPAN_MULTI_WILDCARD_REWRITE
                                              }
                                            }
                                          }
                                        }
                                      })
                                    }
                                  } else if (currentValue.match_phrase) {
                                    for (const key in currentValue.match_phrase) {
                                      const phrase =
                                        currentValue.match_phrase[key]
                                      const terms = phrase.split(/ +/)

                                      if (terms.length > 1) {
                                        previousValue.push({
                                          span_near: {
                                            clauses: terms.reduce(
                                              (previousValue, currentValue) => {
                                                previousValue.push({
                                                  span_term: {
                                                    [key]: currentValue
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
                                          span_term: { [key]: phrase }
                                        })
                                      }
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

        if (left.val.startsWith('"') && left.val.endsWith('"')) {
          const value = left.val.slice(1, -1).trim()
          const terms = value.split(/ +/)

          if (terms.length > 1) {
            const clauses = terms.reduce((previousValue, currentValue) => {
              previousValue.push({
                span_term: {
                  [left.key]: currentValue
                }
              })

              return previousValue
            }, [])

            booleanQuery.bool.must[0].span_near.clauses.push({
              span_near: {
                clauses,
                in_order: true,
                slop: 0
              }
            })
          } else {
            booleanQuery.bool.must[0].span_near.clauses.push({
              span_term: {
                [left.key]: value
              }
            })
          }
        } else if (left.val.includes('*') || left.val.includes('?')) {
          booleanQuery.bool.must[0].span_near.clauses.push({
            span_multi: {
              match: {
                wildcard: {
                  [left.key]: {
                    value: left.val,
                    case_insensitive: true,
                    rewrite: SPAN_MULTI_WILDCARD_REWRITE
                  }
                }
              }
            }
          })
        } else {
          booleanQuery.bool.must[0].span_near.clauses.push({
            span_term: {
              [left.key]: left.val
            }
          })
        }

        if (right.val.startsWith('"') && right.val.endsWith('"')) {
          const value = right.val.slice(1, -1).trim()
          const terms = value.split(/ +/)

          if (terms.length > 1) {
            const clauses = terms.reduce((previousValue, currentValue) => {
              previousValue.push({
                span_term: {
                  [right.key]: currentValue
                }
              })

              return previousValue
            }, [])

            booleanQuery.bool.must[0].span_near.clauses.push({
              span_near: {
                clauses,
                in_order: true,
                slop: 0
              }
            })
          } else {
            booleanQuery.bool.must[0].span_near.clauses.push({
              span_term: {
                [right.key]: value
              }
            })
          }
        } else if (right.val.includes('*') || right.val.includes('?')) {
          booleanQuery.bool.must[0].span_near.clauses.push({
            span_multi: {
              match: {
                wildcard: {
                  [right.key]: {
                    value: right.val,
                    case_insensitive: true,
                    rewrite: SPAN_MULTI_WILDCARD_REWRITE
                  }
                }
              }
            }
          })
        } else {
          booleanQuery.bool.must[0].span_near.clauses.push({
            span_term: {
              [right.key]: right.val
            }
          })
        }

        return booleanQuery
      }
    }
  }
}

// const left = {
//   bool: {
//     should: [
//       { term: { "cpc.sub-grp": "Y02T90_1" } },
//       { term: { "upc.sub-grp": "Y02T90_1" } },
//       { terms: { "ipc.sub-grp": ["Y02T90_1"] } },
//     ],
//   },
// };

// const left = {
//   bool: {
//     should: [
//       { match_phrase: { "cpc.sub-grp": "Y02T90_2" } },
//       { term: { "upc.sub-grp": "Y02T90_3" } },
//     ],
//   },
// };

// const right = {
//   bool: {
//     must: [
//       { match_phrase: { "cpc.sub-grp": "Y02T90_1" } },
//       { term: { "upc.sub-grp": "Y02T90_1" } },
//     ],
//   },
// };

// const right = {
//   bool: {
//     should: [
//       { term: { "cpc.sub-grp": "Y02T90_2" } },
//       { term: { "ipc.sub-grp": "Y02T90_1" } },
//       { terms: { "upc.sub-grp": ["Y02T90_1", "Y02T90_2"] } },
//     ],
//   },
// };

// const left = {
//   bool: {
//     should: [
//       { terms: { pa: ["apple", "kiwi"] } },
//       { match_phrase: { pa: "orange" } },
//     ],
//   },
// };

// const left = {
//   bool: {
//     must: [{
//       span_near: {
//         clauses: [
//           { span_term: { pa: "banana" } },
//           { span_term: { pa: "apple" } },
//         ],
//         slop: "2",
//         in_order: true,
//       },
//     }],
//   },
// };

// const right = { key: "pa", val: "apple*" };

// const left = {
//   bool: {
//     must: [{ term: { ttl: 'kiwi' } }],
//     must_not: [{ term: { ttl: 'mango' } }]
//   }
// }

// const right = {
//   bool: {
//     should: [{ terms: { ttl: ['banana', 'apple'] } }]
//   }
// }

// console.dir(create(left, right, 'NEAR', '2'), {
//   depth: null
// })

// { key: 'ttl', val: 'a' }
// or
// { key: 'ttl', val: 'b' }

// {
//     bool: {
//       must: [
//         { term: { 'cpc.sub-grp': 'Y02T90_4' } },
//         { term: { 'cpc.sub-grp': 'Y02T90_3' } }
//       ]
//     }
// }

// and

// {
//     bool: {
//       must: [
//         { term: { 'cpc.sub-grp': 'Y02T90_4' } },
//         { term: { 'cpc.sub-grp': 'Y02T90_3' } }
//       ]
//     }
// }

module.exports = create
