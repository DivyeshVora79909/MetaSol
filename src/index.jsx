import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import { Toaster } from "solid-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { AuthProvider } from "./store/auth";
import { UIProvider } from "./store/ui";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error("Root element not found.");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UIProvider>
          <Router>
            <App />
          </Router>
          <Toaster position="top-right" gutter={8} />
        </UIProvider>
      </AuthProvider>
    </QueryClientProvider>
  ),
  root,
);
