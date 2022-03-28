const { parse } = require("../parser");

const COMBINE_CRITERION = "OR";
const WILDCARD_REWRITE = "top_terms_10000";
const SPAN_MULTI_WILDCARD_REWRITE = "top_terms_1000";

function main(q, cb) {
  const tree = parse(q);

  const { child: [left, right] = [] } = tree;

  if (left == null && right == null) {
    return { bool: { must: [_main(tree, cb)] } };
  }

  return _main(tree, cb);
}

function _main(tree, cb) {
  const { child: [left, right] = [] } = tree;

  if (left == null && right == null) {
    cb && cb(tree);

    const { key: field, val: value } = tree;

    if (typeof value === "string") {
      if (isPhrase(value)) {
        const match_phrase = {
          [field]: trimPhrase(value),
        };
        return { match_phrase };
      }
      if (containsWildcard(value)) {
        const wildcard = {
          [field]: {
            value,
            case_insensitive: true,
            rewrite: WILDCARD_REWRITE,
          },
        };
        return { wildcard };
      }
      const term = { [field]: value };
      return { term };
    } else {
      const { from, to } = value;
      let range = { [field]: {} };
      if (from !== "*") {
        range[field] = { gte: from };
      }
      if (to !== "*") {
        range[field] = {
          ...range[field],
          lte: to,
        };
      }
      return {
        range,
      };
    }
  }

  const { opt: operator, span } = tree;

  const slop = adjustSlop(span);

  switch (operator) {
    case "AND":
      return {
        bool: {
          must: [_main(left, cb), _main(right, cb)],
        },
      };
    case "OR":
      return {
        bool: shouldCombine(tree, cb, () => ({
          should: [_main(left, cb), _main(right, cb)],
        })),
      };
    case "NOT":
      if (left != null) {
        return {
          bool: {
            must: [_main(left, cb)],
            must_not: [_main(right, cb)],
          },
        };
      } else {
        return {
          bool: {
            must_not: [_main(right, cb)],
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
              [...makeClause(left, cb), ...makeClause(right, cb)],
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
            buildPre([...makeClause(left, cb), ...makeClause(right, cb)], slop),
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

function makeClause(tree, cb) {
  const { child: [left, right] = [] } = tree;

  if (left == null && right == null) {
    cb && cb(tree);

    const { key: field, val: value } = tree;

    if (isPhrase(value)) {
      return [makePhrase(field, trimPhrase(value))];
    }

    if (containsWildcard(value)) {
      return [makeSpanMulti(field, value)];
    }

    return [makeSpanTerm(field, value)];
  }

  const { opt: operator, span } = tree;

  const slop = adjustSlop(span);

  switch (operator) {
    case "NEAR":
      return [
        buildNear([...makeClause(left, cb), ...makeClause(right, cb)], slop),
      ];
    case "PRE":
      return [
        buildPre([...makeClause(left, cb), ...makeClause(right, cb)], slop),
      ];
    case "OR":
      return [
        {
          span_or: {
            clauses: [...makeClause(left, cb), ...makeClause(right, cb)],
          },
        },
      ];
    case "AND":
      return [...makeClause(left, cb), ...makeClause(right, cb)];
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
            rewrite: SPAN_MULTI_WILDCARD_REWRITE,
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

function shouldCombine(tree, cb, fallback) {
  if (!isMulti(tree) && isCombinableTree(tree)) {
    cb && cb(tree);

    const { key: field } = tree;

    return {
      must: [
        {
          terms: {
            [field]: combine(tree, cb),
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
  const { opt: operator, child: [left, right] = [] } = tree;

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

  const { val: value } = tree;

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

function combine(tree, cb) {
  const { child: [left, right] = [] } = tree;

  if (left != null && right != null) {
    return [...combine(left, cb), ...combine(right, cb)];
  }

  cb && cb(tree);

  const { val: value } = tree;

  return [value];
}

module.exports = main;
