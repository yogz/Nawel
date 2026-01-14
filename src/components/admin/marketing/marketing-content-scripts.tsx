"use client";

import {
  FileText,
  Video,
  Layers,
  Sparkles,
  Zap,
  HelpCircle,
  AlertTriangle,
  History,
  Timer,
  Music2,
  Mic,
  Clapperboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MarketingContentScripts() {
  return (
    <div className="space-y-12 mt-12">
      <div className="border-t border-white/10 pt-12">
        <SectionHeader
          title="2.2 Scripts & Templates de Contenu"
          description="Banque de scripts prêts à tourner pour Reels, Posts et Carousels."
          icon={FileText}
        />
      </div>

      <ViralHooks />
      <ReelsScripts />
      <CarouselScripts />
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
    <div className="border-b border-white/10 pb-4 mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-text">{title}</h2>
      </div>
      <p className="text-muted-foreground ml-14">{description}</p>
    </div>
  );
}

function ViralHooks() {
  const hooks = [
    {
      category: "Pain Points",
      icon: AlertTriangle,
      items: [
        "Arrête de jeter ton argent.",
        "Ton frigo est un cimetière ?",
        "3 erreurs qui tuent ton budget.",
        "Tu en as marre du 'On mange quoi ?'",
        "Pourquoi tu manges mal (Lundi).",
        "Stop aux pâtes tous les soirs.",
        "La charge mentale, c'est fini.",
        "Ton pire cauchemar en cuisine.",
        "Tu perds 4h/semaine à faire ça.",
        "Ne fais plus jamais tes courses ainsi.",
      ],
    },
    {
      category: "Bénéfices",
      icon: Sparkles,
      items: [
        "Comment j'ai gagné 200€ ce mois-ci.",
        "La méthode 5 minutes pour tout gérer.",
        "Manger sain sans cuisiner des heures ?",
        "Ton week-end commence enfin vendredi.",
        "Le secret des familles zen.",
        "Divise ton temps de course par 2.",
        "30 jours pour transformer tes dîners.",
        "L'outil que ton ventre attendait.",
        "Mange mieux, dépense moins.",
        "La fin du stress du 19h.",
      ],
    },
    {
      category: "Curiosité",
      icon: HelpCircle,
      items: [
        "Tu fais ça mal depuis toujours.",
        "Ce que les chefs ne disent pas.",
        "L'ingrédient secret de l'organisation.",
        "Pourquoi personne ne parle de ça ?",
        "J'ai testé pour vous...",
        "Le hack iPhone que tu ignores.",
        "Ne scrolle pas si tu as faim.",
        "La vérité sur le Batch Cooking.",
        "Ça va changer ta vie (vraiment).",
        "Attention, tu vas être choqué.",
      ],
    },
    {
      category: "Storytelling",
      icon: History,
      items: [
        "Avant, je pleurais devant mon frigo.",
        "Ma routine du dimanche a tout changé.",
        "Comment Julie a sauvé son couple.",
        "J'étais une catastrophe en cuisine.",
        "Le jour où j'ai arrêté de subir.",
        "Mon déclic alimentaire.",
        "Une semaine dans mon assiette.",
        "Confession d'une maman débordée.",
        "Ce que j'aurais aimé savoir avant.",
        "L'histoire de mon pire repas.",
      ],
    },
    {
      category: "Urgence / FOMO",
      icon: Timer,
      items: [
        "Tu dois voir ça maintenant.",
        "Supprimé dans 24h.",
        "La seule astuce qu'il te faut.",
        "Ne rate pas le train.",
        "C'est le moment ou jamais.",
        "Arrête tout et regarde.",
        "Ton année 2026 se joue ici.",
        "Plus que 3 jours pour...",
        "Pourquoi attendre ?",
        "Fais-le avant qu'il soit trop tard.",
      ],
    },
  ];

  return (
    <div className="space-y-4 mb-12">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Zap className="w-5 h-5 text-blue-500" />
        Banque d'Accroches Virales (50)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {hooks.map((cat, i) => (
          <Card
            key={i}
            className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-md transition-all"
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-text mb-2">
                <cat.icon className="w-4 h-4 text-primary" />
                {cat.category}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ul className="space-y-2">
                {cat.items.map((item, j) => (
                  <li
                    key={j}
                    className="text-xs text-muted-foreground border-l-2 border-black/5 pl-2 hover:border-primary transition-colors cursor-copy"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReelsScripts() {
  const scripts = [
    {
      title: "Tuto Rapide : Liste en 1 clic",
      hook: "👀 Tu fais encore ta liste sur papier ?",
      visual: "Plan serré : main qui rature une feuille, l'air énervé.",
      audio: "Son viral 'Oh no no no'",
      script:
        "Stop. Regarde ça. (Transition écran téléphone). J'ouvre CoList. Je clique sur 'Générer'. Bam. (Transition caddie). Une semaine de courses, 0 oubli. Lien en bio.",
    },
    {
      title: "Avant/Après : Le Frigo",
      hook: "🤢 Ton frigo ressemble à ça ? (Montre chaos)",
      visual: "Plan large frigo en désordre, légumes flétris.",
      audio: "Transition 'Magic swoosh'",
      script:
        "(Snap doigt). Voici le frigo d'un utilisateur CoList. (Plan frigo rangé Tupperware). Juste ce qu'il faut. Pas de gâchis. Tu commences quand ?",
    },
    {
      title: "Mythbusting : Le Meal Prep",
      hook: "❌ Le Meal Prep, c'est pas manger la même chose.",
      visual: "Face came énergique.",
      audio: "Musique Lo-fi chill",
      script:
        "On croit qu'il faut cuire 3kg de riz. Faux. Avec CoList, tu prépares juste les bases. Lundi : Curry. Mardi : Salade composée. 2h le dimanche = Liberté toute la semaine.",
    },
    {
      title: "Day in Life : Maman Pressée",
      hook: "🏃‍♀️ Course d'école à 8h, Réunion à 9h...",
      visual: "Montage rapide POV journée chargée.",
      audio: "Son rythmé 'As it was'",
      script:
        "Le soir, la dernière chose que je veux, c'est réfléchir au dîner. (Plan notif CoList: 'Menu du soir : Tacos'). Merci CoList. 15min, tout le monde est content. La charge mentale ? Connais pas.",
    },
    {
      title: "Trend : Pâtes Virales",
      hook: "🍝 J'ai testé les Pâtes Feta, version CoList.",
      visual: "Recette visuelle rapide (ASMR cuisson).",
      audio: "ASMR Cooking",
      script:
        "C'est bon, mais est-ce que ça rentre dans ton budget ? (Plan écran CoList coût recette). 2€ par personne. Validé. Recette dans l'app.",
    },
  ];

  return (
    <div className="space-y-4 mb-12">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Video className="w-5 h-5 text-blue-500" />
        Scénarios Reels (Exemples)
      </h3>
      <Accordion type="single" collapsible className="w-full">
        {scripts.map((script, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className="border-white/20 bg-white/40 backdrop-blur-sm rounded-lg mb-2 px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <span className="font-medium text-text text-left">{script.title}</span>
              <Badge variant="outline" className="ml-auto mr-4 text-[10px] hidden sm:inline-flex">
                {script.audio.split(" ")[0]}
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 pb-4">
                <div className="space-y-3">
                  <div className="bg-red-50 p-2 rounded border border-red-100">
                    <span className="text-xs font-bold text-red-600 uppercase flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Hook
                    </span>
                    <p className="text-sm font-bold text-gray-800">{script.hook}</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded border border-blue-100">
                    <span className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1">
                      <Clapperboard className="w-3 h-3" /> Visuel
                    </span>
                    <p className="text-sm text-gray-700">{script.visual}</p>
                  </div>
                  <div className="bg-purple-50 p-2 rounded border border-purple-100">
                    <span className="text-xs font-bold text-purple-600 uppercase flex items-center gap-1">
                      <Music2 className="w-3 h-3" /> Audio
                    </span>
                    <p className="text-sm text-gray-700">{script.audio}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-2">
                    <Mic className="w-3 h-3" /> Script Voix-Off
                  </span>
                  <p className="text-sm leading-relaxed italic text-gray-700">"{script.script}"</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function CarouselScripts() {
  const carousels = [
    {
      title: "Meal Prep pour Débutants",
      slides: [
        "Hook: Ne cuisine pas tous les soirs.",
        "1. Choisis 3 recettes compatibles.",
        "2. Fais une seule liste (avec CoList).",
        "3. Bloque 2h le dimanche.",
        "4. Lave et coupe tout d'un coup.",
        "5. Cuisson par lots (Four + Plaques).",
        "6. Stockage : Verre > Plastique.",
        "7. Congèle la moitié.",
        "Récap: 2h dim = 5 soirs libres.",
        "CTA: Télécharge le guide Meal Prep.",
      ],
    },
    {
      title: "Économiser 200€/mois",
      slides: [
        "Hook: Ton caddie te coûte trop cher.",
        "1. Fais l'inventaire avant de partir.",
        "2. N'achète JAMAIS si tu as faim.",
        "3. Marque Distributeur vs Marque.",
        "4. Achète en vrac (Légumineuses).",
        "5. Cuisine les restes (0 gâchis).",
        "6. Planifie tes menus (La base).",
        "7. Utilise le Drive (Pas de tentation).",
        "8. Mange de saison.",
        "Récap: Plan + Vrac + Saison = €€€.",
        "CTA: Active le mode 'Budget' sur CoList.",
      ],
    },
  ];

  return (
    <div className="space-y-4 mb-12">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Layers className="w-5 h-5 text-blue-500" />
        Carousels Éducatifs (Structures)
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {carousels.map((c, i) => (
          <Card key={i} className="bg-white/60 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{c.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {c.slides.map((slide, j) => (
                  <div key={j} className="flex gap-2 text-sm items-start">
                    <span className="text-xs font-mono text-muted-foreground w-4 pt-0.5">
                      {j + 1}.
                    </span>
                    <span
                      className={
                        j === 0
                          ? "font-bold text-primary"
                          : j === c.slides.length - 1
                            ? "font-bold text-blue-600"
                            : "text-text"
                      }
                    >
                      {slide}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
