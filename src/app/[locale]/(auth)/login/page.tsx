import { LoginForm } from "@/components/auth/login-form";
import { setRequestLocale } from "next-intl/server";

export default async function LoginPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <LoginForm />
    </div>
  );
}
