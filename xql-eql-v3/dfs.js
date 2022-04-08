const { parse } = require('../parser.js')
const createEQL = require('../xql-eql-v3/create')
// var heapdump = require('heapdump');

/* Helper function that allocates a new node with the
given data and null left and right pointers. */
function postorder (head, transformer) {
  let temp = head

  while ((temp != null && !temp.visited)) {
    // Visited left subtree
    if (temp.left != null && !temp.left.visited) {
      temp = temp.left
    }
    // Visited right subtree
    else if (temp.right != null && !temp.right.visited) {
      temp = temp.right
    }
    // Print node
    else {
      if (transformer) {
        transformer(temp.data)
      }

      if (temp.left && temp.right && temp.left.parsed && temp.right.parsed && (temp.data.val === 'multi' || temp.data.key === 'multi')) {
        temp.parsed = createEQL(temp.left.parsed, temp.right.parsed, temp.data.opt, temp.data.span || null)
      }

      if (temp.left && temp.right && !temp.left.parsed && temp.right.parsed && (temp.data.val === 'multi' || temp.data.key === 'multi')) {
        temp.parsed = createEQL(temp.left.data, temp.right.parsed, temp.data.opt, temp.data.span || null)
      }

      if (temp.left && temp.right && temp.left.parsed && !temp.right.parsed && (temp.data.val === 'multi' || temp.data.key === 'multi')) {
        temp.parsed = createEQL(temp.left.parsed, temp.right.data, temp.data.opt, temp.data.span || null)
      }

      if (!temp.parsed && temp.left && temp.right && (temp.data.val === 'multi' || temp.data.key === 'multi')) {
        temp.parsed = createEQL(temp.left.data, temp.right.data, temp.data.opt, temp.data.span || null)
      }

      if (!temp.parsed && !temp.left && temp.right && temp.data.key !== 'multi' && temp.data.opt !== 'multi') {
        temp.parsed = createEQL({}, temp.right.data, temp.data.opt, temp.data.span || null)
      }

      if (head.data.val === temp.data.val && !temp.parsed && !temp.left && !temp.right && temp.data.val !== 'multi' && temp.data.key !== 'multi') {
        temp.parsed = createEQL(temp.data, {}, 'AND', null)
      }

      // clear redundant data
      if (temp.left && temp.left.parsed) {
        temp.left.parsed = null
      }

      if (temp.right && temp.right.parsed) {
        temp.right.parsed = null
      }

      temp.visited = true
      temp = head
    }
  }

  return head.parsed
}

// const q = '(text:(((emf*) OR (nod*)) AND ((track*) OR (body*))))'

// console.time('time')
// require('fs').writeFileSync('output.json', JSON.stringify(postorder(parse(q, false, { children: false })), null, 2))
// console.timeEnd('time')

// heapdump.writeSnapshot(function (err, filename) {
//     console.log('dump written to', filename);
// });

module.exports = function (q, transformer) {
  return postorder(parse(q, false, { children: false }), transformer)
}
