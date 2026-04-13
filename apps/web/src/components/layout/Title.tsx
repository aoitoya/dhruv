import { Bell } from "lucide-react";
import type { SessionType } from "@/lib/auth";
import ProfileBtn from "../ui/ProfileBtn";
import SearchBar from "../ui/SearchBar";
import NavBar from "./NavBar";

export default function Title({ userData }: { userData: SessionType }) {
	return (
		<nav className="flex items-center justify-between px-8 py-3 opacity-80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 dark:border-border">
			{/* LEFT SIDE: Logo & Search */}
			<div className="flex items-center gap-12">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
						<div className="w-4 h-4 bg-white rounded-sm rotate-45" />
					</div>
					<h6 className="text-xl font-bold bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
						Dashly
					</h6>
				</div>

				{/* Simple Navigation */}
				<NavBar />
			</div>

			{/* RIGHT SIDE: Actions & Profile */}
			<div className="flex items-center gap-3">
				{/* Search Bar (Optional but looks great in dashboards) */}
				<SearchBar />
				{/* Icon Buttons */}
				<div className="flex items-center gap-1 border-r pr-4 mr-1">
					<button
						type="button"
						className="p-2 text-gray-500 hover:bg-indigo-50 hover:text-primary rounded-full transition-colors relative dark:text-foreground dark:hover:bg-indigo-950 "
					>
						<Bell size={20} />
						<span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-border" />
					</button>
				</div>

				<ProfileBtn userData={userData} />
			</div>
		</nav>
	);
}
