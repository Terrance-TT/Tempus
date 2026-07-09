import { Component, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { ArrowLeft, UserCircle, Loader2 } from "lucide-react";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useClaimGuestData, setBaseUrl } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  peekGuestDeviceId,
  clearGuestDeviceId,
  getPendingScheduleId,
  clearPendingScheduleId,
  getPendingCreateState,
  clearPendingCreateState,
} from "@/hooks/use-device-id";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Create from "@/pages/create";
import Schedule from "@/pages/schedule";
import Integrations from "@/pages/integrations";
import FocusGuard from "@/pages/focus-guard";
import Pricing from "@/pages/pricing";
import CheckoutSuccess from "@/pages/checkout-success";
import NotFound from "@/pages/not-found";

// When the frontend and backend are on different origins (e.g. Railway), set
// the API base URL from an env var so the React Query client calls the right host.
// In the Replit dev environment this is empty, so relative "/api" paths keep working.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

const queryClient = new QueryClient();

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains. Do not inline the env var, leave
// publishableKey undefined, or replace publishableKeyFromHost with anything else.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev (Clerk hits dev FAPI directly), auto-set
// in prod. Do NOT gate on import.meta.env.PROD / NODE_ENV — the empty dev value
// is intentional, and any branching breaks the prod proxy.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(155, 30%, 45%)",
    colorForeground: "hsl(160, 30%, 20%)",
    colorMutedForeground: "hsl(160, 15%, 45%)",
    colorDanger: "hsl(0, 70%, 50%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(40, 20%, 97%)",
    colorInputForeground: "hsl(160, 30%, 20%)",
    colorNeutral: "hsl(155, 15%, 85%)",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-heading font-bold text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary font-medium hover:text-primary/80",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-primary",
    alertText: "text-destructive",
    logoBox: "mb-2",
    logoImage: "h-10 w-10 rounded-xl",
    socialButtonsBlockButton: "border border-border hover:bg-secondary/50 rounded-xl",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm",
    formFieldInput: "border border-input rounded-xl bg-background",
    footerAction: "text-sm",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border border-destructive/20 rounded-xl",
    otpCodeFieldInput: "border border-input rounded-xl",
    formFieldRow: "mb-4",
    main: "px-8 py-8",
  },
};

function SignInPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative">
      <button
        onClick={() => setLocation("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="w-full max-w-[440px] space-y-6">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        <div className="text-center">
          <button
            onClick={() => setLocation("/create")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <UserCircle className="w-4 h-4" /> Continue as guest
          </button>
        </div>
      </div>
    </div>
  );
}

function SignUpPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative">
      <button
        onClick={() => setLocation("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="w-full max-w-[440px] space-y-6">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        <div className="text-center">
          <button
            onClick={() => setLocation("/create")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <UserCircle className="w-4 h-4" /> Continue as guest
          </button>
        </div>
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const rqClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        rqClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, rqClient]);

  return null;
}

// After a guest signs in, claim any data they created anonymously (commitments,
// schedules, preferences) into their real account, then send them to the
// schedule they were locked out of (if any).
function GuestDataClaimer() {
  const { user, isLoaded } = useUser();
  const claimGuestData = useClaimGuestData();
  const rqClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const attemptedRef = useRef(false);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user || attemptedRef.current) return;
    const guestId = peekGuestDeviceId();
    if (!guestId) return;
    attemptedRef.current = true;
    setIsMigrating(true);
    claimGuestData.mutate(
      { data: { guestDeviceId: guestId } },
      {
        onSuccess: (result) => {
          clearGuestDeviceId();
          rqClient.clear();
          setIsMigrating(false);
          if ((result as any)?.claimedCount > 0) {
            toast({ title: "Your plans are ready", description: "Everything you created before signing in has been saved to your account." });
          }
          const pending = getPendingScheduleId();
          const pendingCreate = getPendingCreateState();
          if (pending) {
            clearPendingScheduleId();
            setLocation(`/schedule/${pending}`);
          } else if (pendingCreate) {
            clearPendingCreateState();
            setLocation("/create");
          }
        },
        onError: () => {
          // Leave the guest id in place so a retry on next load can claim it.
          attemptedRef.current = false;
          setIsMigrating(false);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  if (!isMigrating) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-card border shadow-lg rounded-full px-4 py-2.5 text-sm font-medium text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      Saving your plans to your account…
    </div>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-2xl font-heading font-semibold">Something went wrong</p>
          <p className="text-muted-foreground max-w-sm">An unexpected error occurred. Try refreshing the page.</p>
          <button
            className="text-sm underline text-muted-foreground"
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function HomeRedirect() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  return user ? <Home /> : <Landing />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to Tempus with Google to see your schedule",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Sign up with Google to build your first schedule",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <GuestDataClaimer />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            {/* Guests may build a schedule without an account */}
            <Route path="/create" component={Create} />
            <Route path="/schedule/:id" component={Schedule} />
            <Route path="/integrations" component={Integrations} />
            <Route path="/focus-guard" component={FocusGuard} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/checkout/success" component={CheckoutSuccess} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </AppErrorBoundary>
  );
}

export default App;
