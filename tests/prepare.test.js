const { prepare } = require('../prepare')

test('single field: should enclose field along with value in parenthesis', () => {
  const query = 'desc:(DETECT* ) near5 (CONNECT* near6 SOURCE*)'

  expect(prepare(query).q).toBe(
    '((desc:(DETECT* ) near5 (CONNECT* near6 SOURCE*)))'
  )
})

test('multiple fields: should enclose field along with value in parenthesis', () => {
  const query =
    '((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pn:US7420295B2'

  expect(prepare(query).q).toBe(
    '((((desc:(DETECT* near5 (CONNECT* near6 SOURCE*))))) OR (pn:US7420295B2))'
  )
})

test('should return query as it is if no field signature is found', () => {
  const query = 'DETECT* near5 (CONNECT* near6 SOURCE*)'

  expect(prepare(query).q).toBe('(DETECT* near5 (CONNECT* near6 SOURCE*))')
})

test('should consider default operator "AND" within value if operator is not specified', () => {
  const query = 'desc:DETECT* (CONNECT* SOURCE*)'

  expect(prepare(query).q).toBe('((desc:DETECT* AND (CONNECT* AND SOURCE*)))')
})

test('should not add default operator in case of date fields', () => {
  const query =
    'pd:[16990101 to 20010316] OR ab:[16990101 to 20010316] OR abs:[16990101 to 20010316]'

  expect(prepare(query).q).toBe(
    '((pd:[16990101 to 20010316]) OR (ab:[16990101 to 20010316]) OR (abs:[16990101 to 20010316]))'
  )
})

test('should throw error in case of unbalanced circular brackets', () => {
  const query = '((desc:(DETECT* near5 (CONNECT* near6 SOURCE*))) OR pn:US7420295B2'

  expect.assertions(2)

  try {
    prepare(query).q
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty('message', 'Unbalanced brackets or quotes')
  }
})

test('should not throw error if unbalanced circular brackets are inside quotations', () => {
  const query = '(tac:"((detect") OR (ttl:"c))onnect*" OR ppl*)'

  expect(prepare(query).q).toBe(
    '(((tac:"((detect")) OR ((ttl:"c))onnect*" OR ppl*)))'
  )
})

test('should not throw error if unbalanced square brackets are inside quotations', () => {
  const query = '(tac:"[[detect") OR (ttl:"connect]]*" OR ppl*)'

  expect(prepare(query).q).toBe(
    '(((tac:"[[detect")) OR ((ttl:"connect]]*" OR ppl*)))'
  )
})

test('should throw error in case of mismatched brackets', () => {
  const query = '((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pd:(16990101 to 20010316]'

  expect.assertions(2)

  try {
    prepare(query).q
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty('message', 'Unbalanced brackets or quotes')
  }
})

test('should throw error in case of unbalanced square brackets', () => {
  const query = '((desc:(DETECT* near5 (CONNECT* near6 SOURCE*)))) OR pd:[16990101 to 20010316'

  expect.assertions(2)

  try {
    prepare(query).q
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty('message', 'Unbalanced brackets or quotes')
  }
})

test('should throw error if consecutive operators are present', () => {
  expect.assertions(2)

  try {
    prepare('(car  ) bus OR near2 autonomous')
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty(
      'message',
      'consecutive operators are not allowed'
    )
  }
})

test('should throw error if consecutive operators are present at the end', () => {
  expect.assertions(2)

  try {
    prepare('(car  ) bus OR near2')
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty(
      'message',
      'consecutive operators are not allowed'
    )
  }
})

test('should throw error if trailing operators are present', () => {
  expect.assertions(2)

  try {
    prepare('(car  ) bus (near2 )')
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty(
      'message',
      'trailing operators are not allowed'
    )
  }
})

test('should convert tilde proximity searches, if phrase is in the begining', () => {
  const query = '(text:( ("FRANZ KOHLER"~3) OR KOHLER))'

  expect(prepare(query).q).toBe('(((text:( ((FRANZ NEAR3 KOHLER)) OR KOHLER))))')
})

test('should convert tilde proximity searches, if phrase is at the end', () => {
  const query = '(text:(FRANZ AND "FRANZ KOHLER"~3))'

  expect(prepare(query).q).toBe('(((text:(FRANZ AND (FRANZ NEAR3 KOHLER)))))')
})

test('should convert tilde proximity searches, if phrase is at the end and the term before it is not a operator', () => {
  const query = '(text:(FRANZ AND KOHLER ("FRANZ KOHLER"~3)))'

  expect(prepare(query).q).toBe(
    '(((text:(FRANZ AND KOHLER AND ((FRANZ NEAR3 KOHLER))))))'
  )
})

test('should throw error if single term is specified in tilde proximity search', () => {
  expect.assertions(2)

  try {
    prepare('(text:(FRANZ AND "FRANZ"~3))')
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty(
      'message',
      'Proximity search requires at least 2 terms'
    )
  }
})

test('should convert tilde proximity searches, if phrase is in the middle', () => {
  const query = '(text:(FRANZ OR "FRANZ KOHLER"~3 OR KOHLER))'

  expect(prepare(query).q).toBe(
    '(((text:(FRANZ OR (FRANZ NEAR3 KOHLER) OR KOHLER))))'
  )
})

test('should convert tilde proximity searches, if phrase is in the middle and the term before it is not a operator', () => {
  const query = '(text:(FRANZ ("FRANZ KOHLER"~3) OR KOHLER))'

  expect(prepare(query).q).toBe(
    '(((text:(FRANZ AND ((FRANZ NEAR3 KOHLER)) OR KOHLER))))'
  )
})

test('configure default operator as OR', () => {
  const query = '(pn:(ES1286585U ES1286629U US20210403048A1 US20200328824A1))'

  expect(prepare(query, { defOpt: 'OR' }).q).toBe(
    '(((pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))))'
  )
})

test('configure default operator to unknown value', () => {
  const query = '(pn:(ES1286585U ES1286629U US20210403048A1 US20200328824A1))'

  expect(prepare(query, { defOpt: 'DNA' }).q).toBe(
    '(((pn:(ES1286585U AND ES1286629U AND US20210403048A1 AND US20200328824A1))))'
  )
})

test('encountered opening circular bracket while evaluating a term when keywords have already been concatenated', () => {
  expect.assertions(2)

  try {
    prepare('pn: (US-5652895-(A))')
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty(
      'message',
      'invalid query'
    )
  }
})

test('encountered empty circular brackets', () => {
  expect.assertions(2)

  try {
    prepare('pn: (US-5652895 ())')
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty(
      'message',
      'invalid query'
    )
  }
})

test('encountered value after closing circular bracket', () => {
  expect.assertions(2)

  try {
    prepare('pn: (US-5652895 (JP)*)')
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty(
      'message',
      'invalid query'
    )
  }
})

test('encountered quote after closing circular bracket', () => {
  expect.assertions(2)

  try {
    prepare('pn: (US-5652895 (JP)\"\")')
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty(
      'message',
      'invalid query'
    )
  }
})

test('unbalanced quote', () => {
  expect.assertions(2)

  try {
    prepare('pn: US-5652895-A \"')
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty(
      'message',
      'Unbalanced brackets or quotes'
    )
  }
})