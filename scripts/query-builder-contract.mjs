import assert from "node:assert/strict";
import { getOperator } from "../src/lib/queryEngine/index.js";
import {
  defaultOperator,
  emptyFilterValue,
  filterEditorModel,
  isFilterComplete,
} from "../src/lib/queryEngine/queryBuilderModel.js";
import { USER_CONFIG } from "../src/pages/users/config.js";

const expectedOperandCount = {
  none: 0,
  scalar: 1,
  array: "many",
  range: 2,
};

let tested = 0;
for (const field of USER_CONFIG.fields.filter((field) => field.filterable)) {
  const initial = defaultOperator(field);
  assert.ok(field.operators.includes(initial), `${field.id} needs a valid default operator`);

  for (const operator of field.operators) {
    const definition = getOperator(operator);
    const model = filterEditorModel(field, operator);
    const emptyValue = emptyFilterValue(operator);

    assert.ok(definition, `${operator} must be registered`);
    assert.equal(model.rhs, definition.rhs);
    assert.equal(model.operandCount, expectedOperandCount[definition.rhs]);

    if (definition.rhs === "none") {
      assert.equal(emptyValue, null);
      assert.equal(isFilterComplete({ operator, value: emptyValue }), true);
    } else if (definition.rhs === "range") {
      assert.deepEqual(emptyValue, ["", ""]);
      assert.equal(isFilterComplete({ operator, value: emptyValue }), false);
      assert.equal(isFilterComplete({ operator, value: ["2025-01-01T00:00", "2025-12-31T23:59"] }), true);
    } else if (definition.rhs === "array") {
      assert.deepEqual(emptyValue, []);
      assert.equal(isFilterComplete({ operator, value: emptyValue }), false);
      assert.equal(isFilterComplete({ operator, value: ["one"] }), true);
    } else {
      assert.equal(emptyValue, "");
      assert.equal(isFilterComplete({ operator, value: emptyValue }), false);
      assert.equal(isFilterComplete({ operator, value: "value" }), true);
    }
    tested += 1;
  }
}

const genesisDate = USER_CONFIG.fields.find((field) => field.id === "created_at");
const between = filterEditorModel(genesisDate, "INSIDE");
assert.deepEqual(between, { rhs: "range", operandType: "datetime", operandCount: 2 });

console.log(`Query-builder contract passed: ${tested} configured field/operator controls, including the two-input datetime range.`);
