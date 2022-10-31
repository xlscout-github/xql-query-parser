// isBalanced func determines weather the circular and square brackets are balanced
// in the query string.
function isBalanced (q) {
  const stack = []
  const map = {
    '(': ')',
    '[': ']'
  }
  // keep track of occurance of quotes for ignoring any brackets within it.
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

  // unbalanced query if stack isn't empty or if quote is truthy
  // after processing entire query.
  if ((stack.length !== 0) || quote) {
    return false
  }

  return true
}

// todeduct func is a helper func which determines the count of closing parenthesis
// to skip from the end.
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

// evalDeduction func is a helper function which determines the amount of places
// to skip from the end based on count of closing parenthesis.
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

// evalSpaces func collects and returns spaces encountered starting from sepcified postion
// in given string.
function evalSpaces (q, i) {
  let count = 0

  for (let ch = i; ch < q.length; ch++) {
    if (q[ch] !== ' ') break
    count++
  }

  return ' '.repeat(count)
}

// getFields is helper func which evaluates all of the fields in the query
// along with their starting indices.
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

// isNear func return true if the input is a near operator and false otherwise.
function isNear (s) {
  const parts = s.split('near')

  return !!(parts.length === 2 &&
    parts[0] === '' &&
    parts[1] !== '' &&
    (Number(parts[1]) > -1))
}

// _isNear func return true if the input is a inverted near operator and false otherwise.
function _isNear (s) {
  const parts = s.split('raen')

  return !!(parts.length === 2 &&
    parts[1] === '' &&
    parts[0] !== '' &&
    (Number(parts[0]) > -1))
}

// isPre func return true if the input is a pre operator and false otherwise.
function isPre (s) {
  const parts = s.split('pre')

  return !!(parts.length === 2 &&
    parts[0] === '' &&
    parts[1] !== '' &&
    (Number(parts[1]) > -1))
}

// _isPre func return true if the input is a inverted pre operator and false otherwise.
function _isPre (s) {
  const parts = s.split('erp')

  return !!(parts.length === 2 &&
    parts[1] === '' &&
    parts[0] !== '' &&
    (Number(parts[0]) > -1))
}

// isOperator func determines weather the input string is an operator.
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

// _isOperator func determines weather the input string is an inverted operator.
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

// _prepare func alters the query so that the whole query and each subquery
// is enclosed in a parentheses.
// It returns the modified query, operators encountered in between fields,
// all of the fields in the query along with their starting indices and
// their starting and ending indices of inner value.
function _prepare (q) {
  if (!isBalanced(q)) {
    throw new Error('Unbalanced brackets or quotes')
  }

  // keeps track of operators encountered in between fields.
  const operators = new Set()

  // enclose the entire query inside a parentheses as its the starting symbol
  // of production rules.
  q = `(${q})`

  // get all of the fields in the query along with their starting indices.
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

      // identify operator in between 2 fields.
      for (let j = nextFieldIndex - 1; j > currentFieldIndex; j--) {
        if (_isOperator(operator)) {
          operators.add(operator.toUpperCase().split('').reverse().join(''))
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

      // insert opening parenthesis in place of current field position.
      q = [q.slice(0, currentFieldIndex), '(', q.slice(currentFieldIndex)].join(
        ''
      )

      // insert closing parenthesis just before seperating operator.
      q = [
        q.slice(0, posInsertClose + 1),
        ')',
        q.slice(posInsertClose + 1)
      ].join('')

      // update starting field indices array after instering parentheses.
      startFieldIndices = startFieldIndices.map((val, idx) => {
        if (idx < k) return val
        else if (idx === k) return val + 1
        else return val + 2
      })

      // evaluate deduction to be made from the end to get to value's ending position.
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

  // populate starting value indices array.
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

// pickKey func accpects a query and a field and returns the subject field, its value,
// the start and end indices of the subquery.
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

// prepare func puts together a query for feeding into the parser.
function prepare (q, { defOpt = 'AND', defOptMap = {} } = {}) {
  const { q: query, words, operators, startValIndices, endValIndices } = _prepare(q)

  return transform(query, words, operators, startValIndices, endValIndices, { defOpt, defOptMap })
}

// collectRemainingParts is a helper func which collects provided characters
// within a string starting from the postion provided and return them
// along with last looked into postion.
function collectRemainingParts (s, i, chars) {
  let remain = ''
  let char = i

  for (; char < s.length; char++) {
    if (!chars.includes(s[char])) break
    remain += s[char]
  }

  return { remain, char }
}

// trimBrackets func trim brackets from front and back and returns the new string
// along with the count of opening circular brackets and gaps in the beginning.
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

// isProximitySearch func determines whether the provided string resonates with
// proximity search criteria.
function isProximitySearch (s) {
  const parts = s.split('~')

  return (
    parts.length === 2 &&
    (parts[0].startsWith('"') && parts[0].endsWith('"')) &&
    (Number(parts[1]) > -1)
  )
}

// transformProximitySearch func spreads proximity search is known format.
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

// transform func inserts a default operator, transforms proximity search in a proper format,
// in the query as per the config provided.
function transform (q, fields, operators, startIndices, endIndices, props) {
  // set AND as default operator if any unindentified operator is provided.
  if (!isOperator(props.defOpt)) {
    props.defOpt = 'AND'
  }

  let { defOpt } = props
  const { defOptMap } = props

  // if no field is provided text field is assumed.
  if (q.length > 0 && !startIndices.length && !endIndices.length) {
    fields.push('text:')
    startIndices.push(0)
    endIndices.push(q.length - 1)
  }

  for (let i = 0; i < startIndices.length; i++) {
    // for getting field trim any spaces from the end and then removing ending colon.
    const field = fields[i].trimEnd().slice(0, -1)

    // use the default operator if found in the map corresponding to the field.
    if (defOptMap[field]) {
      defOpt = isOperator(defOptMap[field]) ? defOptMap[field] : 'AND'
    } else {
      defOpt = props.defOpt
    }

    // represents the current field's value
    let inter = q.slice(startIndices[i], endIndices[i] + 1)
    let k = inter.length - 1
    // keeps track of number of spaces appearing at the end of a value.
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

    // identify whether it is a date and, if so, continue further.
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

    // if true check for existence for a operator if not found insert one
    // otherwise validate concrete value.
    let toggle = false
    // number of operators added
    let noOperator = 0
    let noProximity = 0
    let start = false
    // starting index of current value.
    let index = 0
    // current term
    let construct = ''
    // previous term
    let prevConstruct = ''
    // whether encountered only opening circular brackets up until now.
    let onlyBracket = false
    let bracketClosed = false
    let quote = false

    for (let ch = 0; ch < inter.length; ch++) {
      if (inter[ch] === '"') {
        // if a quote is encountered right after a closing circular bracket.
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
        // if a opening circular bracket is encountered right after a concrete value.
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
        // if closing circular bracket occurs right after opening circular bracket.
        if (onlyBracket) {
          throw new Error('invalid query')
        }

        construct += inter[ch]
        bracketClosed = true
      } else if (inter[ch] !== ' ') {
        // if a concrete value is encountered right after closing circular bracket
        if (bracketClosed) {
          throw new Error('invalid query')
        }

        onlyBracket = false
        construct += inter[ch]

        if (!start) {
          index = ch
          start = true
        }
      } else {
        // when space is encountered which indicates a seperation between terms,
        // process current accumulated value only when space does not lie within a quotation
        // or when concrete value exists with not just only brackets
        // otherwise accumulate the space in current value.
        if (!quote && !onlyBracket) {
          // collect remaining spaces and closing circular brackets after current space.
          const { remain, char } = collectRemainingParts(inter, ch + 1, [' ', ')'])

          // process further if there is no remaining portion left.
          if (!remain) {
            const { s, frontCount } = trimBrackets(construct)

            // replace current value with trimmed value.
            construct = s

            // if the current value must be an operator, but if it's not, insert one.
            if (toggle && !isOperator(construct)) {
              inter = [inter.slice(0, index), `${defOpt} `, inter.slice(index)].join(
                ''
              )
              // increment the count of default operators added.
              noOperator++
              // move loop iterator and current value's starting index to correct position.
              ch += defOpt.length + ' '.length
              index += defOpt.length + ' '.length
              // add operator inserted to operators set to keep track of all of the operators
              // in the query.
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
              // current value is an operator.
              if (isOperator(construct)) {
                // current value is any operator other than NOT.
                if (construct.toUpperCase() !== 'NOT') {
                  throw new Error('consecutive operators are not allowed')
                }
                // if previous value was NOT as well as current value is also NOT.
                if (prevConstruct.toUpperCase() === 'NOT') {
                  throw new Error('consecutive operators are not allowed')
                }

                // add NOT to operators set
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
                // ideal case.
                toggle = !toggle
              }
            } else {
              // current value is an operator.
              toggle = !toggle
              operators.add(construct.toUpperCase())
            }

            // store current value in previous pointer.
            prevConstruct = construct
            // reset variables.
            construct = ''
            start = false
            index = 0
            bracketClosed = false
          } else {
            // collect remaining portion in current value.
            construct += remain.trimEnd()

            if (inter.length === char) break
            else ch = char - 2 // get to location of next space to process current value.
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

    // set final modified sub query.
    q = [q.slice(0, startIndices[i]), inter, q.slice(endIndices[i] + 1)].join(
      ''
    )

    // update starting value indices array.
    startIndices = startIndices.map((val, idx) => {
      if (idx <= i) return val
      else return val + (defOpt.length + 1) * noOperator - noSpaces + noProximity
    })

    // update ending value indices array.
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
