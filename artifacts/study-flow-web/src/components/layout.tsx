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
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        <div className="min-h-full w-full max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
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
