"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image, Layers, Copy, Check } from "lucide-react";
import { useState } from "react";

export function MarketingInstagramPosts() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-900">
      <div className="border-b pb-4 border-dashed border-gray-200">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-700 text-sm font-bold">
            Bonus
          </span>
          5 Scripts Instagram (1 Carousel + 4 Posts Simples)
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Post Simple 1 - Remplace Reel POV */}
        <InstaPost
          type="Post Simple"
          title="Mème : Le Chaos du Potluck"
          pillar="Humour / Viralité"
          hook="Quand t'es le seul à avoir fait un effort..."
          script={`VISUEL (Photo unique/Mème):
Une photo divisée en deux (Split) :
Haut : "Ce que j'apporte" -> Une magnifique lasagne maison.
Bas : "Ce que les autres apportent" -> Une montagne de paquets de chips 1er prix.

TEXTE SUR L'IMAGE:
"La définition du 'Potluck' sans CoList."

CAPTION:
On a tous ce pote qui croit que 3 paquets de chips = un repas complet. 😭
Arrêtez le massacre.
Sur CoList, vous voyez qui apporte quoi en temps réel.
Fini les dîners 100% féculents.

Lien en bio pour organiser un vrai repas ! 🍝
#potluck #humour #repasentreamis #foodfail #colist`}
        />

        {/* Post Simple 2 - Remplace Reel Tuto */}
        <InstaPost
          type="Post Simple"
          title="Avant/Après : L'Organisation"
          pillar="Product Education"
          hook="La différence est violente."
          script={`VISUEL (Photo unique):
Un comparatif graphique simple sur fond uni.

Gauche (Rouge ❌) : "Avant"
- 50 notifs WhatsApp
- "Qui a pris le pain ?"
- 3 Excels différents
- Stress

Droite (Vert ✅) : "Avec CoList"
- 1 Lien Unique
- Liste auto-générée
- 0 Compte à créer
- Zen

CAPTION:
Pourquoi faire compliqué (et stressant) quand on peut faire simple ?
Une app. Un lien. Tout le monde est synchro.
Testez pour votre prochain dîner (c'est gratuit).
#organisation #productivité #lifehacks #app #repas`}
        />

        {/* Carousel - Conservé mais adapté */}
        <InstaPost
          type="Carousel"
          title="Vacances : Les Red Flags"
          pillar="Valeur / Tips"
          hook="5 signes que l'orga de vos vacances va être un enfer."
          script={`SLIDE 1 (Couverture):
Titre : 5 signes que vos vacances entre potes vont mal finir 🚩
(Et comment les éviter)

SLIDE 2:
🚩 Le groupe WhatsApp "Vacances 2026" a déjà 450 messages et aucune décision prise.

SLIDE 3:
🚩 Quelqu'un a dit "Tkt on verra sur place pour les courses".
(Spoiler: vous allez manger des pâtes au beurre 7j/7).

SLIDE 4:
🚩 Vous avez acheté tout en double le premier jour.
(3 bouteilles d'huile d'olive, 0 sel).

SLIDE 5:
🚩 Le fichier Excel des comptes a planté et personne ne veut le refaire.

SLIDE 6 (Conclusion):
La solution ? Un lien CoList.
✅ Menus partagés
✅ Liste de courses auto
✅ Zéro prise de tête

CAPTION:
Identifie le pote qui dit toujours "on verra sur place" 👇
Ne laissez pas l'intendance gâcher les vacances cet été.
#vacances #potes #voyage #checklist #redflags`}
        />

        {/* Post Simple 3 - Remplace Reel Charge Mentale */}
        <InstaPost
          type="Post Simple"
          title="Citation : La Charge Mentale"
          pillar="Empathie"
          hook="Pour ceux qui portent tout sur leurs épaules."
          script={`VISUEL (Photo unique):
Un fond épuré, couleur douce, avec une citation en typographie élégante.

CITATION AU CENTRE :
"La charge mentale, c'est d'avoir préparé la liste des courses dans sa tête alors qu'on est sous la douche."

Petit logo CoList en bas.

CAPTION:
On la connaît tous, cette petite voix qui n'arrête jamais.
Et si on la mettait sur pause ?
CoList permet de déléguer sans avoir à "manager".
Partagez la liste. Laissez les autres cocher. Respirez. 🧘‍♀️
#chargementale #bienetre #famille #couple #colist`}
        />

        {/* Post Simple 4 - Remplace Carousel Brunch */}
        <InstaPost
          type="Post Simple"
          title="Infographie : Le Brunch Parfait"
          pillar="Inspiration"
          hook="La checklist ultime en une image."
          script={`VISUEL (Infographie):
Une belle illustration "Flat Lay" d'une table de brunch vue du dessus, avec des étiquettes (flèches) pointant sur les essentiels.

TITRE EN HAUT : "L'Anatomie du Brunch Parfait"
Flèche 1 -> "Protéines" (Oeufs/Bacon)
Flèche 2 -> "Vitamines" (Avocat/Fruits)
Flèche 3 -> "Douceur" (Pancakes/Sirop)
Flèche 4 -> "Hydratation" (Jus frais/Café/Mimosas)

CAPTION:
Savez-vous qu'on oublie toujours un truc au brunch ? (Souvent le beurre pour les tartines).
Enregistrez ce post pour dimanche prochain ! 📌

Ou mieux : créez votre événement "Brunch" sur CoList et laissez l'IA générer la liste complète.
#brunch #sundaymood #foodie #infographie #checklist`}
        />
      </div>
    </div>
  );
}

function InstaPost({
  type,
  title,
  pillar,
  hook,
  script,
}: {
  type: string;
  title: string;
  pillar: string;
  hook: string;
  script: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = `titre: ${title}\nTYPE: ${type}\nHOOK: ${hook}\n\n${script}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex justify-between items-start">
          <Badge variant={type === "Carousel" ? "default" : "secondary"} className="mb-2">
            {type === "Carousel" ? (
              <Layers className="w-3 h-3 mr-1" />
            ) : (
              <Image className="w-3 h-3 mr-1" />
            )}
            {type}
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
            {pillar}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Hook
          </span>
          <p className="text-sm font-medium mt-1 text-primary">{hook}</p>
        </div>
        <div className="bg-muted/30 p-3 rounded-md border text-xs font-mono whitespace-pre-wrap flex-1 max-h-[200px] overflow-y-auto">
          {script}
        </div>
        <button
          onClick={copyToClipboard}
          className="w-full mt-auto flex items-center justify-center gap-2 text-xs font-medium py-2 rounded-md border hover:bg-muted transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copié !" : "Copier le script"}
        </button>
      </CardContent>
    </Card>
  );
}
