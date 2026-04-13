import { createFileRoute } from "@tanstack/react-router";
import { IoSettingsOutline } from "react-icons/io5";
import {
	Avatar,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
// import { DropdownMenu } from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app/task")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="p-2.5">
			<div className="grid grid-cols-[1fr_auto] items-center gap-4 ">
				<h6 className="truncate font-bold">workspace name</h6>

				<div className="flex items-center gap-2">
					{/* Members Section */}
					<Members />

					{/* Settings Button */}
					<Button
						variant="outline"
						size={"icon-lg"}
						className="bg-blue-700 hover:bg-blue-600 text-white hover:text-white"
					>
						<IoSettingsOutline size={20} />
					</Button>
				</div>
			</div>
			<div className="border-2 rounded-md  ">
				<Table>
					{" "}
					<TableHeader>
						{" "}
						<TableRow>
							{" "}
							<TableHead>Product</TableHead> <TableHead>Price</TableHead>{" "}
							<TableHead className="text-right">Actions</TableHead>{" "}
						</TableRow>{" "}
					</TableHeader>{" "}
					<TableBody>
						{" "}
						<TableRow>
							{" "}
							<TableCell className="font-medium">Wireless Mouse</TableCell>{" "}
							<TableCell>$29.99</TableCell>{" "}
							<TableCell className="text-right">more</TableCell>
						</TableRow>{" "}
						<TableRow>
							{" "}
							<TableCell className="font-medium">Mechanical Keyboard</TableCell>{" "}
							<TableCell>$129.99</TableCell>{" "}
							<TableCell className="text-right">more</TableCell>
						</TableRow>{" "}
						<TableRow>
							{" "}
							<TableCell className="font-medium">USB-C Hub</TableCell>{" "}
							<TableCell>$49.99</TableCell>{" "}
							<TableCell className="text-right">more</TableCell>
						</TableRow>{" "}
					</TableBody>{" "}
				</Table>
			</div>
		</div>
	);
}

function Members() {
	return (
		<div
			className="flex items-center gap-3 border  cursor-pointer
 border-slate-200 bg-white/50 backdrop-blur-sm pl-4 pr-2 py-1 rounded-md shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
		>
			{/* Label with better typography */}
			<span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
				Members
			</span>

			{/* Avatar Group with slight overlap styling */}
			<AvatarGroup className="grayscale hover:grayscale-0 transition-all duration-300">
				<Avatar className="h-8 w-8 border-2 border-white ring-1 ring-slate-100">
					<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
					<AvatarFallback>CN</AvatarFallback>
				</Avatar>
				<Avatar className="h-8 w-8 border-2 border-white ring-1 ring-slate-100">
					<AvatarImage
						src="https://github.com/maxleiter.png"
						alt="@maxleiter"
					/>
					<AvatarFallback>LR</AvatarFallback>
				</Avatar>
				<Avatar className="h-8 w-8 border-2 border-white ring-1 ring-slate-100">
					<AvatarImage
						src="https://github.com/evilrabbit.png"
						alt="@evilrabbit"
					/>
					<AvatarFallback>ER</AvatarFallback>
				</Avatar>

				{/* Styled Counter */}
				<AvatarGroupCount className="h-8 w-8 text-[10px] bg-slate-100 text-slate-600 border-2 border-white font-bold">
					+ 6
				</AvatarGroupCount>
			</AvatarGroup>
		</div>
	);
}
