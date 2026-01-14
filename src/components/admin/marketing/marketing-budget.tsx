"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, Wrench, Users } from "lucide-react";

export function MarketingBudget() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700">
      <div className="border-b pb-4 border-dashed border-gray-200">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
            7
          </span>
          Budget & Ressources (Bootstrap Mode)
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <PiggyBank className="w-5 h-5" /> Allocation Mensuelle
          </h3>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <BudgetLine label="Paid Social (Tests)" amount="200 €" percent="20%" />
              <BudgetLine label="Outils / SaaS" amount="150 €" percent="15%" />
              <BudgetLine label="Freelance / Contenu" amount="500 €" percent="50%" />
              <BudgetLine label="Divers" amount="150 €" percent="15%" />
              <div className="border-t pt-2 mt-4 font-bold flex justify-between">
                <span>Total</span>
                <span>1000 € / mois</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <Wrench className="w-5 h-5" /> Stack Marketing
          </h3>
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Tool name="Analytics" value="PostHog (Free Tier)" />
              <Tool name="Emailing" value="Resend (Free Tier)" />
              <Tool name="Design" value="Canva / Figma" />
              <Tool name="Social" value="Buffer (Free Tier)" />
              <Tool name="CMS" value="Notion" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" /> Équipe
          </h3>
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="mb-4">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 mb-2">
                  Phase 1 (Actuel)
                </Badge>
                <p className="text-sm">Founders font tout (Produit + Marketing).</p>
              </div>
              <div className="mb-4">
                <Badge variant="outline" className="mb-2">
                  Phase 2 (Mois 4+)
                </Badge>
                <p className="text-sm">
                  Recrutement 1 stagiaire/alternant "Bras Droit Growth/Content".
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BudgetLine({
  label,
  amount,
  percent,
}: {
  label: string;
  amount: string;
  percent: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-3">
        <span className="font-medium">{amount}</span>
        <span className="text-xs text-muted-foreground w-8 text-right">{percent}</span>
      </div>
    </div>
  );
}

function Tool({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
      <span className="font-medium">{name}</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}
