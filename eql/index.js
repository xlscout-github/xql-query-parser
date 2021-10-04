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

  switch (operator) {
    case "AND":
      return {
        bool: shouldCombine(tree, () => ({
          must: [_main(left), _main(right)],
        })),
      };
    case "OR":
      return {
        bool: shouldCombine(tree, () => ({
          should: [_main(left), _main(right)],
        })),
      };
    case "NOT":
      return {
        bool: shouldCombine(tree, () => ({
          must: [_main(left)],
          must_not: [_main(right)],
        })),
      };
    case "NEAR":
      if (isMulti(tree)) {
        throw Error(`${operator} Operator must be scoped to the same field.`);
      }

      return {
        bool: {
          must: [buildNear([makeClause(left), makeClause(right)], slop)],
        },
      };
    case "PRE":
      if (isMulti(tree)) {
        throw Error(`${operator} Operator must be scoped to the same field.`);
      }

      return {
        bool: {
          must: [buildPre([makeClause(left), makeClause(right)], slop)],
        },
      };
  }
}

function buildProximity(clauses, slop, in_order) {
  return {
    span_near: {
      clauses,
      slop,
      in_order,
    },
  };
}

function buildNear(clauses, slop) {
  return buildProximity(clauses, slop, false);
}

function buildPre(clauses, slop) {
  return buildProximity(clauses, slop, true);
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
    if (isPhrase(value)) {
      return makePhrase(field, trimPhrase(value));
    }

    if (containsWildcard(value)) {
      return makeSpanMulti(field, value);
    }

    return makeSpanTerm(field, value);
  }

  switch (operator) {
    case "NEAR":
      return buildNear([makeClause(left), makeClause(right)], slop);
    case "PRE":
      return buildPre([makeClause(left), makeClause(right)], slop);
    case "OR":
      return {
        span_or: {
          clauses: [makeClause(left), makeClause(right)],
        },
      };
    default:
      throw Error(`Operator ${operator} Not Allowed!`);
  }
}

function makePhrase(field, value) {
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

    return buildPre(clauses, 0);
  }

  if (containsWildcard(value)) {
    return makeSpanMulti(field, value);
  }

  return makeSpanTerm(field, value);
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
  }

  return value;
}

module.exports = main;
