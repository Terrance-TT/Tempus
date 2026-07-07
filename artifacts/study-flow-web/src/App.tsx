import { useEffect, useRef, type ComponentType } from "react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useClaimGuestData } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  peekGuestDeviceId,
  clearGuestDeviceId,
  getPendingScheduleId,
  clearPendingScheduleId,
} from "@/hooks/use-device-id";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Create from "@/pages/create";
import Schedule from "@/pages/schedule";
import History from "@/pages/history";
import Integrations from "@/pages/integrations";
import NotFound from "@/pages/not-found";

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
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
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
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || attemptedRef.current) return;
    const guestId = peekGuestDeviceId();
    if (!guestId) return;
    attemptedRef.current = true;
    claimGuestData.mutate(
      { data: { guestDeviceId: guestId } },
      {
        onSuccess: () => {
          clearGuestDeviceId();
          rqClient.clear();
          const pending = getPendingScheduleId();
          if (pending) {
            clearPendingScheduleId();
            setLocation(`/schedule/${pending}`);
          }
        },
        onError: () => {
          // Leave the guest id in place so a retry on next load can claim it.
          attemptedRef.current = false;
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  return null;
}

function HomeRedirect() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  return user ? <Home /> : <Landing />;
}

function AuthedRoute({ component: Component }: { component: ComponentType }) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  return user ? <Component /> : <Landing />;
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
            subtitle: "Sign in to StudyFlow with Google to see your schedule",
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
            <Route path="/schedule/:id">
              <AuthedRoute component={Schedule} />
            </Route>
            <Route path="/history">
              <AuthedRoute component={History} />
            </Route>
            <Route path="/integrations">
              <AuthedRoute component={Integrations} />
            </Route>
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
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
