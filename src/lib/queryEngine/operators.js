/** The only place that knows how an operator becomes SurrealQL. */
const infix = operator => ({
  lhs,
  rhs
}) => `${lhs} ${operator} ${rhs}`;
export const OPERATORS = Object.freeze({
  "IS NONE": {
    rhs: "none",
    types: ["*"],
    emit: ({
      lhs
    }) => `${lhs} IS NONE`
  },
  "IS NOT NONE": {
    rhs: "none",
    types: ["*"],
    emit: ({
      lhs
    }) => `${lhs} IS NOT NONE`
  },
  "=": {
    rhs: "scalar",
    types: ["*"],
    emit: infix("=")
  },
  "!=": {
    rhs: "scalar",
    types: ["*"],
    emit: infix("!=")
  },
  ">": {
    rhs: "scalar",
    types: ["number", "datetime"],
    emit: infix(">")
  },
  "<": {
    rhs: "scalar",
    types: ["number", "datetime"],
    emit: infix("<")
  },
  ">=": {
    rhs: "scalar",
    types: ["number", "datetime"],
    emit: infix(">=")
  },
  "<=": {
    rhs: "scalar",
    types: ["number", "datetime"],
    emit: infix("<=")
  },
  "?=": {
    rhs: "scalar",
    types: ["string"],
    emit: infix("?=")
  },
  "STARTS WITH": {
    rhs: "scalar",
    types: ["string"],
    emit: ({
      lhs,
      rhs
    }) => `string::starts_with(${lhs}, ${rhs})`
  },
  "ENDS WITH": {
    rhs: "scalar",
    types: ["string"],
    emit: ({
      lhs,
      rhs
    }) => `string::ends_with(${lhs}, ${rhs})`
  },
  CONTAINS: {
    rhs: "scalar",
    types: ["string", "array"],
    valueType: "item",
    emit: infix("CONTAINS")
  },
  CONTAINSNOT: {
    rhs: "scalar",
    types: ["string", "array"],
    valueType: "item",
    emit: infix("CONTAINSNOT")
  },
  IN: {
    rhs: "array",
    types: ["string", "number", "boolean", "datetime", "record"],
    emit: infix("IN")
  },
  "NOT IN": {
    rhs: "array",
    types: ["string", "number", "boolean", "datetime", "record"],
    emit: infix("NOT IN")
  },
  CONTAINSANY: {
    rhs: "array",
    types: ["array"],
    valueType: "item",
    emit: infix("CONTAINSANY")
  },
  CONTAINSALL: {
    rhs: "array",
    types: ["array"],
    valueType: "item",
    emit: infix("CONTAINSALL")
  },
  CONTAINSNONE: {
    rhs: "array",
    types: ["array"],
    valueType: "item",
    emit: infix("CONTAINSNONE")
  },
  INSIDE: {
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
