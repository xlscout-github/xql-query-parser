const { parse } = require("../parser");

const COMBINE_CRITERION = "OR";

function main(q, substitute = {}) {
  const tree = parse(q);

  const { child: [left, right] = [] } = tree;

  if (left == null && right == null) {
    return { bool: { must: [_main(tree, substitute)] } };
  }

  return _main(tree, substitute);
}

function _main(tree, substitute) {
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
      if (isPhrase(value)) {
        const match_phrase = {
          [substitute[field] || field]: trimPhrase(value),
        };
        return { match_phrase };
      }
      if (containsWildcard(value)) {
        const wildcard = {
          [substitute[field] || field]: { value, case_insensitive: true },
        };
        return { wildcard };
      }
      const term = { [substitute[field] || field]: value };
      return { term };
    } else {
      const { from, to } = value;
      let range = { [substitute[field] || field]: {} };
      if (from !== "*") {
        range[substitute[field] || field] = { gte: from };
      }
      if (to !== "*") {
        range[substitute[field] || field] = {
          ...range[substitute[field] || field],
          lte: to,
        };
      }
      return {
        range,
      };
    }
  }

  switch (operator) {
    case "AND":
      return {
        bool: {
          must: [_main(left, substitute), _main(right, substitute)],
        },
      };
    case "OR":
      return {
        bool: shouldCombine(tree, substitute, () => ({
          should: [_main(left, substitute), _main(right, substitute)],
        })),
      };
    case "NOT":
      if (left != null) {
        return {
          bool: {
            must: [_main(left, substitute)],
            must_not: [_main(right, substitute)],
          },
        };
      } else {
        return {
          bool: {
            must_not: [_main(right, substitute)],
          },
        };
      }
    case "NEAR":
      if (isMulti(tree)) {
        throw Error(`${operator} Operator must be scoped to the same field`);
      }

      return {
        bool: {
          must: [
            buildNear(
              [
                ...makeClause(left, substitute),
                ...makeClause(right, substitute),
              ],
              slop
            ),
          ],
        },
      };
    case "PRE":
      if (isMulti(tree)) {
        throw Error(`${operator} Operator must be scoped to the same field`);
      }

      return {
        bool: {
          must: [
            buildPre(
              [
                ...makeClause(left, substitute),
                ...makeClause(right, substitute),
              ],
              slop
            ),
          ],
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

function makeClause(tree, substitute) {
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
      return [makePhrase(substitute[field] || field, trimPhrase(value))];
    }

    if (containsWildcard(value)) {
      return [makeSpanMulti(substitute[field] || field, value)];
    }

    return [makeSpanTerm(substitute[field] || field, value)];
  }

  switch (operator) {
    case "NEAR":
      return [
        buildNear(
          [...makeClause(left, substitute), ...makeClause(right, substitute)],
          slop
        ),
      ];
    case "PRE":
      return [
        buildPre(
          [...makeClause(left, substitute), ...makeClause(right, substitute)],
          slop
        ),
      ];
    case "OR":
      return [
        {
          span_or: {
            clauses: [
              ...makeClause(left, substitute),
              ...makeClause(right, substitute),
            ],
          },
        },
      ];
    case "AND":
      return [
        ...makeClause(left, substitute),
        ...makeClause(right, substitute),
      ];
    default:
      throw Error(`Operator ${operator} Not Allowed!`);
  }
}

function makePhrase(field, value) {
  const terms = value.split(/ +/);

  if (terms.length > 1) {
    const clauses = terms.reduce((previousValue, currentValue) => {
      previousValue.push(makeSpanTerm(field, currentValue));
      return previousValue;
    }, []);

    return buildPre(clauses, 0);
  }

  return makeSpanTerm(field, value);
}

function isPhrase(value) {
  return value.startsWith('"') && value.endsWith('"');
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
            case_insensitive: true,
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

function shouldCombine(tree, substitute, fallback) {
  const { key: field } = tree;

  if (!isMulti(tree) && isCombinableTree(tree)) {
    return {
      must: [
        {
          terms: {
            [substitute[field] || field]: combine(tree),
          },
        },
      ],
    };
  }

  return fallback();
}

function isMulti(tree) {
  const { val: value } = tree;

  return !value;
}

function isCombinableTree(tree) {
  const { opt: operator, val: value, child: [left, right] = [] } = tree;

  if (left != null && right != null) {
    if (operator === COMBINE_CRITERION) {
      return isCombinableTree(left) && isCombinableTree(right);
    } else {
      return false;
    }
  }

  if (right != null) {
    return false;
  }

  // overflows
  // return (
  //   typeof value === "string" && !isPhrase(value) && !containsWildcard(value)
  // );
  return (
    typeof value === "string" &&
    !(value.startsWith('"') && value.endsWith('"')) &&
    !(value.includes("*") || value.includes("?"))
  );
}

function combine(tree) {
  const { val: value, child: [left, right] = [] } = tree;

  if (left != null && right != null) {
    return [...combine(left), ...combine(right)];
  }

  return [value];
}

module.exports = main;
