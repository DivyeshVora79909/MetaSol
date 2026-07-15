export const TYPES = Object.freeze({
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  DATETIME: "datetime",
  RECORD: "record",
  ARRAY: "array"
});
export const PRIMITIVE_TYPES = Object.freeze([
  TYPES.STRING,
  TYPES.NUMBER,
  TYPES.BOOLEAN,
  TYPES.DATETIME,
  TYPES.RECORD
]);
const aliases = Object.freeze({
  date: TYPES.DATETIME,
  datetime: TYPES.DATETIME,
  relation: TYPES.RECORD
});
export function normalizeType(type) {
  const normalized = aliases[type] || type;
  if (typeof normalized === "string" && /^array<[^<>]+>$/.test(normalized)) {
    const itemType = normalized.slice(6, -1);
    if (!PRIMITIVE_TYPES.includes(itemType)) {
      throw new Error(`Unsupported Surreal array item type "${itemType}".`);
    }
    return TYPES.ARRAY;
  }
  if (!Object.values(TYPES).includes(normalized)) throw new Error(`Unsupported Surreal field type "${type}".`);
  return normalized;
}
export function itemTypeFor(field) {
  const generic = typeof field.type === "string" && /^array<[^<>]+>$/.test(field.type) ? field.type.slice(6, -1) : undefined;
  return normalizeType(generic || field.items || field.innerType || TYPES.STRING);
}
export function valueTypeFor(field, operator) {
  return operator.valueType === "item" && normalizeType(field.type) === TYPES.ARRAY ? itemTypeFor(field) : normalizeType(field.type);
}
export function normalizeValue(type, value) {
  if (value === null || value === undefined) return value;
  switch (type) {
    case TYPES.STRING:
      if (typeof value !== "string") throw new Error("Expected a string value.");
      return value;
    case TYPES.NUMBER:
      {
        if (typeof value !== "number" && typeof value !== "string") {
          throw new Error("Expected a finite number.");
        }
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
        if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
          throw new Error("Expected a valid datetime.");
        }
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
