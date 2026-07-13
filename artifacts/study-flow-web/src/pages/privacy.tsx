import { Link } from "wouter";
import { Calendar, ArrowLeft } from "lucide-react";

const PRIVACY_LAST_UPDATED = "July 9, 2026";
const TERMS_LAST_UPDATED = "July 13, 2026";

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
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-4xl font-heading font-bold">Privacy Policy</h1>
            </div>
            <p className="text-muted-foreground text-sm">Last updated: {PRIVACY_LAST_UPDATED}</p>
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

          {/* ── Terms of Service ── */}
          <div className="border-t border-border/60 pt-10 space-y-10">
            <header className="space-y-2">
              <h1 className="text-4xl font-heading font-bold">Terms of Service</h1>
              <p className="text-muted-foreground text-sm">Last updated: {TERMS_LAST_UPDATED}</p>
            </header>

            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service ("Terms") govern your access to and use of Tempus, including the web app
              and the Tempus Focus browser extension (collectively, the "Service"), operated by Tempus
              ("we," "our," "us"). By using the Service you agree to these Terms.
            </p>

            <section className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">1. Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed">
                You must be at least 13 years old to use Tempus. If you are under 18, you represent that you
                have your parent or guardian's permission. By using the Service you represent and warrant that
                you meet these requirements.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">2. Your account</h2>
              <p className="text-muted-foreground leading-relaxed">
                You are responsible for keeping your account credentials secure and for all activity that
                occurs under your account. Notify us immediately at{" "}
                <a href="mailto:yungyungadam@gmail.com" className="text-primary underline">yungyungadam@gmail.com</a>{" "}
                if you believe your account has been compromised. We reserve the right to suspend or terminate
                accounts that violate these Terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">3. Acceptable use</h2>
              <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed">
                <li>Use the Service for any unlawful purpose or in violation of any applicable law or regulation.</li>
                <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure.</li>
                <li>Reverse-engineer, decompile, or otherwise attempt to extract the source code of the Service.</li>
                <li>Use automated means (bots, scrapers, etc.) to access the Service at a volume that burdens our systems.</li>
                <li>Upload or transmit malicious code, viruses, or any content intended to harm others.</li>
                <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">4. Paid plans and billing</h2>
              <p className="text-muted-foreground leading-relaxed">
                Tempus offers a free tier and a paid "Tempus Pro" subscription. By subscribing you authorize us
                to charge your payment method on a recurring basis at the then-current subscription price.
                Subscriptions automatically renew until cancelled. You may cancel at any time through the
                billing portal in the app; cancellation takes effect at the end of the current billing period.
                All payments are processed by Stripe. We do not store your full payment card details. Fees are
                non-refundable except where required by applicable law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">5. Intellectual property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its original content, features, and functionality are and will remain the
                exclusive property of Tempus and its licensors. You retain ownership of any content you
                submit (schedules, notes, images). By submitting content you grant us a limited, worldwide,
                royalty-free licence to store, process, and display that content solely to provide the Service
                to you.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">6. Disclaimer of warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is provided "as is" and "as available" without warranties of any kind, either
                express or implied, including but not limited to implied warranties of merchantability, fitness
                for a particular purpose, and non-infringement. We do not warrant that the Service will be
                uninterrupted, error-free, or free of viruses or other harmful components. AI-generated
                schedules are suggestions only — always verify your own timetable and deadlines.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">7. Limitation of liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the fullest extent permitted by law, Tempus shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages — including loss of data, missed
                deadlines, or lost revenue — arising out of or related to your use of the Service, even if we
                have been advised of the possibility of such damages. Our total liability to you for any claim
                arising out of these Terms or the Service shall not exceed the amount you paid us in the
                twelve months preceding the claim, or USD $10, whichever is greater.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">8. Changes to the Service and Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may modify or discontinue any part of the Service at any time. We may also update these
                Terms; when we do we will update the "Last updated" date above. Continued use of the Service
                after changes become effective constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">9. Governing law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by and construed in accordance with the laws of the United States,
                without regard to its conflict-of-law principles. Any disputes arising under these Terms shall
                be resolved in the courts of competent jurisdiction.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">10. Contact us</h2>
              <p className="text-muted-foreground leading-relaxed">
                Questions about these Terms? Reach us at{" "}
                <a href="mailto:yungyungadam@gmail.com" className="text-primary underline">
                  yungyungadam@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
