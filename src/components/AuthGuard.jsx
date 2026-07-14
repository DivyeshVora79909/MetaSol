import { Show } from "solid-js";
import { Navigate } from "@solidjs/router";
import { useAuth } from "../store/auth";

export default function AuthGuard(props) {
  const { state, isAuthenticated } = useAuth();

  return (
    <Show
      when={state.isReady}
      fallback={
        <div class="flex h-screen w-full items-center justify-center bg-base-100">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }
    >
      <Show when={isAuthenticated()} fallback={<Navigate href="/auth/login" />}>
        {props.children}
      </Show>
    </Show>
  );
}
