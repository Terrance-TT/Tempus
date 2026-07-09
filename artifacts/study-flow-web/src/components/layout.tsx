import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, CalendarDays, PlusCircle, Plug, ShieldCheck, LogOut, MessageSquarePlus, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
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
      <aside className="hidden md:flex w-64 flex-col border-r bg-card px-4 py-8 shrink-0">
        <div className="mb-8 px-4">
          <Link href="/">
            <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Calendar className="w-5 h-5" />
              </span>
              Tempus
            </h1>
          </Link>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-100" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-[1.02]"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary-foreground/90" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setFeedbackOpen(true)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground w-full mt-2"
          data-testid="button-open-feedback"
        >
          <MessageSquarePlus className="w-5 h-5" />
          Feedback
        </button>

        {isSignedIn && (
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground w-full mt-2"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        )}
      </aside>

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
