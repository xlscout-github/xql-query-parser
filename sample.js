const { parse } = require('./parser')
const esb = require('./eql/esb')
const eql = require('./eql')
const { EQLgenerator } = require('./EQLgenerator')

const query = '((pd: [20220304 TO 20220308]) NOT pn:(ES1286585U OR ES1286629U OR US20210403048A1 OR US20200328824A1))'

const result = parse(query)

console.dir(result, {
  depth: null
})

console.dir(EQLgenerator(result), {
  depth: null
})

console.dir(eql(query), {
  depth: null
})

console.dir(esb(query), {
  depth: null
})
