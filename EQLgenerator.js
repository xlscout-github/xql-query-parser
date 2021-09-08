function EQLgenerator(parsedArr) {
  if ("span" in parsedArr) {
    span = parsedArr["span"];
    if (span.toLowerCase() == "p") {
      span = "50";
    } else if (span.toLowerCase() == "s") {
      span = "15";
    }
  } else {
    span = -1;
  }

  if ("opt" in parsedArr) {
  } else {
    parsedArr = {
      key: parsedArr["key"],
      val: "multi",
      child: [parsedArr],
      opt: "AND",
    };
  }

  // parsedArr = [parsedArr];
  let outputArr = makeSearchQuery(parsedArr["child"], parsedArr["opt"], span);

  if (outputArr["status"] == "success") {
    if (!("bool" in outputArr["queryArray"])) {
      let groupQuery = { bool: { must: [] } };
      groupQuery["bool"]["must"].push(outputArr["queryArray"]);
      outputArr["queryArray"] = groupQuery;
    }
  }
  return outputArr;
}

function makeSearchQuery(mySearchArr, operator, span = -1) {
  let validations = 1;
  let errorMsg = "";
  let regExp;
  let matchFound = [];
  let qry;
  let groupQuery = [];

  let operatorForNext;
  // operatorForNext = mySearchArr["opt"];
  if ("span" in mySearchArr) {
    span = mySearchArr["span"];
  }
  // mySearchArr = mySearchArr["child"];
  if (span == -1) {
    groupQuery = { bool: { must: [], should: [], must_not: [] } };
  } else {
    if (span.toLowerCase() == "p") {
      span = "50";
    } else if (span.toLowerCase() == "s") {
      span = "15";
    }

    groupQuery = { span_near: { clauses: [], slop: "", in_order: "" } };
  }
  // operator = operatorForNext;
  // return;
  for (let j = 0; j < mySearchArr.length; j++) {
    let currentField = mySearchArr[j]["key"];
    let modifiedQuery = mySearchArr[j].val;
    // /    operator = mySearchArr[j].opt;
    let str = "";
    if (
      currentField === "multi" &&
      "child" in mySearchArr[j] &&
      mySearchArr[j].child.length > 0
    ) {
      //console.log("***multi key");
      const Tempreturnarr = makeSearchQuery(
        mySearchArr[j].child,
        mySearchArr[j].opt
      );
      if (
        "status" in Tempreturnarr &&
        Tempreturnarr.status === "success" &&
        "queryArray" in Tempreturnarr
      ) {
        qry = Tempreturnarr.queryArray;
      } else {
        if (
          "status" in Tempreturnarr &&
          Tempreturnarr.status === "failed" &&
          "errorMsg" in Tempreturnarr
        ) {
          validations = 0;
          errorMsg = Tempreturnarr.errorMsg;
        } else {
          validations = 0;
          errorMsg = "Some unexpected error occured. Please try again later";
        }
      }
    } else if (
      (currentField === "multi" &&
        "child" in mySearchArr[j] &&
        mySearchArr[j].child.length === 0) ||
      (currentField === "multi" && !("child" in mySearchArr[j]))
    ) {
      //console.log("***invalid case");
      // nothing to do, let it go as it is
    } else if (
      currentField !== "" &&
      currentField !== "multi" &&
      modifiedQuery === "multi" &&
      "child" in mySearchArr[j] &&
      mySearchArr[j].child.length > 0
    ) {
      //console.log("***multi value");
      const nearOccurence = 0;
      if ("span" in mySearchArr[j]) {
        span = mySearchArr[j]["span"];
        if (span.toLowerCase() == "p") {
          span = "50";
        } else if (span.toLowerCase() == "s") {
          span = "15";
        }
      } else {
        span = -1;
      }
      Tempreturnarr = makeFinalQuery(
        mySearchArr[j].child,
        0,
        mySearchArr[j].opt,
        span
      );
      qry = Tempreturnarr;
    } else {
      //console.log("making single query");
      if (typeof modifiedQuery === "string") {
        if (
          operator.toLowerCase() == "pre" ||
          operator.toLowerCase() == "near"
        ) {
          starIndex = modifiedQuery.indexOf("*");
          questionMarkIndex = modifiedQuery.indexOf("?");
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            qry = makeWildCardSpanQuery(currentField, modifiedQuery);
          } else {
            qry = maketermQuery(currentField, modifiedQuery);
          }
        } else {
          modifiedQuery = modifiedQuery.trim();
          str = "(" + currentField + ":(" + modifiedQuery + "))";
          const temp = {};
          temp.query_string = {};
          temp.query_string = { default_operator: "AND", query: str };
          qry = temp;
        }
      } else {
        const temp = {};
        let tempDate;
        if (modifiedQuery.from === "*") {
          modifiedQuery.from = new Date(1699, 0, 1, 0, 0, 0, 0);
          tempDate = modifiedQuery.from;
          modifiedQuery.from =
            tempDate.getFullYear() +
            "" +
            ("0" + (tempDate.getMonth() + 1)).slice(-2) +
            "" +
            ("0" + tempDate.getDate()).slice(-2);
        }
        if (modifiedQuery.to === "*") {
          modifiedQuery.to = new Date();
          tempDate = modifiedQuery.to;
          modifiedQuery.to =
            tempDate.getFullYear() +
            "" +
            ("0" + (tempDate.getMonth() + 1)).slice(-2) +
            "" +
            ("0" + tempDate.getDate()).slice(-2);
        }
        temp.range = {};

        temp.range[currentField] = {
          gte: modifiedQuery.from,
          lte: modifiedQuery.to,
        };
        qry = temp;
      }
    }

    if (validations === 0) {
      break;
    }
    switch (operator) {
      case "AND":
        groupQuery.bool.must.push(qry);
        break;

      case "OR":
        groupQuery.bool.should.push(qry);
        break;

      case "NOT":
        groupQuery.bool.must_not.push(qry);
        break;

      case "PRE":
      case "pre":
        groupQuery.span_near.clauses.push(qry);
        groupQuery.span_near.in_order = "true";
        groupQuery.span_near.slop = span;
        break;

      case "NEAR":
      case "near":
        groupQuery.span_near.clauses.push(qry);
        groupQuery.span_near.in_order = "false";
        groupQuery.span_near.slop = span;
        break;
    }
    //console.log("GROUPQUERYYYY--------------------");
    //console.log(JSON.stringify(groupQuery, 0, 2));
  }
  // console.log(JSON.stringify(groupQuery));
  let finalResponseArr;
  if (validations === 0) {
    finalResponseArr = {
      status: "failed",
      errorMsg: errorMsg,
      queryArray: [],
    };
  } else {
    finalResponseArr = {
      status: "success",
      errorMsg: "",
      queryArray: groupQuery,
    };
  }
  return finalResponseArr;
}

function makeWildCardSpanQuery(field, value) {
  const wildcardquery = {};
  wildcardquery.span_multi = {};
  wildcardquery.span_multi.match = {};
  wildcardquery.span_multi.match.wildcard = {};
  wildcardquery.span_multi.match.wildcard[field] = {
    value: value,
    rewrite: "top_terms_4092",
  };
  return wildcardquery;
}
function makeWildCardQuery(field, value) {
  const wildCardQuery = { IsChanged: 0, changedValue: value };
  const starIndex = value.indexOf("*");
  const questionMarkIndex = value.indexOf("?");
  if (starIndex === -1 && questionMarkIndex === -1) {
    // error
  } else {
    const x = {};
    x.span_multi = {};
    x.span_multi.match = {};
    x.span_multi.match.wildcard = {};
    x.span_multi.match.wildcard[field] = {
      value: value,
      rewrite: "top_terms_4092",
    };
    wildCardQuery.changedValue = x;
    wildCardQuery.IsChanged = 1;
  }
  return wildCardQuery;
}
function maketermQuery(field, value) {
  const x = {};
  x.span_term = {};
  x.span_term[field] = value;
  return x;
}

function checkNearoccurence(strArr) {
  //console.log(strArr);
  let checkNearPreOccurrence = 0;
  for (tempi = 0; tempi < strArr.length; tempi++) {
    if ("opt" in strArr[tempi]) {
      if (
        strArr[tempi]["opt"].toLowerCase() == "pre" ||
        strArr[tempi]["opt"].toUpperCase() == "near"
      ) {
        checkNearPreOccurrence = 1;
        break;
      }
    }
  }
  return checkNearPreOccurrence;
}

function makeElasticQuery2(strArr, havenearoccured, operator, span) {
  const currentObj = strArr[0];
  const nextObj = strArr[1];
  //console.log("------------makeElasticQuery2-----------------------------");
  //console.log("---havennearoccured " + havenearoccured);
  //console.log("--CUREEEEEEEEEEEEEEENT OBJ");
  //console.log(JSON.stringify(currentObj, 0, 2));
  //console.log("--nextTTTTTTTTTTTobj");
  //console.log(JSON.stringify(nextObj, 0, 2));
  //console.log("span is ");
  //console.log(span);
  //console.log("perator is ");
  //console.log(operator);
  if (havenearoccured === 0 && span != -1) {
    havenearoccured = 1;
  }
  // return;
  let tempquery = {};
  let tempqueryArr1 = {};
  let tempqueryArr2 = {};
  let starIndex = -1;
  let questionMarkIndex = -1;
  let searchfield;
  let searchValue;
  let nextOpt;
  const regExp = /near[\s]*([^\s([a-zA-Z\]]+)/gim;
  const regExp2 = /pre[\s]*([^\s([a-zA-Z\]]+)/gim;
  let multiOperand = [];
  let nonmultiOperand = [];
  if (
    currentObj.key !== "" &&
    currentObj.key !== "multi" &&
    currentObj.val === "multi" &&
    "child" in currentObj &&
    currentObj.child.length > 0
  ) {
    multiOperand.push(currentObj);
  } else {
    nonmultiOperand.push(currentObj);
  }
  if (
    nextObj.key !== "" &&
    nextObj.key !== "multi" &&
    nextObj.val === "multi" &&
    "child" in nextObj &&
    nextObj.child.length > 0
  ) {
    multiOperand.push(nextObj);
  } else {
    nonmultiOperand.push(nextObj);
  }
  //console.log(havenearoccured);
  if (multiOperand.length > 0) {
    firstOperand = multiOperand[0];
    // if (havenearoccured === 0) {
    //   havenearoccured = checkNearoccurence(firstOperand.child);
    // }
    //console.log("here multi1");
    //console.log(operator);
    tempqueryArr1 = makeFinalQuery(
      firstOperand.child,
      havenearoccured,
      firstOperand.opt,
      firstOperand.span
    );
    //console.log("TEMPQUERYYY1 ouput is ");
    //console.log(tempqueryArr1);
    if (multiOperand.length == 2) {
      secondOperand = multiOperand[1];
      //console.log("heree next");
      if (havenearoccured === 0) {
        //console.log(span);
        if (span != -1) {
          havenearoccured = 1;
        }
        // else {
        //   havenearoccured = checkNearoccurence(secondOperand.child);
        // }
      }
      //console.log(havenearoccured);
      tempqueryArr2 = makeFinalQuery(
        secondOperand.child,
        havenearoccured,
        secondOperand.opt,
        secondOperand.span
      );
      //console.log("tempqueryArr2");
      //console.log(tempqueryArr2);
      //console.log("nearoccured");
      //console.log(havenearoccured);
      if (havenearoccured === 1) {
        if (span != -1) {
          tempquery = {};
          tempquery.span_near = {};
          tempquery.span_near.clauses = [];
          tempquery.span_near.clauses.push(tempqueryArr1);
          tempquery.span_near.clauses.push(tempqueryArr2);
          if (span === "0") {
            tempquery.span_near.in_order = "true"; // case of inverted commas converted to near0
          } else {
            tempquery.span_near.in_order = "false";
          }
          if (operator.toLowerCase() == "near") {
            tempquery.span_near.in_order = "false";
          } else {
            tempquery.span_near.in_order = "true";
          }
          // }
          tempquery.span_near.slop = span;
        } else if (operator == "OR") {
          tempquery = {};
          tempquery.span_or = {};
          tempquery.span_or.clauses = [];
          tempquery.span_or.clauses.push(tempqueryArr1);
          tempquery.span_or.clauses.push(tempqueryArr2);
        } else {
          //console.log("unhandledd case");
        }
      } else {
        if (operator == "AND") {
          tempquery = { bool: { must: [] } };
          tempquery.bool.must.push(tempqueryArr1);
          tempquery.bool.must.push(tempqueryArr2);
        } else if (operator === "OR") {
          tempquery = { bool: { should: [] } };
          tempquery.bool.should.push(tempqueryArr1);
          tempquery.bool.should.push(tempqueryArr2);
        } else if (operator == "NOT") {
          tempquery = { bool: { must_not: [] } };
          tempquery.bool.must_not.push(tempqueryArr1);
          tempquery.bool.must_not.push(tempqueryArr2);
        } else {
          //console.log("operator");
          //console.log(operator);
          //console.log("SOMEE UNCOVERED CASE");
        }
      }
    } else if (nonmultiOperand.length > 0) {
      secondOperand = nonmultiOperand[0];
      //console.log("second operator not multi");
      //console.log(secondOperand);
      searchValue = secondOperand.val;
      searchfield = secondOperand.key;
      //console.log("span");
      //console.log(span);
      //console.log("havenearoccured");
      //console.log(havenearoccured);
      if (havenearoccured === 1) {
        //console.log(span);
        //console.log(operator);
        if (operator == "OR") {
          starIndex = searchValue.indexOf("*");
          questionMarkIndex = searchValue.indexOf("?");
          // making current query part
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = makeWildCardSpanQuery(searchfield, searchValue);
          } else {
            tempqry = maketermQuery(searchfield, searchValue);
          }
          tempquery.span_or = {};
          tempquery.span_or.clauses = [];
          tempquery.span_or.clauses.push(tempqueryArr1);
          tempquery.span_or.clauses.push(tempqry);
        } else if (span != -1) {
          //console.log("span  coming here");
          //console.log(span);
          starIndex = searchValue.indexOf("*");
          questionMarkIndex = searchValue.indexOf("?");
          // making current query part
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = makeWildCardSpanQuery(searchfield, searchValue);
          } else {
            tempqry = maketermQuery(searchfield, searchValue);
          }
          tempquery.span_near = {};
          tempquery.span_near.clauses = [];
          tempquery.span_near.clauses.push(tempqueryArr1);
          tempquery.span_near.clauses.push(tempqry);
          // if (operator.match(/(pre)[\d]+/i) !== null) {
          //   tempquery.span_near.in_order = "true";
          //   span = operator.replace(/(pre)/i, "");
          // } else {
          //   span = operator.replace(/(near)/i, "");
          //console.log("span");
          //console.log(span);
          if (operator.toLowerCase() == "pre") {
            tempquery.span_near.in_order = "true";
          } else {
            if (span === "0") {
              tempquery.span_near.in_order = "true"; // case of inverted commas converted to near0
            } else {
              tempquery.span_near.in_order = "false";
            }
          }
          // }
          //console.log("span2");
          //console.log(span);
          tempquery.span_near.slop = span;
          //console.log("finalq uery here is ");
          //console.log(JSON.stringify(tempquery, 0, 2));
        } else {
          //console.log("irrelevant case yhaa");
        }
      } else {
        //console.log("heree  " + searchValue);
        //console.log("heree  " + operator);
        str = "(" + searchfield + ":(" + searchValue + "))";
        tempqry = { query_string: { default_operator: "AND", query: str } };
        if (operator == "AND") {
          tempquery = { bool: { must: [] } };
          tempquery.bool.must.push(tempqueryArr1);
          tempquery.bool.must.push(tempqry);
        } else if (operator === "OR") {
          tempquery = { bool: { should: [] } };
          tempquery.bool.should.push(tempqueryArr1);
          tempquery.bool.should.push(tempqry);
        } else if (operator == "NOT") {
          tempquery = { bool: { must_not: [] } };
          tempquery.bool.must_not.push(tempqueryArr1);
          tempquery.bool.must_not.push(tempqry);
        } else {
          // wrong case
        }
      }
    } else {
      tempquery = tempqueryArr1;
    }
  } else {
    let searchfield = currentObj.key;
    let searchValue = currentObj.val;
    // let currentOperator = currentObj.opt;
    let tempqueryArr2 = {};
    let tempqry = {};
    //console.log("in elseeee initial child not multi");
    //console.log(havenearoccured);
    if (havenearoccured == 1) {
      if (
        nextObj.key !== "" &&
        nextObj.key !== "multi" &&
        nextObj.val === "multi" &&
        "child" in nextObj &&
        nextObj.child.length > 0
      ) {
        // nextOpt = nextObj.opt;
        //console.log("here multi multi");
        tempqueryArr2 = makeFinalQuery(nextObj.child, havenearoccured);

        if (operator == "OR") {
          starIndex = searchValue.indexOf("*");
          questionMarkIndex = searchValue.indexOf("?");
          // making current query part
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = makeWildCardSpanQuery(searchfield, searchValue);
          } else {
            tempqry = maketermQuery(searchfield, searchValue);
          }
          tempquery.span_or = {};
          tempquery.span_or.clauses = [];
          tempquery.span_or.clauses.push(tempqry);
          tempquery.span_or.clauses.push(tempqueryArr2);
        } else if (span != -1) {
          starIndex = searchValue.indexOf("*");
          questionMarkIndex = searchValue.indexOf("?");
          // making current query part
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = makeWildCardSpanQuery(searchfield, searchValue);
          } else {
            tempqry = maketermQuery(searchfield, searchValue);
          }
          tempquery.span_near = {};
          tempquery.span_near.clauses = [];
          tempquery.span_near.clauses.push(tempqry);
          tempquery.span_near.clauses.push(tempqueryArr2);
          // let span;
          // if (operator.match(/(pre)[\d]+/i) !== null) {
          //   tempquery.span_near.in_order = "true";
          //   span = operator.replace(/(pre)/i, "");
          // } else {
          //   span = operator.replace(/(near)/i, "");

          if (span === "0") {
            tempquery.span_near.in_order = "true"; // case of inverted commas converted to near0
          } else {
            tempquery.span_near.in_order = "false";
          }
          // }
          tempquery.span_near.slop = span;
        } else {
          //console.log("coming in wrong case");
        }
        //console.log(JSON.stringify(tempquery));
      } else {
        // const nextOpt = nextObj.opt;
        //console.log("regExp");
        //console.log(regExp);
        //console.log(regExp2);
        //console.log(operator);
        //console.log(span);
        if (operator == "OR") {
          starIndex = searchValue.indexOf("*");
          questionMarkIndex = searchValue.indexOf("?");
          // making current query part
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = makeWildCardSpanQuery(searchfield, searchValue);
          } else {
            tempqry = maketermQuery(searchfield, searchValue);
          }
          tempquery.span_or = {};
          tempquery.span_or.clauses = [];
          tempquery.span_or.clauses.push(tempqry);

          starIndex = nextObj.val.indexOf("*");
          questionMarkIndex = nextObj.val.indexOf("?");
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = makeWildCardSpanQuery(nextObj.key, nextObj.val);
          } else {
            tempqry = maketermQuery(nextObj.key, nextObj.val);
          }
          tempquery.span_or.clauses.push(tempqry);
        } else if (span != -1) {
          starIndex = searchValue.indexOf("*");
          questionMarkIndex = searchValue.indexOf("?");
          // making current query part
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = makeWildCardSpanQuery(searchfield, searchValue);
          } else {
            tempqry = maketermQuery(searchfield, searchValue);
          }
          //console.log(JSON.stringify(tempqry));
          tempquery.span_near = {};
          tempquery.span_near.clauses = [];
          tempquery.span_near.clauses.push(tempqry);

          starIndex = nextObj.val.indexOf("*");
          questionMarkIndex = nextObj.val.indexOf("?");
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = tempqry = makeWildCardSpanQuery(nextObj.key, nextObj.val);
          } else {
            tempqry = maketermQuery(nextObj.key, nextObj.val);
          }
          tempquery.span_near.clauses.push(tempqry);
          if (operator.toLowerCase() == "pre") {
            tempquery.span_near.in_order = "true";
          } else {
            if (parseInt(span) === 0) {
              tempquery.span_near.in_order = "true"; // case of inverted commas converted to near0
            } else {
              tempquery.span_near.in_order = "false";
            }
          }
          tempquery.span_near.slop = span;
          //console.log("finalq uery here is ");
          //console.log(JSON.stringify(tempquery, 0, 2));
        } else {
          //console.log("irrelevant case77");
        }
      }
    } else {
      //console.log("heree  " + searchValue);

      //console.log("nextobjjjjjj");
      //console.log(JSON.stringify(nextObj));
      //console.log(JSON.stringify(tempquery));
      //console.log("span now is " + span);
      // nextOpt = nextObj.opt;
      if (
        nextObj.key !== "" &&
        nextObj.key !== "multi" &&
        nextObj.val === "multi" &&
        "child" in nextObj &&
        nextObj.child.length > 0
      ) {
        //console.log("HEREE MULTI CHILD");
        //console.log(searchValue);
        //console.log(searchfield);
        str = "(" + searchfield + ":(" + searchValue + "))";
        tempqry = { query_string: { default_operator: "AND", query: str } };

        //console.log("nextchildmulti");
        //console.log("tempquery till now");
        //console.log(JSON.stringify(tempqry));

        tempqry2 = makeFinalQuery(
          nextObj.child,
          havenearoccured,
          nextObj.opt,
          nextObj.span
        );
        // nextOpt = nextObj.opt;
        //console.log("tempqry after makefinalQUery");
        //console.log(JSON.stringify(tempqry2));
        //console.log("next opt is " + operator);
        if (operator == "AND") {
          tempquery2 = { bool: { must: [] } };
          tempquery2.bool.must.push(tempqry2);
          tempquery2.bool.must.push(tempqry);
        } else if (operator == "OR") {
          tempquery2 = { bool: { should: [] } };
          tempquery2.bool.should.push(tempqry2);
          tempquery2.bool.should.push(tempqry);
        } else if (operator == "NOT") {
          tempquery2 = { bool: { must_not: [] } };
          tempquery2.bool.must_not.push(tempqry2);
          tempquery2.bool.must_not.push(tempqry);
        } else {
          //console.log("breaking heree ");
          //tocover and check case
        }
        tempquery = tempquery2;

        //console.log("query");
        //console.log(JSON.stringify(tempquery, 0, 2));
      } else {
        // nextobj val is not multi
        //console.log("nextobj not mjulti");
        if (span != -1) {
          // both are non multi and operator is proximity
          //console.log("hereeee ion reg match");
          starIndex = searchValue.indexOf("*");
          questionMarkIndex = searchValue.indexOf("?");
          // making current query part
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = makeWildCardSpanQuery(searchfield, searchValue);
          } else {
            tempqry = maketermQuery(searchfield, searchValue);
          }
          tempquery.span_near = {};
          tempquery.span_near.clauses = [];
          // tempquery.span_near.clauses.push(tempqueryArr1);
          tempquery.span_near.clauses.push(tempqry);
          //console.log("nextObj");
          //console.log(tempquery);
          //console.log(nextObj);
          searchValue = nextObj.val;
          searchfield = nextObj.key;
          starIndex = searchValue.indexOf("*");
          questionMarkIndex = searchValue.indexOf("?");
          // making current query part
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = makeWildCardSpanQuery(searchfield, searchValue);
          } else {
            tempqry = maketermQuery(searchfield, searchValue);
          }
          tempquery.span_near.clauses.push(tempqry);
          //console.log("-----------------finalq uery here is ");

          if (span === "0") {
            tempquery.span_near.in_order = "true"; // case of inverted commas converted to near0
          } else {
            tempquery.span_near.in_order = "false";
          }
          if (operator.toLowerCase() == "pre") {
            tempquery.span_near.in_order = "true";
          } else {
            tempquery.span_near.in_order = "false";
          }
          tempquery.span_near.slop = span;
          //console.log("-----------------finalq uery here is ");
          //console.log(JSON.stringify(tempquery, 0, 2));
        } else {
          //both are non multi and operator is not proximity
          str = "(" + searchfield + ":(" + searchValue + "))";
          tempqry = { query_string: { default_operator: "AND", query: str } };
          let tempqry2;
          if (operator == "OR") {
            str = "(" + nextObj.key + ":(" + nextObj.val + "))";
            tempqry2 = {
              query_string: { default_operator: "AND", query: str },
            };
            tempquery2 = { bool: { should: [] } };
            tempquery2.bool.should.push(tempqry);
            tempquery2.bool.should.push(tempqry2);
            tempquery = tempquery2;
          } else if (operator == "NOT") {
            str = "(" + nextObj.key + ":(" + nextObj.val + "))";
            tempqry2 = {
              query_string: { default_operator: "AND", query: str },
            };
            tempquery2 = { bool: { should: [] } };
            tempquery2.bool.must_not.push(tempqry);
            tempquery2.bool.must_not.push(tempqry2);
            tempquery = tempquery2;
          } else if (operator == "AND") {
            str = "(" + nextObj.key + ":(" + nextObj.val + "))";
            tempqry2 = {
              query_string: { default_operator: "AND", query: str },
            };
            tempquery2 = { bool: { must: [] } };
            tempquery2.bool.must.push(tempqry);
            tempquery2.bool.must.push(tempqry2);
            tempquery = tempquery2;
          } else {
            //console.log("irrelevant case");
            //console.log("nextopt ios " + operator);
          }
        }
      }
    }
  }
  //console.log("GOINGGGG");
  return { query: tempquery, havenearoccured: havenearoccured };
}

function makeFinalQuery(
  strArr,
  varhavenearoccured = 0,
  multiOperator = "AND",
  span = -1
) {
  //console.log(multiOperator);
  //console.log(span);
  //console.log("span");
  // return;
  const finalQueryArr = [];
  tempqueryArr = [];
  let havenearoccured = varhavenearoccured;
  //console.log("------------------makeFinalQuery");
  //console.log(strArr);
  //console.log(multiOperator);
  //console.log(span);
  //console.log("span");
  if (span != -1) {
    havenearoccured = 1;
  }
  tempqueryArr = makeElasticQuery2(
    strArr,
    havenearoccured,
    multiOperator,
    span
  );
  //console.log(JSON.stringify(tempqueryArr));
  return tempqueryArr.query;
}

module.exports = { EQLgenerator };
