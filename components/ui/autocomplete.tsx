"use client"

import * as React from "react"
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// specs/035-select-dropdown-polish: replaces the native <input list>/
// <datalist> combo (browser-native, unstyleable suggestion popup — the
// account holder flagged it as visually inconsistent with the rest of the
// app) with a fully-styled, free-text-with-suggestions field matching
// components/ui/select.tsx's conventions exactly. Unlike Select, typing a
// value not in the list is still accepted — the whole point of a group/tag
// field where "type a new one" has to keep working (specs/025).
const Autocomplete = AutocompletePrimitive.Root

function AutocompleteInputGroup({
  className,
  ...props
}: AutocompletePrimitive.InputGroup.Props) {
  return (
    <AutocompletePrimitive.InputGroup
      data-slot="autocomplete-input-group"
      className={cn("relative flex items-center", className)}
      {...props}
    />
  )
}

function AutocompleteInput({ className, ...props }: AutocompletePrimitive.Input.Props) {
  return (
    <AutocompletePrimitive.Input
      data-slot="autocomplete-input"
      className={cn(
        "flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
        className
      )}
      {...props}
    />
  )
}

// A visible chevron button, like Select's own trigger icon — without this,
// there was no affordance at all that suggestions exist until the user
// starts typing (the native <datalist> this replaced always showed a small
// dropdown arrow). Clicking it opens the popup showing every suggestion,
// same as clicking a <select>.
function AutocompleteTrigger({ className, ...props }: AutocompletePrimitive.Trigger.Props) {
  return (
    <AutocompletePrimitive.Trigger
      data-slot="autocomplete-trigger"
      className={cn(
        "absolute right-1.5 flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground outline-none hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </AutocompletePrimitive.Trigger>
  )
}

function AutocompletePopup({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  ...props
}: Omit<AutocompletePrimitive.Popup.Props, "children"> &
  Pick<AutocompletePrimitive.Positioner.Props, "side" | "sideOffset"> & {
    children?: React.ReactNode | ((item: string, index: number) => React.ReactNode);
  }) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50 outline-none"
      >
        <AutocompletePrimitive.Popup
          data-slot="autocomplete-popup"
          className={cn(
            "max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <AutocompletePrimitive.List>{children}</AutocompletePrimitive.List>
          <AutocompletePrimitive.Empty className="px-2 py-1.5 text-sm text-muted-foreground" />
        </AutocompletePrimitive.Popup>
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  )
}

function AutocompleteItem({ className, children, ...props }: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </AutocompletePrimitive.Item>
  )
}

export {
  Autocomplete,
  AutocompleteInputGroup,
  AutocompleteInput,
  AutocompleteTrigger,
  AutocompletePopup,
  AutocompleteItem,
}
