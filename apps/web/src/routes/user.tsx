import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/layout/layout";

export const Route = createFileRoute("/user")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<Layout>
				<div>Dashboard</div>
			</Layout>
		</div>
	);
}
