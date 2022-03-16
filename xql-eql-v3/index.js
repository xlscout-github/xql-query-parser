const genEQL = require('./gen-eql')

// const pnq = '((ttl:(wireless)) OR (pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)))'
// const pnq1 = '(pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845))'
// const fieldq = '(ttl:((mobile AND phone) OR screen NOT aluminum))'
// const fieldq1 = '(tac:((((autonomous vehicles) OR (automated vehicle) OR (self driving vehicle) OR (self driving car)))))'
// const fieldq2 = '(ttl:(wireles? AND communicatio?) NOT (ttl:(netwo* AND sign*)))'

// console.log('final ->', JSON.stringify(genEQL('US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845', (node) => {
//     // console.log(node.key, node.val);
//     if (node.key === 'pn') {
//         // node.key = 'pn-nok.keyword'
//         node.key = 'ucid-alt.keyword'
//     }
// }), null, 2))

console.dir(genEQL('(ttl:(((Fruit* OR Vegetable*) NEAR3 ((Carrot OR juice) OR (banana NEAR3 shake)))))'), { depth: null })
