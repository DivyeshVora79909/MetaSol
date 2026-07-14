import { createContext, useContext, createEffect, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { db, initDB } from "../lib/surreal";

const AuthContext = createContext();

export function AuthProvider(props) {
  // The absolute truth of the frontend
  const [state, setState] = createStore({
    token: null,
    isReady: false,
  });

  // O(1) Computed Boolean
  const isAuthenticated = () => !!state.token;

  // The Only Mutator Required
  const setToken = (newToken) => setState("token", newToken);

  onMount(async () => {
    await initDB();
    const savedToken = localStorage.getItem("rebase_token");
    if (savedToken) {
      try {
        // Hydrate DB client with saved token
        await db.authenticate(savedToken);
        setState("token", savedToken);
      } catch (err) {
        // Token expired or invalid, collapse state
        setState("token", null);
      }
    }
    setState("isReady", true);
  });

  // THE REACTIVE GRAPH TRIGGER:
  // If token changes, sync localStorage and DB mathematically. No manual cleanup needed.
  createEffect(() => {
    if (!state.isReady) return;

    if (state.token) {
      localStorage.setItem("rebase_token", state.token);
      // db is already authenticated if this came from a login function,
      // but re-authenticating here ensures total synchronization.
      db.authenticate(state.token).catch(() => setToken(null));
    } else {
      localStorage.removeItem("rebase_token");
      db.invalidate(); // Drops the DB connection's auth state
    }
  });

  return (
    <AuthContext.Provider value={{ state, isAuthenticated, setToken }}>
      {props.children}
    </AuthContext.Provider>
  );
}

// Minimal hook to access the graph anywhere
export const useAuth = () => useContext(AuthContext);
