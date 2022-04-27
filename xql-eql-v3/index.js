// const { genEqlIter, genEqlRec } = require('./gen-eql')
const genEqlIter = require('./dfs')

// const pnq = '((ttl:(wireless)) OR (pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)))'
// const pnq1 = '(pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845))'
// const fieldq = '(ttl:((mobile AND phone) OR screen NOT aluminum))'
// const fieldq1 = '(tac:((((autonomous vehicles) OR (automated vehicle) OR (self driving vehicle) OR (self driving car)))))'
// const fieldq2 = '(ttl:(wireles? AND communicatio?) NOT (ttl:(netwo* AND sign*)))'

const q = '(ttl:(mobile))'

console.log('final ->', require('fs').writeFileSync('output.json', JSON.stringify(genEqlIter(q, (node) => {
  // console.log(node.key, node.val);
  if (node.key === 'pn') {
    // node.key = 'pn-nok.keyword'
    node.key = 'ucid-alt.keyword'
  }

  if (node.key === 'cpc') {
    node.key = 'cpc.sub-grp'
    node.val = node.val.replace('/', '_')
  }

  if (node.key === 'ipc' || node.key === 'ic') {
    node.key = 'ipc.sub-grp'
    node.val = node.val.replace('/', '_')
  }

  if (node.key.includes('.name') && (node.val.startsWith('"') && node.val.endsWith('"'))) {
    node.val = node.val.replace(/['"]+/g, '')
  }
}), null, 2)))

//
// ttl: (Carrot OR juice AND apple)
// ttl: (Carrot OR juice OR apple)

// console.dir(genEqlIter('(ttl:((((Carrot OR juice) OR (banana NEAR3 shake)))))'), { depth: null })
