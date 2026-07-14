import { createSignal, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { useAuth } from "../../store/auth";
import { authVerifyAndReset } from "../../lib/surreal";
import toast from "solid-toast";

export default function SignUp() {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const [email, setEmail] = createSignal("");
  const [inviteToken, setInviteToken] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirm, setConfirm] = createSignal("");

  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password() !== confirm()) {
      return toast.error("Passwords do not match.");
    }

    setLoading(true);
    try {
      const token = await authVerifyAndReset(
        email(),
        inviteToken(),
        password(),
      );

      setToken(token);
      toast.success("Account activated securely.");

      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Invalid Email or Invite Token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div class="card w-full max-w-md bg-base-100 shadow-xl">
        <form onSubmit={handleSubmit} class="card-body">
          <h2 class="card-title text-2xl font-bold">Activate Account</h2>
          <p class="text-sm text-base-content/70">
            Enter your email and invite token to securely set up your password.
          </p>

          <div class="form-control w-full mt-4">
            <label class="label">
              <span class="label-text">Email Address</span>
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
              <span class="label-text">Invite Token</span>
            </label>
            <input
              type="text"
              class="input input-bordered w-full font-mono text-sm tracking-widest"
              value={inviteToken()}
              onInput={(e) => setInviteToken(e.target.value)}
              placeholder="e.g. 123e4567-e89b-12d3..."
              required
            />
          </div>

          <div class="form-control w-full mt-4">
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

          <div class="form-control w-full mt-2">
            <label class="label">
              <span class="label-text">Confirm Password</span>
            </label>
            <input
              type="password"
              class="input input-bordered w-full"
              value={confirm()}
              onInput={(e) => setConfirm(e.target.value)}
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
              <Show when={loading()} fallback="Activate & Sign In">
                <span class="loading loading-spinner"></span> Processing...
              </Show>
            </button>
          </div>

          <div class="text-center mt-4">
            <span class="text-sm text-base-content/70">Already active? </span>
            <A
              href="/auth/login"
              class="link link-hover text-primary font-semibold"
            >
              Go to Login
            </A>
          </div>
        </form>
      </div>
    </div>
  );
}
