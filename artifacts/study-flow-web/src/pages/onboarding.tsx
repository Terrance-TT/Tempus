import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDeviceId } from "@/hooks/use-device-id";
import { useCreateCommitment, useListCommitments, getListCommitmentsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { CommitmentForm, CommitmentFormValues } from "@/components/commitment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckSquare, Clock } from "lucide-react";

export default function Onboarding() {
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: commitments = [] } = useListCommitments(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListCommitmentsQueryKey({ deviceId: deviceId || "" }) } }
  );

  const createCommitment = useCreateCommitment();

  const handleSubmit = (data: CommitmentFormValues) => {
    if (!deviceId) return;
    createCommitment.mutate(
      {
        data: {
          ...data,
          deviceId,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey({ deviceId }) });
          toast({
            title: "Commitment added",
            description: "You can add another or proceed.",
          });
        },
        onError: (err: any) => {
          toast({
            title: "Error",
            description: err?.data?.message || "Failed to add commitment.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8 pt-8 pb-12">
        <header className="space-y-2 text-center mb-10">
          <h1 className="text-3xl font-heading font-semibold tracking-tight text-foreground">
            Let's build your routine
          </h1>
          <p className="text-muted-foreground text-lg">
            Add your recurring classes, activities, and routines.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-medium mb-6">Add a Commitment</h2>
              <CommitmentForm onSubmit={handleSubmit} isSubmitting={createCommitment.isPending} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                Added so far ({commitments.length})
              </h3>
              
              <div className="space-y-3">
                {commitments.length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-secondary/50 p-4 rounded-xl border border-secondary text-center">
                    No commitments added yet. Add your first one to get started.
                  </div>
                ) : (
                  commitments.map((commitment) => (
                    <Card key={commitment.id} className="overflow-hidden bg-card/50 shadow-none border-secondary">
                      <CardContent className="p-3">
                        <div className="font-medium text-sm">{commitment.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {commitment.startTime} - {commitment.endTime}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {commitments.length > 0 && (
              <div className="pt-4 border-t border-border">
                <Button asChild className="w-full" size="lg">
                  <Link href="/generate">
                    Generate Schedule <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
