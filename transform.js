const Queue = require('./util/Queue')

const DATE_TYPE = 'DATE'

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

function transform_condense (tree) {
  if (tree.leftOperand && tree.rightOperand) {
    const res = {
      field: '',
      keyword: '',
      operator: '',
      children: []
    }

    const key = getSingularField(tree)

    if (key) {
      res.field = key
      if (tree.explicit) {
        res.keyword = `(${transform_condense(tree.leftOperand).keyword} ${
          tree.operator
        }${tree.span || ''} ${transform_condense(tree.rightOperand).keyword})`
      } else {
        res.keyword = `${transform_condense(tree.leftOperand).keyword} ${
          tree.operator
        }${tree.span || ''} ${transform_condense(tree.rightOperand).keyword}`
      }
    } else {
      res.operator = tree.operator
      res.children = [
        transform_condense(tree.leftOperand),
        transform_condense(tree.rightOperand)
      ]
    }

    return res
  }

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
      if (tree.explicit) {
        res.keyword = `(${tree.operator} ${
          transform_condense(tree.rightOperand).keyword
        })`
      } else {
        res.keyword = `${tree.operator} ${
          transform_condense(tree.rightOperand).keyword
        }`
      }
    } else {
      res.operator = tree.operator
      res.children = [null, transform_condense(tree.rightOperand)]
    }

    return res
  }

  if (tree.type === 'DATE') {
    if (tree.explicit) {
      return {
        field: tree.field,
        keyword: `(from${tree.from} to${tree.to})`,
        operator: '',
        children: []
      }
    } else {
      return {
        field: tree.field,
        keyword: `from${tree.from} to${tree.to}`,
        operator: '',
        children: []
      }
    }
  }

  if (tree.explicit) {
    return {
      field: tree.field,
      keyword: `(${tree.value})`,
      operator: '',
      children: []
    }
  } else {
    return {
      field: tree.field,
      keyword: tree.value,
      operator: '',
      children: []
    }
  }
}

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

    if (left == null) {
      output.child.push(null)

      if (right.child) {
        output.child.push(right)

        if (!right.val) {
          output.key = 'multi'
        } else {
          output.key = right.key
          output.val = 'multi'
        }
      } else {
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

      if (!left.val || !right.val || left.key !== right.key) {
        output.key = 'multi'
      } else {
        output.key = left.key
        output.val = 'multi'
      }
    } else if (left.child) {
      output.child.push(left)

      if (right.type === DATE_TYPE) {
        output.child.push({
          key: right.field,
          val: { from: right.from, to: right.to }
        })
      } else {
        output.child.push({ key: right.field, val: right.value })
      }

      if (!left.val || right.field !== left.key) {
        output.key = 'multi'
      } else {
        output.key = right.field
        output.val = 'multi'
      }
    } else if (right.child) {
      if (left.type === DATE_TYPE) {
        output.child.push({
          key: left.field,
          val: { from: left.from, to: left.to }
        })
      } else {
        output.child.push({ key: left.field, val: left.value })
      }

      output.child.push(right)

      if (!right.val || left.field !== right.key) {
        output.key = 'multi'
      } else {
        output.key = left.field
        output.val = 'multi'
      }
    } else {
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

function transform (root, opt = { children: true }) {
  let node = root

  if (node.leftOperand == null && node.rightOperand == null) {
    if (opt.children) {
      if (node.type === DATE_TYPE) {
        return { key: node.field, val: { from: node.from, to: node.to } }
      } else {
        return { key: node.field, val: node.value }
      }
    } else {
      if (node.type === DATE_TYPE) {
        return { data: { key: node.field, val: { from: node.from, to: node.to } }, left: null, right: null }
      } else {
        return { data: { key: node.field, val: node.value }, left: null, right: null }
      }
    }
  }

  while (node != null && !node.visited) {
    if (node.leftOperand != null && !node.leftOperand.visited) {
      node = node.leftOperand
    } else if (node.rightOperand != null && !node.rightOperand.visited) {
      node = node.rightOperand
    } else {
      if (node.leftOperand == null && node.rightOperand == null) {
        if (opt.children) {
          if (node.type === DATE_TYPE) {
            node.parsed = { field: node.field, value: { from: node.from, to: node.to } }
          } else {
            node.parsed = { field: node.field, value: node.value }
          }
        } else {
          if (node.type === DATE_TYPE) {
            node.parsed = { data: { key: node.field, val: { from: node.from, to: node.to } }, left: null, right: null }
          } else {
            node.parsed = { data: { key: node.field, val: node.value }, left: null, right: null }
          }
        }
      } else if (node.leftOperand == null) {
        node.parsed = _transform(
          node.leftOperand,
          node.rightOperand.parsed,
          node.operator,
          opt
        )

        delete node.rightOperand
      } else {
        node.parsed = _transform(
          node.leftOperand.parsed,
          node.rightOperand.parsed,
          node.operator,
          opt,
          node.span && { span: node.span }
        )

        delete node.leftOperand
        delete node.rightOperand
      }

      node.visited = true
      node = root
    }
  }

  return root.parsed
}

module.exports = {
  transform,
  transform_condense
}
