import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./avatar";

export default function ProfileBtn() {
	return (
		<div className="flex">
			<Avatar>
				<AvatarImage src="" />
				<AvatarFallback>CN</AvatarFallback>
				<AvatarBadge className="bg-green-600 dark:bg-green-800" />
			</Avatar>

			<div>
				<h6>Name</h6>
				<p>Title</p>
			</div>
		</div>
	);
}
