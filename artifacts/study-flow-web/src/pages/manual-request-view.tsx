import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Clock, CheckCircle2, Hourglass } from "lucide-react";
import { useManualRequest } from "@/hooks/use-manual-requests";

export default function ManualRequestView() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data, isLoading } = useManualRequest(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const req = data?.data;
  if (!req) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto pt-20 text-center space-y-4">
          <p className="text-muted-foreground">Request not found.</p>
          <Button variant="outline" onClick={() => setLocation("/")}>Go home</Button>
        </div>
      </Layout>
    );
  }

  const response = req.response;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto pt-6 pb-16 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-heading font-bold">Your personalised schedule</h1>
        </div>

        {req.status === "pending" || req.status === "in_progress" ? (
          <Card className="text-center p-10 space-y-4">
            <Hourglass className="w-12 h-12 text-primary/60 mx-auto animate-pulse" />
            <div>
              <h2 className="text-xl font-heading font-semibold">We're working on it</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {req.status === "pending"
                  ? "Your request is in the queue. We'll have your plan ready shortly."
                  : "One of our team is putting together your schedule now."}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Submitted {new Date(req.createdAt).toLocaleString()}</p>
          </Card>
        ) : response ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Your schedule is ready</span>
            </div>

            {response.message && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <p className="text-sm italic text-foreground leading-relaxed">"{response.message}"</p>
                </CardContent>
              </Card>
            )}

            {response.graphicPath && (
              <Card>
                <CardContent className="pt-4">
                  <img
                    src={response.graphicPath}
                    alt="Your schedule"
                    className="w-full rounded-lg object-contain max-h-96"
                  />
                </CardContent>
              </Card>
            )}

            {response.scheduleContent && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Your plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {response.scheduleContent}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="text-center p-10">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No response yet.</p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
