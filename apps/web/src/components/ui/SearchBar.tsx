import { Command, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./dialog";
import { Separator } from "./separator";

export default function SearchBar() {
	const [open, setOpen] = useState<boolean>(false);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((prevOpen) => !prevOpen);
			}
		};

		document.addEventListener("keydown", down);

		return () => document.removeEventListener("keydown", down);
	}, []);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger>
				<div className="cursor-pointer">
					{/* DESKTOP: Wide Search Bar */}
					<div className="hidden sm:flex items-center justify-between bg-slate-50 dark:bg-card hover:bg-white border border-slate-200 dark:border-border hover:border-indigo-400 rounded-xl px-4 py-2 transition-all duration-200 shadow-sm hover:shadow-md w-64 group">
						<div className="flex items-center gap-3">
							<Search
								size={18}
								className="text-slate-400 group-hover:text-indigo-500 transition-colors dark:text-muted-foreground"
							/>
							<span className="text-slate-400 text-sm font-medium dark:text-muted-foreground">
								Search...
							</span>
						</div>
						<div className="flex items-center gap-1 bg-slate-200/50 px-1.5 py-0.5 rounded border border-slate-300 dark:bg-card dark:border-border">
							<Command
								size={10}
								className="text-slate-500 dark:text-muted-foreground"
							/>
							<span className="text-[10px] font-bold text-slate-500 dark:text-muted-foreground">
								K
							</span>
						</div>
					</div>

					{/* MOBILE: Icon Only Button */}
					<div className="flex sm:hidden p-2.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-full transition-all hover:shadow-sm active:scale-95">
						<Search size={20} strokeWidth={2.5} />
					</div>
				</div>
			</DialogTrigger>

			<DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-t-2xl sm:rounded-xl gap-0">
				<DialogHeader className="gap-0">
					{/* <DialogDescription> */}
					<div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-border">
						<Search className="text-indigo-500 mr-3" size={20} />
						<input
							autoFocus
							type="text"
							placeholder="Search documents, files, settings..."
							className="w-full text-base sm:text-lg bg-transparent border-none focus:ring-0 focus:outline-none text-slate-700 placeholder:text-slate-400 dark:placeholder:text-muted-foreground"
						/>
					</div>
					{/* </DialogDescription> */}
					<Separator />
				</DialogHeader>

				{/* Results / Suggestions Placeholder */}
				<div className=" bg-slate-50/50 dark:bg-card min-h-40">
					<h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-3 mt-1">
						Suggested
					</h3>
					<div className="space-y-0.5">
						{["Dashboard", "Analytics", "Project Settings"].map((item) => (
							<div
								key={item}
								className="flex items-center px-3 py-2 text-sm text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-lg transition-all cursor-pointer group dark:text-foreground dark:hover:text-accent-foreground dark:hover:bg-accent"
							>
								<div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-indigo-400 mr-3" />
								{item}
							</div>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
