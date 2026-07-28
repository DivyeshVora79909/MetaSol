import * as v from "valibot";

export const UserSchema = v.object({
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
});
