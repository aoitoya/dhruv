import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { IoLogoGithub as Github } from "react-icons/io";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import authClient from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
	component: AuthPage,
});

type AuthTab = "signin" | "signup";

const initialFormData = {
	name: "",
	email: "",
	password: "",
};

function AuthPage() {
	const [formData, setFormData] = useState(initialFormData);
	const [isLoading, setIsLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<AuthTab>("signin");

	const handleInputChange = useCallback(
		(field: keyof typeof formData) =>
			(e: React.ChangeEvent<HTMLInputElement>) => {
				setFormData((prev) => ({ ...prev, [field]: e.target.value }));
			},
		[],
	);

	const handleSubmit = useCallback<React.FormEventHandler>(
		async (e) => {
			e.preventDefault();
			setIsLoading(true);

			try {
				if (activeTab === "signup") {
					await authClient.signUp.email(formData, {
						onSuccess: () => setIsLoading(false),
						onResponse: () => setIsLoading(false),
					});
				} else {
					await authClient.signIn.email(formData, {
						onSuccess: () => setIsLoading(false),
						onResponse: () => setIsLoading(false),
					});
				}
			} catch (error) {
				console.error("Auth error:", error);
				setIsLoading(false);
			}
		},
		[activeTab, formData],
	);

	const handleGitHubSignIn = useCallback(async () => {
		setIsLoading(true);
		try {
			await authClient.signIn.social({
				provider: "github",
				callbackURL: `${import.meta.env.VITE_CLIENT_URL}/`,
				errorCallbackURL: `${import.meta.env.VITE_CLIENT_URL}/auth`,
				newUserCallbackURL: `${import.meta.env.VITE_CLIENT_URL}/`,
			});
		} catch (error) {
			console.error("GitHub auth error:", error);
			setIsLoading(false);
		}
	}, []);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
			<div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
				<Card className="shadow-lg shadow-foreground/5 border-border/50">
					<CardHeader className="text-center pb-2">
						<CardTitle className="text-xl font-semibold tracking-tight">
							{activeTab === "signin" ? "Welcome Back" : "Create Account"}
						</CardTitle>
						<CardDescription className="text-muted-foreground">
							{activeTab === "signin"
								? "Sign in to your account to continue"
								: "Join us and start your journey"}
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-4">
						<AuthTabs activeTab={activeTab} onTabChange={setActiveTab} />

						<form onSubmit={handleSubmit} className="space-y-3">
							{activeTab === "signup" && (
								<FormInput
									id="name"
									label="Name"
									type="text"
									value={formData.name}
									onChange={handleInputChange("name")}
									placeholder="Your name"
									autoComplete="name"
								/>
							)}

							<FormInput
								id="email"
								label="Email"
								type="email"
								value={formData.email}
								onChange={handleInputChange("email")}
								placeholder="you@example.com"
								autoComplete="email"
							/>

							<FormInput
								id="password"
								label="Password"
								type="password"
								value={formData.password}
								onChange={handleInputChange("password")}
								placeholder="Enter your password"
								autoComplete={
									activeTab === "signup" ? "new-password" : "current-password"
								}
							/>

							<Button
								type="submit"
								className="w-full"
								size="lg"
								disabled={isLoading}
							>
								{isLoading ? (
									<span className="flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										Processing...
									</span>
								) : activeTab === "signup" ? (
									"Create Account"
								) : (
									"Sign In"
								)}
							</Button>
						</form>

						<SocialAuthSeparator />

						<Button
							type="button"
							variant="outline"
							className="w-full"
							size="lg"
							onClick={handleGitHubSignIn}
							disabled={isLoading}
						>
							<Github className="mr-2 size-4" />
							GitHub
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function AuthTabs({
	activeTab,
	onTabChange,
}: {
	activeTab: AuthTab;
	onTabChange: (tab: AuthTab) => void;
}) {
	return (
		<div className="flex rounded-md bg-muted p-0.5">
			{(["signin", "signup"] as AuthTab[]).map((tab) => (
				<button
					key={tab}
					type="button"
					onClick={() => onTabChange(tab)}
					className={cn(
						"flex-1 py-1.5 text-xs font-medium rounded-sm transition-all",
						activeTab === tab
							? "bg-background shadow-sm text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{tab === "signin" ? "Sign In" : "Sign Up"}
				</button>
			))}
		</div>
	);
}

function FormInput({
	id,
	label,
	type,
	value,
	onChange,
	placeholder,
	autoComplete,
}: {
	id: string;
	label: string;
	type: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	placeholder: string;
	autoComplete?: string;
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id} className="text-foreground/80">
				{label}
			</Label>
			<Input
				id={id}
				type={type}
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				required
				autoComplete={autoComplete}
			/>
		</div>
	);
}

function SocialAuthSeparator() {
	return (
		<div className="relative py-2">
			<div className="absolute inset-0 flex items-center">
				<Separator className="w-full" />
			</div>
			<div className="relative flex justify-center text-xs uppercase">
				<span className="bg-card px-2 text-muted-foreground">
					Or continue with
				</span>
			</div>
		</div>
	);
}
