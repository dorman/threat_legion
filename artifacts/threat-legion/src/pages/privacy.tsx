import { Link } from "wouter";
import { ArrowLeft, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4 text-foreground">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Last updated: March 2025</p>
            </div>
          </div>

          <p className="text-muted-foreground mb-10 leading-relaxed">
            This Privacy Policy describes how ThreatLegion ("we", "us", or "our") collects, uses, and protects information when you use our security scanning service.
          </p>

          <Section title="1. Information We Collect">
            <p><strong className="text-foreground">Account Information:</strong> When you sign in via Replit, we receive your Replit profile information including your name, email address, and profile image. We store this to create and manage your account.</p>
            <p><strong className="text-foreground">GitHub Identity:</strong> We connect to your GitHub account via Replit's GitHub integration to verify repository ownership. We access your GitHub username to authorize scan requests.</p>
            <p><strong className="text-foreground">Scan Submissions:</strong> We record the GitHub repository URLs you submit for scanning, along with the resulting vulnerability reports, timestamps, and security scores.</p>
            <p><strong className="text-foreground">Usage Data:</strong> We collect basic service usage data including scan history and account activity for operational purposes.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>To provide and operate the security scanning service.</li>
              <li>To verify that you have authorization to scan submitted repositories.</li>
              <li>To generate and store your vulnerability scan reports.</li>
              <li>To manage your subscription tier and billing status.</li>
              <li>To maintain the security and integrity of the service.</li>
              <li>To communicate service updates or important notices.</li>
            </ul>
          </Section>

          <Section title="3. Repository Content">
            <p><strong className="text-foreground">Temporary Access:</strong> When you submit a repository for scanning, our AI agents temporarily read the repository's source files to generate the vulnerability report. This access is read-only and scoped to the specific scan session.</p>
            <p><strong className="text-foreground">No Persistent Storage of Code:</strong> We do not permanently store the content of your source code files. File content is accessed in-memory during the scan and discarded once the report is generated.</p>
            <p><strong className="text-foreground">AI Processing:</strong> Repository content is processed by Claude AI (Anthropic). Anthropic's privacy practices govern how they handle data sent to their API. We encourage you to review Anthropic's privacy policy.</p>
          </Section>

          <Section title="4. Data Retention">
            <p><strong className="text-foreground">Scan Reports:</strong> Completed scan results (vulnerability findings, scores, remediation advice) are retained in our database and associated with your account so you can review them later.</p>
            <p><strong className="text-foreground">Account Data:</strong> We retain your account information for as long as your account is active. You may request deletion of your account and associated data by contacting us.</p>
            <p><strong className="text-foreground">Session Data:</strong> Session tokens expire after a period of inactivity for security purposes.</p>
          </Section>

          <Section title="5. Data Sharing">
            <p>We do not sell your personal data. We share data only in the following limited circumstances:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong className="text-foreground">Anthropic (Claude AI):</strong> Repository content is sent to Anthropic's API for AI analysis during scans.</li>
              <li><strong className="text-foreground">GitHub:</strong> We read repository metadata via the GitHub API to verify ownership.</li>
              <li><strong className="text-foreground">Replit:</strong> Authentication is handled via Replit's OIDC service.</li>
              <li><strong className="text-foreground">Legal requirements:</strong> We may disclose information if required by law or valid legal process.</li>
            </ul>
          </Section>

          <Section title="6. Security">
            <p>We implement reasonable security measures to protect your information, including encrypted connections (HTTPS/TLS), session-based authentication with server-side session storage, and access controls limiting what each user can access.</p>
            <p>However, no system is perfectly secure. We cannot guarantee the absolute security of your information.</p>
          </Section>

          <Section title="7. Your Rights">
            <p>Depending on your jurisdiction, you may have rights including:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong className="text-foreground">Access:</strong> Request a copy of the data we hold about you.</li>
              <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate data.</li>
              <li><strong className="text-foreground">Deletion:</strong> Request deletion of your account and associated data.</li>
              <li><strong className="text-foreground">Portability:</strong> Request your scan history in a machine-readable format.</li>
            </ul>
            <p>To exercise these rights, contact us through the Replit platform.</p>
          </Section>

          <Section title="8. Cookies and Sessions">
            <p>We use a single session cookie to maintain your authenticated session. This cookie is essential for the service to function and cannot be opted out of while using ThreatLegion. We do not use third-party advertising cookies or tracking scripts.</p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>ThreatLegion is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="11. Contact">
            <p>If you have questions about this Privacy Policy or how we handle your data, you may contact us through the Replit platform where ThreatLegion is hosted.</p>
          </Section>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
