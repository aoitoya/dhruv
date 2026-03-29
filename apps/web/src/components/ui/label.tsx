/** biome-ignore-all lint/a11y/noLabelWithoutControl: ignore */
"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Renders an HTML label element with standardized styling and a `data-slot="label"` attribute.
 *
 * @param className - Additional CSS class names to append to the component's default utility classes
 * @returns A JSX `label` element with the composed `className`, `data-slot="label"`, and all other props forwarded
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
