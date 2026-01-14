"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gauge, TrendingUp, Users, Target, CircleDollarSign } from "lucide-react";

export function MarketingMetrics() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-600">
      <div className="border-b pb-4 border-dashed border-gray-200">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-sm font-bold">
            6
          </span>
          Métriques & Dashboard
        </h2>
      </div>

      {/* North Star */}
      <Card className="bg-gradient-to-r from-cyan-900 to-slate-900 text-white border-none shadow-xl">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <h3 className="text-cyan-400 font-bold tracking-widest uppercase text-sm mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" /> North Star Metric
          </h3>
          <div className="text-4xl md:text-5xl font-extrabold mb-4">
            Weekly Active Hosted Events
          </div>
          <p className="text-cyan-200/80 max-w-lg">
            Nombre d&apos;événements (repas) ayant eu lieu avec au moins 3 participants actifs sur
            les 7 derniers jours. C&apos;est la métrique qui prouve que la valeur principale est
            délivrée.
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Funnel KPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Funnel KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FunnelStep
                icon={Gauge}
                label="Acquisition"
                kpi="Nouveaux Hôtes / mois"
                target="500 -> 5000"
              />
              <FunnelStep
                icon={Users}
                label="Activation"
                kpi="Taux invités -> Hôtes (K-Factor)"
                target="&gt; 20%"
              />
              <FunnelStep
                icon={TrendingUp}
                label="Retention"
                kpi="Hôtes récurrents (M+1)"
                target="&gt; 40%"
              />
              <FunnelStep
                icon={CircleDollarSign}
                label="Revenue"
                kpi="Conversion Premum"
                target="2% des Hôtes"
              />
            </div>
          </CardContent>
        </Card>

        {/* OKRs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">OKRs Trimestriels</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Qx</TableHead>
                  <TableHead>Objectif</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-bold text-cyan-700">Q1</TableCell>
                  <TableCell>Fit Produit/Marché</TableCell>
                  <TableCell>NPS &gt; 50</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold text-cyan-700">Q2</TableCell>
                  <TableCell>Viralité Native</TableCell>
                  <TableCell>K-Factor &gt; 1</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold text-cyan-700">Q3</TableCell>
                  <TableCell>Scale Acquisition</TableCell>
                  <TableCell>+15% MoM Growth</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold text-cyan-700">Q4</TableCell>
                  <TableCell>Monétisation</TableCell>
                  <TableCell>1000 abonnés</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FunnelStep({
  icon: Icon,
  label,
  kpi,
  target,
}: {
  icon: any;
  label: string;
  kpi: string;
  target: string;
}) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="bg-muted p-2 rounded-full">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{kpi}</div>
        </div>
      </div>
      <Badge variant="outline" className="font-mono">
        {target}
      </Badge>
    </div>
  );
}
