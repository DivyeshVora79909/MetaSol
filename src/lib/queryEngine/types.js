export const TYPES = Object.freeze({
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  DATETIME: "datetime",
  RECORD: "record",
  ARRAY: "array",
  OBJECT: "object"
});
const aliases = Object.freeze({
  date: TYPES.DATETIME,
  datetime: TYPES.DATETIME,
  relation: TYPES.RECORD
});
export function normalizeType(type) {
  const normalized = aliases[type] || type;
  if (!Object.values(TYPES).includes(normalized)) throw new Error(`Unsupported Surreal field type "${type}".`);
  return normalized;
}
export function valueTypeFor(field, operator) {
  return operator.valueType === "item" && field.type === TYPES.ARRAY ? normalizeType(field.items ?? field.innerType ?? TYPES.STRING) : field.type;
}
export function normalizeValue(type, value) {
  if (value === null || value === undefined) return value;
  switch (type) {
    case TYPES.STRING:
      if (typeof value !== "string") throw new Error("Expected a string value.");
      return value;
    case TYPES.NUMBER:
      {
        const number = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(number)) throw new Error("Expected a finite number.");
        return number;
      }
    case TYPES.BOOLEAN:
      if (value === true || value === false) return value;
      if (value === "true") return true;
      if (value === "false") return false;
      throw new Error("Expected true or false.");
    case TYPES.DATETIME:
      {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) throw new Error("Expected a valid datetime.");
        return date.toISOString();
      }
    case TYPES.RECORD:
      if (typeof value !== "string" || value.trim() === "") throw new Error("Expected a record id.");
      return value;
    case TYPES.ARRAY:
      if (!Array.isArray(value)) throw new Error("Expected an array value.");
      return value;
    case TYPES.OBJECT:
      if (typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object value.");
      return value;
  }
}
export function normalizeFilterValue(type, rhs, value) {
  if (rhs === "none") return null;
  if (rhs === "scalar") return normalizeValue(type, value);
  if (rhs === "array") return value.map(item => normalizeValue(type, item));
  if (rhs === "range") return value.map(item => normalizeValue(type, item));
  throw new Error(`Unknown RHS shape "${rhs}".`);
}
export function castVariable(type, rhs, name) {
  if (rhs === "none") return "";
  const surrealType = {
    number: "number",
    boolean: "bool",
    datetime: "datetime",
    record: "record"
  }[type];
  if (!surrealType) return `$${name}`;
  return rhs === "array" ? `<array<${surrealType}>>$${name}` : `<${surrealType}>$${name}`;
}
