import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, PlusCircle, History, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Today", icon: Calendar },
    { href: "/create", label: "New Plan", icon: PlusCircle },
    { href: "/history", label: "History", icon: History },
    { href: "/integrations", label: "Integrations", icon: Plug },
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
              StudyFlow
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
        </div>
      </nav>
    </div>
  );
}
