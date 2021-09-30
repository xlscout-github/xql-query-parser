const { parse } = require("../parser");

const DEFAULT_OPERATOR = "AND";
const ANALYZE_WILDCARD = true;
const COMBINABLE_OPERATORS = ["AND", "OR", "NOT"];
const REWRITE = "top_terms_4092";

function main(q) {
  const tree = parse(q);

  const { child: [left, right] = [] } = tree;

  if (left == null && right == null) {
    return { bool: { must: [_main(tree)] } };
  }

  return _main(tree);
}

function _main(tree) {
  const {
    key: field,
    val: value,
    opt: operator,
    span,
    child: [left, right] = [],
  } = tree;

  const slop = adjustSlop(span);

  if (left == null && right == null) {
    if (typeof value === "string") {
      const query = `(${field}:(${value}))`;
      return {
        query_string: {
          query,
          default_operator: DEFAULT_OPERATOR,
          analyze_wildcard: ANALYZE_WILDCARD,
        },
      };
    } else {
      const { from, to } = value;
      let range = { [field]: {} };
      if (from !== "*") {
        range[field] = { gte: from };
      }
      if (to !== "*") {
        range[field] = { ...range[field], lte: to };
      }
      return {
        range,
      };
    }
  }

  let bool = {};

  switch (operator) {
    case "AND":
      bool = shouldCombine(tree, () => ({
        must: [_main(left), _main(right)],
      }));
      break;
    case "OR":
      bool = shouldCombine(tree, () => ({
        should: [_main(left), _main(right)],
      }));
      break;
    case "NOT":
      bool = shouldCombine(tree, () => ({
        must: [_main(left)],
        must_not: [_main(right)],
      }));
      break;
    case "NEAR":
      if (isMulti(tree)) {
        throw Error(`${operator} Operator must be scoped to the same field.`);
      }

      bool = {
        must: [
          {
            span_near: {
              clauses: [makeClause(left), makeClause(right)],
              slop,
              in_order: "false",
            },
          },
        ],
      };
      break;
    case "PRE":
      if (isMulti(tree)) {
        throw Error(`${operator} Operator must be scoped to the same field.`);
      }

      bool = {
        must: [
          {
            span_near: {
              clauses: [makeClause(left), makeClause(right)],
              slop,
              in_order: "true",
            },
          },
        ],
      };
      break;
  }

  return { bool };
}

function adjustSlop(span) {
  switch (span) {
    case "S":
      return "15";
    case "P":
      return "50";
    default:
      return span;
  }
}

function makeClause(tree) {
  const {
    key: field,
    val: value,
    opt: operator,
    span,
    child: [left, right] = [],
  } = tree;

  const slop = adjustSlop(span);

  if (left == null && right == null) {
    if (value.includes("*") || value.includes("?")) {
      return {
        span_multi: {
          match: {
            wildcard: {
              [field]: {
                value,
                rewrite: REWRITE,
              },
            },
          },
        },
      };
    }

    const term = value.toLowerCase();

    return { span_term: { [field]: term } };
  }

  let clause = {};

  switch (operator) {
    case "NEAR":
      clause = {
        span_near: {
          clauses: [makeClause(left), makeClause(right)],
          slop,
          in_order: "false",
        },
      };
      break;
    case "PRE":
      clause = {
        span_near: {
          clauses: [makeClause(left), makeClause(right)],
          slop,
          in_order: "true",
        },
      };
      break;
    case "OR":
      clause = {
        span_or: {
          clauses: [makeClause(left), makeClause(right)],
        },
      };
      break;
    default:
      throw Error(`Operator ${operator} Not Allowed!`);
  }

  return clause;
}

function shouldCombine(tree, fallback) {
  const { key: field } = tree;

  if (!isMulti(tree) && isCombinableTree(tree)) {
    return {
      must: [
        {
          query_string: {
            query: `(${field}:${combine(tree)})`,
            default_operator: DEFAULT_OPERATOR,
            analyze_wildcard: ANALYZE_WILDCARD,
          },
        },
      ],
    };
  }

  return fallback();
}

function isMulti(tree) {
  // left, right must exist
  const { val: value } = tree;

  return !value;
}

function isCombinableTree(tree) {
  const { opt: operator, val: value, child: [left, right] = [] } = tree;

  if (left != null && right != null) {
    if (COMBINABLE_OPERATORS.includes(operator)) {
      return isCombinableTree(left) && isCombinableTree(right);
    } else {
      return false;
    }
  }

  return typeof value === "string";
}

function combine(tree) {
  const { val: value, opt: operator, child: [left, right] = [] } = tree;

  if (left != null && right != null) {
    return `(${combine(left)} ${operator} ${combine(right)})`;
  } else {
    return value;
  }
}

module.exports = main;
