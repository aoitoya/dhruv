import { Bell, ChevronDown, Home, Settings } from "lucide-react";
import SearchBar from "../ui/SearchBar";

export default function Title() {
	return (
		<nav className="flex items-center justify-between px-8 py-3 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
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
				<ul className="hidden md:flex items-center gap-8">
					<li className="flex items-center gap-2 text-sm font-semibold text-indigo-600 cursor-pointer">
						<Home size={18} />
						<span>Home</span>
					</li>
				</ul>
			</div>

			{/* RIGHT SIDE: Actions & Profile */}
			<div className="flex items-center gap-3">
				{/* Search Bar (Optional but looks great in dashboards) */}
				<SearchBar />
				{/* Icon Buttons */}
				<div className="flex items-center gap-1 border-r border-gray-100 pr-4 mr-1">
					<button
						type="button"
						className="p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors relative"
					>
						<Bell size={20} />
						<span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
					</button>

					<button
						type="button"
						className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
					>
						<Settings size={20} />
					</button>
				</div>

				{/* Profile Section */}
				<button
					type="button"
					className="flex items-center gap-3 pl-2 hover:bg-gray-50 p-1 rounded-xl transition-all group"
				>
					<div className="relative">
						<img
							src="https://ui-avatars.com/api/?name=Alex+Smith&background=6366f1&color=fff"
							alt="Profile"
							className="w-9 h-9 rounded-full object-cover border border-gray-200"
						/>
						<div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
					</div>

					<div className="hidden lg:block text-left">
						<p className="text-sm font-bold text-gray-700 leading-tight">
							Alex Smith
						</p>
						<p className="text-[11px] font-medium text-gray-400">
							Premium Plan
						</p>
					</div>

					<ChevronDown
						size={14}
						className="text-gray-400 group-hover:text-gray-600"
					/>
				</button>
			</div>
		</nav>
	);
}
