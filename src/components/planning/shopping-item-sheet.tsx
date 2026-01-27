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
}

export function ShoppingItemSheet({
  item,
  open,
  onOpenChange,
  slug,
  writeKey,
}: ShoppingItemSheetProps) {
  const t = useTranslations("EventDashboard");
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
        toast.success(t("common.saved"));
        onOpenChange(false);
      } catch (error) {
        toast.error(t("common.error"));
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("Sheets.editItem")}</SheetTitle>
          <SheetDescription>{t("Sheets.editItemDescription")}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("Sheets.itemName")}</Label>
            <Input id="name" placeholder={t("Sheets.itemNamePlaceholder")} {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t("Sheets.quantity")}</Label>
              <Input id="quantity" placeholder="Ex: 2, 500g..." {...register("quantity")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t("Sheets.note")}</Label>
            <Textarea
              id="note"
              placeholder={t("Sheets.notePlaceholder")}
              className="resize-none"
              {...register("note")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
