"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Target,
  Zap,
  TrendingUp,
  Instagram,
  Clock,
  AlertCircle,
  Quote,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";

export function MarketingPhase1() {
  return (
    <div className="space-y-12">
      <SectionHeader
        title="1.1 Audit & Positionnement : Analyse Concurrentielle"
        description="Analyse approfondie de 5 concurrents majeurs sur Instagram."
        icon={TrendingUp}
      />
      <CompetitiveAnalysis />

      <SectionHeader
        title="1.2 Personas Cibles"
        description="Segmentation d'audience et profils types pour CoList."
        icon={Users}
      />
      <Personas />

      <SectionHeader
        title="1.3 Proposition de Valeur (UVP)"
        description="Axes de différenciation et messages clés."
        icon={Target}
      />
      <ValuePropositions />
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: any;
}) {
  return (
    <div className="border-b border-white/10 pb-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-text">{title}</h2>
      </div>
      <p className="text-muted-foreground ml-14">{description}</p>
    </div>
  );
}

function CompetitiveAnalysis() {
  const competitors = [
    {
      name: "Mealime",
      followers: "155k",
      frequency: "3-4 / semaine",
      content: "Reels recettes rapides, Astuces meal prep",
      tone: "Pragmatique, Encouragent, Focus Santé",
      engagement: "Moyen (1.2%)",
      hashtags: "#mealprep #healthyeating #easyrecipes",
      collabs: "Micro-influenceurs nutrition",
    },
    {
      name: "Yummly",
      followers: "2.1M",
      frequency: "Quotidien",
      content: "Photos haute qualité, Reels 'Food Porn'",
      tone: "Inspirant, Visuel, Gourmand",
      engagement: "Faible (<0.5%)",
      hashtags: "#foodporn #recipeoftheday #yummly",
      collabs: "Chefs célèbres, Marques food",
    },
    {
      name: "PlateJoy",
      followers: "45k",
      frequency: "2 / semaine",
      content: "Carrousels éducatifs santé, Témoignages",
      tone: "Expert, Scientifique, Bienveillant",
      engagement: "Élevé (2.5%)",
      hashtags: "#cleanliving #nutritioncoach #wellness",
      collabs: "Diététiciens, Coachs santé",
    },
    {
      name: "Paprika",
      followers: "12k",
      frequency: "Irrégulier",
      content: "Mises à jour app, Reposts utilisateurs",
      tone: "Technique, Fonctionnel",
      engagement: "Moyen (1.0%)",
      hashtags: "#appupdate #organizing #tech",
      collabs: "Peu visible",
    },
    {
      name: "Whisk",
      followers: "85k",
      frequency: "5 / semaine",
      content: "Reels TikTok style, Trends virales",
      tone: "Jeune, Dynamique, Communautaire",
      engagement: "Très élevé (4.0%)",
      hashtags: "#foodtiktok #viralrecipes #samsungfood",
      collabs: "Créateurs TikTok, YouTubeurs",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/20 bg-white/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">App</TableHead>
              <TableHead>Contenu & Ton</TableHead>
              <TableHead>Stats Insta</TableHead>
              <TableHead>Stratégie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitors.map((app) => (
              <TableRow key={app.name}>
                <TableCell className="font-semibold">{app.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{app.content}</span>
                    <span className="text-xs text-muted-foreground">{app.tone}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className="w-fit">
                      {app.followers}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Eng: {app.engagement}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs italic">{app.hashtags}</span>
                    <span className="text-xs text-muted-foreground">Collabs: {app.collabs}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <Lightbulb className="w-5 h-5" />
            Insights Actionnables pour CoList
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-text/80">
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Opportunité 'Real-Life' :</strong> Le marché est saturé d'images parfaites
                (Yummly) ou très techniques (Paprika). CoList peut se démarquer avec un contenu
                "vrai", montrant le chaos réel des repas de semaine et comment l'app le résout.
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Format Gagnant :</strong> Les Reels "TikTok style" (Whisk) génèrent le plus
                d'engagement. Adopter un montage dynamique et rapide pour les démos produits.
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Niche Émotionnelle :</strong> PlateJoy réussit avec l'éducation. CoList doit
                éduquer non pas sur la nutrition, mais sur la "charge mentale" et la sérénité
                retrouvée.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Personas() {
  const personas = [
    {
      name: "Julie, la 'Manager' de Foyer",
      tagline: "Cherche à survivre au chaos du 18h-20h",
      details: "34 ans, En couple, 2 enfants (3 et 6 ans), Cadre RH, 45k€/an",
      painPoints:
        "Charge mentale explosive, 'Qu'est-ce qu'on mange ?' répété 10x, Gaspillage alimentaire.",
      instagram:
        "Connectée le soir (21h-23h). Suit des comptes 'Maman décomplexée', Déco, Astuces rangement.",
      objections: '"Je n\'ai pas le temps de configurer une nouvelle appli."',
      trigger: "La promesse de ne plus jamais avoir à décider le soir.",
      quote: '"Je veux juste que mon mari puisse faire les courses sans m\'appeler 5 fois."',
    },
    {
      name: "Marc, le 'Systémique' Optimisateur",
      tagline: "Veut hacker sa nutrition et son budget",
      details: "28 ans, Célibataire, Développeur Freelance, 55k€/an",
      painPoints:
        "Perte de temps en courses, Mange mal par flemme, Veut optimiser ses macros/budget.",
      instagram:
        "Binge-watch des reels tech/productivité le matin. Suit des comptes Tech, Crypto, Sport.",
      objections: '"Pourquoi payer pour une liste alors que j\'ai Notes ?"',
      trigger: "L'automatisation et les stats. Gagner 2h/semaine.",
      quote: '"Si ça ne se synchronise pas ou si c\'est lent, je désinstalle."',
    },
    {
      name: "Léa & Thomas, le Couple 'Foodie' Débutant",
      tagline: "Veulent bien manger sans se prendre la tête",
      details: "24-26 ans, Jeunes actifs, Vie urbaine, 38k€/an (foyer)",
      painPoints:
        "Manque d'inspiration, Frigo vide le jeudi, Commandent trop UberEats (budget explosé).",
      instagram:
        "Tout le temps. Taguent leurs amis sur des recettes. Suivent Top Chef, Influenceurs Food.",
      objections: '"C\'est trop rigide, on veut décider au dernier moment."',
      trigger: "L'aspect visuel de l'app et les suggestions recettes inspirantes.",
      quote: '"On finit toujours par manger des ptes parce qu\'on a rien prévu."',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {personas.map((p, i) => (
        <Card
          key={i}
          className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-md transition-all"
        >
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold">
                {p.name.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-base text-text leading-tight">{p.name}</CardTitle>
                <p className="text-xs text-muted-foreground font-normal mt-1">{p.tagline}</p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit text-xs font-normal bg-white/50">
              {p.details.split(",")[0]}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="flex items-center gap-2 text-red-500 font-semibold mb-1 text-xs uppercase tracking-wider">
                <AlertCircle className="w-3 h-3" /> Pain Points
              </div>
              <p className="text-muted-foreground">{p.painPoints}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-purple-600 font-semibold mb-1 text-xs uppercase tracking-wider">
                <Instagram className="w-3 h-3" /> Habitudes Insta
              </div>
              <p className="text-muted-foreground text-xs">{p.instagram}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-green-600 font-semibold mb-1 text-xs uppercase tracking-wider">
                <Zap className="w-3 h-3" /> Trigger Émotionnel
              </div>
              <p className="text-text font-medium">{p.trigger}</p>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg flex gap-2 italic text-muted-foreground text-xs relative mt-2">
              <Quote className="w-3 h-3 absolute top-2 left-2 text-muted-foreground/30" />
              <span className="ml-4">{p.quote}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ValuePropositions() {
  const uvps = [
    {
      fr: "Libérez votre esprit : vos repas de la semaine gérés en 5 minutes.",
      en: "Free your mind: manage your weekly meals in 5 minutes.",
      pain: "Charge Mentale & Perte de temps",
      icon: Clock,
    },
    {
      fr: "Fini le gaspillage : achetez uniquement ce que vous cuisinez.",
      en: "Stop waste: only buy what you cook.",
      pain: "Perte d'argent & Culpabilité écologique",
      icon: TrendingUp,
    },
    {
      fr: "Des listes de courses intelligentes qui se rangent toutes seules.",
      en: "Smart shopping lists that organize themselves.",
      pain: "Corvée des courses & Désorganisation",
      icon: CheckCircle2,
    },
    {
      fr: "Retrouvez le plaisir de cuisiner sans le stress de décider.",
      en: "Rediscover the joy of cooking without the stress of deciding.",
      pain: "Fatigue décisionnelle",
      icon: Zap,
    },
    {
      fr: "Une seule app pour toute la famille, synchronisée en temps réel.",
      en: "One app for the whole family, synchronized in real-time.",
      pain: "Problèmes de communication couple/famille",
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {uvps.map((uvp, i) => (
        <Card
          key={i}
          className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow"
        >
          <CardContent className="pt-6">
            <div className="mb-4 text-primary bg-primary/10 w-fit p-2 rounded-lg">
              <uvp.icon className="w-5 h-5" />
            </div>
            <p className="font-bold text-text mb-2 text-sm leading-snug">&quot;{uvp.fr}&quot;</p>
            <p className="text-xs text-muted-foreground mb-4 italic">{uvp.en}</p>
            <div className="border-t border-dashed pt-2 mt-auto">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Cible
              </span>
              <p className="text-xs font-medium text-text mt-0.5">{uvp.pain}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
