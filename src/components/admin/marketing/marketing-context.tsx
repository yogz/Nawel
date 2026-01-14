"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow, Fingerprint, CalendarDays, ShoppingCart } from "lucide-react";

export function MarketingContext() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Contexte Produit
        </h2>
        <p className="text-muted-foreground">
          Fondations et identité de CoList pour aligner l&apos;équipe marketing.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">App Identity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="font-semibold mb-1">Mission</div>
              <p className="text-sm text-muted-foreground">
                Remplacer les conversations de groupe chaotiques par un espace de travail partagé et
                structuré en temps réel pour organiser les repas collectifs.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">Format</div>
              <div className="flex gap-2">
                <Badge variant="secondary">Web App</Badge>
                <Badge variant="secondary">PWA</Badge>
                <Badge variant="secondary">Mobile-First</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-lg">Fonctionnalités Clés</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="font-semibold whitespace-nowrap text-purple-600">Onboarding</span>
                <span className="text-muted-foreground">
                  Magic Link, zéro friction, pas de compte requis pour les invités.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold whitespace-nowrap text-purple-600">
                  Planification
                </span>
                <span className="text-muted-foreground">
                  Mode Potluck pour éviter les doublons, Mode Vacances pour séjours.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold whitespace-nowrap text-purple-600">Utility AI</span>
                <span className="text-muted-foreground">
                  Génération automatique d&apos;ingrédients depuis n&apos;importe quel plat.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold whitespace-nowrap text-purple-600">Smart List</span>
                <span className="text-muted-foreground">
                  Agrégation, tri par rayon, coordination temps réel.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
