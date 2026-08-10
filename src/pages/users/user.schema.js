import * as v from "valibot";

export const UserSchema = v.pipe(
  v.object({
    name: v.pipe(
      v.string(),
      v.minLength(2, "Name must be at least 2 characters"),
    ),
    email: v.pipe(
      v.string(),
      v.nonEmpty("Email is required"),
      v.email("Invalid email format"),
    ),
    login_access: v.boolean(),
    a_favorite_primitive: v.optional(v.nullable(v.string())),
    a_friends: v.optional(v.array(v.string()), []),
    a_watched_items: v.optional(v.array(v.string()), []),
  }),

  v.partialCheck(
    [["name"], ["login_access"]],
    (input) => !(input.name === "Guest" && input.login_access === true),
    "Guests cannot be granted login access.",
  ),
);
