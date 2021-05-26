function isMatchingBrackets(q) {
  const stack = [];
  const map = {
    "(": ")",
    "[": "]",
  };

  for (let i = 0; i < q.length; i++) {
    if (q[i] === "(" || q[i] === "[") {
      stack.push(q[i]);
    } else if (q[i] === ")" || q[i] === "]") {
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

function evalSpaces(q, i) {
  let count = 0;
  for (let ch = i; ch <= q.length; ch++) {
    if (q[ch] === " ") count++;
    else break;
  }

  return " ".repeat(count);
}

function prepareQ(q) {
  if (!isMatchingBrackets(q)) {
    throw new Error("Unbalanced Brackets");
  }

  const foundwords = [];
  let startFieldIndices = [];
  let startValIndices = [];
  let endValIndices = [];

  let construct = "";
  let start = false;
  let index = 0;
  let sQuote = false;
  let eQuote = false;

  for (let ch = 0; ch < q.length; ch++) {
    if (q[ch] === '"' || q[ch] === "'") {
      if (sQuote) eQuote = true;
      sQuote = true;
    } else if (q[ch] !== " " && q[ch] !== "(" && q[ch] !== ")") {
      if (sQuote === eQuote) {
        if (q[ch] === ":" && construct !== "") {
          construct += q[ch];
          construct += evalSpaces(q, ch + 1);
          foundwords.push(construct);
          startFieldIndices.push(index);
          construct = "";
          start = false;
          index = 0;
          sQuote = false;
          eQuote = false;
        } else {
          construct += q[ch];
          if (!start) {
            index = ch;
            start = true;
          }
        }
      }
    } else if (q[ch] === " ") {
      if (sQuote === eQuote) {
        construct = "";
        start = false;
        index = 0;
        sQuote = false;
        eQuote = false;
      }
    }
  }

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

      const deduction = todeduct(q, currentFieldIndex + 1, posInsertClose + 1);

      endValIndices.push(posInsertClose + 1 - deduction);
    }

    q = [
      q.slice(0, startFieldIndices[k]),
      "(",
      q.slice(startFieldIndices[k]),
    ].join("");

    q = [q.slice(0, q.length), ")"].join("");

    startFieldIndices[k] = startFieldIndices[k] + 1;

    const deduction = todeduct(q, startFieldIndices[k], q.length - 1);

    endValIndices.push(q.length - 1 - deduction);
  }

  for (let i = 0; i < startFieldIndices.length; i++) {
    startValIndices.push(startFieldIndices[i] + foundwords[i].length);
  }

  // console.log("Query", q);
  // console.log("Start Field Index", startFieldIndices);
  // console.log("Start Val Index", startValIndices);
  // console.log("End Val Index", endValIndices);

  return fillDefaultOperator(q, startValIndices, endValIndices);
}

function isfirstCloseBracket(s, i) {
  let truct = "";
  let char;
  let explicit = false;
  for (char = i; char < s.length; char++) {
    if (s[char] === " " || s[char] === ")") {
      truct += s[char];
    } else {
      explicit = true;
      break;
    }
  }
  return { truct, char, explicit };
}

function fillDefaultOperator(q, startIndices, endIndices) {
  if (q.length > 0 && startIndices.length === 0 && endIndices.length === 0) {
    startIndices.push(0);
    endIndices.push(q.length - 1);
  }

  for (let i = 0; i < startIndices.length; i++) {
    let inter = q.substring(startIndices[i], endIndices[i] + 1);

    let isDate = true;
    let datePart = "";
    let dateParams = [];
    for (let ch = 0; ch < inter.length; ch++) {
      if (inter[ch] === "[") {
        dateParams.push("[");
      } else if (inter[ch] === "]") {
        if (isNaN(Number(datePart))) {
          isDate = false;
          break;
        }
        if (datePart !== "") dateParams.push(datePart);
        datePart = "";
        dateParams.push("]");
      } else if (inter[ch] !== " ") {
        datePart += inter[ch];
      } else if (inter[ch] === " " && datePart !== "") {
        if (isNaN(Number(datePart)) && datePart.toLowerCase() !== "to") {
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
      dateParams.length === 5 &&
      dateParams[0] === "[" &&
      !isNaN(dateParams[1]) &&
      dateParams[2].toLowerCase() === "to" &&
      !isNaN(dateParams[3]) &&
      dateParams[4] === "]"
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
    let eQuote = false;

    for (let ch = 0; ch < inter.length; ch++) {
      if (inter[ch] === '"' || inter[ch] === "'") {
        if (sQuote) eQuote = true;
        sQuote = true;
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
        if (sQuote === eQuote) {
          if (onlyBracket) {
            construct += inter[ch];
          } else {
            const { truct, char, explicit } = isfirstCloseBracket(inter, ch);
            if (truct === " " && char === ch + 1) {
              if (toggle) {
                if (
                  construct.toLowerCase() !== "and" &&
                  construct.toLowerCase() !== "or" &&
                  construct.toLowerCase() !== "not" &&
                  !/near[0-9]+/.test(construct.toLowerCase()) &&
                  !/pre[0-9]+/.test(construct.toLowerCase())
                ) {
                  inter = [
                    inter.slice(0, index),
                    "AND ",
                    inter.slice(index),
                  ].join("");
                  count++;
                  ch = ch + 4;
                  toggle = true;
                } else toggle = !toggle;
              } else {
                toggle = !toggle;
              }
              construct = "";
              start = false;
              index = 0;
              sQuote = false;
              eQuote = false;
            } else {
              construct += truct.trimEnd();
              if (explicit) ch = char - 2;
              else break;
            }
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
        !/near[0-9]+/.test(construct.toLowerCase()) &&
        !/pre[0-9]+/.test(construct.toLowerCase())
      ) {
        inter = [inter.slice(0, index), "AND ", inter.slice(index)].join("");
        count++;
      }
    }

    q = [q.slice(0, startIndices[i]), inter, q.slice(endIndices[i] + 1)].join(
      ""
    );

    startIndices = startIndices.map((val, idx) => {
      if (idx <= i) return val;
      else return val + 4 * count;
    });

    endIndices = endIndices.map((val, idx) => {
      if (idx < i) return val;
      else return val + 4 * count;
    });
  }

  return q;
}

module.exports = prepareQ;
