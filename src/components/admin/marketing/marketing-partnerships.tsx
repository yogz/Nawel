"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake, Stars, ShoppingBag, Home } from "lucide-react";

export function MarketingPartnerships() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
      <div className="border-b pb-4 border-dashed border-gray-200">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-sm font-bold">
            5
          </span>
          Partenariats & Influence
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 5.1 Micro-Influence */}
        <Card className="border-orange-100 bg-orange-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-orange-800">
              <Stars className="w-5 h-5 text-orange-500" />
              5.1 Strategie Micro-Influence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-800 hover:bg-orange-200"
              >
                Food Bloggers
              </Badge>
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-800 hover:bg-orange-200"
              >
                Familles Nombreuses
              </Badge>
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-800 hover:bg-orange-200"
              >
                Orga/Productivité
              </Badge>
            </div>
            <div className="bg-white p-3 rounded-lg border border-orange-100/50">
              <h4 className="font-semibold text-sm mb-1">Offre Standard</h4>
              <p className="text-xs text-muted-foreground">
                Gratuité à vie de CoList Premium + 10 codes Premium pour leur communauté (Concours).
                <br />
                Pas de rénumération cash au début (échange valeur).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 5.2 Partenariats B2B2C */}
        <Card className="border-orange-100 bg-orange-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-orange-800">
              <Handshake className="w-5 h-5 text-orange-500" />
              5.2 Partenariats B2B2C
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-start gap-2">
                <ShoppingBag className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <span className="font-semibold text-sm block">Retailers (Drive)</span>
                  <p className="text-xs text-muted-foreground">
                    Intégration du panier CoList vers l&apos;API Drive (Leclerc/Intermarché). Modèle
                    apporteur d&apos;affaires.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Home className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <span className="font-semibold text-sm block">Location Vacances</span>
                  <p className="text-xs text-muted-foreground">
                    Plugin pour Airbnb/Gîtes de France. "Votre séjour est réservé ? Organisez vos
                    repas maintenant."
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
