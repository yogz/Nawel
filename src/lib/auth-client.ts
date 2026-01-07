import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL || typeof window !== "undefined"
      ? window.location.origin
      : undefined,
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession, requestPasswordReset } = authClient;
