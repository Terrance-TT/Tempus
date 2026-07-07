import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Camera, Sparkles, CalendarCheck2, ArrowRight, BookOpen, BedDouble, Coffee, Download, CheckCircle2, ShieldCheck } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-foreground">StudyFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/sign-in")} className="hidden sm:flex">
              Sign in
            </Button>
            <Button onClick={() => setLocation("/sign-up")} className="rounded-full px-6">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent blur-3xl rounded-full" />
        </div>

        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-secondary-border text-sm font-medium text-secondary-foreground mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Breathe. We've got your week covered.</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-heading font-bold text-foreground leading-[1.1] tracking-tight">
              Turn your chaotic <br className="hidden md:block" />
              <span className="text-muted-foreground line-through decoration-primary/40 decoration-4">timetable</span> into a plan.
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Snap a photo of your schedule or describe your week. Tell us what's due. StudyFlow builds a balanced, realistic week that respects your sleep, meals, and actual capacity to focus.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                size="lg" 
                className="w-full sm:w-auto text-lg h-14 px-8 rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                onClick={() => setLocation("/sign-up")}
              >
                Sign up with Google
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="w-full sm:w-auto text-lg h-14 px-8 rounded-full hover:bg-secondary/50 transition-colors"
                onClick={() => setLocation("/create")}
              >
                Try it without an account
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Guests can build a schedule right away — only sign in when you're ready to save it.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works / Features */}
      <section className="py-24 bg-secondary/30 border-y border-border/50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
              How To <span className="line-through">Procrastinate</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              No manual data entry. Just a simple schedule, and a clear path forward.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 space-y-6 bg-background/50 backdrop-blur border-border/50 hover:border-primary/30 transition-colors animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold mb-2">1. Dump the chaos</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Snap a photo of your messy timetable, or just type out "I have work from 4-8 on Tuesday." We'll parse it instantly.
                </p>
              </div>
            </Card>

            <Card className="p-8 space-y-6 bg-background/50 backdrop-blur border-border/50 hover:border-primary/30 transition-colors animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400 fill-mode-both">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold mb-2">2. Pull your assignments</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Connect Canvas or Google Classroom. We'll automatically pull in your due dates so nothing slips through the cracks.
                </p>
              </div>
            </Card>

            <Card className="p-8 space-y-6 bg-background/50 backdrop-blur border-border/50 hover:border-primary/30 transition-colors animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold mb-2">3. Let AI balance it</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We schedule homework blocks around your classes, making sure you still have time to eat, sleep, and breathe.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-24 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center gap-16 max-w-5xl mx-auto">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
                <ShieldCheck className="w-4 h-4" />
                <span>Realistic expectations</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
                A schedule that knows you are human.
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <BedDouble className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Protects your sleep</h4>
                    <p className="text-muted-foreground">StudyFlow refuses to schedule assignments during your designated sleep hours. No more accidental all-nighters.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Coffee className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Mandatory breaks</h4>
                    <p className="text-muted-foreground">Focus blocks are automatically broken up with adequate rest and meal times.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <CalendarCheck2 className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">One-click Google Calendar sync</h4>
                    <p className="text-muted-foreground">Once it looks good, push the entire week to your Google Calendar instantly.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-md relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent blur-3xl -z-10 rounded-full" />
              <Card className="p-6 border border-border shadow-2xl bg-background rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="space-y-4">
                  <div className="h-2 w-1/3 bg-secondary rounded-full mb-6" />
                  
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex gap-4">
                    <div className="w-1 bg-primary rounded-full shrink-0" />
                    <div>
                      <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">10:00 AM - 11:30 AM</p>
                      <p className="font-medium text-foreground">Write History Essay</p>
                      <p className="text-sm text-muted-foreground mt-1">Due tomorrow • High focus</p>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-secondary/50 border border-secondary-border flex gap-4 opacity-70">
                    <div className="w-1 bg-muted-foreground/30 rounded-full shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">11:30 AM - 12:30 PM</p>
                      <p className="font-medium text-foreground">Lunch & Screen Break</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 flex gap-4">
                    <div className="w-1 bg-accent rounded-full shrink-0" />
                    <div>
                      <p className="text-xs text-accent-foreground font-bold uppercase tracking-wider mb-1">12:30 PM - 2:00 PM</p>
                      <p className="font-medium text-foreground">Math Problem Set</p>
                      <p className="text-sm text-muted-foreground mt-1">Due Friday • Medium focus</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-primary/5 border-t border-primary/10" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-2xl">
          <h2 className="text-4xl font-heading font-bold text-foreground mb-6">
            Ready to feel in control?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Let's sit down and figure out your week. It only takes a minute.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="w-full sm:w-auto text-lg h-14 px-8 rounded-full shadow-lg hover:scale-[1.02] transition-transform"
              onClick={() => setLocation("/sign-up")}
            >
              Sign up with Google
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="w-full sm:w-auto text-lg h-14 px-8 rounded-full bg-background"
              onClick={() => setLocation("/create")}
            >
              Try as guest
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border mt-auto bg-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="font-heading font-medium">StudyFlow</span>
          </div>
          <div className="text-sm text-muted-foreground flex gap-6">
            <button onClick={() => setLocation("/sign-in")} className="hover:text-foreground transition-colors">Sign in</button>
            <button onClick={() => setLocation("/sign-up")} className="hover:text-foreground transition-colors">Sign up</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
