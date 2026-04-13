import { useNavigate } from "@tanstack/react-router";
import { CgProfile } from "react-icons/cg";
import { IoIosLogOut } from "react-icons/io";
import { IoSettingsOutline } from "react-icons/io5";
import authClient, { type SessionType } from "@/lib/auth";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./avatar";
import {
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarTrigger,
} from "./menubar";

export default function ProfileBtn({ userData }: { userData: SessionType }) {
	const navigate = useNavigate();
	const handleLogout = async () => {
		await authClient.signOut();
		navigate({ to: "/" });
	};
	const name = userData.user.name;

	const session = authClient.useSession();
	if (!session.data) {
		return;
	}

	const notImg = name
		.split(" ")
		.map((word) => word[0])
		.join("")
		.toUpperCase();

	return (
		<MenubarMenu>
			<MenubarTrigger className="flex gap-2 cursor-pointer">
				<Avatar>
					<AvatarImage src={session.data.user.image ?? ""} />
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
