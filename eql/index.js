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
    let clause = {};

    if (isPhrase(value)) {
      clause = makePhrase(field, trimPhrase(value));
    } else if (containsWildcard(value)) {
      clause = makeSpanMulti(field, value);
    } else {
      clause = makeSpanTerm(field, value);
    }

    return clause;
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

function makePhrase(field, value) {
  let clause = {};
  const terms = value.split(/ +/);

  if (terms.length > 1) {
    const clauses = terms.reduce((previousValue, currentValue) => {
      if (containsWildcard(currentValue)) {
        previousValue = [...previousValue, makeSpanMulti(field, currentValue)];
      } else {
        previousValue = [...previousValue, makeSpanTerm(field, currentValue)];
      }

      return previousValue;
    }, []);

    clause = {
      span_near: {
        clauses,
        slop: 0,
        in_order: "true",
      },
    };
  } else {
    if (containsWildcard(value)) {
      clause = makeSpanMulti(field, value);
    } else {
      clause = makeSpanTerm(field, value);
    }
  }

  return clause;
}

function isPhrase(value) {
  return (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  );
}

function trimPhrase(value) {
  return value.slice(1, -1).trim();
}

function containsWildcard(value) {
  return value.includes("*") || value.includes("?");
}

function makeSpanMulti(field, value) {
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

function makeSpanTerm(field, value) {
  const term = value.toLowerCase();

  return { span_term: { [field]: term } };
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
