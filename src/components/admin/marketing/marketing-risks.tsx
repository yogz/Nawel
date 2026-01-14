"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldAlert, CornerUpRight } from "lucide-react";

export function MarketingRisks() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-800">
      <div className="border-b pb-4 border-dashed border-gray-200">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700 text-sm font-bold">
            8
          </span>
          Risques & Contingences
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <RiskCard
          title="Adoption Faible"
          risk="Les utilisateurs trouvent l'app trop complexe par rapport à WhatsApp."
          mitigation="Simplifier drastiquement l'onboarding. Mode 'invité passif' (ne télécharge rien, clique juste)."
          pivot="Pivot B2B : Vendre l'outil aux organisateurs d'événements pro."
        />
        <RiskCard
          title="Churn Élevé"
          risk="L'effet 'Whaou' retombe après le premier événement. Pas de récurrence."
          mitigation="Push notifications intelligentes. Emails récapitulatifs 'Souvenirs de votre soirée'."
          pivot="Focus sur les 'Power Users' (Agences, Wedding planners) avec features pro."
        />
        <RiskCard
          title="Coût d'Acquisition"
          risk="Le paid social est trop cher, impossible de rentabiliser un utilisateur gratuit."
          mitigation="Focus strict sur le PLG et le viral ou le SEO (Zero cost). Couper le paid."
          pivot="Modèle payant uniquement (SaaS) ou commission sur les courses (Affiliation)."
        />
      </div>
    </div>
  );
}

function RiskCard({
  title,
  risk,
  mitigation,
  pivot,
}: {
  title: string;
  risk: string;
  mitigation: string;
  pivot: string;
}) {
  return (
    <Card className="border-red-100/50 hover:border-red-200 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-red-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block mb-1">
            Risque
          </span>
          <p className="text-muted-foreground leading-snug">{risk}</p>
        </div>
        <div className="bg-green-50/50 p-2 rounded border border-green-100/50">
          <span className="font-semibold text-xs text-green-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Mitigation
          </span>
          <p className="text-green-900/80 leading-snug text-xs">{mitigation}</p>
        </div>
        <div className="bg-blue-50/50 p-2 rounded border border-blue-100/50">
          <span className="font-semibold text-xs text-blue-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <CornerUpRight className="w-3 h-3" /> Pivot Possible
          </span>
          <p className="text-blue-900/80 leading-snug text-xs">{pivot}</p>
        </div>
      </CardContent>
    </Card>
  );
}
