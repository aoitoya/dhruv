import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

export default function NavBar() {
	return (
		<ul className="hidden md:flex items-center gap-8">
			<Link to="/app">
				<li className="flex items-center gap-2 text-sm font-semibold text-indigo-600 cursor-pointer">
					<Home size={18} />
					<span>Dashboard</span>
				</li>
			</Link>
		</ul>
	);
}
