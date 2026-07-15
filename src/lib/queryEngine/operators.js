/** The only place that knows how an operator becomes SurrealQL. */
const infix = operator => ({
  lhs,
  rhs
}) => `${lhs} ${operator} ${rhs}`;
export const OPERATORS = Object.freeze({
  "IS NONE": {
    label: "is empty",
    rhs: "none",
    types: ["*"],
    emit: ({
      lhs
    }) => `${lhs} IS NONE`
  },
  "IS NOT NONE": {
    label: "is not empty",
    rhs: "none",
    types: ["*"],
    emit: ({
      lhs
    }) => `${lhs} IS NOT NONE`
  },
  "=": {
    label: "equals",
    rhs: "scalar",
    types: ["*"],
    emit: infix("=")
  },
  "!=": {
    label: "does not equal",
    rhs: "scalar",
    types: ["*"],
    emit: infix("!=")
  },
  ">": {
    label: "is greater than",
    rhs: "scalar",
    types: ["number", "datetime"],
    emit: infix(">")
  },
  "<": {
    label: "is less than",
    rhs: "scalar",
    types: ["number", "datetime"],
    emit: infix("<")
  },
  ">=": {
    label: "is at least",
    rhs: "scalar",
    types: ["number", "datetime"],
    emit: infix(">=")
  },
  "<=": {
    label: "is at most",
    rhs: "scalar",
    types: ["number", "datetime"],
    emit: infix("<=")
  },
  "?=": {
    label: "matches (fuzzy)",
    rhs: "scalar",
    types: ["string"],
    emit: infix("?=")
  },
  "STARTS WITH": {
    label: "starts with",
    rhs: "scalar",
    types: ["string"],
    emit: ({
      lhs,
      rhs
    }) => `string::starts_with(${lhs}, ${rhs})`
  },
  "ENDS WITH": {
    label: "ends with",
    rhs: "scalar",
    types: ["string"],
    emit: ({
      lhs,
      rhs
    }) => `string::ends_with(${lhs}, ${rhs})`
  },
  CONTAINS: {
    label: "contains",
    rhs: "scalar",
    types: ["string", "array"],
    valueType: "item",
    emit: infix("CONTAINS")
  },
  CONTAINSNOT: {
    label: "does not contain",
    rhs: "scalar",
    types: ["string", "array"],
    valueType: "item",
    emit: infix("CONTAINSNOT")
  },
  IN: {
    label: "is one of",
    rhs: "array",
    types: ["string", "number", "boolean", "datetime", "record"],
    emit: infix("IN")
  },
  "NOT IN": {
    label: "is not one of",
    rhs: "array",
    types: ["string", "number", "boolean", "datetime", "record"],
    emit: infix("NOT IN")
  },
  CONTAINSANY: {
    label: "contains any of",
    rhs: "array",
    types: ["array"],
    valueType: "item",
    emit: infix("CONTAINSANY")
  },
  CONTAINSALL: {
    label: "contains all of",
    rhs: "array",
    types: ["array"],
    valueType: "item",
    emit: infix("CONTAINSALL")
  },
  CONTAINSNONE: {
    label: "contains none of",
    rhs: "array",
    types: ["array"],
    valueType: "item",
    emit: infix("CONTAINSNONE")
  },
  INSIDE: {
    label: "is between",
    rhs: "range",
    types: ["number", "datetime"],
    emit: ({
      lhs,
      range
    }) => `${lhs} INSIDE ${range.min}..${range.max}`
  },
  // `OUTSIDE` is the UI label. `NOTINSIDE` is SurrealQL's range-safe inverse
  // relation (whereas OUTSIDE itself is reserved for geometry values).
  OUTSIDE: {
    label: "is outside",
    rhs: "range",
    types: ["number", "datetime"],
    emit: ({
      lhs,
      range
    }) => `${lhs} NOTINSIDE ${range.min}..${range.max}`
  }
});
export const OPERATOR_NAMES = Object.freeze(Object.keys(OPERATORS));
export const hasOperator = name => Object.hasOwn(OPERATORS, name);
export const getOperator = name => OPERATORS[name];
export const isOperatorAllowed = (fieldType, operator) => {
  const definition = getOperator(operator);
  return !!definition && (definition.types.includes("*") || definition.types.includes(fieldType));
};
