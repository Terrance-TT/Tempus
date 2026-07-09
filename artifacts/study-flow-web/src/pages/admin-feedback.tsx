import { useState } from "react";
import { Bug, CheckCircle2, Heart, Inbox, Loader2, RotateCcw } from "lucide-react";
import {
  useGetAdminStatus,
  getGetAdminStatusQueryKey,
  useListFeedback,
  getListFeedbackQueryKey,
  useUpdateFeedbackStatus,
  type FeedbackItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type Filter = "all" | "bug" | "survey";

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateStatus = useUpdateFeedbackStatus();

  const toggleStatus = () => {
    updateStatus.mutate(
      { id: item.id, data: { status: item.status === "new" ? "resolved" : "new" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey() });
        },
        onError: () => {
          toast({ title: "Couldn't update", variant: "destructive" });
        },
      },
    );
  };

  const isBug = item.type === "bug";

  return (
    <Card className={item.status === "resolved" ? "opacity-60" : ""} data-testid={`card-feedback-${item.id}`}>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isBug ? (
            <Badge variant="destructive" className="gap-1">
              <Bug className="w-3 h-3" /> Bug
            </Badge>
          ) : (
            <Badge className="gap-1">
              <Heart className="w-3 h-3" /> Survey
            </Badge>
          )}
          {item.status === "resolved" && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="w-3 h-3" /> Resolved
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(item.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="text-xs text-muted-foreground space-x-3">
          <span>{item.email || "Anonymous"}</span>
          {item.page && <span className="font-mono">{item.page}</span>}
        </div>

        {isBug ? (
          <p className="text-sm whitespace-pre-wrap">{item.message}</p>
        ) : (
          <div className="space-y-3">
            {(item.answers ?? []).map((a, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-muted-foreground">{a.question}</p>
                <p className="text-sm whitespace-pre-wrap">{a.answer}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleStatus}
            disabled={updateStatus.isPending}
            data-testid={`button-toggle-status-${item.id}`}
          >
            {updateStatus.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : item.status === "new" ? (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            )}
            {item.status === "new" ? "Mark resolved" : "Reopen"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminFeedback() {
  const [filter, setFilter] = useState<Filter>("all");

  const { data: adminStatus, isLoading: isLoadingStatus } = useGetAdminStatus({
    query: { queryKey: getGetAdminStatusQueryKey() },
  });
  const isAdmin = adminStatus?.isAdmin === true;

  const { data: items, isLoading } = useListFeedback({
    query: { enabled: isAdmin, queryKey: getListFeedbackQueryKey() },
  });

  const filtered = (items ?? []).filter((item) => filter === "all" || item.type === filter);
  const newCount = (items ?? []).filter((i) => i.status === "new").length;

  if (isLoadingStatus) {
    return (
      <>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <div className="text-center py-20 space-y-2">
          <p className="text-xl font-heading font-semibold">Admins only</p>
          <p className="text-muted-foreground text-sm">This page is reserved for the Tempus team.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Inbox className="w-7 h-7 text-primary" />
            Feedback
          </h1>
          <p className="text-muted-foreground mt-1">
            {newCount} new {newCount === 1 ? "item" : "items"} — bug reports and survey responses from users.
          </p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="bug" data-testid="tab-bugs">Bugs</TabsTrigger>
            <TabsTrigger value="survey" data-testid="tab-surveys">Surveys</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm py-12 text-center">
            Nothing here yet — feedback will appear as users send it.
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <FeedbackCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
