import { LoginForm } from "@/components/auth/login-form";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";

export default async function LoginPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  // Redirect to dashboard if already authenticated
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect({ href: "/event", locale });
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 p-4">
      <Suspense fallback={<div className="h-screen w-full" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
