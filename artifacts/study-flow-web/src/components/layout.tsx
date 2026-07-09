import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, CalendarDays, PlusCircle, Plug, ShieldCheck, LogOut, MessageSquarePlus, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useClerk } from "@clerk/react";
import { useIsSignedIn, useDeviceId } from "@/hooks/use-device-id";
import {
  useListSchedules,
  getListSchedulesQueryKey,
  useGetAdminStatus,
  getGetAdminStatusQueryKey,
} from "@workspace/api-client-react";
import { FeedbackDialog } from "@/components/feedback-dialog";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  const isSignedIn = useIsSignedIn();
  const deviceId = useDeviceId();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { data: adminStatus } = useGetAdminStatus({
    query: { enabled: !!isSignedIn, queryKey: getGetAdminStatusQueryKey() },
  });
  const isAdmin = adminStatus?.isAdmin === true;

  const { data: schedules } = useListSchedules(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListSchedulesQueryKey({ deviceId: deviceId || "" }) } }
  );
  const hasGeneratedSchedule = !!schedules?.some((s) => s.status === "complete");

  const handleSignOut = () => signOut(() => setLocation("/"));

  const navItems = [
    hasGeneratedSchedule
      ? { href: "/", label: "Today", icon: Calendar }
      : { href: "/", label: "Plans", icon: CalendarDays },
    { href: "/create", label: "New Plan", icon: PlusCircle },
    { href: "/integrations", label: "Integrations", icon: Plug },
    { href: "/focus-guard", label: "Focus Guard", icon: ShieldCheck },
    ...(isAdmin ? [{ href: "/admin/feedback", label: "Feedback Inbox", icon: Inbox }] : []),
  ];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <TooltipProvider delayDuration={200}>
        <aside className="hidden md:flex w-20 flex-col border-r bg-card items-center py-5 gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/" className="mb-4 transition-all hover:scale-105">
                <span className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/30">
                  <Calendar className="w-7 h-7" />
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Home</TooltipContent>
          </Tooltip>

          <nav className="flex-1 flex flex-col items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "p-2.5 flex items-center justify-center rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-8 h-8" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          <div className="flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setFeedbackOpen(true)}
                  className="p-2.5 flex items-center justify-center rounded-xl transition-all duration-200 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  data-testid="button-open-feedback"
                >
                  <MessageSquarePlus className="w-8 h-8" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Feedback</TooltipContent>
            </Tooltip>

            {isSignedIn && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSignOut}
                    className="p-2.5 flex items-center justify-center rounded-xl transition-all duration-200 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <LogOut className="w-8 h-8" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            )}
          </div>
        </aside>
      </TooltipProvider>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto relative">
        {/* Background art */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
          {/* Diagonal crosshatch grid */}
          <svg className="absolute inset-0 w-full h-full text-primary opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="crosshatch" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="40" stroke="currentColor" strokeWidth="0.6"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#crosshatch)" />
          </svg>
          {/* Primary glow — bottom left */}
          <div className="absolute -bottom-48 -left-24 w-[600px] h-[600px] bg-primary/12 rounded-full blur-[130px]" />
          {/* Secondary glow — top right */}
          <div className="absolute -top-24 right-0 w-[350px] h-[350px] bg-primary/7 rounded-full blur-[80px]" />
          {/* Starburst lines from bottom-left corner */}
          <svg className="absolute bottom-0 left-0 w-[560px] h-[560px] text-primary opacity-[0.06]" viewBox="0 0 560 560" fill="none" xmlns="http://www.w3.org/2000/svg">
            {[0,15,30,45,60,75,90].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              return <line key={i} x1="0" y1="560" x2={Math.cos(rad) * 800} y2={560 - Math.sin(rad) * 800} stroke="currentColor" strokeWidth="0.8"/>;
            })}
          </svg>
          {/* Floating geometric outline — top right */}
          <svg className="absolute top-12 right-12 w-48 h-48 text-primary opacity-[0.06]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,4 96,28 96,72 50,96 4,72 4,28" stroke="currentColor" strokeWidth="1"/>
            <polygon points="50,18 82,34 82,66 50,82 18,66 18,34" stroke="currentColor" strokeWidth="0.6"/>
            <polygon points="50,32 68,41 68,59 50,68 32,59 32,41" stroke="currentColor" strokeWidth="0.4"/>
          </svg>
        </div>
        <div className="relative min-h-full w-full max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/80 backdrop-blur-md pb-safe z-50">
        <div className="flex items-center justify-around p-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg min-w-[4rem] transition-all duration-200",
                  isActive 
                    ? "text-primary scale-110" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 mb-1", isActive ? "fill-primary/20" : "")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[4rem] transition-all duration-200 text-muted-foreground hover:text-foreground"
            data-testid="button-open-feedback-mobile"
          >
            <MessageSquarePlus className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Feedback</span>
          </button>
          {isSignedIn && (
            <button
              onClick={handleSignOut}
              className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[4rem] transition-all duration-200 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Sign out</span>
            </button>
          )}
        </div>
      </nav>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
