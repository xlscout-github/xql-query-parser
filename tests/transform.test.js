const transform = require("../transform");

test("should transform provided left-right object format to parent-child relationship format", () => {
  const lrObjData = {
    operator: "OR",
    leftOperand: { field: "desc", value: "DETECT*" },
    rightOperand: { field: "pn", value: "US7420295B2" },
  };

  expect(transform(lrObjData)).toEqual({
    key: "multi",
    opt: "OR",
    child: [
      { key: "desc", val: "DETECT*" },
      { key: "pn", val: "US7420295B2" },
    ],
  });
});

test("should transform left-right object containing date fields", () => {
  const lrObjData = {
    type: "DATE",
    from: "16990101",
    to: "20010316",
    field: "pd",
  };

  expect(transform(lrObjData)).toEqual({
    key: "pd",
    from: "16990101",
    to: "20010316",
  });
});

test("should establish value as multi if left side and right side have same fields", () => {
  const lrObjData = {
    operator: "NEAR5",
    leftOperand: { field: "desc", value: "DETECT*" },
    rightOperand: {
      operator: "NEAR6",
      leftOperand: { field: "desc", value: "CONNECT*" },
      rightOperand: { field: "desc", value: "SOURCE*" },
    },
  };

  expect(transform(lrObjData)).toEqual({
    key: "desc",
    val: "multi",
    opt: "NEAR5",
    child: [
      { key: "desc", val: "DETECT*" },
      {
        key: "desc",
        val: "multi",
        opt: "NEAR6",
        child: [
          { key: "desc", val: "CONNECT*" },
          { key: "desc", val: "SOURCE*" },
        ],
      },
    ],
  });
});