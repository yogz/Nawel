import { createAuthClient } from "better-auth/react";
import { adminClient, magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    (typeof window !== "undefined" ? window.location.origin : undefined),
  plugins: [adminClient(), magicLinkClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} = authClient;
