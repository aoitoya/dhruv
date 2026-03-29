import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import {
  type ChangeEvent,
  type SubmitEventHandler,
  useCallback,
  useState,
} from "react";
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

/**
 * Render the authentication page with sign-in and sign-up forms, tabbed switching, and a GitHub social sign-in option.
 *
 * The component manages form state (name, email, password), tracks a loading state to disable inputs during requests,
 * and switches between "signin" and "signup" modes. Submitting the form triggers the appropriate email sign-in or
 * sign-up flow via `authClient` and updates the loading state; initiating GitHub auth triggers a social sign-in flow.
 * Errors are logged to the console and will clear the loading state.
 *
 * @returns The React element that renders the authentication page UI.
 */
function AuthPage() {
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");

  const handleInputChange = useCallback(
    (field: keyof typeof formData) => (e: ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  const handleSubmit = useCallback<SubmitEventHandler>(
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
        callbackURL: `${import.meta.env.VITE_CLIENT_URL}/app`,
        errorCallbackURL: `${import.meta.env.VITE_CLIENT_URL}/`,
        newUserCallbackURL: `${import.meta.env.VITE_CLIENT_URL}/app`,
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

/**
 * Renders a two-option tab switcher for choosing between "Sign In" and "Sign Up".
 *
 * The active tab is highlighted; clicking a tab calls `onTabChange` with the selected tab.
 *
 * @param activeTab - Currently selected tab, either `"signin"` or `"signup"`.
 * @param onTabChange - Callback invoked with the newly selected tab when the user clicks a tab.
 * @returns The tab switcher React element.
 */
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

/**
 * Renders a labeled, required input element controlled by the provided props.
 *
 * @param id - Unique identifier applied to the input and its label
 * @param label - Visible text for the input's label
 * @param type - HTML input `type` attribute (e.g., "text", "email", "password")
 * @param value - Controlled input value
 * @param onChange - Change handler for the input element
 * @param placeholder - Placeholder text shown when the input is empty
 * @param autoComplete - Optional `autocomplete` attribute value for the input
 * @returns The JSX element containing a label and a required controlled input
 */
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
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
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

/**
 * Render a horizontal separator with a centered "Or continue with" label.
 *
 * @returns A JSX element containing a full-width horizontal line with an uppercase, centered label overlaid on the line.
 */
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
