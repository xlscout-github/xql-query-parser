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

# CJK Radicals Supplement \u2E80-\u2EFF
# Kangxi Radicals \u2F00-\u2FDF
# CJK Symbols and Punctuation \u3000-\u303F
# CJK Strokes \u31C0-\u31EF
# Enclosed CJK Letters and Months \u3200-\u32FF
# CJK Compatibility \u3300-\u33FF
# CJK Compatibility Ideographs \uF900-\uFAFF
# CJK Compatibility Forms \uFE30-\uFE4F
# CJK Unified Ideographs Extension A \u3400-\u4DBF
# CJK Unified Ideographs \u4E00-\u9FFF
# Vertical Forms \uFE10-\uFE1F
# Hiragana \u3040-\u309F
# Katakana \u30A0-\u30FF
# Katakana Phonetic Extensions \u31F0-\u31FF
# Kanbun \u3190-\u319F
# Hangul Syllables \uAC00-\uD7AF
# Hangul Jamo \u1100-\u11FF
# Hangul Compatibility Jamo \u3130-\u318F
# Hangul Jamo Extended-A \uA960-\uA97F
# Hangul Jamo Extended-B \uD7B0-\uD7FF
# Halfwidth and Fullwidth Forms \uFF00-\uFFEF

# Latin-1 Supplement \u0080-\u00FF

# General Punctuation \u2000-\u206f

# Normal Value Basic Latin
# ASCII punctuation and symbols \u0021\u0023-\u0026\u002A-\u002F
# ASCII digits \u0030-\u0039
# ASCII punctuation and symbols \u003B-\u0040
# Uppercase Latin alphabet \u0041-\u005A
# ASCII punctuation and symbols \u005C\u005E-\u0060
# Lowercase Latin alphabet \u0061-\u007A
# ASCII punctuation and symbols \u007B-\u007E
NVAL -> [\u0021\u0023-\u0026\u002A-\u002F\u0030-\u0039\u003B-\u0040\u0041-\u005A\u005C\u005E-\u0060\u0061-\u007A\u007B-\u007E\u2000-\u206f\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u31C0-\u31EF\u3200-\u32FF\u3300-\u33FF\uF900-\uFAFF\uFE30-\uFE4F\u3400-\u4DBF\u4E00-\u9FFF\uFE10-\uFE1F\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3190-\u319F\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF\uFF00-\uFFEF\u0080-\u00FF]:+ {% d => d[0].join("") %}

# Single Quotation Value Basic Latin
# C0 controls \u000A
# ASCII punctuation and symbols \u0020-\u0026\u0028-\u002F
# ASCII digits \u0030-\u0039
# ASCII punctuation and symbols \u003A-\u0040
# Uppercase Latin alphabet \u0041-\u005A
# ASCII punctuation and symbols \u005B-\u0060
# Lowercase Latin alphabet \u0061-\u007A
# ASCII punctuation and symbols \u007B-\u007E
SSVAL -> [\u000A\u0020-\u0026\u0028-\u002F\u0030-\u0039\u003A-\u0040\u0041-\u005A\u005B-\u0060\u0061-\u007A\u007B-\u007E\u2000-\u206f\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u31C0-\u31EF\u3200-\u32FF\u3300-\u33FF\uF900-\uFAFF\uFE30-\uFE4F\u3400-\u4DBF\u4E00-\u9FFF\uFE10-\uFE1F\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3190-\u319F\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF\uFF00-\uFFEF\u0080-\u00FF]:+ {% d => d[0].join("") %}

# Double Quotation Value Basic Latin
# C0 controls \u000A
# ASCII punctuation and symbols \u0020-\u0021\u0023-\u002F
# ASCII digits \u0030-\u0039
# ASCII punctuation and symbols \u003A-\u0040
# Uppercase Latin alphabet \u0041-\u005A
# ASCII punctuation and symbols \u005B-\u0060
# Lowercase Latin alphabet \u0061-\u007A
# ASCII punctuation and symbols \u007B-\u007E
DSVAL -> [\u000A\u0020-\u0021\u0023-\u002F\u0030-\u0039\u003A-\u0040\u0041-\u005A\u005B-\u0060\u0061-\u007A\u007B-\u007E\u2000-\u206f\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u31C0-\u31EF\u3200-\u32FF\u3300-\u33FF\uF900-\uFAFF\uFE30-\uFE4F\u3400-\u4DBF\u4E00-\u9FFF\uFE10-\uFE1F\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3190-\u319F\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF\uFF00-\uFFEF\u0080-\u00FF]:+ {% d => d[0].join("") %}

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
