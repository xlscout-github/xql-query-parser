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
    let groupQuery = { bool: { must: [], should: [], must_not: [] } };
    groupQuery["bool"]["must"].push(outputArr["queryArray"]);
    outputArr["queryArray"] = groupQuery;
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
  for (let j = 0; j < mySearchArr.length; j++) {
    let currentField = mySearchArr[j]["key"];
    let modifiedQuery = mySearchArr[j].val;
    let str = "";
    if (
      currentField === "multi" &&
      "child" in mySearchArr[j] &&
      mySearchArr[j].child.length > 0
    ) {
      //  // console.log("***multi key");
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
      //  // console.log("***invalid case");
      // nothing to do, let it go as it is
    } else if (
      currentField !== "" &&
      currentField !== "multi" &&
      modifiedQuery === "multi" &&
      "child" in mySearchArr[j] &&
      mySearchArr[j].child.length > 0
    ) {
      // console.log("***multi value");
      output = makeSingleQuery(mySearchArr[j].child, mySearchArr[j].opt);
      if (
        "proximityOperatorOccured" in output &&
        output["proximityOperatorOccured"] == "false" &&
        output["query"] != ""
      ) {
        modifiedQuery = output["query"].trim();
        str = "(" + currentField + ":(" + modifiedQuery + "))";
        const temp = {};
        temp.query_string = {};
        temp.query_string = {
          default_operator: "AND",
          query: str,
          analyze_wildcard: true,
        };
        qry = temp;
      } else {
        const nearOccurence = 0;
        temphavenearoccured = 0;
        if (span != -1) {
          temphavenearoccured = 1;
        } else {
          temphavenearoccured = 0;
        }
        if ("span" in mySearchArr[j]) {
          tempspan = mySearchArr[j]["span"];
          if (tempspan.toLowerCase() == "p") {
            tempspan = "50";
          } else if (tempspan.toLowerCase() == "s") {
            tempspan = "15";
          }
        } else {
          tempspan = -1;
        }
        Tempreturnarr = makeFinalQuery(
          mySearchArr[j].child,
          temphavenearoccured,
          mySearchArr[j].opt,
          tempspan
        );
        qry = Tempreturnarr;
      }
    } else {
      //  // console.log("making single query");
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
          temp.query_string = {
            default_operator: "AND",
            query: str,
            analyze_wildcard: true,
          };
          qry = temp;
        }
      } else {
        const temp = {};
        let tempDate;
        temp.range = {};
        temp.range[currentField] = {};
        if (modifiedQuery.from != "*") {
          temp.range[currentField].gte = modifiedQuery.from;
        }
        if (modifiedQuery.to != "*") {
          temp.range[currentField].lte = modifiedQuery.to;
        }

        qry = temp;
      }
    }

    if (validations === 0) {
      break;
    }
    if (j === 0) {
      switch (operator) {
        case "AND":
        case "OR":
        case "NOT":
          groupQuery.bool.must.push(qry);
          break;

        // case "OR":
        //   groupQuery.bool.should.push(qry);
        //    // console.log(JSON.stringify(groupQuery));
        //   break;

        // case "NOT":
        //   groupQuery.bool.must_not.push(qry);
        //    // console.log(JSON.stringify(groupQuery));

        //   break;

        case "PRE":
        case "pre":
          groupQuery.span_near.clauses.push(qry);
          groupQuery.span_near.in_order = "true";
          if (span.toLowerCase() == "p") {
            span = "50";
          } else if (span.toLowerCase() == "s") {
            span = "15";
          }
          groupQuery.span_near.slop = span;
          break;

        case "NEAR":
        case "near":
          if (span.toLowerCase() == "p") {
            span = "50";
          } else if (span.toLowerCase() == "s") {
            span = "15";
          }
          groupQuery.span_near.clauses.push(qry);
          groupQuery.span_near.in_order = "false";
          groupQuery.span_near.slop = span;
          break;
      }
    } else {
      let tempQueryArray = {};
      tempQueryArray = { bool: { must: [], should: [], must_not: [] } };

      switch (operator) {
        case "AND":
          tempQueryArray.bool.must.push(qry);
          tempQueryArray.bool.must.push(groupQuery);
          groupQuery = tempQueryArray;
          break;

        case "OR":
          tempQueryArray.bool.should.push(qry);
          tempQueryArray.bool.should.push(groupQuery);
          groupQuery = tempQueryArray;
          break;

        case "NOT":
          tempQueryArray = groupQuery;
          groupQuery.bool.must_not.push(qry);
          groupQuery = tempQueryArray;
          break;

        case "PRE":
        case "pre":
          groupQuery.span_near.clauses.push(qry);
          groupQuery.span_near.in_order = "true";
          if (span.toLowerCase() == "p") {
            span = "50";
          } else if (span.toLowerCase() == "s") {
            span = "15";
          }
          groupQuery.span_near.slop = span;
          break;

        case "NEAR":
        case "near":
          groupQuery.span_near.clauses.push(qry);
          groupQuery.span_near.in_order = "false";
          if (span.toLowerCase() == "p") {
            span = "50";
          } else if (span.toLowerCase() == "s") {
            span = "15";
          }
          groupQuery.span_near.slop = span;
          break;
      }
    }
  }
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
    value: value.toLowerCase(),
    rewrite: "top_terms_4092",
  };
  return wildcardquery;
}

function maketermQuery(field, value) {
  const x = {};
  x.span_term = {};
  if (value.indexOf('"') != -1) {
    //no conversion of '"' encountered
  } else {
    value = value.toLowerCase();
  }
  x.span_term[field] = value;
  return x;
}

function checkNearoccurence(strArr) {
  // // console.log(strArr);
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
  if (havenearoccured === 0 && span != -1) {
    havenearoccured = 1;
  }
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
    currentObj.position = "first";
    multiOperand.push(currentObj);
  } else {
    currentObj.position = "first";
    nonmultiOperand.push(currentObj);
  }

  if (
    nextObj.key !== "" &&
    nextObj.key !== "multi" &&
    nextObj.val === "multi" &&
    "child" in nextObj &&
    nextObj.child.length > 0
  ) {
    nextObj.position = "second";
    multiOperand.push(nextObj);
  } else {
    nextObj.position = "second";
    nonmultiOperand.push(nextObj);
  }
  if (multiOperand.length > 0) {
    firstOperand = multiOperand[0];
    tempqueryArr1 = makeFinalQuery(
      firstOperand.child,
      havenearoccured,
      firstOperand.opt,
      firstOperand.span
    );

    // console.log(multiOperand.length);
    // console.log(nonmultiOperand.length);
    if (multiOperand.length == 2) {
      secondOperand = multiOperand[1];
      if (havenearoccured === 0) {
        if (span != -1) {
          havenearoccured = 1;
        }
      }
      tempqueryArr2 = makeFinalQuery(
        secondOperand.child,
        havenearoccured,
        secondOperand.opt,
        secondOperand.span
      );
      if (havenearoccured === 1) {
        if (span != -1) {
          // #querytotest- ((ttl:((smart pre1 (watch OR watches)) NEAR5 (wearable* OR device*))) AND pd: [20000101 TO 20210910])
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
          if (span.toLowerCase() == "p") {
            span = "50";
          } else if (span.toLowerCase() == "s") {
            span = "15";
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
        }
      } else {
        tempquery = { bool: { must: [] } };
        if (operator == "AND") {
          //#querytotest- ((text:((smart NEAR2 (wearable OR wearables OR watch OR watches)) AND (heart NEAR2 rate))) NOT (tac:(smart NEAR2 (wearable OR wearables))) OR (tac:(smart NEAR4 (watch OR watches))))
          tempquery.bool.must.push(tempqueryArr1);
          tempquery.bool.must.push(tempqueryArr2);
        } else if (operator === "OR") {
          //#querytotest- (text: ((silicone* OR (("r2sio") AND x) OR (poly pre1 siloxane) OR siloxane* OR polysilioxane*))) AND ((pa: ((dow OR wacker OR momenteo))))
          tempquery = { bool: { should: [] } };
          tempquery.bool.should.push(tempqueryArr1);
          tempquery.bool.should.push(tempqueryArr2);
        } else if (operator == "NOT") {
          tempquery = { bool: { must: [], must_not: [] } };
          tempquery.bool.must.push(tempqueryArr1);
          tempquery.bool.must_not.push(tempqueryArr2);
        } else {
          // console.log("operator");
          // console.log(operator);
          // console.log("SOMEE UNCOVERED CASE");
        }
      }
    } else if (nonmultiOperand.length > 0) {
      secondOperand = nonmultiOperand[0];
      searchValue = secondOperand.val;
      searchfield = secondOperand.key;
      searchPosition = secondOperand.position;

      if (havenearoccured === 1) {
        if (operator == "OR") {
          // #querytotest- (text:((smart NEAR2 (wearable OR wearables OR watch OR watches)) AND (heart NEAR2 rate)))
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
          if (searchPosition == "first") {
            tempquery.span_or.clauses.push(tempqry);
            tempquery.span_or.clauses.push(tempqueryArr1);
          } else {
            tempquery.span_or.clauses.push(tempqueryArr1);
            tempquery.span_or.clauses.push(tempqry);
          }
        } else if (span != -1) {
          //#querytotest- ttl:abc NEAR5 (lithium OR battery) near10 (battery OR cell)
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
          if (searchPosition == "first") {
            tempquery.span_near.clauses.push(tempqry);
            tempquery.span_near.clauses.push(tempqueryArr1);
          } else {
            tempquery.span_near.clauses.push(tempqueryArr1);
            tempquery.span_near.clauses.push(tempqry);
          }

          if (operator.toLowerCase() == "pre") {
            tempquery.span_near.in_order = "true";
          } else {
            if (span === "0") {
              tempquery.span_near.in_order = "true"; // case of inverted commas converted to near0
            } else {
              tempquery.span_near.in_order = "false";
            }
          }
          if (span.toLowerCase() == "p") {
            span = "50";
          } else if (span.toLowerCase() == "s") {
            span = "15";
          }
          tempquery.span_near.slop = span;
        } else {
          // // console.log("irrelevant case yhaa");
        }
      } else {
        str = "(" + searchfield + ":(" + searchValue + "))";
        tempqry = {
          query_string: {
            default_operator: "AND",
            query: str,
            analyze_wildcard: true,
          },
        };
        tempquery = { bool: { must: [] } };

        if (operator == "AND") {
          tempquery = { bool: { must: [] } };
          tempquery.bool.must.push(tempqueryArr1);
          tempquery.bool.must.push(tempqry);
        } else if (operator === "OR") {
          // #querytotest- (text: ((silicone* OR (("r2sio") AND x) OR (poly pre1 siloxane) OR siloxane* OR polysilioxane*))) AND ((pa: ((dow OR wacker OR momenteo))))
          tempquery = { bool: { should: [] } };
          tempquery.bool.should.push(tempqueryArr1);
          tempquery.bool.should.push(tempqry);
        } else if (operator == "NOT") {
          // #querytotest- (tac:(abc NOT (def OR (ghi OR abcd)) NOT (efg NOT abc)))
          tempquery = { bool: { must_not: [], must: [] } };
          if (searchPosition == "first") {
            tempquery.bool.must.push(tempqry);
            tempquery.bool.must_not.push(tempqueryArr1);
          } else {
            tempquery.bool.must.push(tempqueryArr1);
            tempquery.bool.must_not.push(tempqry);
          }
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

    if (havenearoccured == 1) {
      if (
        nextObj.key !== "" &&
        nextObj.key !== "multi" &&
        nextObj.val === "multi" &&
        "child" in nextObj &&
        nextObj.child.length > 0
      ) {
        // nextOpt = nextObj.opt;

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

          if (span === "0") {
            tempquery.span_near.in_order = "true"; // case of inverted commas converted to near0
          } else {
            tempquery.span_near.in_order = "false";
          }
          if (span.toLowerCase() == "p") {
            span = "50";
          } else if (span.toLowerCase() == "s") {
            span = "15";
          }
          tempquery.span_near.slop = span;
        } else {
        }
      } else {
        if (operator == "OR") {
          // #querytotest- ttl:abc NEAR5 (lithium OR battery) near10 (battery OR cell)
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
          // #querytotest- ttl:abc NEAR5 (lithium OR battery) near10 (battery near5 cell)
          // #querytotest- ttl:abc OR (lithium near6 battery) near10 (battery near5 cell)
          starIndex = searchValue.indexOf("*");
          questionMarkIndex = searchValue.indexOf("?");
          // making current query part
          if (starIndex !== -1 || questionMarkIndex !== -1) {
            tempqry = makeWildCardSpanQuery(searchfield, searchValue);
          } else {
            tempqry = maketermQuery(searchfield, searchValue);
          }
          // // console.log(JSON.stringify(tempqry));
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
          if (span.toLowerCase() == "p") {
            span = "50";
          } else if (span.toLowerCase() == "s") {
            span = "15";
          }
          tempquery.span_near.slop = span;
          // // console.log("finalq uery here is ");
          // // console.log(JSON.stringify(tempquery, 0, 2));
        } else {
        }
      }
    } else {
      if (
        nextObj.key !== "" &&
        nextObj.key !== "multi" &&
        nextObj.val === "multi" &&
        "child" in nextObj &&
        nextObj.child.length > 0
      ) {
        str = "(" + searchfield + ":(" + searchValue + "))";
        tempqry = {
          query_string: {
            default_operator: "AND",
            query: str,
            analyze_wildcard: true,
          },
        };
        tempqry2 = makeFinalQuery(
          nextObj.child,
          havenearoccured,
          nextObj.opt,
          nextObj.span
        );
        if (operator == "AND") {
          tempquery2 = { bool: { must: [] } };
          tempquery2.bool.must.push(tempqry2);
          tempquery2.bool.must.push(tempqry);
        } else if (operator == "OR") {
          tempquery2 = { bool: { should: [] } };
          tempquery2.bool.should.push(tempqry2);
          tempquery2.bool.should.push(tempqry);
        } else if (operator == "NOT") {
          tempquery2 = { bool: { must: [], must_not: [] } };
          tempquery2.bool.must.push(tempqry);
          tempquery2.bool.must_not.push(tempqry2);
        } else {
          // // console.log("breaking heree ");
          //tocover and check case
        }
        tempquery = tempquery2;

        // // console.log("query");
        // // console.log(JSON.stringify(tempquery, 0, 2));
      } else {
        // nextobj val is not multi
        if (span != -1) {
          // both are non multi and operator is proximity
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
          // // console.log("-----------------finalq uery here is ");

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
          if (span.toLowerCase() == "p") {
            span = "50";
          } else if (span.toLowerCase() == "s") {
            span = "15";
          }
          tempquery.span_near.slop = span;
          // // console.log("-----------------finalq uery here is ");
          // // console.log(JSON.stringify(tempquery, 0, 2));
        } else {
          //both are non multi and operator is not proximity
          str = "(" + searchfield + ":(" + searchValue + "))";
          tempqry = {
            query_string: {
              default_operator: "AND",
              query: str,
              analyze_wildcard: true,
            },
          };
          let tempqry2;
          if (operator == "OR") {
            // #querytotest- ((tac:(autonomous NEAR2 (vehicle* OR car OR cars OR automobile*))) NOT tac:(manual NEAR2 (transmission OR gear*)))
            //#querytotest - (text: smart or (watch or watches))
            str = "(" + nextObj.key + ":(" + nextObj.val + "))";
            tempqry2 = {
              query_string: {
                default_operator: "AND",
                query: str,
                analyze_wildcard: true,
              },
            };
            tempquery2 = { bool: { should: [] } };
            tempquery2.bool.should.push(tempqry);
            tempquery2.bool.should.push(tempqry2);
            tempquery = tempquery2;
          } else if (operator == "NOT") {
            // #querytotest- (text: smart or (watch not watches))
            // #querytotest- (tac:(abc OR def NOT (efg NOT abc)))
            str = "(" + nextObj.key + ":(" + nextObj.val + "))";
            tempqry2 = {
              query_string: {
                default_operator: "AND",
                query: str,
                analyze_wildcard: true,
              },
            };
            tempquery2 = { bool: { must_not: [], must: [] } };

            tempquery2.bool.must.push(tempqry);
            tempquery2.bool.must_not.push(tempqry2);
            tempquery = tempquery2;
          } else if (operator == "AND") {
            // #querytotest- (text: ((silicone* OR (("r2sio") AND x) OR (poly pre1 siloxane) OR siloxane* OR polysilioxane*))) AND ((pa: ((dow OR wacker OR momenteo))))
            // #querytotest-(text: smart or (watch AND watches))
            str = "(" + nextObj.key + ":(" + nextObj.val + "))";
            tempqry2 = {
              query_string: {
                default_operator: "AND",
                query: str,
                analyze_wildcard: true,
              },
            };
            tempquery2 = { bool: { must: [] } };
            tempquery2.bool.must.push(tempqry);
            tempquery2.bool.must.push(tempqry2);
            tempquery = tempquery2;
            // // console.log("nextopt - os " + operator);
          }
        }
      }
    }
  }
  // // console.log("GOINGGGG");
  return { query: tempquery, havenearoccured: havenearoccured };
}

function makeFinalQuery(
  strArr,
  varhavenearoccured = 0,
  multiOperator = "AND",
  span = -1
) {
  // // console.log(multiOperator);
  // // console.log(span);
  // // console.log("span");
  // return;
  const finalQueryArr = [];
  tempqueryArr = [];
  let havenearoccured = varhavenearoccured;
  // // console.log("------------------makeFinalQuery");
  // // console.log(strArr);
  // // console.log(multiOperator);
  // // console.log(span);
  // // console.log("span");
  if (span != -1) {
    havenearoccured = 1;
  }
  tempqueryArr = makeElasticQuery2(
    strArr,
    havenearoccured,
    multiOperator,
    span
  );
  // // console.log(JSON.stringify(tempqueryArr));
  return tempqueryArr.query;
}

function makeSingleQuery(strArr, qryoperator, query = "") {
  returnArr = { proximityOperatorOccured: "false", query: query };
  for (var i = 0; i < strArr.length; i++) {
    if ("opt" in strArr[i]) {
      if (
        strArr[i]["opt"].toLowerCase() == "or" ||
        strArr[i]["opt"].toLowerCase() == "and" ||
        strArr[i]["opt"].toLowerCase() == "not"
      ) {
        if (strArr[i]["val"] == "multi") {
          returnArr = makeSingleQuery(strArr[i]["child"], strArr[i]["opt"]);
          if (returnArr["proximityOperatorOccured"] == "true") {
            return returnArr;
          } else {
            if (returnArr["query"] != "") {
              if (query == "") {
                query = returnArr["query"];
              } else {
                query = query + " " + qryoperator + " " + returnArr["query"];
              }
            }
          }
        } else {
          query = query + strArr[i]["val"];
        }
      } else if (
        strArr[i]["opt"].toLowerCase() == "pre" ||
        strArr[i]["opt"].toLowerCase() == "near"
      ) {
        returnArr["proximityOperatorOccured"] = "true";
      } else {
        query = "(" + query + " " + qryoperator + " " + strArr[i]["val"] + ")";
      }
    } else {
      if (query.trim() == "") {
        query = strArr[i]["val"];
      } else {
        query = "(" + query + " " + qryoperator + " " + strArr[i]["val"] + ")";
      }
    }
  }
  if (returnArr["proximityOperatorOccured"] == "false") {
    returnArr["query"] = query;
  }
  return returnArr;
}
module.exports = { EQLgenerator };
