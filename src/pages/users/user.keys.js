export const userKeys = {
  all: ["user"],
  lists: () => [...userKeys.all, "list"],
  list: (filters) => [...userKeys.lists(), JSON.stringify(filters)],
  details: () => [...userKeys.all, "detail"],
  detail: (id) => [...userKeys.details(), id],
};
