import { useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, ClipboardList, User, Calendar,
  ImagePlus, CheckCircle2, X, Send, RefreshCcw,
} from "lucide-react";
import {
  useMyRole, useStaffRequests, useStaffRequest,
  useClaimRequest, useSubmitResponse,
} from "@/hooks/use-manual-requests";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type Request = {
  id: string;
  ownerUserId: string;
  ownerEmail: string | null;
  timetableDescription: string | null;
  assignments: unknown;
  preferences: unknown;
  status: string;
  assignedToUserId: string | null;
  createdAt: string;
  response: {
    message: string | null;
    scheduleContent: string | null;
    graphicPath: string | null;
  } | null;
};

function RequestDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useStaffRequest(id);
  const claim = useClaimRequest();
  const submit = useSubmitResponse();

  const [message, setMessage] = useState("");
  const [scheduleContent, setScheduleContent] = useState("");
  const [graphic, setGraphic] = useState<string | null>(null);
  const [graphicName, setGraphicName] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const req: Request | undefined = data?.data;
  if (!req) return <p className="text-sm text-muted-foreground p-4">Request not found.</p>;

  const assignments = Array.isArray(req.assignments)
    ? (req.assignments as Array<{ title?: string; dueDate?: string; estimatedHours?: number }>)
    : [];

  const prefs = req.preferences as {
    wakeTime?: string; bedTime?: string; mealTimes?: string; notes?: string;
  } | null;

  const handleClaim = async () => {
    try {
      await claim.mutateAsync(req.id);
      refetch();
      toast({ title: "Request claimed — it's now yours to handle" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setGraphic(dataUrl);
    setGraphicName(file.name);
  };

  const handleSubmit = async () => {
    if (!scheduleContent.trim() && !message.trim()) {
      toast({ title: "Add a message or schedule before sending", variant: "destructive" });
      return;
    }
    try {
      await submit.mutateAsync({
        id: req.id,
        message: message || undefined,
        scheduleContent: scheduleContent || undefined,
        graphicPath: graphic ?? undefined,
      });
      setSubmitted(true);
      refetch();
      toast({ title: "Response sent!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const alreadyCompleted = req.status === "completed" && !!req.response;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[req.status] ?? ""}`}>
              {req.status.replace("_", " ")}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(req.createdAt).toLocaleString()}
            </span>
          </div>
          <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            {req.ownerEmail ?? "Guest user"}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Schedule info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Their weekly schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {req.timetableDescription ? (
            <p className="text-sm whitespace-pre-wrap">{req.timetableDescription}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description provided.</p>
          )}
        </CardContent>
      </Card>

      {/* Assignments */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assignments & tasks ({assignments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {assignments.map((a, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <div>
                    <span className="font-medium">{a.title ?? "Untitled"}</span>
                    {a.dueDate && <span className="text-muted-foreground ml-2 text-xs">Due {a.dueDate}</span>}
                    {a.estimatedHours && <span className="text-muted-foreground ml-2 text-xs">~{a.estimatedHours}h</span>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Preferences */}
      {prefs && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Routine preferences</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {prefs.wakeTime && <p><span className="text-muted-foreground">Wake:</span> {prefs.wakeTime}</p>}
            {prefs.bedTime && <p><span className="text-muted-foreground">Bed:</span> {prefs.bedTime}</p>}
            {prefs.mealTimes && <p><span className="text-muted-foreground">Meals:</span> {prefs.mealTimes}</p>}
            {prefs.notes && <p><span className="text-muted-foreground">Notes:</span> {prefs.notes}</p>}
          </CardContent>
        </Card>
      )}

      {/* Claim if pending */}
      {req.status === "pending" && (
        <Button className="w-full" onClick={handleClaim} disabled={claim.isPending}>
          {claim.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
          Claim this request
        </Button>
      )}

      {/* Completed — show existing response */}
      {alreadyCompleted && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Response already sent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {req.response?.message && <p className="italic text-muted-foreground">"{req.response.message}"</p>}
            {req.response?.scheduleContent && (
              <pre className="whitespace-pre-wrap bg-white border rounded-lg p-3 text-xs overflow-auto max-h-48">
                {req.response.scheduleContent}
              </pre>
            )}
            {req.response?.graphicPath && (
              <img src={req.response.graphicPath} alt="Schedule graphic" className="rounded-lg max-h-48 object-cover border" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Compose response (in_progress or re-send after completed) */}
      {(req.status === "in_progress" || req.status === "completed") && !submitted && (
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-semibold text-base">Compose response</h3>

          <div className="space-y-1">
            <label className="text-sm font-medium">Message to student</label>
            <Textarea
              placeholder="e.g. Hi! I've put together a balanced study plan for you. I've front-loaded the heavy subjects in the morning when focus is highest."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Schedule plan</label>
            <Textarea
              placeholder={"Monday\n  7:00–8:00  Breakfast + review notes\n  8:00–10:00 Math study block\n  ..."}
              value={scheduleContent}
              onChange={(e) => setScheduleContent(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Schedule graphic</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            {graphic ? (
              <div className="relative">
                <img src={graphic} alt="Preview" className="rounded-lg max-h-48 object-cover border w-full" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => { setGraphic(null); setGraphicName(null); }}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                {graphicName ?? "Upload schedule image"}
              </Button>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submit.isPending}
          >
            {submit.isPending ? (
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Send className="mr-2 w-4 h-4" />
            )}
            Send to student
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Staff() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedId = params.get("id");

  const { data: roleData, isLoading: roleLoading } = useMyRole();
  const { data: requestsData, isLoading: requestsLoading } = useStaffRequests();
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);

  const requests: Request[] = requestsData?.data ?? [];

  if (roleLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const role = roleData?.role;
  if (!role) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto pt-20 text-center space-y-4">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Staff only</h1>
          <p className="text-muted-foreground">You don't have access to this dashboard.</p>
          <Button variant="outline" onClick={() => setLocation("/")}>Go home</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pt-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
                <ClipboardList className="w-7 h-7 text-primary" /> Staff dashboard
              </h1>
              <p className="text-sm text-muted-foreground capitalize">{role} view</p>
            </div>
          </div>
          {role === "admin" && (
            <Button variant="outline" size="sm" onClick={() => setLocation("/admin")}>
              Switch to admin
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
          {/* Request list */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Schedule requests
                {requests.filter((r) => r.status === "pending").length > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {requests.filter((r) => r.status === "pending").length} new
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {requestsLoading ? (
                <div className="p-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No requests yet.</p>
              ) : (
                <ul className="divide-y">
                  {requests.map((r) => (
                    <li
                      key={r.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${selectedId === r.id ? "bg-muted/60 border-l-2 border-primary" : ""}`}
                      onClick={() => setSelectedId(r.id)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{r.ownerEmail ?? "Guest"}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ""}`}>
                          {r.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {r.timetableDescription?.slice(0, 50) ?? "No description"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Detail panel */}
          <div>
            {selectedId ? (
              <Card>
                <CardContent className="pt-6">
                  <RequestDetail id={selectedId} onClose={() => setSelectedId(null)} />
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border rounded-xl border-dashed">
                <ClipboardList className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Select a request to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
