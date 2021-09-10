@builtin "whitespace.ne"

@{%

function setField(field, value) {
  if (value === null) return null;
  else if (value.leftOperand || value.rightOperand) {
    if (value.leftOperand) {
      value.leftOperand = setField(field, value.leftOperand);
    }
    if (value.rightOperand) {
      value.rightOperand = setField(field, value.rightOperand);
    }
  } else {
    return { ...value, field };
  }

  return value;
}

function setDefaultField(value, field = "text") {
  // DATE VALUE
  if (typeof value === "object" && value.type === "DATE") {
    return { ...value, field };
  }

  // STRING VALUE
  return { field, value };
}

%}

main -> P {% id %} |
        main __ OP __ P 
        {% 
        (d) => {
          if (typeof d[2] === "object" && d[2].type && d[2].span) {
            return {
              operator: d[2].type.toUpperCase(),
              span: d[2].span,
              leftOperand: d[0],
              rightOperand: d[4],
            };
          }
          return {
            operator: d[2].toUpperCase(),
            leftOperand: d[0],
            rightOperand: d[4],
          };
        }
        %}

# Parentheses
P -> "(" _ F _ ")" {% (d) => d[2] %} |
     "(" _ V _ ")" 
     {% 
     ([, , val]) => {
       if (val != null) {
         return { ...val, explicit: true };
       } else {
         return null;
       }
      } 
     %} |
     "(" _ ")" {% (d) => null %} |
     VAL {% (d) => setDefaultField(d[0]) %}

# Field
F -> FIELD _ ":" _ V {% (d) => setField(d[0], d[4]) %}

# Operator
OP -> AND {% id %} |
      OR {% id %} |
      NOT {% id %} |
      NEAR NUM {% (d) => ({ type: d[0], span: d[1] }) %} |
      NEAR PORS {% (d) => ({ type: d[0], span: d[1].toUpperCase() }) %} |
      PRE NUM {% (d) => ({ type: d[0], span: d[1] }) %} |
      PRE PORS {% (d) => ({ type: d[0], span: d[1].toUpperCase() }) %}

AND -> "and"i {% id %}

OR -> "or"i {% id %}

NOT -> "not"i {% id %}

NEAR -> "near"i {% id %}

PRE -> "pre"i {% id %}

PORS -> "p"i {% id %} |
        "s"i {% id %}

# Value
V -> V __ OP __ P 
      {% 
      (d) => {
        if (typeof d[2] === "object" && d[2].type && d[2].span) {
          return {
            operator: d[2].type.toUpperCase(),
            span: d[2].span,
            leftOperand: d[0],
            rightOperand: d[4],
          };
        }
        return {
          operator: d[2].toUpperCase(),
          leftOperand: d[0],
          rightOperand: d[4],
        };
      }
      %} |
     P {% id %}

# Value Content
VAL ->
    NVAL {% id %} |
    "\"" DSVAL "\"" {% (d) => d[0] + d[1] + d[2] %} |
    "'" SSVAL "'" {% (d) => d[0] + d[1] + d[2] %} |
    "[" _ NUMORSTAR __ TO __ NUMORSTAR _ "]" {% (d) => ({ type: "DATE", from: d[2], to: d[6] }) %}

NUMORSTAR -> NUM {% id %} |
             "*" {% id %}

# Normal Value
NVAL -> [^:\]\[()\s]:+ {% d => d[0].join("") %}

# Single Quotation Value
SSVAL -> [^']:+ {% d => d[0].join("") %}

# Double Quotation Value
DSVAL -> [^"]:+ {% d => d[0].join("") %}

TO -> "to"i {% id %}

# Field Content
FIELD ->
    [a-zA-Z*\\]:+ {% (d) => d[0].join("") %} |
    [a-zA-Z*\\]:+ SEPERATOR FIELD {% (d) => d[0].join("") + d[1] + d[2] %} |
    SEPERATOR FIELD {% (d) => d[0] + d[1] %} |
    FIELD SEPERATOR {% (d) => d[0] + d[1] %}

# Field Seperator
SEPERATOR -> "." {% id %} |
             "-" {% id %} |
             "_" {% id %}

# Number
NUM ->
    [0-9]:+ {% (d) => d[0].join("") %}
