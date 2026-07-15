import { getOperator } from "./operators.js";

const isBlank = (value) =>
  (typeof value === "string" && value.trim() === "") ||
  value === null ||
  value === undefined;

export const fieldType = (field) =>
  field.type?.startsWith("array<") ? "array" : field.type;

export const itemType = (field) =>
  field.type?.match(/^array<(.+)>$/)?.[1] ||
  field.items ||
  field.innerType ||
  field.type;

export const operandType = (field, operator) =>
  fieldType(field) === "array" && getOperator(operator)?.valueType === "item"
    ? itemType(field)
    : fieldType(field);

export const emptyFilterValue = (operator) => {
  const rhs = getOperator(operator)?.rhs;
  if (rhs === "none") return null;
  if (rhs === "array") return [];
  if (rhs === "range") return ["", ""];
  return "";
};

export const defaultOperator = (field) =>
  field.defaultOperator ||
  field.operators.find((operator) => getOperator(operator)?.rhs === "scalar") ||
  field.operators[0];

export const filterEditorModel = (field, operator) => {
  const definition = getOperator(operator);
  if (!definition) return null;

  return {
    rhs: definition.rhs,
    operandType: operandType(field, operator),
    operandCount:
      definition.rhs === "none"
        ? 0
        : definition.rhs === "range"
          ? 2
          : definition.rhs === "array"
            ? "many"
            : 1,
  };
};

export const isFilterComplete = (filter) => {
  const rhs = getOperator(filter.operator)?.rhs;
  if (rhs === "none") return true;
  if (rhs === "array") {
    return (
      Array.isArray(filter.value) &&
      filter.value.length > 0 &&
      filter.value.every((value) => !isBlank(value))
    );
  }
  if (rhs === "range") {
    return (
      Array.isArray(filter.value) &&
      filter.value.length === 2 &&
      filter.value.every((value) => !isBlank(value))
    );
  }
  return !isBlank(filter.value);
};
