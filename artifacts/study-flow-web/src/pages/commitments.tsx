import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeviceId } from "@/hooks/use-device-id";
import { 
  useListCommitments, 
  useCreateCommitment, 
  useUpdateCommitment, 
  useDeleteCommitment, 
  getListCommitmentsQueryKey,
  Commitment 
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { CommitmentForm, CommitmentFormValues } from "@/components/commitment-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, CalendarDays, Pencil, Trash2, BookOpen, Activity, RotateCw, CheckSquare } from "lucide-react";
import { Link } from "wouter";

export default function Commitments() {
  const deviceId = useDeviceId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);

  const { data: commitments, isLoading } = useListCommitments(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListCommitmentsQueryKey({ deviceId: deviceId || "" }) } }
  );

  const createCommitment = useCreateCommitment();
  const updateCommitment = useUpdateCommitment();
  const deleteCommitment = useDeleteCommitment();

  const handleAdd = (data: CommitmentFormValues) => {
    if (!deviceId) return;
    createCommitment.mutate(
      { data: { ...data, deviceId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey({ deviceId }) });
          toast({ title: "Commitment added" });
          setIsAddOpen(false);
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message, variant: "destructive" });
        },
      }
    );
  };

  const handleEdit = (data: CommitmentFormValues) => {
    if (!editingCommitment || !deviceId) return;
    updateCommitment.mutate(
      { id: editingCommitment.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey({ deviceId }) });
          toast({ title: "Commitment updated" });
          setEditingCommitment(null);
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message, variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!deviceId) return;
    deleteCommitment.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey({ deviceId }) });
          toast({ title: "Commitment deleted" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message, variant: "destructive" });
        },
      }
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "class": return <BookOpen className="w-4 h-4" />;
      case "extracurricular": return <Activity className="w-4 h-4" />;
      case "routine": return <RotateCw className="w-4 h-4" />;
      default: return null;
    }
  };

  if (!deviceId || isLoading) {
    return (
      <Layout>
        <div className="space-y-6 pt-8">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <header className="space-y-1">
            <h1 className="text-3xl font-heading font-semibold tracking-tight text-foreground">
              Commitments
            </h1>
            <p className="text-muted-foreground">
              Manage your classes, activities, and routines.
            </p>
          </header>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0">
                <Plus className="w-4 h-4 mr-2" /> Add Commitment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Commitment</DialogTitle>
              </DialogHeader>
              <CommitmentForm onSubmit={handleAdd} isSubmitting={createCommitment.isPending} />
            </DialogContent>
          </Dialog>
        </div>

        {commitments && commitments.length > 0 ? (
          <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {commitments.map((commitment) => (
              <Card key={commitment.id} className="overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
                <CardContent className="p-0 sm:p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-center">
                      <div className="flex items-start justify-between mb-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="flex items-center gap-1 capitalize">
                              {getTypeIcon(commitment.type)}
                              {commitment.type}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg">{commitment.title}</h3>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4" />
                          <span className="uppercase text-xs tracking-wider font-medium">
                            {commitment.daysOfWeek.join(", ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{commitment.startTime} - {commitment.endTime}</span>
                        </div>
                      </div>
                      {commitment.notes && (
                        <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                          {commitment.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex sm:flex-col items-center justify-end p-2 sm:p-4 sm:bg-secondary/20 border-t sm:border-t-0 sm:border-l gap-2">
                      <Dialog open={editingCommitment?.id === commitment.id} onOpenChange={(open) => !open && setEditingCommitment(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditingCommitment(commitment)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Commitment</DialogTitle>
                          </DialogHeader>
                          {editingCommitment && (
                            <CommitmentForm 
                              initialValues={editingCommitment}
                              onSubmit={handleEdit} 
                              isSubmitting={updateCommitment.isPending} 
                            />
                          )}
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the commitment.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(commitment.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-card border rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-secondary text-muted-foreground rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckSquare className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-medium mb-2">No commitments yet</h2>
            <p className="text-muted-foreground mb-6">
              Add your classes and regular activities to start building your routine.
            </p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Your First Commitment
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
