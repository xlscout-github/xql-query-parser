@builtin "whitespace.ne"

@{%

function setField(field, value) {
  if (value.leftOperand || value.rightOperand) {
    if (value.leftOperand) {
      value.leftOperand = setField(field, value.leftOperand)
    }
    if (value.rightOperand) {
      value.rightOperand = setField(field, value.rightOperand)
    }
  } else {
    return { ...value, field }
  }

  return value
}

function setDefaultField(value, field = "text") {
  // DATE VALUE
  if (typeof value === "object" && value.type === "DATE") {
    return { ...value, field }
  }

  // STRING VALUE
  return { field, value }
}

%}

main -> P {% id %}

# Parentheses
P -> "(" _ F _ ")" {% ([, , f]) => f %} |
     "(" _ V _ ")" {% ([, , val]) => ({ ...val, explicit: true }) %} |
     VAL {% ([v]) => setDefaultField(v) %}

# Field
F -> FIELD _ ":" _ V {% ([f, , , , v]) => setField(f, v) %}

# Operator
OP -> AND {% id %} |
      OR {% id %} |
      NOT {% id %} |
      NEAR NUM {% ([type, span]) => ({ type, span }) %} |
      NEAR PORS {% ([type, span]) => ({ type, span: span.toUpperCase() }) %} |
      PRE NUM {% ([type, span]) => ({ type, span }) %} |
      PRE PORS {% ([type, span]) => ({ type, span: span.toUpperCase() }) %}

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
      ([l, , o, , r]) => {
        if (typeof o === "object") {
          return {
            operator: o.type.toUpperCase(),
            span: o.span,
            leftOperand: l,
            rightOperand: r
          }
        }
        return {
          operator: o.toUpperCase(),
          leftOperand: l,
          rightOperand: r
        }
      }
      %} |
     P __ OP __ NOT __ V
     {%
      ([l, , o, , , , r]) => {
        if (typeof o === "object") {
          return {
            operator: o.type.toUpperCase(),
            span: o.span,
            leftOperand: l,
            rightOperand: {
              operator: "NOT",
              leftOperand: null,
              rightOperand: r
            }
          }
        }
        return {
          operator: o.toUpperCase(),
          leftOperand: l,
          rightOperand: {
            operator: "NOT",
            leftOperand: null,
            rightOperand: r
          }
        }
      }
      %} |
     NOT __ V 
      {%
      ([, , v]) => {
        return {
          operator: "NOT",
          leftOperand: null,
          rightOperand: v
        }
      }
      %} |
     P {% id %}

# Value Content
VAL ->
    KVAL {% id %} |
    "\"" QVAL "\"" {% ([, v]) => "\"" + v + "\"" %} |
    "[" _ NUMORSTAR __ TO __ NUMORSTAR _ "]" {% ([, , from, , , , to]) => ({ type: "DATE", from, to }) %}

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

# Latin-1 Supplement 
# Latin-1 Punctuation and Symbols \u00A0-\u00BF
# Letters \u00C0-\u00D6
# Mathematical operator \u00D7
# Letters \u00D8-\u00F6
# Mathematical operator \u00F7
# Letters \u00F8-\u00FF

# Latin Extended-A
# European Latin \u0100-\u0148
# Deprecated Letter \u0149
# European Latin \u014A-\u017F

# Latin Extended-B
# Non-European and historic Latin \u0180-\u01BF
# African letters for clicks \u01C0-\u01C3
# Croatian digraphs matching Serbian Cyrillic letters \u01C4-\u01CC
# Pinyin diacritic-vowel combinations \u01CD-\u01DC
# Phonetic and historic letters \u01DD-\u01FF
# Additions for Slovenian and Croatian \u0200-\u0217
# Additions for Romanian \u0218-\u021B
# Miscellaneous additions \u021C-\u0229
# Additions for Livonian \u022A-\u0233
# Additions for Sinology \u0234-\u0236
# Miscellaneous addition \u0237
# Additions for Africanist linguistics \u0238-\u0239
# Additions for Sencoten \u023A-\u023E
# Additions for Africanist linguistics \u023F-\u0240
# Miscellaneous additions \u0241-\u024F

# IPA Extensions
# IPA letters \u0250-\u02A8
# IPA characters disordered speech \u02A9-\u02AD
# Additions for Sinology \u02AE-\u02AF

# Spacing Modifier Letters \u02B0-\u02FF

# Greek and Coptic \u0370-\u03FF

# Phonetic Extensions \u1D00-\u1D7F

# Phonetic Extensions Supplement \u1D80-\u1DBF

# Latin Extended Additional \u1E00-\u1EFF

# Superscripts and Subscripts \u2070-\u209F

# Letterlike Symbols \u2100-\u214F

# Number Forms \u2150-\u218F

# Latin Extended-C \u2C60-\u2C7F

# Latin Extended-D \uA720-\uA7FF

# Latin Extended-E \uAB30-\uAB6F

# Alphabetic Presentation Forms \uFB00-\uFB4F

# General Punctuation \u2000-\u206f

# Keyword Value Basic Latin
# ASCII punctuation and symbols \u0021\u0023-\u0027\u002A-\u002F
# ASCII digits \u0030-\u0039
# ASCII punctuation and symbols \u003B-\u0040
# Uppercase Latin alphabet \u0041-\u005A
# ASCII punctuation and symbols \u005C\u005E-\u0060
# Lowercase Latin alphabet \u0061-\u007A
# ASCII punctuation and symbols \u007B-\u007E
KVAL -> [\u0021\u0023-\u0027\u002A-\u002F\u0030-\u0039\u003B-\u0040\u0041-\u005A\u005C\u005E-\u0060\u0061-\u007A\u007B-\u007E\u2000-\u206f\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u31C0-\u31EF\u3200-\u32FF\u3300-\u33FF\uF900-\uFAFF\uFE30-\uFE4F\u3400-\u4DBF\u4E00-\u9FFF\uFE10-\uFE1F\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3190-\u319F\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF\uFF00-\uFFEF\u00A0-\u00BF\u00C0-\u00D6\u00D7\u00D8-\u00F6\u00F7\u00F8-\u00FF\u0100-\u0148\u0149\u014A-\u017F\u0180-\u01BF\u01C0-\u01C3\u01C4-\u01CC\u01CD-\u01DC\u01DD-\u01FF\u0200-\u0217\u0218-\u021B\u021C-\u0229\u022A-\u0233\u0234-\u0236\u0237\u0238-\u0239\u023A-\u023E\u023F-\u0240\u0241-\u024F\u0250-\u02A8\u02A9-\u02AD\u02AE-\u02AF\u02B0-\u02FF\u0370-\u03FF\u1D00-\u1D7F\u1D80-\u1DBF\u1E00-\u1EFF\u2070-\u209F\u2100-\u214F\u2150-\u218F\u2C60-\u2C7F\uA720-\uA7FF\uAB30-\uAB6F\uFB00-\uFB4F]:+ {% d => d[0].join("") %}

# Quotation Value Basic Latin
# C0 controls \u000A
# ASCII punctuation and symbols \u0020-\u0021\u0023-\u002F
# ASCII digits \u0030-\u0039
# ASCII punctuation and symbols \u003A-\u0040
# Uppercase Latin alphabet \u0041-\u005A
# ASCII punctuation and symbols \u005B-\u0060
# Lowercase Latin alphabet \u0061-\u007A
# ASCII punctuation and symbols \u007B-\u007E
QVAL -> [\u000A\u0020-\u0021\u0023-\u002F\u0030-\u0039\u003A-\u0040\u0041-\u005A\u005B-\u0060\u0061-\u007A\u007B-\u007E\u2000-\u206f\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u31C0-\u31EF\u3200-\u32FF\u3300-\u33FF\uF900-\uFAFF\uFE30-\uFE4F\u3400-\u4DBF\u4E00-\u9FFF\uFE10-\uFE1F\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3190-\u319F\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF\uFF00-\uFFEF\u00A0-\u00BF\u00C0-\u00D6\u00D7\u00D8-\u00F6\u00F7\u00F8-\u00FF\u0100-\u0148\u0149\u014A-\u017F\u0180-\u01BF\u01C0-\u01C3\u01C4-\u01CC\u01CD-\u01DC\u01DD-\u01FF\u0200-\u0217\u0218-\u021B\u021C-\u0229\u022A-\u0233\u0234-\u0236\u0237\u0238-\u0239\u023A-\u023E\u023F-\u0240\u0241-\u024F\u0250-\u02A8\u02A9-\u02AD\u02AE-\u02AF\u02B0-\u02FF\u0370-\u03FF\u1D00-\u1D7F\u1D80-\u1DBF\u1E00-\u1EFF\u2070-\u209F\u2100-\u214F\u2150-\u218F\u2C60-\u2C7F\uA720-\uA7FF\uAB30-\uAB6F\uFB00-\uFB4F]:+ {% d => d[0].join("") %}

TO -> "to"i {% id %}

# Field Content
FIELD ->
    [a-zA-Z0-9*\\]:+ {% ([v]) => v.join("") %} |
    [a-zA-Z0-9*\\]:+ SEPERATOR FIELD {% ([v, s, f]) => v.join("") + s + f %} |
    SEPERATOR FIELD {% ([s, f]) => s + f %} |
    FIELD SEPERATOR {% ([f, s]) => f + s %}

# Field Seperator
SEPERATOR -> "." {% id %} |
             "-" {% id %} |
             "_" {% id %}

# Number
NUM ->
    [0-9]:+ {% ([n]) => n.join("") %}
