function isMatchingBrackets(q) {
  const stack = [];
  const map = {
    "(": ")",
    "[": "]",
  };
  let sQuote = false;
  let dQuote = false;

  for (let i = 0; i < q.length; i++) {
    if (!dQuote && q[i] === "'") {
      sQuote = !sQuote;
    } else if (!sQuote && q[i] === '"') {
      dQuote = !dQuote;
    } else if (
      sQuote === false &&
      dQuote === false &&
      (q[i] === "(" || q[i] === "[")
    ) {
      stack.push(q[i]);
    } else if (
      sQuote === false &&
      dQuote === false &&
      (q[i] === ")" || q[i] === "]")
    ) {
      const last = stack.pop();

      if (q[i] !== map[last]) {
        return false;
      }
    }
  }

  if (stack.length !== 0) {
    return false;
  }

  return true;
}

function todeduct(q, start, end) {
  const original = start;

  while (q[start - 1] === "(" || q[start - 1] === " ") {
    start = start - 1;
  }

  let countBefore = 0;
  let count = 0;
  for (let i = start; i <= end; i++) {
    if (q[i] === "(") {
      count++;
      if (i < original) {
        countBefore++;
      }
    } else if (q[i] === ")") {
      count--;
    }
  }

  return countBefore - count;
}

function evalDeduction(q, start, end) {
  const deduction = todeduct(q, start, end);

  let i = end;
  let foundClose = 0;
  let count = 0;

  while (deduction !== foundClose) {
    if (q[i] === ")") foundClose++;

    count++;
    i--;
  }

  return count;
}

function evalSpaces(q, i) {
  let count = 0;
  for (let ch = i; ch <= q.length; ch++) {
    if (q[ch] === " ") count++;
    else break;
  }

  return " ".repeat(count);
}

function getFields(q) {
  const foundwords = [];
  const startFieldIndices = [];

  let construct = "";
  let start = false;
  let index = 0;
  let sQuote = false;
  let dQuote = false;

  for (let ch = 0; ch < q.length; ch++) {
    if (!dQuote && q[ch] === "'") {
      sQuote = !sQuote;
    } else if (!sQuote && q[ch] === '"') {
      dQuote = !dQuote;
    } else if (q[ch] !== " " && q[ch] !== "(" && q[ch] !== ")") {
      if (sQuote === false && dQuote === false) {
        if (q[ch] === ":" && construct !== "") {
          construct += q[ch];
          construct += evalSpaces(q, ch + 1);
          foundwords.push(construct);
          startFieldIndices.push(index);
          construct = "";
          start = false;
          index = 0;
          sQuote = false;
          dQuote = false;
        } else {
          construct += q[ch];
          if (!start) {
            index = ch;
            start = true;
          }
        }
      }
    } else if (q[ch] === " ") {
      if (sQuote === false && dQuote === false) {
        construct = "";
        start = false;
        index = 0;
        sQuote = false;
        dQuote = false;
      }
    }
  }

  return {
    foundwords,
    startFieldIndices,
  };
}

function prepare(q) {
  if (!isMatchingBrackets(q)) {
    throw new Error("Unbalanced Brackets");
  }

  const fields = getFields(q);

  const { foundwords } = fields;
  let { startFieldIndices } = fields;

  let startValIndices = [];
  let endValIndices = [];

  if (startFieldIndices.length) {
    let k;
    for (k = 0; k < startFieldIndices.length - 1; k++) {
      const currentFieldIndex = startFieldIndices[k];
      const nextFieldIndex = startFieldIndices[k + 1];

      let operator = "";
      let operatorIndex;

      for (let j = nextFieldIndex - 1; j >= currentFieldIndex; j--) {
        if (
          operator.toLowerCase() === "ro" ||
          operator.toLowerCase() === "dna" ||
          operator.toLowerCase() === "ton" ||
          operator.toLowerCase() === "praen" ||
          operator.toLowerCase() === "sraen" ||
          operator.toLowerCase() === "perp" ||
          operator.toLowerCase() === "serp" ||
          /[0-9]+raen/.test(operator.toLowerCase()) ||
          /[0-9]+erp/.test(operator.toLowerCase())
        ) {
          break;
        }
        if (q[j] === " " || q[j] === "(") {
          operator = "";
          continue;
        }
        operator += q[j];
        operatorIndex = j;
      }

      const posInsertClose = operatorIndex - 1;

      q = [q.slice(0, currentFieldIndex), "(", q.slice(currentFieldIndex)].join(
        ""
      );

      q = [
        q.slice(0, posInsertClose + 1),
        ")",
        q.slice(posInsertClose + 1),
      ].join("");

      startFieldIndices = startFieldIndices.map((val, idx) => {
        if (idx < k) return val;
        else if (idx === k) return val + 1;
        else return val + 2;
      });

      const deduction = evalDeduction(
        q,
        currentFieldIndex + 1,
        posInsertClose + 1
      );

      endValIndices.push(posInsertClose + 1 - deduction);
    }

    q = [
      q.slice(0, startFieldIndices[k]),
      "(",
      q.slice(startFieldIndices[k]),
    ].join("");

    q = [q.slice(0, q.length), ")"].join("");

    startFieldIndices[k] = startFieldIndices[k] + 1;

    const deduction = evalDeduction(q, startFieldIndices[k], q.length - 1);

    endValIndices.push(q.length - 1 - deduction);
  }

  for (let i = 0; i < startFieldIndices.length; i++) {
    startValIndices.push(startFieldIndices[i] + foundwords[i].length);
  }

  // console.log("Query", q);
  // console.log("Found words", foundwords);
  // console.log("Start Field Index", startFieldIndices);
  // console.log("Start Val Index", startValIndices);
  // console.log("End Val Index", endValIndices);

  return {
    q,
    foundwords,
    startFieldIndices,
    startValIndices,
    endValIndices,
  };
}

function pickKey(q, field) {
  const {
    q: query,
    foundwords,
    startFieldIndices,
    startValIndices,
    endValIndices,
  } = prepare(q);

  const startEnd = [];
  for (let i = 0; i < foundwords.length; i++) {
    if (foundwords[i].slice(0, -1) === field) {
      startEnd.push({
        field: field,
        value: query.substring(startValIndices[i], endValIndices[i] + 1),
        start: startFieldIndices[i] - (2 * i + 1),
        end: endValIndices[i] - (2 * i + 1),
      });
    }
  }

  return startEnd;
}

function prepareQ(q) {
  const { q: query, startValIndices, endValIndices } = prepare(q);

  return fillDefaultOperator(query, startValIndices, endValIndices);
}

function collectRemainingParts(s, i) {
  let remain = "";
  let char;
  for (char = i; char < s.length; char++) {
    if (s[char] === " " || s[char] === ")") {
      remain += s[char];
    } else {
      break;
    }
  }

  return { remain, char };
}

function fillDefaultOperator(q, startIndices, endIndices) {
  if (q.length > 0 && startIndices.length === 0 && endIndices.length === 0) {
    startIndices.push(0);
    endIndices.push(q.length - 1);
  }

  for (let i = 0; i < startIndices.length; i++) {
    let inter = q.substring(startIndices[i], endIndices[i] + 1);

    let k = inter.length - 1;
    let noSpaces = 0;

    while (inter[k] === " ") {
      noSpaces++;
      k--;
    }

    inter = inter.trimEnd();

    let isDate = true;
    let datePart = "";
    let dateParams = [];
    let beginIndex = 0;

    for (let ch = 0; ch < inter.length; ch++) {
      if (inter[ch] === "(" || inter[ch] === ")") {
        dateParams.push(inter[ch]);
      } else if (inter[ch] === "[") {
        beginIndex = dateParams.push(inter[ch]) - 1;
      } else if (inter[ch] === "]") {
        if (isNaN(Number(datePart)) && datePart !== "*") {
          isDate = false;
          break;
        }
        if (datePart !== "") dateParams.push(datePart);
        datePart = "";
        dateParams.push(inter[ch]);
      } else if (inter[ch] !== " ") {
        datePart += inter[ch];
      } else if (inter[ch] === " " && datePart !== "") {
        if (
          isNaN(Number(datePart)) &&
          datePart !== "*" &&
          datePart.toLowerCase() !== "to"
        ) {
          isDate = false;
          break;
        }
        dateParams.push(datePart);
        datePart = "";
      }
    }

    // ignore for date
    if (
      isDate &&
      dateParams.length === 2 * beginIndex + 5 &&
      dateParams[beginIndex] === "[" &&
      (dateParams[beginIndex + 1] === "*" ||
        !isNaN(dateParams[beginIndex + 1])) &&
      dateParams[beginIndex + 2].toLowerCase() === "to" &&
      (dateParams[beginIndex + 3] === "*" ||
        !isNaN(dateParams[beginIndex + 3])) &&
      dateParams[beginIndex + 4] === "]"
    ) {
      continue;
    }

    let toggle = false;
    let count = 0;
    let start = false;
    let index = 0;
    let construct = "";
    let onlyBracket = false;
    let sQuote = false;
    let dQuote = false;

    for (let ch = 0; ch < inter.length; ch++) {
      if (!dQuote && inter[ch] === "'") {
        sQuote = !sQuote;
        construct += inter[ch];
        if (!start) {
          index = ch;
          start = true;
        }
      } else if (!sQuote && inter[ch] === '"') {
        dQuote = !dQuote;
        construct += inter[ch];
        if (!start) {
          index = ch;
          start = true;
        }
      } else if (inter[ch] === "(") {
        onlyBracket = true;
        construct += inter[ch];
        if (!start) {
          index = ch;
          start = true;
        }
      } else if (inter[ch] !== " ") {
        onlyBracket = false;
        construct += inter[ch];
        if (!start) {
          index = ch;
          start = true;
        }
      } else if (inter[ch] === " ") {
        if (!sQuote && !dQuote && !onlyBracket) {
          const { remain, char } = collectRemainingParts(inter, ch);
          if (remain === " " && char === ch + 1) {
            if (
              toggle &&
              construct.toLowerCase() !== "and" &&
              construct.toLowerCase() !== "or" &&
              construct.toLowerCase() !== "not" &&
              construct.toLowerCase() !== "nearp" &&
              construct.toLowerCase() !== "nears" &&
              construct.toLowerCase() !== "prep" &&
              construct.toLowerCase() !== "pres" &&
              !/near[0-9]+/.test(construct.toLowerCase()) &&
              !/pre[0-9]+/.test(construct.toLowerCase())
            ) {
              inter = [inter.slice(0, index), "AND ", inter.slice(index)].join(
                ""
              );
              count++;
              ch = ch + 4;
              toggle = true;
            } else if (!toggle) {
              if (
                construct.toLowerCase() === "and" ||
                construct.toLowerCase() === "or" ||
                construct.toLowerCase() === "not" ||
                construct.toLowerCase() === "nearp" ||
                construct.toLowerCase() === "nears" ||
                construct.toLowerCase() === "prep" ||
                construct.toLowerCase() === "pres" ||
                /near[0-9]+/.test(construct.toLowerCase()) ||
                /pre[0-9]+/.test(construct.toLowerCase())
              ) {
                throw new Error("Consective operators Are not allowed");
              }

              toggle = !toggle;
            } else {
              toggle = !toggle;
            }

            construct = "";
            start = false;
            index = 0;
            sQuote = false;
            dQuote = false;
          } else {
            construct += remain.trimEnd();
            ch = char - 2;
          }
        } else {
          construct += inter[ch];
        }
      }
    }

    if (toggle) {
      if (
        construct.toLowerCase() !== "and" &&
        construct.toLowerCase() !== "or" &&
        construct.toLowerCase() !== "not" &&
        construct.toLowerCase() !== "nearp" &&
        construct.toLowerCase() !== "nears" &&
        construct.toLowerCase() !== "prep" &&
        construct.toLowerCase() !== "pres" &&
        !/near[0-9]+/.test(construct.toLowerCase()) &&
        !/pre[0-9]+/.test(construct.toLowerCase())
      ) {
        inter = [inter.slice(0, index), "AND ", inter.slice(index)].join("");
        count++;
      }
    } else {
      if (
        construct.toLowerCase() === "and" ||
        construct.toLowerCase() === "or" ||
        construct.toLowerCase() === "not" ||
        construct.toLowerCase() === "nearp" ||
        construct.toLowerCase() === "nears" ||
        construct.toLowerCase() === "prep" ||
        construct.toLowerCase() === "pres" ||
        /near[0-9]+/.test(construct.toLowerCase()) ||
        /pre[0-9]+/.test(construct.toLowerCase())
      ) {
        throw new Error("Consective operators Are not allowed");
      }
    }

    q = [q.slice(0, startIndices[i]), inter, q.slice(endIndices[i] + 1)].join(
      ""
    );

    startIndices = startIndices.map((val, idx) => {
      if (idx <= i) return val;
      else return val + 4 * count - noSpaces;
    });

    endIndices = endIndices.map((val, idx) => {
      if (idx < i) return val;
      else return val + 4 * count - noSpaces;
    });
  }

  return q;
}

module.exports = {
  prepareQ,
  pickKey,
  getFields,
};
