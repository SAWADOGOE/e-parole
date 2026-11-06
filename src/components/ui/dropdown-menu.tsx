"use client";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 rounded-md border bg-bg-elevated p-1 text-fg shadow-sm data-[state=open]:animate-in data-[state=open]:fade-in-0",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex min-h-11 cursor-default items-center gap-2 rounded-sm px-3 text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-bg-subtle [&_svg]:size-4 [&_svg]:text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return <DropdownMenuPrimitive.Label className={cn("px-3 py-2 text-xs text-muted", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const CHOICE_ITEM =
  "relative flex min-h-11 cursor-default items-center gap-2 rounded-sm py-0 pr-3 pl-9 text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-bg-subtle [&_svg]:size-4";

/** Réglage booléen dans un menu : joignable aux flèches, coché par Espace (rôle menuitemcheckbox). */
export function DropdownMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem className={cn(CHOICE_ITEM, className)} {...props}>
      <span aria-hidden="true" className="absolute left-3 inline-flex size-4 items-center justify-center rounded-sm border border-border-strong">
        <DropdownMenuPrimitive.ItemIndicator className="size-2.5 rounded-[2px] bg-accent" />
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

/** Choix exclusif dans un menu (rôle menuitemradio). */
export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem className={cn(CHOICE_ITEM, className)} {...props}>
      <span aria-hidden="true" className="absolute left-3 inline-flex size-4 items-center justify-center rounded-full border border-border-strong">
        <DropdownMenuPrimitive.ItemIndicator className="size-2 rounded-full bg-accent" />
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}
