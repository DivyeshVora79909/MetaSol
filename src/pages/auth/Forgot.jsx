import { createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { authRequestReset } from "../../lib/surreal";
import toast from "solid-toast";

export default function Forgot() {
  const [email, setEmail] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [success, setSuccess] = createSignal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authRequestReset(email());
      setSuccess(true);
    } catch (err) {
      toast.error(err.message || "Failed to request reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div class="card w-full max-w-sm bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-2xl font-bold">Reset Password</h2>

          <Show
            when={!success()}
            fallback={
              <div class="alert alert-success mt-4">
                <span>Verification link sent. Please check your inbox.</span>
              </div>
            }
          >
            <form onSubmit={handleSubmit}>
              <div class="form-control w-full mt-4">
                <label class="label">
                  <span class="label-text">Account Email</span>
                </label>
                <input
                  type="email"
                  class="input input-bordered w-full"
                  value={email()}
                  onInput={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div class="card-actions mt-6">
                <button
                  type="submit"
                  class="btn btn-primary w-full"
                  disabled={loading()}
                >
                  <Show when={loading()} fallback="Send Reset Link">
                    <span class="loading loading-spinner"></span> Requesting...
                  </Show>
                </button>
              </div>
            </form>
          </Show>

          <div class="text-center mt-4">
            <A
              href="/auth/login"
              class="link link-hover text-sm text-base-content/70"
            >
              Return to login
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}
