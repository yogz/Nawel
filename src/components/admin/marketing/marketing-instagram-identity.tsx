"use client";

import {
  Palette,
  LayoutTemplate,
  Type,
  Camera,
  Library,
  Sticker,
  Hash,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MarketingInstagramIdentity() {
  return (
    <div className="space-y-12 mt-12">
      <div className="border-t border-white/10 pt-12">
        <SectionHeader
          title="1.2 Identité Visuelle Instagram"
          description="Charte graphique et bibliothèque d'éléments de marque."
          icon={Palette}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ColorPalettes />
        <TypographyAndStyle />
      </div>

      <PostTemplates />
      <BrandAssetsLibrary />
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
        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-text">{title}</h2>
      </div>
      <p className="text-muted-foreground ml-14">{description}</p>
    </div>
  );
}

function ColorPalettes() {
  const palettes = [
    {
      name: "Primaire : 'Fresh & Organic'",
      colors: [
        { name: "Deep Emerald", hex: "#2D6A4F", usage: "Titres, CTA" },
        { name: "Creamy White", hex: "#F9F7F2", usage: "Fonds, Cartes" },
        { name: "Terracotta", hex: "#E07A5F", usage: "Accents, Alertes" },
      ],
    },
    {
      name: "Secondaire : 'Soft Sage'",
      colors: [
        { name: "Sage Green", hex: "#81B29A", usage: "Fonds secondaires" },
        { name: "Mustard", hex: "#F2CC8F", usage: "Icônes, Highlights" },
        { name: "Charcoal", hex: "#3D405B", usage: "Texte courant" },
      ],
    },
  ];

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-white/20 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="w-5 h-5 text-pink-500" />
          Palettes de Couleurs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {palettes.map((palette, i) => (
          <div key={i}>
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">{palette.name}</h4>
            <div className="flex gap-4">
              {palette.colors.map((color, j) => (
                <div key={j} className="group relative flex-1">
                  <div
                    className="h-16 w-full rounded-lg shadow-sm border border-black/5 mb-2 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="text-center">
                    <p className="text-xs font-bold text-text">{color.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground bg-white/50 rounded px-1 w-fit mx-auto mt-0.5">
                      {color.hex}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TypographyAndStyle() {
  return (
    <Card className="bg-white/60 backdrop-blur-sm border-white/20 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Type className="w-5 h-5 text-pink-500" />
          Typo & Style Photo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-6">
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Titres (Headings)</h4>
            <div className="p-4 bg-white/50 rounded-lg border border-white/20">
              <p className="text-2xl font-serif text-text mb-1">Playfair Display</p>
              <p className="text-xs text-muted-foreground">Élégant, Premium, Appétissant</p>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Corps (Body)</h4>
            <div className="p-4 bg-white/50 rounded-lg border border-white/20">
              <p className="text-base font-sans text-text mb-1">Lato / Inter</p>
              <p className="text-xs text-muted-foreground">Lisible, Moderne, Clean</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="flex items-center gap-2 text-sm font-medium mb-2 text-muted-foreground">
            <Camera className="w-4 h-4" /> Guidelines Photo
          </h4>
          <ul className="text-sm space-y-2 text-text/80">
            <li className="flex gap-2">
              <span className="text-pink-500">•</span>
              <span>
                <strong>Lumière :</strong> Naturelle et latérale (pas de flash direct). Lumière du
                matin (cool) ou 'Golden Hour' (warm) selon le plat.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500">•</span>
              <span>
                <strong>Composition :</strong> "Messy but Clean". Des miettes artistiques, un
                torchon froissé, mais un plat central net.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500">•</span>
              <span>
                <strong>Props :</strong> Bois brut, céramique artisanale, ingrédients bruts en
                arrière-plan.
              </span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function PostTemplates() {
  const templates = [
    {
      title: "Citation Inspirante",
      icon: LayoutTemplate,
      desc: "Fond uni (Creamy White) ou photo floue sombre. Typo Serif centrée.",
      content: "'Planifier, c'est se libérer.'",
    },
    {
      title: "Avant / Après",
      icon: LayoutTemplate,
      desc: "Split screen vertical. Gauche: Frigo vide/chaos (N&B). Droite: Frigo CoList (Couleur).",
      content: "Badges 'Sans CoList' vs 'Avec CoList'.",
    },
    {
      title: "Tuto Step-by-Step",
      icon: LayoutTemplate,
      desc: "Carrousel 5-7 slides. Screenshots zoomés avec flèches annotées main.",
      content: "Comment générer sa liste en 1 clic.",
    },
    {
      title: "UGC Repost",
      icon: LayoutTemplate,
      desc: "Photo utilisateur dans un cadre 'Polaroid' sur fond texturé.",
      content: "Mention @User + Sticker 'CoList Family'.",
    },
    {
      title: "Post Promotionnel",
      icon: LayoutTemplate,
      desc: "Bold. Fond Emerald Green. Gros titre blanc. Mockup 3D du téléphone.",
      content: "-50% sur l'abonnement annuel.",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <LayoutTemplate className="w-5 h-5 text-pink-500" />
        Templates de Posts (Feed)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {templates.map((t, i) => (
          <Card
            key={i}
            className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-md transition-all cursor-default"
          >
            <CardHeader className="p-4 pb-2">
              <Badge variant="outline" className="w-fit mb-2 bg-white/50">
                {t.title}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm">
              <p className="text-muted-foreground text-xs mb-2 leading-relaxed">{t.desc}</p>
              <div className="bg-pink-500/5 p-2 rounded text-xs font-medium text-pink-700">
                Ex: {t.content}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BrandAssetsLibrary() {
  const assets = [
    {
      category: "Icônes UI (Flat)",
      items: [
        "Calendrier Repas",
        "Panier Courses",
        "Toque Chef (Niveau)",
        "Horloge (Temps)",
        "Feuille (Végé)",
      ],
      specs: "SVG, Stroke 2px, Rounded Caps. Color: Emerald ou Charcoal.",
    },
    {
      category: "Stickers Stories (Animés)",
      items: [
        "Checkmark vert qui se dessine",
        "Flèche 'Swipe Up' rebondissante",
        "Texte 'Miam !'",
        "Avocat qui danse",
        "Caddie qui roule",
      ],
      specs: "GIF transparent. 30fps. Loop parfait.",
    },
    {
      category: "Éléments Déco",
      items: [
        "Traits de soulignement (Hand-drawn)",
        "Cercle d'entoure (Hand-drawn)",
        "Confettis légumes",
        "Wavy lines separators",
      ],
      specs: "Style 'Crayonné' pour le côté humain.",
    },
    {
      category: "Frames & Bordures",
      items: ["Cadre Polaroid", "Bordure 'Ticket de caisse'", "Fenêtre OS téléphone"],
      specs: "PNG Haute Def avec zones transparentes.",
    },
  ];

  return (
    <Card className="bg-gradient-to-br from-white/80 to-white/40 border-white/20 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-pink-500" />
            Bibliothèque d'Éléments de Marque
          </div>
          <Badge className="bg-pink-500 hover:bg-pink-600">
            <Download className="w-3 h-3 mr-1" /> Pack Assets .zip
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assets.map((cat, i) => (
            <div key={i} className="bg-white/50 rounded-xl p-4 border border-white/20">
              <h4 className="font-semibold text-text mb-3 flex items-center gap-2">
                {i === 0 && <Hash className="w-4 h-4 text-muted-foreground" />}
                {i === 1 && <Sticker className="w-4 h-4 text-muted-foreground" />}
                {cat.category}
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {cat.items.map((item, j) => (
                  <Badge
                    key={j}
                    variant="secondary"
                    className="bg-white hover:bg-white text-xs text-muted-foreground font-normal border border-black/5"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground border-t border-black/5 pt-2">
                Spec: {cat.specs}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
