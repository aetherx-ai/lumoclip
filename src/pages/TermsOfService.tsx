import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  UserCheck,
  ShieldAlert,
  CreditCard,
  Ban,
  Copyright,
  Server,
  Scale,
  Mail,
} from "lucide-react";

const TermsOfService: React.FC = () => {
  const lastUpdated = "August 30, 2026";

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-200px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[140px]" />
        <div className="absolute bottom-[-200px] left-[-100px] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[140px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
              <span className="text-lg font-black">L</span>
            </div>

            <span className="text-xl font-bold tracking-tight">
              Lumo<span className="text-blue-400">Clip</span>
            </span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to LumoClip
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10">
            <FileText className="text-purple-400" size={32} />
          </div>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Terms of Service
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            These terms govern your access to and use of the LumoClip
            platform.
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="space-y-8">
          <TermsSection
            icon={<FileText size={20} />}
            title="1. Acceptance of Terms"
          >
            <p>
              Welcome to LumoClip. These Terms of Service constitute an
              agreement between you and LumoClip governing your access to and
              use of the LumoClip website, applications, software, APIs, and
              related services.
            </p>

            <p>
              By accessing or using LumoClip, you agree to be bound by these
              Terms. If you do not agree with these Terms, you should not use
              the service.
            </p>
          </TermsSection>

          <TermsSection
            icon={<UserCheck size={20} />}
            title="2. Eligibility and Accounts"
          >
            <p>
              You must provide accurate information when creating an account
              and are responsible for maintaining the confidentiality of your
              account credentials.
            </p>

            <p>
              You are responsible for activities performed through your
              account and should notify us promptly if you believe your
              account has been accessed without authorization.
            </p>

            <p>
              You may not create accounts for fraudulent purposes or use
              another person's account without authorization.
            </p>
          </TermsSection>

          <TermsSection
            icon={<Server size={20} />}
            title="3. LumoClip Services"
          >
            <p>
              LumoClip provides AI-powered tools that may include video
              clipping, video processing, transcription, captions, content
              repurposing, AI-assisted editing, and related functionality.
            </p>

            <p>
              Features may change, be added, suspended, or discontinued over
              time. We may modify the service when reasonably necessary to
              maintain, improve, or secure the platform.
            </p>
          </TermsSection>

          <TermsSection
            icon={<Copyright size={20} />}
            title="4. Your Content"
          >
            <p>
              You retain ownership of content that you upload to LumoClip,
              subject to the rights necessary for us to provide the service.
            </p>

            <p>
              By uploading content, you grant LumoClip a limited,
              non-exclusive, worldwide license to host, reproduce, process,
              transmit, modify, and otherwise use that content only as
              reasonably necessary to operate and provide the requested
              LumoClip services.
            </p>

            <p>
              This license ends when your content is deleted, except where
              retention is required for legal, security, backup, or legitimate
              operational purposes.
            </p>
          </TermsSection>

          <TermsSection
            icon={<ShieldAlert size={20} />}
            title="5. Content Responsibility"
          >
            <p>
              You are solely responsible for the content you upload,
              process, generate, publish, or distribute through LumoClip.
            </p>

            <p>
              You represent that you have all necessary rights, permissions,
              licenses, and consents required to use the content with
              LumoClip.
            </p>

            <p>
              LumoClip does not grant you ownership rights in third-party
              content merely because our tools process or transform it.
            </p>
          </TermsSection>

          <TermsSection icon={<Ban size={20} />} title="6. Prohibited Use">
            <p>You agree not to use LumoClip to:</p>

            <ul>
              <li>Violate applicable laws or regulations</li>
              <li>Infringe intellectual property or privacy rights</li>
              <li>Upload malware or malicious software</li>
              <li>Attempt to compromise or disrupt the service</li>
              <li>Reverse engineer or abuse the platform</li>
              <li>Use automated systems to overload our infrastructure</li>
              <li>Impersonate another person or organization</li>
              <li>Conduct fraudulent or deceptive activities</li>
              <li>Process content that you do not have permission to use</li>
            </ul>
          </TermsSection>

          <TermsSection
            icon={<CreditCard size={20} />}
            title="7. Subscriptions and Payments"
          >
            <p>
              Certain LumoClip features may require a paid subscription or
              usage-based payment.
            </p>

            <p>
              Prices, credit limits, usage allowances, billing periods, and
              available plans may be displayed on the LumoClip website and may
              change from time to time.
            </p>

            <p>
              If you purchase a subscription, you authorize the applicable
              payment provider to charge the payment method associated with
              your purchase.
            </p>

            <p>
              Unless otherwise stated at the time of purchase, subscriptions
              may automatically renew according to the selected billing
              period until cancelled.
            </p>
          </TermsSection>

          <TermsSection
            icon={<CreditCard size={20} />}
            title="8. Refunds and Cancellation"
          >
            <p>
              You may cancel your subscription according to the cancellation
              options provided within your account or through the applicable
              payment system.
            </p>

            <p>
              Cancellation generally prevents future renewal but may not
              automatically refund amounts already charged, except where
              required by law or expressly stated in an applicable offer.
            </p>

            <p>
              Any promotional credits, free credits, or unused usage
              allowances may be subject to the rules of the applicable plan.
            </p>
          </TermsSection>

          <TermsSection
            icon={<ShieldAlert size={20} />}
            title="9. AI-Generated Results"
          >
            <p>
              LumoClip may use artificial intelligence and machine learning
              systems to generate clips, captions, transcripts, summaries,
              titles, descriptions, or other outputs.
            </p>

            <p>
              AI-generated results may contain errors, omissions, inaccuracies,
              or unintended content. You are responsible for reviewing outputs
              before publishing or relying on them.
            </p>

            <p>
              LumoClip does not guarantee that AI-generated content will
              always be accurate, complete, original, or suitable for a
              particular purpose.
            </p>
          </TermsSection>

          <TermsSection
            icon={<Server size={20} />}
            title="10. Service Availability"
          >
            <p>
              We aim to keep LumoClip reliable and available, but we do not
              guarantee uninterrupted or error-free operation.
            </p>

            <p>
              The service may occasionally be unavailable because of
              maintenance, upgrades, infrastructure failures, third-party
              outages, security incidents, or circumstances beyond our
              reasonable control.
            </p>
          </TermsSection>

          <TermsSection
            icon={<ShieldAlert size={20} />}
            title="11. Account Suspension and Termination"
          >
            <p>
              We may suspend or terminate an account if we reasonably believe
              that the account has violated these Terms, applicable law, or
              created a security, legal, or operational risk.
            </p>

            <p>
              You may stop using LumoClip at any time. Certain provisions of
              these Terms, including intellectual property, limitations of
              liability, and dispute-related provisions, may survive
              termination.
            </p>
          </TermsSection>

          <TermsSection
            icon={<Copyright size={20} />}
            title="12. Intellectual Property"
          >
            <p>
              LumoClip and its software, branding, interface, designs,
              trademarks, documentation, and underlying technology are owned
              by or licensed to LumoClip and are protected by applicable
              intellectual property laws.
            </p>

            <p>
              Except as expressly permitted by these Terms, you may not copy,
              modify, distribute, sell, license, or create derivative works
              from LumoClip's proprietary technology or materials.
            </p>
          </TermsSection>

          <TermsSection
            icon={<ShieldAlert size={20} />}
            title="13. Disclaimers"
          >
            <p>
              To the maximum extent permitted by applicable law, LumoClip is
              provided on an "as is" and "as available" basis.
            </p>

            <p>
              We do not guarantee that the service will meet every specific
              requirement, operate without interruption, or produce
              error-free results.
            </p>
          </TermsSection>

          <TermsSection
            icon={<Scale size={20} />}
            title="14. Limitation of Liability"
          >
            <p>
              To the maximum extent permitted by law, LumoClip and its
              operators, affiliates, employees, and service providers will
              not be liable for indirect, incidental, consequential, special,
              exemplary, or punitive damages arising from your use of or
              inability to use the service.
            </p>

            <p>
              Nothing in these Terms excludes or limits liability that cannot
              legally be excluded or limited under applicable law.
            </p>
          </TermsSection>

          <TermsSection
            icon={<Scale size={20} />}
            title="15. Indemnification"
          >
            <p>
              To the extent permitted by applicable law, you agree to
              indemnify and hold harmless LumoClip from claims, losses,
              liabilities, damages, and expenses arising from your unlawful
              use of the service, your violation of these Terms, or your
              infringement of third-party rights.
            </p>
          </TermsSection>

          <TermsSection
            icon={<FileText size={20} />}
            title="16. Changes to These Terms"
          >
            <p>
              We may update these Terms from time to time to reflect changes
              to our services, business practices, legal requirements, or
              security practices.
            </p>

            <p>
              When appropriate, we will update the "Last updated" date on this
              page. Your continued use of LumoClip after changes become
              effective constitutes acceptance of the updated Terms to the
              extent permitted by law.
            </p>
          </TermsSection>

          <TermsSection
            icon={<Mail size={20} />}
            title="17. Contact"
          >
            <p>
              If you have questions about these Terms of Service, please
              contact LumoClip through the contact information available on
              our website.
            </p>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="font-semibold text-white">LumoClip</p>
              <p className="mt-1 text-gray-400">
                AI Video Clipping & Repurposing Platform
              </p>
              <p className="mt-2 text-blue-400">https://lumo-clip.com</p>
            </div>
          </TermsSection>
        </div>

        {/* Footer */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} LumoClip. All rights reserved.
          </p>

          <div className="flex gap-5 text-sm">
            <Link
              to="/privacy"
              className="text-gray-400 transition hover:text-white"
            >
              Privacy Policy
            </Link>

            <Link
              to="/"
              className="text-gray-400 transition hover:text-white"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

interface TermsSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const TermsSection: React.FC<TermsSectionProps> = ({
  icon,
  title,
  children,
}) => {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/10 md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-400/20 bg-purple-500/10 text-purple-400">
          {icon}
        </div>

        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>

      <div className="space-y-4 text-[15px] leading-7 text-gray-400">
        {children}
      </div>

      <style>{`
        section ul {
          list-style: disc;
          padding-left: 1.4rem;
        }

        section li {
          margin-bottom: 0.35rem;
        }

        section p {
          max-width: 75ch;
        }
      `}</style>
    </section>
  );
};

export default TermsOfService;