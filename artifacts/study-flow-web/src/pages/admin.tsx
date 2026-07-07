import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Search, UserPlus, Trash2, Loader2,
  Users, ClipboardList, ExternalLink, ShieldCheck,
} from "lucide-react";
import {
  useMyRole, useStaffList, useSearchUser,
  useGrantEmployee, useRevokeEmployee, useAdminRequests,
} from "@/hooks/use-manual-requests";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-700",
};

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();

  const { data: roleData, isLoading: roleLoading } = useMyRole();
  const { data: staffData, isLoading: staffLoading } = useStaffList();
  const { data: requestsData, isLoading: requestsLoading } = useAdminRequests();

  const [emailSearch, setEmailSearch] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const { data: searchData, isFetching: searching } = useSearchUser(pendingEmail);

  const grant = useGrantEmployee();
  const revoke = useRevokeEmployee();

  if (roleLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (roleData?.role !== "admin") {
    return (
      <Layout>
        <div className="max-w-lg mx-auto pt-20 text-center space-y-4">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Admin only</h1>
          <p className="text-muted-foreground">You don't have access to this page.</p>
          <Button variant="outline" onClick={() => setLocation("/")}>Go home</Button>
        </div>
      </Layout>
    );
  }

  const staff: Array<{ id: number; userId: string; email: string; role: string; createdAt: string }> =
    staffData?.data ?? [];
  const requests: Array<{
    id: string; ownerEmail: string | null; status: string;
    timetableDescription: string | null; createdAt: string;
    response: { id: string } | null;
  }> = requestsData?.data ?? [];

  const handleSearch = () => setPendingEmail(emailSearch.trim());

  const handleGrant = async (userId: string, email: string) => {
    try {
      await grant.mutateAsync({ userId, email });
      toast({ title: "Employee added", description: email });
      setPendingEmail("");
      setEmailSearch("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRevoke = async (userId: string, email: string) => {
    try {
      await revoke.mutateAsync(userId);
      toast({ title: "Removed", description: `${email} is no longer an employee` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const foundUsers: Array<{ id: string; email: string; firstName: string | null; lastName: string | null }> =
    searchData?.data ?? [];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pt-6 pb-16 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-primary" /> Admin
              </h1>
              <p className="text-sm text-muted-foreground">Signed in as {user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setLocation("/staff")}>
            <ExternalLink className="w-4 h-4 mr-2" /> Switch to staff view
          </Button>
        </div>

        <Tabs defaultValue="staff">
          <TabsList>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Staff ({staff.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Requests ({requests.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Staff tab ── */}
          <TabsContent value="staff" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add employee by email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="user@example.com"
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {pendingEmail && foundUsers.length === 0 && !searching && (
                  <p className="text-sm text-muted-foreground">No users found with that email.</p>
                )}

                {foundUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleGrant(u.id, u.email)}
                      disabled={grant.isPending}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add employee
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current employees</CardTitle>
              </CardHeader>
              <CardContent>
                {staffLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : staff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No employees yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {staff.map((s) => (
                      <li key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{s.email}</p>
                          <p className="text-xs text-muted-foreground capitalize">{s.role}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevoke(s.userId, s.email)}
                          disabled={revoke.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Requests tab ── */}
          <TabsContent value="requests" className="pt-4">
            <Card>
              <CardContent className="p-0">
                {requestsLoading ? (
                  <div className="p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : requests.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">No requests yet.</p>
                ) : (
                  <ul className="divide-y">
                    {requests.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 cursor-pointer"
                        onClick={() => setLocation(`/staff?id=${r.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.ownerEmail ?? "Guest"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.timetableDescription?.slice(0, 80) ?? "No description"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4 shrink-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ""}`}>
                            {r.status.replace("_", " ")}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
