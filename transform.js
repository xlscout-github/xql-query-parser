function findLeftField(lObj) {
  if (lObj.leftOperand) {
    return findLeftField(lObj.leftOperand);
  }

  return lObj.field;
}

function findRightField(lObj) {
  if (lObj.rightOperand) {
    return findRightField(lObj.rightOperand);
  }

  return lObj.field;
}

function transform(lrObj) {
  if (lrObj.leftOperand && lrObj.rightOperand) {
    const res = {};

    const LL = findLeftField(lrObj.leftOperand);
    const LR = findLeftField(lrObj.rightOperand);

    const RL = findRightField(lrObj.leftOperand);
    const RR = findRightField(lrObj.rightOperand);

    if (LL === LR && LR === RL && RL === RR) {
      res["key"] = LL;
      res["val"] = "multi";
    } else {
      res["key"] = "multi";
    }

    if (lrObj.span) {
      res["span"] = lrObj.span;
    }

    res["opt"] = lrObj.operator;
    res["child"] = [
      transform(lrObj.leftOperand),
      transform(lrObj.rightOperand),
    ];

    return res;
  }

  if (lrObj.type === "DATE") {
    return { key: lrObj.field, val: { from: lrObj.from, to: lrObj.to } };
  }

  return { key: lrObj.field, val: lrObj.value };
}

function transform_condense(lrObj) {
  if (lrObj.leftOperand && lrObj.rightOperand) {
    const res = {
      field: "",
      keyword: "",
      operator: "",
      children: [],
    };

    const LL = findLeftField(lrObj.leftOperand);
    const LR = findLeftField(lrObj.rightOperand);

    const RL = findRightField(lrObj.leftOperand);
    const RR = findRightField(lrObj.rightOperand);

    if (LL === LR && LR === RL && RL === RR) {
      res.field = LL;
      if (lrObj.explicit) {
        res.keyword = `(${transform_condense(lrObj.leftOperand).keyword} ${
          lrObj.operator
        }${lrObj.span || ""} ${
          transform_condense(lrObj.rightOperand).keyword
        })`;
      } else {
        res.keyword = `${transform_condense(lrObj.leftOperand).keyword} ${
          lrObj.operator
        }${lrObj.span || ""} ${transform_condense(lrObj.rightOperand).keyword}`;
      }
    } else {
      res.operator = lrObj.operator;
      res.children = [
        transform_condense(lrObj.leftOperand),
        transform_condense(lrObj.rightOperand),
      ];
    }

    return res;
  }

  if (lrObj.type === "DATE") {
    if (lrObj.explicit) {
      return {
        field: lrObj.field,
        keyword: `(from${lrObj.from} to${lrObj.to})`,
        operator: "",
        children: [],
      };
    } else {
      return {
        field: lrObj.field,
        keyword: `from${lrObj.from} to${lrObj.to}`,
        operator: "",
        children: [],
      };
    }
  }

  if (lrObj.explicit) {
    return {
      field: lrObj.field,
      keyword: `(${lrObj.value})`,
      operator: "",
      children: [],
    };
  } else {
    return {
      field: lrObj.field,
      keyword: lrObj.value,
      operator: "",
      children: [],
    };
  }
}

module.exports = {
  transform,
  transform_condense,
};
