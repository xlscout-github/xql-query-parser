const Queue = require("./util/Queue");

function getSingularField(tree) {
  let field = null;

  const queue = new Queue();
  queue.enqueue(tree);

  while (!queue.isEmpty()) {
    tree = queue.dequeue();

    if (tree.leftOperand == null && tree.rightOperand == null) {
      if (!field) {
        field = tree.field;
        continue;
      }

      if (field !== tree.field) {
        field = null;
        break;
      }
    }

    if (tree.leftOperand != null) {
      queue.enqueue(tree.leftOperand);
    }

    if (tree.rightOperand != null) {
      queue.enqueue(tree.rightOperand);
    }
  }

  return field;
}

function transform(tree, opt = { children: true }) {
  if (tree.leftOperand && tree.rightOperand) {
    const res = {};

    const key = getSingularField(tree);

    if (key) {
      res.key = key;
      res.val = "multi";
    } else {
      res.key = "multi";
    }

    if (tree.span) {
      res.span = tree.span;
    }

    res.opt = tree.operator;

    if (opt.children) {
      res.child = [transform(tree.leftOperand, opt), transform(tree.rightOperand, opt)];

      return res;
    }

    res.left = transform(tree.leftOperand, opt);
    res.right = transform(tree.rightOperand, opt);

    const { left, right, ...data } = res
    return { left, right, data };
  }

  if (tree.rightOperand) {
    const res = {};

    const key = getSingularField(tree);

    if (key) {
      res.key = key;
      res.val = "multi";
    } else {
      res.key = "multi";
    }

    res.opt = tree.operator;

    if (opt.children) {
      res.child = [null, transform(tree.rightOperand, opt)];

      return res;
    }

    res.left = null;
    res.right = transform(tree.rightOperand, opt)

    const { left, right, ...data } = res
    return { left, right, data };
  }

  if (tree.type === "DATE") {
    if (opt.children) {
      return { key: tree.field, val: { from: tree.from, to: tree.to } };
    }

    return { data: { key: tree.field, val: { from: tree.from, to: tree.to } }, left: null, right: null };
  }

  if (opt.children) {
    return { key: tree.field, val: tree.value };
  }

  return { data: { key: tree.field, val: tree.value }, left: null, right: null };
}

function transform_condense(tree) {
  if (tree.leftOperand && tree.rightOperand) {
    const res = {
      field: "",
      keyword: "",
      operator: "",
      children: [],
    };

    const key = getSingularField(tree);

    if (key) {
      res.field = key;
      if (tree.explicit) {
        res.keyword = `(${transform_condense(tree.leftOperand).keyword} ${tree.operator
          }${tree.span || ""} ${transform_condense(tree.rightOperand).keyword})`;
      } else {
        res.keyword = `${transform_condense(tree.leftOperand).keyword} ${tree.operator
          }${tree.span || ""} ${transform_condense(tree.rightOperand).keyword}`;
      }
    } else {
      res.operator = tree.operator;
      res.children = [
        transform_condense(tree.leftOperand),
        transform_condense(tree.rightOperand),
      ];
    }

    return res;
  }

  if (tree.rightOperand) {
    const res = {
      field: "",
      keyword: "",
      operator: "",
      children: [],
    };

    const key = getSingularField(tree);

    if (key) {
      res.field = key;
      if (tree.explicit) {
        res.keyword = `(${tree.operator} ${transform_condense(tree.rightOperand).keyword
          })`;
      } else {
        res.keyword = `${tree.operator} ${transform_condense(tree.rightOperand).keyword
          }`;
      }
    } else {
      res.operator = tree.operator;
      res.children = [null, transform_condense(tree.rightOperand)];
    }

    return res;
  }

  if (tree.type === "DATE") {
    if (tree.explicit) {
      return {
        field: tree.field,
        keyword: `(from${tree.from} to${tree.to})`,
        operator: "",
        children: [],
      };
    } else {
      return {
        field: tree.field,
        keyword: `from${tree.from} to${tree.to}`,
        operator: "",
        children: [],
      };
    }
  }

  if (tree.explicit) {
    return {
      field: tree.field,
      keyword: `(${tree.value})`,
      operator: "",
      children: [],
    };
  } else {
    return {
      field: tree.field,
      keyword: tree.value,
      operator: "",
      children: [],
    };
  }
}

module.exports = {
  transform,
  transform_condense,
};
