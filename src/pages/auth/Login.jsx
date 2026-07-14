import { createSignal, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { useAuth } from "../../store/auth";
import { authLogin } from "../../lib/surreal";
import toast from "solid-toast";

export default function Login() {
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await authLogin(email(), password());
      setToken(token);
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div class="card w-full max-w-sm bg-base-100 shadow-xl">
        <form onSubmit={handleSubmit} class="card-body">
          <h2 class="card-title text-2xl font-bold">ReBase Login</h2>

          <div class="form-control w-full mt-4">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              type="email"
              class="input input-bordered w-full"
              value={email()}
              onInput={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div class="form-control w-full mt-2">
            <label class="label">
              <span class="label-text">Password</span>
            </label>
            <input
              type="password"
              class="input input-bordered w-full"
              value={password()}
              onInput={(e) => setPassword(e.target.value)}
              required
            />
            <label class="label mt-1">
              <A
                href="/auth/forgot"
                class="label-text-alt link link-hover text-primary"
              >
                Forgot password?
              </A>
            </label>
          </div>

          <div class="card-actions mt-6">
            <button
              type="submit"
              class="btn btn-primary w-full"
              disabled={loading()}
            >
              <Show when={loading()} fallback="Sign In">
                <span class="loading loading-spinner"></span> Authenticating...
              </Show>
            </button>
          </div>

          <div class="text-center mt-4">
            <span class="text-sm text-base-content/70">
              Have an invite token?{" "}
            </span>
            <A
              href="/auth/signup"
              class="link link-hover text-primary font-semibold"
            >
              Activate Account
            </A>
          </div>
        </form>
      </div>
    </div>
  );
}
