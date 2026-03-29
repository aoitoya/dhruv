import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "@/lib/utils";

/**
 * Render a styled separator element by wrapping Base UI's SeparatorPrimitive.
 *
 * @param className - Additional CSS classes to apply to the separator
 * @param orientation - Layout orientation; defaults to `"horizontal"`
 * @param props - Remaining props are forwarded to `SeparatorPrimitive`
 * @returns The rendered `SeparatorPrimitive` element with composed classes and forwarded props
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
