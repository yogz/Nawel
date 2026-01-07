"use client";

import { useRouter, usePathname, Link } from "@/i18n/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Calendar, Database, Users, FlaskConical, Quote, Bug } from "lucide-react";
import clsx from "clsx";

type User = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
};

const navItems = [
  { href: "/admin", label: "Événements CoList", icon: Calendar },
  { href: "/admin/citations", label: "Citations", icon: Quote },
  { href: "/admin/cache", label: "Cache IA", icon: Database },
  { href: "/admin/models", label: "Modèles", icon: FlaskConical },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/feedback", label: "Feedback", icon: Bug },
  { href: "/admin/logs", label: "Audit Logs", icon: Shield },
];

export function AdminHeader({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-text">Admin CoList</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>

        {/* Navigation tabs */}
        <nav className="-mb-px flex gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-b-2 border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:bg-black/5 hover:text-text"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
