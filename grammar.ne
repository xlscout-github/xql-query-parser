@builtin "whitespace.ne" # Whitespace: `_` is optional, `__` is mandatory.

@{%

function setField(field, value) {
  if (typeof value === "object" && value !== null && value.leftOperand && value.rightOperand) {
    value.leftOperand = setField(field, value.leftOperand);
    value.rightOperand = setField(field, value.rightOperand);

    return value;
  } else  {
    return { ...value, field };
  }
}

function setDefaultField(value, field = "text") {
  // DATE VALUE
  if (typeof value === "object" && value !== null && value.type === "DATE") {
    return {...value, field}
  }

  // STRING VALUE
  return { field, value };
}

%}

main -> P {% id %} |
        main __ OP __ P 
        {% 
        d => ({
            operator: d[2].toUpperCase(), 
            leftOperand: d[0], 
            rightOperand: d[4]
            }) 
        %}

# Parentheses
P -> "(" _ F _ ")" {% d => d[2] %} |
     "(" _ V _ ")" {% d => d[2] %} |
     VAL {% d => setDefaultField(d[0]) %}

# Field
F -> FIELD _ ":" _ V {% d => setField(d[0], d[4]) %}

# Operator
OP -> AND {% id %} |
      OR {% id %} |
      NOT {% id %} |
      NEAR NUM {% d => d[0] + d[1] %} |
      PRE NUM {% d => d[0] + d[1] %}

AND -> "and" {% id %} |
       "AND" {% id %}

OR -> "or" {% id %} |
       "OR" {% id %}

NOT -> "not" {% id %} |
       "NOT" {% id %}

NEAR -> "near" {% id %} |
       "NEAR" {% id %}

PRE -> "pre" {% id %} |
       "PRE" {% id %}

# Value
V -> V __ OP __ P 
      {% 
      d => ({
          operator: d[2].toUpperCase(),
          leftOperand: d[0],
          rightOperand: d[4]
        })
      %} |
      P {% id %}

# Value Content
VAL ->
    NVAL {% id %} |
    "\"" SVAL "\"" {% d => d[0] + d[1] + d[2] %} |
    "'" SVAL "'" {% d => d[0] + d[1] + d[2] %} |
    "[" _ NUM __ TO __ NUM _ "]" {% d => ({ type: "DATE", from: d[2], to: d[6]}) %}

NVAL -> [-+\w.?*/\\]:+ {% d => d[0].join("") %}

SVAL -> [-+\w.?*\s/\\]:+ {% d => d[0].join("") %}

TO -> "to" {% id %} | 
      "TO" {% id %}                           

# Field Content
FIELD ->
    [a-zA-Z]:+ {% d => d[0].join("") %} |
    [a-zA-Z]:+ SEPERATOR FIELD {% d => d[0].join("") + d[1] + d[2] %}

# Field Seperator
SEPERATOR -> "." {% id %} |
             "-" {% id %}

# Number
NUM ->
    [0-9]:+ {% d => d[0].join("") %}