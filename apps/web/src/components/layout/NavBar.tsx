import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

export default function NavBar() {
	const _navLink = [
		{
			name: "Dashboard",
			icon: Home,
			link: "/user",
		},
	];

	return (
		<ul className="hidden md:flex items-center gap-8">
			<Link to="/user">
				<li className="flex items-center gap-2 text-sm font-semibold text-indigo-600 cursor-pointer">
					<Home size={18} />
					<span>Dashboard</span>
				</li>
			</Link>
		</ul>
	);
}
