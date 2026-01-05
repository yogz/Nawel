"use client";

/**
 * Exemples d'utilisation des solutions de contournement
 * pour les problèmes de focus dans les drawers
 */

import { useState, useRef, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./drawer";
import { Label } from "./label";
import { Button } from "./button";
import { DrawerInput, DrawerTextareaInput, DrawerNativeInput } from "./drawer-input";

/**
 * Solution 1: DrawerInput avec scroll automatique
 * ✅ Meilleur pour: Inputs simples avec focus automatique
 */
export function DrawerInputExample() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="px-6">
        <DrawerHeader>
          <DrawerTitle>Solution 1: DrawerInput</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="drawer-input">Nom</Label>
            <DrawerInput
              id="drawer-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Entrez votre nom"
              scrollOnFocus={true}
              className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white"
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Solution 2: DrawerTextareaInput (textarea qui se comporte comme un input)
 * ✅ Meilleur pour: Mobile, quand Input pose problème
 * Les textareas sont souvent mieux gérés par les navigateurs mobiles
 */
export function DrawerTextareaInputExample() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="px-6">
        <DrawerHeader>
          <DrawerTitle>Solution 2: Textarea comme Input</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="drawer-textarea">Email</Label>
            <DrawerTextareaInput
              id="drawer-textarea"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="votre@email.com"
              rows={1}
              className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white"
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Solution 3: DrawerNativeInput avec gestion du focus différé
 * ✅ Meilleur pour: Éviter les problèmes de focus initial
 */
export function DrawerNativeInputExample() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="px-6">
        <DrawerHeader>
          <DrawerTitle>Solution 3: Input Natif</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="drawer-native">Message</Label>
            <DrawerNativeInput
              id="drawer-native"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Votre message"
              preventAutoFocus={false}
              className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white"
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Solution 4: Utiliser un input standard SANS autoFocus
 * ✅ Meilleur pour: Solution la plus simple
 *
 * Dans votre drawer, évitez simplement autoFocus:
 *
 * ❌ Mauvais:
 * <Input autoFocus />
 *
 * ✅ Bon:
 * <Input /> // Pas d'autoFocus
 *
 * Ou utilisez un useEffect pour gérer le focus manuellement:
 */
export function DrawerWithoutAutoFocusExample() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus manuel après ouverture
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="px-6">
        <DrawerHeader>
          <DrawerTitle>Solution 4: Sans autoFocus</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="drawer-no-autofocus">Nom</Label>
            {/* Pas d'autoFocus ici */}
            <DrawerInput
              ref={inputRef}
              id="drawer-no-autofocus"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Entrez votre nom"
              className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 text-base focus:bg-white"
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
