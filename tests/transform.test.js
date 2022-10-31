const { transform, transformCondense } = require('../transform')

test('should transform provided left-right object format to parent-child relationship format', () => {
  const tree = {
    operator: 'OR',
    leftOperand: { field: 'desc', value: 'DETECT*' },
    rightOperand: { field: 'pn', value: 'US7420295B2' }
  }

  expect(transform(tree)).toEqual({
    key: 'multi',
    opt: 'OR',
    child: [
      { key: 'desc', val: 'DETECT*' },
      { key: 'pn', val: 'US7420295B2' }
    ]
  })
})

test('should transform left-right object containing date fields', () => {
  const tree = {
    type: 'DATE',
    from: '16990101',
    to: '20010316',
    field: 'pd'
  }

  expect(transform(tree)).toEqual({
    key: 'pd',
    val: {
      from: '16990101',
      to: '20010316'
    }
  })
})

test('should establish value as multi if left side and right side have same fields', () => {
  const tree = {
    operator: 'NEAR',
    span: '5',
    leftOperand: { field: 'desc', value: 'DETECT*' },
    rightOperand: {
      operator: 'NEAR',
      span: '6',
      leftOperand: { field: 'desc', value: 'CONNECT*' },
      rightOperand: { field: 'desc', value: 'SOURCE*' }
    }
  }

  expect(transform(tree)).toEqual({
    key: 'desc',
    val: 'multi',
    opt: 'NEAR',
    span: '5',
    child: [
      { key: 'desc', val: 'DETECT*' },
      {
        key: 'desc',
        val: 'multi',
        opt: 'NEAR',
        span: '6',
        child: [
          { key: 'desc', val: 'CONNECT*' },
          { key: 'desc', val: 'SOURCE*' }
        ]
      }
    ]
  })
})

test('should produce a condensed ouput where values are merged and hide implicit grouping', () => {
  const tree = {
    operator: 'OR',
    leftOperand: {
      operator: 'NEAR',
      span: '5',
      leftOperand: { field: 'desc', value: 'DETECT*' },
      rightOperand: {
        operator: 'NEAR',
        span: '6',
        leftOperand: { field: 'desc', value: 'CONNECT*' },
        rightOperand: { field: 'desc', value: 'SOURCE*' },
        explicit: true
      },
      explicit: true
    },
    rightOperand: { field: 'pn', value: 'US7420295B2' }
  }

  expect(transformCondense(tree)).toEqual({
    field: '',
    keyword: '',
    operator: 'OR',
    children: [
      {
        field: 'desc',
        keyword: '(DETECT* NEAR5 (CONNECT* NEAR6 SOURCE*))',
        operator: '',
        children: []
      },
      { field: 'pn', keyword: 'US7420295B2', operator: '', children: [] }
    ]
  })
})
