const { parse } = require('./parser')
const { prepare: preProcess, elasticBuilder, pickKeyParsed } = require('./')

console.dir(parse(
  '(ttl:((apple AND kiwi) AND orange NEAR2 ball))',
  false,
  {
    eql: true,
    children: true
  }
), { depth: null })

const queryConfig = preProcess(
  '(((pn:(EP-2137994-A4))) AND ((pn:US-9966065-B2)))',
  { defOpt: 'OR' }
)

console.log(queryConfig)
