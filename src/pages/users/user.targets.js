export const PRIMITIVE_TARGET = {
  table: "test_primitive",
  label: "Primitives",
  searchable: ["a_string"],
  columns: [
    { key: "id", label: "ID" },
    { key: "a_string", label: "Name" },
  ],
};

export const USER_TARGET = {
  table: "user",
  label: "Users",
  searchable: ["name", "email"],
  columns: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
  ],
};

export const TREE_TARGET = {
  table: "test_tree",
  label: "Trees",
  searchable: ["a_name"],
  columns: [{ key: "a_name", label: "Node Name" }],
};
