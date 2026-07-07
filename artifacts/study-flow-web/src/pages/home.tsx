import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useDeviceId } from "@/hooks/use-device-id";
import { useListSchedules, getListSchedulesQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, PlusCircle, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();

  const { data: schedules, isLoading } = useListSchedules(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListSchedulesQueryKey({ deviceId: deviceId || "" }) } }
  );

  const activeSchedule = schedules?.find(s => s.status === "complete");

  if (!deviceId || isLoading) {
    return (
      <Layout>
        <div className="space-y-6 pt-12">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">Welcome to Tempus</h1>
          <p className="text-muted-foreground text-lg">Your AI-powered study planner.</p>
        </header>

        {activeSchedule ? (
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Calendar className="w-6 h-6 text-primary" />
                  Your Active Plan
                </CardTitle>
                <CardDescription className="text-base">
                  Generated on {format(new Date(activeSchedule.createdAt), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    className="flex-1 text-lg py-6 rounded-xl shadow-sm"
                    onClick={() => setLocation(`/schedule/${activeSchedule.id}`)}
                  >
                    Open Schedule <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 py-6 rounded-xl bg-background hover:bg-secondary/50"
                    onClick={() => setLocation("/create")}
                  >
                    <PlusCircle className="mr-2 w-5 h-5" /> New Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="text-center py-16 px-6 border-dashed bg-secondary/10 shadow-none relative overflow-hidden rounded-3xl">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-6 max-w-md mx-auto">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary shadow-sm border border-primary/20">
                <Sparkles className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-heading font-semibold text-foreground">Ready to get organized?</h2>
                <p className="text-muted-foreground text-lg">
                  Snap a photo of your class timetable, tell us what's due, and we'll build a balanced schedule for you in seconds.
                </p>
              </div>
              <Button size="lg" className="w-full text-lg py-6 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" onClick={() => setLocation("/create")}>
                <PlusCircle className="mr-2 w-5 h-5" /> Create Your First Plan
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
