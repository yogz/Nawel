"use client";

import dynamic from "next/dynamic";
import { WizardSkeleton } from "./wizard-skeleton";

/**
 * Charge le wizard côté client uniquement. Le wizard fait ~2200 lignes
 * et embarque framer-motion / react-easy-crop / day-picker / qrcode etc.
 * Le différer derrière un skeleton sert deux choses :
 *
 *   1. Le HTML initial de la route arrive interactif (skeleton) avant
 *      que le JS du wizard ne soit téléchargé — gain LCP/INP sur mobile
 *      lent (3G/4G en bord de route).
 *   2. Le SSR du wizard est skip — pas de coût serveur sur un composant
 *      qui de toute façon a besoin de state client immédiatement.
 *
 * `ssr: false` impose un wrapper Client Component (cf. Next 16 App
 * Router) — d'où ce fichier intermédiaire.
 */
const CreateWizardLazy = dynamic(
  () => import("./index").then((mod) => ({ default: mod.CreateWizard })),
  {
    ssr: false,
    loading: () => <WizardSkeleton />,
  }
);

type Props = {
  isLoggedIn: boolean;
  defaultCreatorName?: string;
  vibeKey: string | null;
  defaultTitle?: string;
};

export function CreateWizardLazyWrapper(props: Props) {
  return <CreateWizardLazy {...props} />;
}
