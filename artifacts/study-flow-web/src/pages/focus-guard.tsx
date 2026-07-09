import { Layout } from "@/components/layout";
import { FocusGuardCard } from "@/components/focus-guard-card";

export default function FocusGuard() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-2" data-testid="text-focus-guard-title">
            Focus Guard
          </h1>
          <p className="text-muted-foreground">
            Your distraction blocker, controlled entirely from here.
          </p>
        </div>
        <FocusGuardCard />
      </div>
    </Layout>
  );
}
