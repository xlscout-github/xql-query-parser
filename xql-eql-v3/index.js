const genEQL = require('./gen-eql')

const pnq = '((ttl:(wireless)) OR (pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845)))'
const pnq1 = '(pn:(US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845))'
const fieldq = '(ttl:((mobile AND phone) OR screen NOT aluminum))'
const fieldq1 = '(tac:((((autonomous vehicles) OR (automated vehicle) OR (self driving vehicle) OR (self driving car)))))'
const fieldq2 = '(ttl:(wireles? AND communicatio?) NOT (ttl:(netwo* AND sign*)))'

// console.log('final ->', JSON.stringify(genEQL('US20200233814 OR US9774086 OR WO2020251708 OR EP3856098 OR WO2019165110 OR US7545845', (node) => {
//     // console.log(node.key, node.val);
//     if (node.key === 'pn') {
//         // node.key = 'pn-nok.keyword'
//         node.key = 'ucid-alt.keyword'
//     }
// }), null, 2))

// (ttl:(apple NOT (ball OR base)))
// (ttl:(apple NOT ball NOT base))
// (ttl:((mobile AND phone) NOT screen NOT aluminum))

//
console.dir(genEQL('(ttl:("tree" NEAR2 "de*"))'), { depth: null })

// TO CHECK
// ttl: mobile
// ttl: [123456 to 123456]
// ttl: text NOT ball
// (ttl:((apple NOT banana) AND ball))
// (ttl:(NOT banana NOT ball))
// (ttl:((apple NOT banana) NOT (ball)))
// (ttl:((*apple OR banana*) NEAR10 (ball)))
// (ttl:((*apple AND banana) NEAR10 (*ball)))

// (ttl:(apple AND (banana NOT ball)))
// (ttl:(ball NOT (apple NOT banana)))
