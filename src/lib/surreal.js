import { Surreal } from "surrealdb";

export const db = new Surreal();

const URL = import.meta.env.VITE_SURREAL_URL;
const NS = import.meta.env.VITE_SURREAL_NAMESPACE;
const DB = import.meta.env.VITE_SURREAL_DATABASE;

export const initDB = async () => {
  await db.connect(URL);
};

export const authLogin = async (email, password) => {
  return await db.signin({
    namespace: NS,
    database: DB,
    access: "account",
    variables: { email, password },
  });
};

export const authRequestReset = async (email) => {
  return await db.signup({
    namespace: NS,
    database: DB,
    access: "request_password_reset",
    variables: { email },
  });
};

export const authVerifyAndReset = async (email, invite, newPassword) => {
  return await db.signup({
    namespace: NS,
    database: DB,
    access: "account",
    variables: { email, invite, password: newPassword },
  });
};

export const authLogout = async () => {
  await db.invalidate();
};

export const fetchQuery = async (sql, vars = {}) => {
  if (import.meta.env.PROD) {
    return await db.query(sql, vars);
  }

  const startTime = performance.now();

  try {
    const response = await db.query(sql, vars);
    const executionTime = (performance.now() - startTime).toFixed(2);

    console.groupCollapsed(
      `%c 🟢 SurrealDB Query %c[${executionTime}ms]`,
      "color: #10b981; font-weight: bold;",
      "color: #6b7280;",
    );
    console.log("%cSQL:", "color: #3b82f6; font-weight: bold;", sql.trim());
    if (Object.keys(vars).length > 0) {
      console.log("%cVars:", "color: #f59e0b; font-weight: bold;", vars);
    }
    console.log("%cResult:", "color: #8b5cf6; font-weight: bold;", response);
    console.groupEnd();

    return response;
  } catch (error) {
    const executionTime = (performance.now() - startTime).toFixed(2);

    console.groupCollapsed(
      `%c 🔴 SurrealDB Error %c[${executionTime}ms]`,
      "color: #ef4444; font-weight: bold;",
      "color: #6b7280;",
    );
    console.log("%cSQL:", "color: #3b82f6; font-weight: bold;", sql.trim());
    console.log("%cVars:", "color: #f59e0b; font-weight: bold;", vars);
    console.error("%cError:", "color: #ef4444; font-weight: bold;", error);
    console.groupEnd();

    throw error;
  }
};
