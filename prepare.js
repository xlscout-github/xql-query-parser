function isBalanced (q) {
  const stack = []
  const map = {
    '(': ')',
    '[': ']'
  }
  let quote = false

  for (let i = 0; i < q.length; i++) {
    if (q[i] === '"') {
      quote = !quote
    } else if (!quote && (q[i] === '(' || q[i] === '[')) {
      stack.push(q[i])
    } else if (!quote && (q[i] === ')' || q[i] === ']')) {
      const last = stack.pop()

      if (q[i] !== map[last]) {
        return false
      }
    }
  }

  if ((stack.length !== 0) || quote) {
    return false
  }

  return true
}

function todeduct (q, start, end) {
  const original = start

  while (q[start - 1] === '(' || q[start - 1] === ' ') {
    start--
  }

  let quote = false
  let countBefore = 0
  let count = 0
  for (let i = start; i <= end; i++) {
    if (q[i] === '"') {
      quote = !quote
    } else if (!quote && q[i] === '(') {
      count++
      if (i < original) {
        countBefore++
      }
    } else if (!quote && q[i] === ')') {
      count--
    }
  }

  return countBefore - count
}

function evalDeduction (q, start, end) {
  const deduction = todeduct(q, start, end)

  let i = end
  let foundClose = 0
  let count = 0

  while (deduction !== foundClose) {
    if (q[i] === ')') foundClose++

    count++
    i--
  }

  return count
}

function evalSpaces (q, i) {
  let count = 0
  for (let ch = i; ch < q.length; ch++) {
    if (q[ch] === ' ') count++
    else break
  }

  return ' '.repeat(count)
}

function getFields (q) {
  const words = []
  const startFieldIndices = []

  let construct = ''
  let start = false
  let index = 0
  let quote = false

  for (let ch = 0; ch < q.length; ch++) {
    if (q[ch] === '"') {
      quote = !quote
    } else if (q[ch] !== ' ' && q[ch] !== '(' && q[ch] !== ')') {
      if (!quote) {
        if (q[ch] === ':' && construct !== '') {
          construct += q[ch]
          construct += evalSpaces(q, ch + 1)
          words.push(construct)
          startFieldIndices.push(index)
          construct = ''
          start = false
          index = 0
        } else {
          construct += q[ch]
          if (!start) {
            index = ch
            start = true
          }
        }
      }
    } else if (q[ch] === ' ') {
      if (!quote) {
        construct = ''
        start = false
        index = 0
      }
    }
  }

  return {
    words,
    startFieldIndices
  }
}

function isNear (s) {
  const parts = s.split('near')

  return !!(parts.length === 2 &&
    parts[0] === '' &&
    parts[1] !== '' &&
    (Number(parts[1]) > -1))
}

function _isNear (s) {
  const parts = s.split('raen')

  return !!(parts.length === 2 &&
    parts[1] === '' &&
    parts[0] !== '' &&
    (Number(parts[0]) > -1))
}

function isPre (s) {
  const parts = s.split('pre')

  return !!(parts.length === 2 &&
    parts[0] === '' &&
    parts[1] !== '' &&
    (Number(parts[1]) > -1))
}

function _isPre (s) {
  const parts = s.split('erp')

  return !!(parts.length === 2 &&
    parts[1] === '' &&
    parts[0] !== '' &&
    (Number(parts[0]) > -1))
}

function isOperator (s) {
  s = s.toLowerCase()

  return (
    s === 'and' ||
    s === 'or' ||
    s === 'not' ||
    s === 'nearp' ||
    s === 'nears' ||
    s === 'prep' ||
    s === 'pres' ||
    isNear(s) ||
    isPre(s)
  )
}

function _isOperator (s) {
  s = s.toLowerCase()

  return (
    s === 'dna' ||
    s === 'ro' ||
    s === 'ton' ||
    s === 'praen' ||
    s === 'sraen' ||
    s === 'perp' ||
    s === 'serp' ||
    _isNear(s) ||
    _isPre(s)
  )
}

function _prepare (q) {
  if (!isBalanced(q)) {
    throw new Error('Unbalanced brackets or quotes')
  }

  const operators = new Set()

  q = `(${q})`

  const fields = getFields(q)

  const { words } = fields
  let { startFieldIndices } = fields

  const startValIndices = []
  const endValIndices = []

  if (startFieldIndices.length) {
    let k
    for (k = 0; k < startFieldIndices.length - 1; k++) {
      const currentFieldIndex = startFieldIndices[k]
      const nextFieldIndex = startFieldIndices[k + 1]

      let operator = ''
      let operatorIndex

      for (let j = nextFieldIndex - 1; j > currentFieldIndex; j--) {
        if (_isOperator(operator)) {
          operators.add(operator.toUpperCase().split("").reverse().join(""))
          break
        }

        if (q[j] === ' ' || q[j] === '(') {
          operator = ''
          continue
        }

        operator += q[j]
        operatorIndex = j
      }

      const posInsertClose = operatorIndex - 1

      q = [q.slice(0, currentFieldIndex), '(', q.slice(currentFieldIndex)].join(
        ''
      )

      q = [
        q.slice(0, posInsertClose + 1),
        ')',
        q.slice(posInsertClose + 1)
      ].join('')

      startFieldIndices = startFieldIndices.map((val, idx) => {
        if (idx < k) return val
        else if (idx === k) return val + 1
        else return val + 2
      })

      const deduction = evalDeduction(
        q,
        currentFieldIndex + 1,
        posInsertClose + 1
      )

      endValIndices.push(posInsertClose + 1 - deduction)
    }

    q = [
      q.slice(0, startFieldIndices[k]),
      '(',
      q.slice(startFieldIndices[k])
    ].join('')

    q = [q.slice(0, q.length), ')'].join('')

    startFieldIndices[k] = startFieldIndices[k] + 1

    const deduction = evalDeduction(q, startFieldIndices[k], q.length - 1)

    endValIndices.push(q.length - 1 - deduction)
  }

  for (let i = 0; i < startFieldIndices.length; i++) {
    startValIndices.push(startFieldIndices[i] + words[i].length)
  }

  // console.log("Query", q);
  // console.log("Found words", words);
  // console.log("Start Field Index", startFieldIndices);
  // console.log("Start Val Index", startValIndices);
  // console.log("End Val Index", endValIndices);

  return {
    q,
    words,
    operators,
    startFieldIndices,
    startValIndices,
    endValIndices
  }
}

function pickKey (q, field) {
  const {
    q: query,
    words,
    startFieldIndices,
    startValIndices,
    endValIndices
  } = _prepare(q)

  const indices = []

  for (let i = 0; i < words.length; i++) {
    if (words[i].trimEnd().slice(0, -1) === field) {
      indices.push({
        field,
        value: query.slice(startValIndices[i], endValIndices[i] + 1),
        start: startFieldIndices[i] - (2 * i + 2),
        end: endValIndices[i] - (2 * i + 2)
      })
    }
  }

  return indices
}

function prepare (q, { defOpt = 'AND', defOptMap = {} } = {}) {
  const { q: query, words, operators, startValIndices, endValIndices } = _prepare(q)

  return transform(query, words, operators, startValIndices, endValIndices, { defOpt, defOptMap })
}

function collectRemainingParts (s, i) {
  let remain = ''
  let char
  for (char = i; char < s.length; char++) {
    if (s[char] === ' ' || s[char] === ')') {
      remain += s[char]
    } else break
  }

  return { remain, char }
}

function trimBrackets (s) {
  let frontCount = 0

  while (s.startsWith('(')) {
    s = s.slice(1)
    if (s.startsWith(' ')) frontCount++
    s = s.trim()
    frontCount++
  }

  while (s.endsWith(')')) {
    s = s.slice(0, -1).trim()
  }

  return { s, frontCount }
}

function isProximitySearch (s) {
  const parts = s.split('~')

  return (
    parts.length === 2 &&
    (parts[0].startsWith('"') && parts[0].endsWith('"')) &&
    (Number(parts[1]) > -1)
  )
}

function transformProximitySearch (s, q, start) {
  const [searchPhrase, distance] = s.split('~')
  const terms = searchPhrase.slice(1, -1).split(' ')

  if (terms.length < 2) {
    throw new Error('Proximity search requires at least 2 terms')
  }

  const result = [
    q.slice(0, start),
    `(${terms.join(` NEAR${distance} `)})`,
    q.slice(start + s.length)
  ].join('')

  const increment =
    (terms.length - 1) * ('NEAR'.length + distance.length + ' '.length) -
    ('~'.length + distance.length)

  return {
    result,
    increment
  }
}

function transform (q, fields, operators, startIndices, endIndices, props) {
  if (!isOperator(props.defOpt)) {
    props.defOpt = 'AND'
  }

  let { defOpt } = props
  const { defOptMap } = props

  if (q.length > 0 && startIndices.length === 0 && endIndices.length === 0) {
    fields.push('text:')
    startIndices.push(0)
    endIndices.push(q.length - 1)
  }

  for (let i = 0; i < startIndices.length; i++) {
    const field = fields[i].trimEnd().slice(0, -1)

    if (defOptMap[field]) {
      defOpt = isOperator(defOptMap[field]) ? defOptMap[field] : 'AND'
    } else {
      defOpt = props.defOpt
    }

    let inter = q.slice(startIndices[i], endIndices[i] + 1)
    let k = inter.length - 1
    let noSpaces = 0

    while (inter[k] === ' ') {
      noSpaces++
      k--
    }

    inter = inter.trimEnd()

    let isDate = true
    let datePart = ''
    const dateParams = []
    let beginIndex = 0

    for (let ch = 0; ch < inter.length; ch++) {
      if (inter[ch] === '(' || inter[ch] === ')') {
        dateParams.push(inter[ch])
      } else if (inter[ch] === '[') {
        beginIndex = dateParams.push(inter[ch]) - 1
      } else if (inter[ch] === ']') {
        if (isNaN(Number(datePart)) && datePart !== '*') {
          isDate = false
          break
        }
        if (datePart !== '') dateParams.push(datePart)
        datePart = ''
        dateParams.push(inter[ch])
      } else if (inter[ch] !== ' ') {
        datePart += inter[ch]
      } else if (inter[ch] === ' ' && datePart !== '') {
        if (
          isNaN(Number(datePart)) &&
          datePart !== '*' &&
          datePart.toLowerCase() !== 'to'
        ) {
          isDate = false
          break
        }
        dateParams.push(datePart)
        datePart = ''
      }
    }

    // ignore for date
    if (
      isDate &&
      dateParams.length === 2 * beginIndex + 5 &&
      dateParams[beginIndex] === '[' &&
      (dateParams[beginIndex + 1] === '*' ||
        !isNaN(dateParams[beginIndex + 1])) &&
      dateParams[beginIndex + 2].toLowerCase() === 'to' &&
      (dateParams[beginIndex + 3] === '*' ||
        !isNaN(dateParams[beginIndex + 3])) &&
      dateParams[beginIndex + 4] === ']'
    ) {
      continue
    }

    let toggle = false
    let noOperator = 0
    let noProximity = 0
    let start = false
    let index = 0
    let construct = ''
    let prevConstruct = ''
    let onlyBracket = false
    let bracketClosed = false
    let quote = false

    for (let ch = 0; ch < inter.length; ch++) {
      if (inter[ch] === '"') {
        if (bracketClosed) {
          throw new Error('invalid query')
        }
        quote = !quote
        construct += inter[ch]
        if (!start) {
          index = ch
          start = true
        }
      } else if (!quote && inter[ch] === '(') {
        if (construct && !onlyBracket) {
          throw new Error('invalid query')
        }

        onlyBracket = true
        construct += inter[ch]
        if (!start) {
          index = ch
          start = true
        }
      } else if (!quote && inter[ch] === ')') {
        if (onlyBracket) {
          throw new Error('invalid query')
        }
        construct += inter[ch]
        bracketClosed = true
      } else if (inter[ch] !== ' ') {
        if (bracketClosed) {
          throw new Error('invalid query')
        }
        onlyBracket = false
        construct += inter[ch]
        if (!start) {
          index = ch
          start = true
        }
      } else if (inter[ch] === ' ') {
        if (!quote && !onlyBracket) {
          const { remain, char } = collectRemainingParts(inter, ch)

          if (remain === ' ') {
            const { s, frontCount } = trimBrackets(construct)

            construct = s

            if (toggle && !isOperator(construct)) {
              inter = [inter.slice(0, index), `${defOpt} `, inter.slice(index)].join(
                ''
              )
              noOperator++
              ch += defOpt.length + ' '.length
              index += defOpt.length + ' '.length
              operators.add(defOpt.toUpperCase())

              if (isProximitySearch(construct)) {
                const { result, increment } = transformProximitySearch(
                  construct,
                  inter,
                  index + frontCount
                )

                inter = result
                noProximity += increment
                ch += increment
              }
            } else if (!toggle) {
              if (isOperator(construct)) {
                if (construct.toUpperCase() !== 'NOT') {
                  throw new Error('consecutive operators are not allowed')
                }
                if (prevConstruct.toUpperCase() === 'NOT') {
                  throw new Error('consecutive operators are not allowed')
                }

                operators.add('NOT')
              } else if (isProximitySearch(construct)) {
                const { result, increment } = transformProximitySearch(
                  construct,
                  inter,
                  index + frontCount
                )

                inter = result
                noProximity += increment
                ch += increment

                toggle = !toggle
              } else {
                toggle = !toggle
              }
            } else {
              toggle = !toggle
              operators.add(construct.toUpperCase())
            }

            prevConstruct = construct
            construct = ''
            start = false
            index = 0
            bracketClosed = false
          } else {
            construct += remain.trimEnd()

            if (inter.length === char) {
              break
            } else {
              ch = char - 2
            }
          }
        } else {
          construct += inter[ch]
        }
      }
    }

    const { s, frontCount } = trimBrackets(construct)

    construct = s

    if (toggle) {
      if (!isOperator(construct)) {
        inter = [inter.slice(0, index), `${defOpt} `, inter.slice(index)].join('')
        noOperator++
        operators.add(defOpt.toUpperCase())

        if (isProximitySearch(construct)) {
          const { result, increment } = transformProximitySearch(
            construct,
            inter,
            index + defOpt.length + ' '.length + frontCount
          )

          inter = result
          noProximity += increment
        }
      } else {
        throw new Error('trailing operators are not allowed')
      }
    } else {
      if (isOperator(construct)) {
        throw new Error('consecutive operators are not allowed')
      } else {
        if (isProximitySearch(construct)) {
          const { result, increment } = transformProximitySearch(
            construct,
            inter,
            index + frontCount
          )

          inter = result
          noProximity += increment
        }
      }
    }

    q = [q.slice(0, startIndices[i]), inter, q.slice(endIndices[i] + 1)].join(
      ''
    )

    startIndices = startIndices.map((val, idx) => {
      if (idx <= i) return val
      else return val + (defOpt.length + 1) * noOperator - noSpaces + noProximity
    })

    endIndices = endIndices.map((val, idx) => {
      if (idx < i) return val
      else return val + (defOpt.length + 1) * noOperator - noSpaces + noProximity
    })
  }

  return { q, fields, operators, startIndices, endIndices }
}

module.exports = {
  prepare,
  pickKey,
  getFields
}
