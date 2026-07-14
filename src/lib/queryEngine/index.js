import { validateQuery } from "./validator.js";
import { buildQuery } from "./builder.js";
export { OPERATORS, OPERATOR_NAMES, getOperator } from "./operators.js";
export { TYPES } from "./types.js";
export { validateQuery } from "./validator.js";
/** Compile trusted resource metadata and untrusted UI state into parameterized SurrealQL. */
export function compileQuery(config, rawState) {
  if (!config?.table || !Array.isArray(config.fields)) throw new Error("A query config needs a table and fields.");
  const ast = validateQuery(rawState, config);
  return {
    ...buildQuery(config, ast),
    ast
  };
}
