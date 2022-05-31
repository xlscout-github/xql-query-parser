const { parse } = require('./parser')

const query = '(pn:(ES1286585U ES1286629U US20210403048A1 US20200328824A1))'

const result = parse(query, false, { defOpt: 'OR', eql: true })

console.dir(result, {
  depth: null
})
