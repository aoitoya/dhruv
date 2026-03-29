import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card container that groups related content and applies consistent styling and responsive size variants.
 *
 * @param size - Controls the card's spacing and sizing; use `"sm"` for reduced gap and padding.
 * @returns A `<div>` element with `data-slot="card"` and composed utility classes; layout and spacing adjust when `size` is `"sm"`.
 */
function Card({
	className,
	size = "default",
	...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
	return (
		<div
			data-slot="card"
			data-size={size}
			className={cn(
				"group/card flex flex-col gap-6 overflow-hidden rounded-xl bg-card py-6 text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10 has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Renders the card header container used to host title, description, and action slots.
 *
 * The element is a <div> with `data-slot="card-header"` and a composed set of layout and responsive classes;
 * any `className` passed in is merged with the default classes and remaining div props are forwarded.
 *
 * @param className - Additional CSS class names to merge with the component's default classes
 * @param props - Additional props spread onto the underlying `<div>` element
 * @returns The rendered header `<div>` element with `data-slot="card-header"` and composed layout classes
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				"group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-6 group-data-[size=sm]/card:px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Renders the card title slot with heading typography and responsive size adjustment for `sm` cards.
 *
 * @returns A `<div>` element with `data-slot="card-title"`, heading typography classes, and any provided `className` merged.
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-title"
			className={cn(
				"font-heading text-base leading-normal font-medium group-data-[size=sm]/card:text-sm",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Renders the card's descriptive text element with muted, small typography.
 *
 * Forwards any additional div props to the rendered element.
 *
 * @returns A `<div>` element marked as the card description slot (`data-slot="card-description"`) with small, muted text styling.
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-description"
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

/**
 * Renders the card action slot used to place interactive controls aligned to the card's top-right.
 *
 * @param className - Additional CSS classes merged with the component's base classes.
 * @param props - Other `div` props forwarded to the underlying element.
 * @returns The `<div>` element for the card action slot.
 */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-action"
			className={cn(
				"col-start-2 row-span-2 row-start-1 self-start justify-self-end",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Renders the content region of a Card.
 *
 * Applies horizontal padding that adjusts when the parent card's `data-size` is `sm`,
 * merges any provided `className`, and forwards remaining div props to the container.
 *
 * @param className - Additional class names to apply to the content container
 * @returns The card content container element
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-content"
			className={cn("px-6 group-data-[size=sm]/card:px-4", className)}
			{...props}
		/>
	);
}

/**
 * Renders the card footer container for footer content and actions.
 *
 * Accepts standard div props and merges `className` with footer-specific layout classes.
 *
 * @param className - Additional CSS class names to apply to the footer container
 * @returns A `<div>` element with `data-slot="card-footer"` and responsive footer spacing and layout classes
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-footer"
			className={cn(
				"flex items-center rounded-b-xl px-6 group-data-[size=sm]/card:px-4 [.border-t]:pt-6 group-data-[size=sm]/card:[.border-t]:pt-4",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
};
