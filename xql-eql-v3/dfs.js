const { parse } = require("../parser.js");
const createEQL = require("../xql-eql-v3/create")
// var heapdump = require('heapdump');


/* Helper function that allocates a new node with the
given data and null left and right pointers. */
function postorder(head) {
    var temp = head;

    let left = null;

    while ((temp != null && !temp.visited)) {
        // Visited left subtree
        if (temp.left != null && !temp.left.visited) {
            temp = temp.left;
        }
        // Visited right subtree
        else if (temp.right != null && !temp.right.visited) {
            temp = temp.right;
        }
        // Print node
        else {
            if (temp.left && temp.right && (temp.data.val === 'multi' || temp.data.key === 'multi')) {
                if (left) {
                    if (temp.left.data.val !== 'multi') {
                        left = createEQL(left, temp.left.data, temp.data.opt, temp.data.span || null)
                    }

                    if (temp.right.data.val !== 'multi') {
                        left = createEQL(left, temp.right.data, temp.data.opt, temp.data.span || null)
                    }
                } else {
                    left = createEQL(left || temp.left.data, temp.right.data, temp.data.opt, temp.data.span || null)
                }
            }

            temp.visited = true;
            temp = head;
        }
    }

    return left
}

const q = '(text:(((emf*) OR (nod*)) AND ((track*) OR (body*))))' // incorrect query

console.time('time')
require('fs').writeFileSync('output.json', JSON.stringify(postorder(parse(q, false, { children: false })), null, 2))
console.timeEnd('time')


// heapdump.writeSnapshot(function (err, filename) {
//     console.log('dump written to', filename);
// });