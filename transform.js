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

function filterNullOperand(lrObj) {
  if (lrObj.leftOperand === null && lrObj.rightOperand === null) {
    return null;
  } else if (lrObj.leftOperand === null && lrObj.rightOperand) {
    return filterNullOperand(lrObj.rightOperand);
  } else if (lrObj.rightOperand === null && lrObj.leftOperand) {
    return filterNullOperand(lrObj.leftOperand);
  } else if (lrObj.leftOperand && lrObj.rightOperand) {
    lrObj.leftOperand = filterNullOperand(lrObj.leftOperand);
    lrObj.rightOperand = filterNullOperand(lrObj.rightOperand);

    if (lrObj.leftOperand === null && lrObj.rightOperand) {
      return lrObj.rightOperand;
    } else if (lrObj.rightOperand === null && lrObj.leftOperand) {
      return lrObj.leftOperand;
    } else if (lrObj.leftOperand === null && lrObj.rightOperand === null) {
      return null;
    }
  }

  return lrObj;
}

function _transform(lrObj) {
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
      _transform(lrObj.leftOperand),
      _transform(lrObj.rightOperand),
    ];

    return res;
  }

  if (lrObj.type === "DATE") {
    return { key: lrObj.field, val: { from: lrObj.from, to: lrObj.to } };
  }

  return { key: lrObj.field, val: lrObj.value };
}

function transform(lrObj) {
  const filtered = filterNullOperand(lrObj);
  if (filtered === null) throw new Error("Empty grouping expressions");
  return _transform(filtered);
}

function _transform_condense(lrObj) {
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
        res.keyword = `(${_transform_condense(lrObj.leftOperand).keyword} ${
          lrObj.operator
        }${lrObj.span || ""} ${
          _transform_condense(lrObj.rightOperand).keyword
        })`;
      } else {
        res.keyword = `${_transform_condense(lrObj.leftOperand).keyword} ${
          lrObj.operator
        }${lrObj.span || ""} ${
          _transform_condense(lrObj.rightOperand).keyword
        }`;
      }
    } else {
      res.operator = lrObj.operator;
      res.children = [
        _transform_condense(lrObj.leftOperand),
        _transform_condense(lrObj.rightOperand),
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

function transform_condense(lrObj) {
  const filtered = filterNullOperand(lrObj);
  if (filtered === null) throw new Error("Empty grouping expressions");
  return _transform_condense(filtered);
}

module.exports = {
  transform,
  transform_condense,
};
