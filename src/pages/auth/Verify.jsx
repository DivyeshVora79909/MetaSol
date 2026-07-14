import { createSignal, Show, onMount } from "solid-js";
import { useSearchParams, useNavigate, A } from "@solidjs/router";
import { useAuth } from "../../store/auth";
import { authVerifyAndReset } from "../../lib/surreal";
import toast from "solid-toast";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [isValidRoute, setIsValidRoute] = createSignal(true);

  onMount(() => {
    if (!searchParams.email || !searchParams.token) {
      setIsValidRoute(false);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await authVerifyAndReset(
        searchParams.email,
        searchParams.token,
        password(),
      );

      setToken(token);
      toast.success("Password reset successful.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Invalid or expired token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div class="card w-full max-w-sm bg-base-100 shadow-xl">
        <div class="card-body">
          <Show
            when={isValidRoute()}
            fallback={
              <div class="text-center">
                <div class="alert alert-error">Invalid Reset Link</div>
                <A href="/auth/login" class="btn btn-ghost mt-4">
                  Go to Login
                </A>
              </div>
            }
          >
            <h2 class="card-title text-2xl font-bold">New Password</h2>
            <p class="text-sm text-base-content/70">
              Resetting password for: <br />
              <strong>{searchParams.email}</strong>
            </p>

            <form onSubmit={handleSubmit} class="mt-4">
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text">Secure Password</span>
                </label>
                <input
                  type="password"
                  class="input input-bordered w-full"
                  value={password()}
                  onInput={(e) => setPassword(e.target.value)}
                  required
                  minlength="6"
                />
              </div>

              <div class="card-actions mt-6">
                <button
                  type="submit"
                  class="btn btn-primary w-full"
                  disabled={loading()}
                >
                  <Show when={loading()} fallback="Confirm Reset">
                    <span class="loading loading-spinner"></span> Processing...
                  </Show>
                </button>
              </div>
            </form>
          </Show>
        </div>
      </div>
    </div>
  );
}
