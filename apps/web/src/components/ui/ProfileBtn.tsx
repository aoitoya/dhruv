import { CgProfile } from "react-icons/cg";
import { IoIosLogOut } from "react-icons/io";
import { IoSettingsOutline } from "react-icons/io5";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./avatar";

import {
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarTrigger,
} from "./menubar";

export default function ProfileBtn() {
	return (
		<MenubarMenu>
			<MenubarTrigger className="flex gap-2 cursor-pointer">
				<Avatar>
					<AvatarImage src="" />
					<AvatarFallback>CN</AvatarFallback>
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
				<MenubarItem variant="destructive">
					<IoIosLogOut />
					Logout
				</MenubarItem>
			</MenubarContent>
		</MenubarMenu>
	);
}
