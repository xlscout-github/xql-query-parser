function findField(lObj) {
  if (lObj.leftOperand) {
    return findField(lObj.leftOperand);
  }

  return lObj.field;
}

function transform(lrObj) {
  if (lrObj.leftOperand && lrObj.rightOperand) {
    const res = {};

    const leftField = findField(lrObj.leftOperand);
    const rightField = findField(lrObj.rightOperand);

    if (leftField === rightField) {
      res["key"] = leftField;
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
    return { key: lrObj.field, from: lrObj.from, to: lrObj.to };
  }

  return { key: lrObj.field, val: lrObj.value };
}

module.exports = transform;
