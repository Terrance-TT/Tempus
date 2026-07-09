import { Link } from "wouter";
import { Calendar } from "lucide-react";

const LAST_UPDATED = "July 9, 2026";

export default function Privacy() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <nav className="w-full border-b border-border/40">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-foreground">Tempus</span>
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl py-16 space-y-10 text-foreground">
          <header className="space-y-2">
            <h1 className="text-4xl font-heading font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground text-sm">Last updated: {LAST_UPDATED}</p>
          </header>

          <p className="text-muted-foreground leading-relaxed">
            This Privacy Policy explains what information Tempus ("we," "our," "us") collects through the Tempus
            web app and the Tempus Focus browser extension, how we use it, and the choices you have. By using
            Tempus, you agree to the practices described below.
          </p>

          <section className="space-y-3">
            <h2 className="text-2xl font-heading font-semibold">Information we collect</h2>
            <div className="space-y-2 text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Account information.</strong> If you sign in with Google, we
                receive your name, email address, and profile image from your Google account to create and
                identify your Tempus account.
              </p>
              <p>
                <strong className="text-foreground">Schedule and task data.</strong> Information you provide to
                build your schedule, such as class times, commitments, assignments, due dates, and study
                preferences. This may be entered by photo, typed description, or manual entry.
              </p>
              <p>
                <strong className="text-foreground">Browser extension data — web history.</strong> The Tempus
                Focus browser extension checks the domain of the tab you have active while a scheduled focus
                block is running, so it can (a) decide whether to block a distracting site during that block, and
                (b) optionally log time spent per domain per day if you enable the site-usage analytics feature.
                The extension does not read, store, or transmit the content of any page — only the domain name
                and the time spent on it.
              </p>
              <p>
                <strong className="text-foreground">Usage data.</strong> Basic technical information such as
                device/browser type and general app usage, used to maintain and improve the service.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-heading font-semibold">How we use your information</h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed">
              <li>To build, store, and display your personalized study schedule.</li>
              <li>To operate the Focus extension's site-blocking during your scheduled focus time.</li>
              <li>To show you optional analytics about time spent on distracting sites, if enabled.</li>
              <li>To maintain your account, provide customer support, and secure the service.</li>
              <li>To process payments if you subscribe to a paid plan (handled by our payment processor).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-heading font-semibold">What we do not do</h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed">
              <li>We do not sell or transfer your personal data to third parties, outside of the service providers described in this policy.</li>
              <li>We do not use your data for purposes unrelated to providing and improving Tempus.</li>
              <li>We do not use your data to determine creditworthiness or for lending purposes.</li>
              <li>We do not read the content of pages you visit through the browser extension.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-heading font-semibold">Data sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We share data only with service providers who help us operate Tempus — for example, our
              authentication provider (for sign-in), our hosting/database provider (to store your data), and our
              payment processor (to handle subscriptions). These providers are only permitted to use your data to
              provide services to us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-heading font-semibold">Data retention and deletion</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account and schedule data for as long as your account is active. You can delete your
              schedule data or disconnect the browser extension at any time from within the app. To request full
              deletion of your account and associated data, contact us using the details below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-heading font-semibold">Children's privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Tempus is intended for students and is not directed at children under 13. We do not knowingly
              collect personal information from children under 13 without appropriate parental or school
              consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-heading font-semibold">Changes to this policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Material changes will be reflected by updating
              the "Last updated" date above.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-heading font-semibold">Contact us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or want to request deletion of your data, contact
              us at{" "}
              <a href="mailto:yungyungadam@gmail.com" className="text-primary underline">
                yungyungadam@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
