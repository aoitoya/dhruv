import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { CgProfile } from "react-icons/cg";
import { IoIosLogOut } from "react-icons/io";
import { IoSettingsOutline } from "react-icons/io5";
import authClient from "@/lib/auth";
import { userAtom } from "@/states/user";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./avatar";
import {
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarTrigger,
} from "./menubar";

export default function ProfileBtn() {
	const [user] = useAtom(userAtom);

	const navigate = useNavigate();
	const handleLogout = async () => {
		await authClient.signOut();
		navigate({ to: "/" });
	};

	if (!user) {
		return null;
	}

	const name = user.name;

	const notImg = name
		.split(" ")
		.map((word) => word[0])
		.join("")
		.toUpperCase();

	return (
		<MenubarMenu>
			<MenubarTrigger className="flex gap-2 cursor-pointer">
				<Avatar>
					<AvatarImage src={user.image ?? ""} />
					<AvatarFallback>{notImg}</AvatarFallback>
					<AvatarBadge className="bg-green-600 dark:bg-green-400" />
				</Avatar>

				<div className="hidden lg:block text-left">
					<p className="text-sm font-bold text-gray-700 dark:text-foreground leading-tight">
						Alex Smith
					</p>
					<p className="text-[11px] font-medium text-gray-400 dark:text-muted-foreground">
						Premium Plan
					</p>
				</div>
			</MenubarTrigger>
			<MenubarContent>
				<MenubarItem>
					<CgProfile />
					Profile
				</MenubarItem>
				<MenubarItem>
					<IoSettingsOutline />
					Setting
				</MenubarItem>
				<MenubarSeparator />
				<MenubarItem variant="destructive" onClick={handleLogout}>
					<IoIosLogOut />
					Logout
				</MenubarItem>
			</MenubarContent>
		</MenubarMenu>
	);
}
