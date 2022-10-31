const Queue = require('./utils/Queue')
const createEQL = require('./xql-eql-v3/create')

const DATE_TYPE = 'DATE'

// getSingularField func determines if a tree is composed of the same field and,
// if so, returns that field.
function getSingularField (tree) {
  let field = null

  const queue = new Queue()
  queue.enqueue(tree)

  while (!queue.isEmpty()) {
    tree = queue.dequeue()

    if (tree.leftOperand == null && tree.rightOperand == null) {
      if (!field) {
        field = tree.field
        continue
      }

      if (field !== tree.field) {
        field = null
        break
      }
    }

    if (tree.leftOperand != null) {
      queue.enqueue(tree.leftOperand)
    }

    if (tree.rightOperand != null) {
      queue.enqueue(tree.rightOperand)
    }
  }

  return field
}

// function transform (tree, opt = { children: true }) {
//   if (tree.leftOperand && tree.rightOperand) {
//     const res = {}

//     const key = getSingularField(tree)

//     if (key) {
//       res.key = key
//       res.val = 'multi'
//     } else {
//       res.key = 'multi'
//     }

//     if (tree.span) {
//       res.span = tree.span
//     }

//     res.opt = tree.operator

//     if (opt.children) {
//       res.child = [
//         transform(tree.leftOperand, opt),
//         transform(tree.rightOperand, opt)
//       ]

//       return res
//     }

//     res.left = transform(tree.leftOperand, opt)
//     res.right = transform(tree.rightOperand, opt)

//     const { left, right, ...data } = res

//     return { left, right, data }
//   }

//   if (tree.rightOperand) {
//     const res = {}

//     const key = getSingularField(tree)

//     if (key) {
//       res.key = key
//       res.val = 'multi'
//     } else {
//       res.key = 'multi'
//     }

//     res.opt = tree.operator

//     if (opt.children) {
//       res.child = [null, transform(tree.rightOperand, opt)]

//       return res
//     }

//     res.left = null
//     res.right = transform(tree.rightOperand, opt)

//     const { left, right, ...data } = res

//     return { left, right, data }
//   }

//   if (tree.type === 'DATE') {
//     if (opt.children) {
//       return { key: tree.field, val: { from: tree.from, to: tree.to } }
//     }

//     return {
//       data: { key: tree.field, val: { from: tree.from, to: tree.to } },
//       left: null,
//       right: null
//     }
//   }

//   if (opt.children) {
//     return { key: tree.field, val: tree.value }
//   }

//   return {
//     data: { key: tree.field, val: tree.value },
//     left: null,
//     right: null
//   }
// }

// transformCondense func produces a condenced output where the value is grouped together
// with the corresponding field.
function transformCondense (tree) {
  // both operands exists.
  if (tree.leftOperand && tree.rightOperand) {
    const res = {
      field: '',
      keyword: '',
      operator: '',
      children: []
    }

    const key = getSingularField(tree)

    // if same field combine nested nodes together, otherwise add both nodes
    // as seperate entity.
    if (key) {
      res.field = key

      // if circular brackets is provided at the time of query creation add it.
      res.keyword = `${tree.explicit ? '(' : ''}${transformCondense(tree.leftOperand).keyword} ${
          tree.operator
        }${tree.span || ''} ${transformCondense(tree.rightOperand).keyword}${tree.explicit ? ')' : ''}`
    } else {
      res.operator = tree.operator
      res.children = [
        transformCondense(tree.leftOperand),
        transformCondense(tree.rightOperand)
      ]
    }

    return res
  }

  // right handside exists but left does not: independent NOT
  if (tree.rightOperand) {
    const res = {
      field: '',
      keyword: '',
      operator: '',
      children: []
    }

    const key = getSingularField(tree)

    if (key) {
      res.field = key
      res.keyword = `${tree.explicit ? '(' : ''}${tree.operator} ${
          transformCondense(tree.rightOperand).keyword
        }${tree.explicit ? ')' : ''}`
    } else {
      res.operator = tree.operator
      // set 1st element as null in case of independent NOT.
      res.children = [null, transformCondense(tree.rightOperand)]
    }

    return res
  }

  // leaf node of date type.
  if (tree.type === 'DATE') {
    return {
      field: tree.field,
      keyword: `${tree.explicit ? '(' : ''}from${tree.from} to${tree.to}${tree.explicit ? '(' : ''}`,
      operator: '',
      children: []
    }
  }

  // leaf node of string type.
  return {
    field: tree.field,
    keyword: `${tree.explicit ? '(' : ''}${tree.value}${tree.explicit ? '(' : ''}`,
    operator: '',
    children: []
  }
}

// _transform func combines left and right operands provided into a single structure
// as pre data format provided identified by children property.
function _transform (
  left,
  right,
  operator,
  opt = { children: true },
  props = {}
) {
  if (opt.children) {
    const output = {
      ...props,
      opt: operator,
      child: []
    }

    // left node is null: independent NOT
    if (left == null) {
      output.child.push(null)

      // right is a non-leaf node.
      if (right.child) {
        output.child.push(right)

        // if right node's value potion does not exist, it means that inner nodes belong to
        // different keys.
        if (!right.val) {
          output.key = 'multi'
        } else {
          output.key = right.key
          output.val = 'multi'
        }
      } else {
        // right is a leaf node.
        if (right.type === DATE_TYPE) {
          output.child.push({
            key: right.field,
            val: { from: right.from, to: right.to }
          })
        } else {
          output.child.push({ key: right.field, val: right.value })
        }

        output.key = right.field
        output.val = 'multi'
      }
    } else if (left.child && right.child) {
      output.child.push(left)
      output.child.push(right)

      // if either nodes consists different keys within or
      // their keys does not match with one another.
      if (!left.val || !right.val || left.key !== right.key) {
        output.key = 'multi'
      } else {
        output.key = left.key
        output.val = 'multi'
      }
    } else if (left.child) {
      // right is a leaf node.
      output.child.push(left)

      if (right.type === DATE_TYPE) {
        output.child.push({
          key: right.field,
          val: { from: right.from, to: right.to }
        })
      } else {
        output.child.push({ key: right.field, val: right.value })
      }

      // if left node has different keys within or keys does not match between both nodes.
      if (!left.val || right.field !== left.key) {
        output.key = 'multi'
      } else {
        output.key = right.field
        output.val = 'multi'
      }
    } else if (right.child) {
      // left is a leaf node.
      if (left.type === DATE_TYPE) {
        output.child.push({
          key: left.field,
          val: { from: left.from, to: left.to }
        })
      } else {
        output.child.push({ key: left.field, val: left.value })
      }

      output.child.push(right)

      // if right node has different keys within or keys does not match between both nodes.
      if (!right.val || left.field !== right.key) {
        output.key = 'multi'
      } else {
        output.key = left.field
        output.val = 'multi'
      }
    } else {
      // both nodes are leaf nodes.
      if (left.type === DATE_TYPE) {
        output.child.push({
          key: left.field,
          val: { from: left.from, to: left.to }
        })
      } else {
        output.child.push({ key: left.field, val: left.value })
      }

      if (right.type === DATE_TYPE) {
        output.child.push({
          key: right.field,
          val: { from: right.from, to: right.to }
        })
      } else {
        output.child.push({ key: right.field, val: right.value })
      }

      // if both nodes belong to the same field set value portion as multi,
      // otherwise set key as multi.
      if (left.field === right.field) {
        output.key = left.field
        output.val = 'multi'
      } else {
        output.key = 'multi'
      }
    }

    return output
  }

  const output = {
    data: { ...props, opt: operator }
  }

  if (left == null) {
    output.left = null

    if (right.data) {
      output.right = right

      if (!right.data.val) {
        output.data.key = 'multi'
      } else {
        output.data.key = right.data.key
        output.data.val = 'multi'
      }
    } else {
      if (right.type === DATE_TYPE) {
        output.right = {
          data: { key: right.field, val: { from: right.from, to: right.to } },
          left: null,
          right: null
        }
      } else {
        output.right = {
          data: { key: right.field, val: right.value },
          left: null,
          right: null
        }
      }

      output.data.key = right.field
      output.data.val = 'multi'
    }
  } else if (left.data && right.data) {
    output.left = left
    output.right = right

    if (!left.data.val || !right.data.val || left.data.key !== right.data.key) {
      output.data.key = 'multi'
    } else {
      output.data.key = left.data.key
      output.data.val = 'multi'
    }
  } else if (left.data) {
    output.left = left

    if (right.type === DATE_TYPE) {
      output.right = {
        data: { key: right.field, val: { from: right.from, to: right.to } },
        left: null,
        right: null
      }
    } else {
      output.right = {
        data: { key: right.field, val: right.value },
        left: null,
        right: null
      }
    }

    if (!left.data.val || right.field !== left.data.key) {
      output.data.key = 'multi'
    } else {
      output.data.key = right.field
      output.data.val = 'multi'
    }
  } else if (right.data) {
    output.right = right

    if (left.type === DATE_TYPE) {
      output.left = {
        data: { key: left.field, val: { from: left.from, to: left.to } },
        left: null,
        right: null
      }
    } else {
      output.left = {
        data: { key: left.field, val: left.value },
        left: null,
        right: null
      }
    }

    if (!right.data.val || left.field !== right.data.key) {
      output.data.key = 'multi'
    } else {
      output.data.key = left.field
      output.data.val = 'multi'
    }
  } else {
    if (left.type === DATE_TYPE) {
      output.left = {
        data: { key: left.field, val: { from: left.from, to: left.to } },
        left: null,
        right: null
      }
    } else {
      output.left = {
        data: { key: left.field, val: left.value },
        left: null,
        right: null
      }
    }

    if (right.type === DATE_TYPE) {
      output.right = {
        data: { key: right.field, val: { from: right.from, to: right.to } },
        left: null,
        right: null
      }
    } else {
      output.right = {
        data: { key: right.field, val: right.value },
        left: null,
        right: null
      }
    }

    if (left.field === right.field) {
      output.data.key = left.field
      output.data.val = 'multi'
    } else {
      output.data.key = 'multi'
    }
  }

  return output
}

function transform (root, opt = { children: true, eql: false, transformFn: null }) {
  if (root.leftOperand == null && root.rightOperand == null) {
    if (opt.eql) {
      let node

      if (root.type === DATE_TYPE) {
        node = { key: root.field, val: { from: root.from, to: root.to } }
      } else {
        node = { key: root.field, val: root.value }
      }

      if (opt.transformFn) opt.transformFn(node)

      return createEQL(node, {}, 'AND')
    }

    if (opt.children) {
      if (root.type === DATE_TYPE) {
        return { key: root.field, val: { from: root.from, to: root.to } }
      }

      return { key: root.field, val: root.value }
    }

    if (root.type === DATE_TYPE) {
      return { data: { key: root.field, val: { from: root.from, to: root.to } }, left: null, right: null }
    }

    return { data: { key: root.field, val: root.value }, left: null, right: null }
  }

  const dummyNode = { leftOperand: root, rightOperand: null }
  let current = dummyNode
  let parent = null
  let middle = null
  let auxiliary = null
  let back = null
  let fin = null

  while (current != null) {
    if (current.leftOperand == null) {
      current = current.rightOperand
    } else {
      auxiliary = current.leftOperand

      while (auxiliary.rightOperand != null && auxiliary.rightOperand != current) {
        auxiliary = auxiliary.rightOperand
      }

      if (auxiliary.rightOperand != current) {
        auxiliary.rightOperand = current
        current = current.leftOperand
      } else {
        parent = current
        middle = current.leftOperand

        while (middle != current) {
          back = middle.rightOperand
          middle.rightOperand = parent
          parent = middle
          middle = back
        }

        parent = current
        middle = auxiliary

        while (middle != current) {
          middle.rightOperand.parsed = middle.rightOperand.parsed || []

          if (middle.leftOperand === null) {
            if (opt.eql) {
              fin = createEQL({}, middle.parsed[0], middle.operator)
            } else {
              fin = _transform(
                null,
                middle.parsed[0],
                middle.operator,
                opt
              )
            }

            middle.rightOperand.parsed.push(fin)

            delete middle.parsed
          } else if (middle.leftOperand == null) {
            if (opt.eql) {
              let node

              if (middle.type === DATE_TYPE) {
                node = { key: middle.field, val: { from: middle.from, to: middle.to } }
              } else {
                node = { key: middle.field, val: middle.value }
              }

              if (opt.transformFn) opt.transformFn(node)

              middle.rightOperand.parsed.push(node)
            } else {
              if (opt.children) {
                if (middle.type === DATE_TYPE) {
                  middle.rightOperand.parsed.push({ field: middle.field, value: { from: middle.from, to: middle.to } })
                } else {
                  middle.rightOperand.parsed.push({ field: middle.field, value: middle.value })
                }
              } else {
                if (middle.type === DATE_TYPE) {
                  middle.rightOperand.parsed.push({ data: { key: middle.field, val: { from: middle.from, to: middle.to } }, left: null, right: null })
                } else {
                  middle.rightOperand.parsed.push({ data: { key: middle.field, val: middle.value }, left: null, right: null })
                }
              }
            }
          } else {
            if (opt.eql) {
              fin = createEQL(middle.parsed[0], middle.parsed[1], middle.operator, middle.span)
            } else {
              fin = _transform(
                middle.parsed[0],
                middle.parsed[1],
                middle.operator,
                opt,
                middle.span && { span: middle.span }
              )
            }

            middle.rightOperand.parsed.push(fin)

            delete middle.parsed
          }

          back = middle.rightOperand
          middle.rightOperand = parent
          parent = middle
          middle = back
        }

        delete auxiliary.rightOperand
        current = current.rightOperand
      }
    }
  }

  return fin
}

// function transform (root, opt = { children: true }) {
//   let node = root

//   if (node.leftOperand == null && node.rightOperand == null) {
//     if (opt.children) {
//       if (node.type === DATE_TYPE) {
//         return { key: node.field, val: { from: node.from, to: node.to } }
//       } else {
//         return { key: node.field, val: node.value }
//       }
//     } else {
//       if (node.type === DATE_TYPE) {
//         return { data: { key: node.field, val: { from: node.from, to: node.to } }, left: null, right: null }
//       } else {
//         return { data: { key: node.field, val: node.value }, left: null, right: null }
//       }
//     }
//   }

//   while (node != null && !node.visited) {
//     if (node.leftOperand != null && !node.leftOperand.visited) {
//       node = node.leftOperand
//     } else if (node.rightOperand != null && !node.rightOperand.visited) {
//       node = node.rightOperand
//     } else {
//       if (node.leftOperand == null && node.rightOperand == null) {
//         if (opt.children) {
//           if (node.type === DATE_TYPE) {
//             node.parsed = { field: node.field, value: { from: node.from, to: node.to } }
//           } else {
//             node.parsed = { field: node.field, value: node.value }
//           }
//         } else {
//           if (node.type === DATE_TYPE) {
//             node.parsed = { data: { key: node.field, val: { from: node.from, to: node.to } }, left: null, right: null }
//           } else {
//             node.parsed = { data: { key: node.field, val: node.value }, left: null, right: null }
//           }
//         }
//       } else if (node.leftOperand == null) {
//         node.parsed = _transform(
//           null,
//           node.rightOperand.parsed,
//           node.operator,
//           opt
//         )

//         delete node.rightOperand
//       } else {
//         node.parsed = _transform(
//           node.leftOperand.parsed,
//           node.rightOperand.parsed,
//           node.operator,
//           opt,
//           node.span && { span: node.span }
//         )

//         delete node.leftOperand
//         delete node.rightOperand
//       }

//       node.visited = true
//       node = root
//     }
//   }

//   return root.parsed
// }

module.exports = {
  transform,
  transformCondense
}
