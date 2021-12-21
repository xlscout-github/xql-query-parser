const Queue = require("./util/Queue");

const NOT = "NOT";

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

function filterNullOperand(tree) {
  if (tree.leftOperand === null && tree.rightOperand === null) {
    return null;
  } else if (tree.leftOperand === null && tree.rightOperand) {
    if (tree.operator === NOT) {
      // hold on to null
      return { ...tree, rightOperand: filterNullOperand(tree.rightOperand) };
    } else {
      return filterNullOperand(tree.rightOperand);
    }
  } else if (tree.rightOperand === null && tree.leftOperand) {
    return filterNullOperand(tree.leftOperand);
  } else if (tree.leftOperand && tree.rightOperand) {
    tree.leftOperand = filterNullOperand(tree.leftOperand);
    tree.rightOperand = filterNullOperand(tree.rightOperand);

    if (tree.leftOperand === null && tree.rightOperand) {
      return tree.rightOperand;
    } else if (tree.rightOperand === null && tree.leftOperand) {
      return tree.leftOperand;
    } else if (tree.leftOperand === null && tree.rightOperand === null) {
      return null;
    }
  }

  return tree;
}

function _transform(tree) {
  if (!tree) throw new Error("Empty grouping expressions");

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
    res.child = [_transform(tree.leftOperand), _transform(tree.rightOperand)];

    return res;
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
    res.child = [null, _transform(tree.rightOperand)];

    return res;
  }

  if (tree.type === "DATE") {
    return { key: tree.field, val: { from: tree.from, to: tree.to } };
  }

  return { key: tree.field, val: tree.value };
}

function transform(tree) {
  return _transform(filterNullOperand(tree));
}

function _transform_condense(tree) {
  if (!tree) throw new Error("Empty grouping expressions");

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
        res.keyword = `(${_transform_condense(tree.leftOperand).keyword} ${
          tree.operator
        }${tree.span || ""} ${_transform_condense(tree.rightOperand).keyword})`;
      } else {
        res.keyword = `${_transform_condense(tree.leftOperand).keyword} ${
          tree.operator
        }${tree.span || ""} ${_transform_condense(tree.rightOperand).keyword}`;
      }
    } else {
      res.operator = tree.operator;
      res.children = [
        _transform_condense(tree.leftOperand),
        _transform_condense(tree.rightOperand),
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
        res.keyword = `(${tree.operator} ${
          _transform_condense(tree.rightOperand).keyword
        })`;
      } else {
        res.keyword = `${tree.operator} ${
          _transform_condense(tree.rightOperand).keyword
        }`;
      }
    } else {
      res.operator = tree.operator;
      res.children = [null, _transform_condense(tree.rightOperand)];
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

function transform_condense(tree) {
  return _transform_condense(filterNullOperand(tree));
}

module.exports = {
  transform,
  transform_condense,
};
