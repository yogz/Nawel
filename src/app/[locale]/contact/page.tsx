import ContactForm from "./ContactForm";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export default async function ContactPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Suspense fallback={<div className="h-screen w-full" />}>
        <ContactForm />
      </Suspense>
    </div>
  );
}
