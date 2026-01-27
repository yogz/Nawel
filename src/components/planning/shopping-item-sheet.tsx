"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { updateItemAction } from "@/app/actions/item-actions";
import { type AggregatedShoppingItem } from "@/lib/shopping-utils";
import { type PlanData } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.string().optional(),
  note: z.string().optional(),
});

interface ShoppingItemSheetProps {
  item: AggregatedShoppingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  writeKey?: string;
  setPlan?: (updater: (prev: PlanData) => PlanData) => void;
}

export function ShoppingItemSheet({
  item,
  open,
  onOpenChange,
  slug,
  writeKey,
  setPlan,
}: ShoppingItemSheetProps) {
  const t = useTranslations("EventDashboard");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: "",
      note: "",
    },
  });

  // Reset form when item changes
  useEffect(() => {
    if (item && open) {
      // Use the first source item for default values
      const sourceItem = item.sources[0].item;
      reset({
        name: sourceItem.name,
        quantity: sourceItem.quantity || "",
        note: sourceItem.note || "",
      });
    }
  }, [item, open, reset]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!item) return;

    startTransition(async () => {
      // Optimistic update
      if (setPlan) {
        setPlan((prev) => ({
          ...prev,
          meals: prev.meals.map((meal) => ({
            ...meal,
            services: meal.services.map((service) => ({
              ...service,
              items: service.items.map((serviceItem) => {
                const matchingSource = item.sources.find((s) => s.item.id === serviceItem.id);
                if (!matchingSource) {
                  return serviceItem;
                }
                return {
                  ...serviceItem,
                  name: values.name,
                  quantity: values.quantity || null,
                  note: values.note || null,
                  // Also update ingredient name if it's a categorized item
                  ingredients: serviceItem.ingredients?.map((ing) => {
                    // If it's a "whole dish" ingredient (name matches item), update it too
                    if (
                      ing.name.toLowerCase().trim() === serviceItem.name.toLowerCase().trim() ||
                      serviceItem.name.toLowerCase().includes(ing.name.toLowerCase())
                    ) {
                      return {
                        ...ing,
                        name: values.name,
                        quantity: values.quantity || ing.quantity,
                      };
                    }
                    return ing;
                  }),
                };
              }),
            })),
          })),
        }));
      }

      try {
        const promises = item.sources.map((source) =>
          updateItemAction({
            id: source.item.id,
            name: values.name,
            quantity: values.quantity || null,
            note: values.note || null,
            personId: source.item.personId, // Keep assignment
            slug,
            key: writeKey,
          })
        );

        await Promise.all(promises);
        toast.success(tCommon("saved"));
        onOpenChange(false);
      } catch {
        toast.error(tCommon("error"));
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-border bg-card sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-foreground">{t("Sheets.editItem")}</SheetTitle>
          <SheetDescription>{t("Sheets.editItemDescription")}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              {t("Sheets.itemName")}
            </Label>
            <Input
              id="name"
              placeholder={t("Sheets.itemNamePlaceholder")}
              className="border-input bg-background text-foreground placeholder:text-muted-foreground"
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-foreground">
              {t("Sheets.quantity")}
            </Label>
            <Input
              id="quantity"
              placeholder="Ex: 2, 500g..."
              className="border-input bg-background text-foreground placeholder:text-muted-foreground"
              {...register("quantity")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-foreground">
              {t("Sheets.note")}
            </Label>
            <Textarea
              id="note"
              placeholder={t("Sheets.notePlaceholder")}
              className="resize-none border-input bg-background text-foreground placeholder:text-muted-foreground"
              {...register("note")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="border-input"
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
