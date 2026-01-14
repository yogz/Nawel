"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Lock, Sparkles, Rocket } from "lucide-react";

export function MarketingPLG() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      <div className="border-b pb-4 border-dashed border-gray-200">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
            2
          </span>
          Stratégie Product-Led Growth (PLG)
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 2.1 Boucle Virale */}
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-700">
              <Share2 className="w-5 h-5" />
              <CardTitle className="text-base">2.1 Boucle Virale Native</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
              <div className="text-sm font-semibold mb-1">K-Factor Goal: &gt; 1.2</div>
              <p className="text-xs text-muted-foreground">
                Chaque hôte amène en moyenne 5 invités. Si 20% convertissent en futurs hôtes =
                croissance exponentielle.
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2 items-start">
                <span className="text-indigo-500 font-bold">•</span>
                <span>
                  <strong>Magic Link:</strong> Réduire le temps "Share to Join" à &lt; 5s.
                </span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-indigo-500 font-bold">•</span>
                <span>
                  <strong>Post-Event CTA:</strong> Popup "Créez votre événement" pour les invités
                  après un repas réussi.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 2.2 Freemium */}
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-700">
              <Lock className="w-5 h-5" />
              <CardTitle className="text-base">2.2 Stratégie Freemium</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
              <div className="text-sm font-semibold mb-1">Modèle: Usage-Based</div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  FREE: 1 Événement Actif
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  PREMIUM: Illimité + Historique
                </Badge>
              </div>
            </div>
            <div className="text-sm space-y-2">
              <p>
                <strong>Feature Gates:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-xs">
                <li>Planification &gt; 30 jours (Vacances)</li>
                <li>Duplication d&apos;événement récurrent</li>
                <li>Export PDF liste de courses</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 2.3 Activation */}
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-700">
              <Rocket className="w-5 h-5" />
              <CardTitle className="text-base">2.3 Time-to-Value</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
              <div className="text-sm font-semibold mb-1 mb-2">Aha! Moment</div>
              <p className="text-xs text-muted-foreground italic">
                &quot;Quand l&apos;hôte voit la première contribution d&apos;un invité apparaître en
                temps réel.&quot;
              </p>
            </div>
            <div className="text-sm space-y-2">
              <p>
                <strong>Actions Frictionless:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-xs">
                <li>Pas de mdp à l&apos;inscription (Auth email/Google)</li>
                <li>Template d&apos;événement par défaut</li>
                <li>IA : Complète les ingrédients manquants</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
