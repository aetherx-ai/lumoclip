import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Database,
  UserCheck,
  Cookie,
  Globe2,
  Mail,
} from "lucide-react";

const PrivacyPolicy: React.FC = () => {
  const lastUpdated = "August 30, 2026";

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-200px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute bottom-[-200px] right-[-100px] h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[140px]" />
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
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10">
            <ShieldCheck className="text-blue-400" size={32} />
          </div>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Privacy Policy
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Your privacy matters to us. This Privacy Policy explains how
            LumoClip collects, uses, stores, and protects your information.
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <PolicySection
            icon={<ShieldCheck size={20} />}
            title="1. Introduction"
          >
            <p>
              Welcome to LumoClip. LumoClip is an AI-powered video clipping,
              editing, captioning, repurposing, and content creation platform.
            </p>

            <p>
              This Privacy Policy explains how we collect and process
              information when you visit our website, create an account, use
              our services, upload content, or otherwise interact with
              LumoClip.
            </p>

            <p>
              By using LumoClip, you acknowledge that you have read and
              understood this Privacy Policy.
            </p>
          </PolicySection>

          <PolicySection
            icon={<Database size={20} />}
            title="2. Information We Collect"
          >
            <h3 className="font-semibold text-white">
              2.1 Account Information
            </h3>

            <p>
              When you create an account, we may collect information such as:
            </p>

            <ul>
              <li>Name</li>
              <li>Email address</li>
              <li>Profile information</li>
              <li>Authentication information</li>
              <li>Account preferences</li>
            </ul>

            <h3 className="mt-6 font-semibold text-white">
              2.2 Content You Upload
            </h3>

            <p>
              When you use LumoClip, you may upload or provide video, audio,
              images, text, transcripts, captions, or other content.
            </p>

            <p>
              We process this content only as necessary to provide the
              requested features and services, including AI-powered analysis,
              transcription, clipping, caption generation, and video
              processing.
            </p>

            <h3 className="mt-6 font-semibold text-white">
              2.3 Usage Information
            </h3>

            <p>
              We may automatically collect information about how you interact
              with our service, including pages visited, features used,
              approximate device information, browser information, IP address,
              and technical logs.
            </p>
          </PolicySection>

          <PolicySection
            icon={<Lock size={20} />}
            title="3. How We Use Your Information"
          >
            <p>We may use information we collect to:</p>

            <ul>
              <li>Provide and operate LumoClip</li>
              <li>Create and manage user accounts</li>
              <li>Process uploaded videos and media</li>
              <li>Generate AI-powered clips, captions, and transcripts</li>
              <li>Improve service performance and reliability</li>
              <li>Monitor security and prevent abuse</li>
              <li>Provide customer support</li>
              <li>Process subscriptions and payments</li>
              <li>Communicate important service information</li>
              <li>Comply with applicable legal obligations</li>
            </ul>
          </PolicySection>

          <PolicySection
            icon={<UserCheck size={20} />}
            title="4. Google OAuth and Third-Party Login"
          >
            <p>
              LumoClip may allow you to sign in using third-party
              authentication providers, including Google.
            </p>

            <p>
              If you choose Google Sign-In, we may receive information that
              Google makes available to us according to your Google account
              permissions, such as your name, email address, and profile
              information.
            </p>

            <p>
              We use this information to create and authenticate your
              LumoClip account and provide account-related functionality.
            </p>

            <p>
              LumoClip does not sell Google user data. Information received
              through Google APIs is used only for purposes permitted by the
              applicable Google API policies and your authorization.
            </p>
          </PolicySection>

          <PolicySection
            icon={<Database size={20} />}
            title="5. Video and AI Processing"
          >
            <p>
              LumoClip uses automated technologies and third-party AI or
              infrastructure services to process user-provided content.
            </p>

            <p>
              Depending on the features you use, your content may be processed
              by services responsible for video processing, speech
              transcription, AI analysis, storage, or content generation.
            </p>

            <p>
              We take reasonable measures to ensure that service providers
              process information only for legitimate purposes related to
              providing LumoClip.
            </p>
          </PolicySection>

          <PolicySection
            icon={<Globe2 size={20} />}
            title="6. Third-Party Services"
          >
            <p>
              LumoClip may use third-party services for authentication,
              hosting, databases, analytics, payments, AI processing, storage,
              communications, and infrastructure.
            </p>

            <p>
              These providers may process limited information on our behalf.
              Their handling of information may also be governed by their own
              privacy policies.
            </p>
          </PolicySection>

          <PolicySection
            icon={<Cookie size={20} />}
            title="7. Cookies and Similar Technologies"
          >
            <p>
              LumoClip may use cookies, local storage, session technologies,
              and similar mechanisms to maintain authentication sessions,
              remember preferences, improve functionality, and understand
              service usage.
            </p>

            <p>
              You may be able to control cookies through your browser
              settings. Disabling certain cookies may affect parts of the
              service.
            </p>
          </PolicySection>

          <PolicySection
            icon={<Lock size={20} />}
            title="8. Data Security"
          >
            <p>
              We use reasonable administrative, technical, and organizational
              safeguards designed to protect your information against
              unauthorized access, loss, misuse, alteration, or disclosure.
            </p>

            <p>
              However, no internet transmission or electronic storage system
              can be guaranteed to be completely secure.
            </p>
          </PolicySection>

          <PolicySection
            icon={<Database size={20} />}
            title="9. Data Retention"
          >
            <p>
              We retain information for as long as reasonably necessary to
              provide our services, maintain your account, comply with legal
              obligations, resolve disputes, enforce agreements, and protect
              our legitimate interests.
            </p>

            <p>
              Uploaded media may be deleted according to our product
              retention policies and the features or storage settings
              applicable to your account.
            </p>
          </PolicySection>

          <PolicySection
            icon={<UserCheck size={20} />}
            title="10. Your Rights and Choices"
          >
            <p>
              Depending on your location and applicable law, you may have
              rights regarding your personal information, including the right
              to:
            </p>

            <ul>
              <li>Request access to your personal information</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of certain information</li>
              <li>Withdraw certain permissions</li>
              <li>Object to or restrict certain processing</li>
              <li>Request a copy of certain information</li>
            </ul>

            <p>
              To make a privacy-related request, contact us using the
              information provided below.
            </p>
          </PolicySection>

          <PolicySection
            icon={<Lock size={20} />}
            title="11. Children's Privacy"
          >
            <p>
              LumoClip is not intended for children who are below the minimum
              age required to independently use online services under
              applicable law.
            </p>

            <p>
              We do not knowingly collect personal information from children
              in violation of applicable law.
            </p>
          </PolicySection>

          <PolicySection
            icon={<Globe2 size={20} />}
            title="12. International Data Processing"
          >
            <p>
              LumoClip and its service providers may process or store
              information in countries other than your country of residence.
            </p>

            <p>
              By using the service, you understand that your information may
              be transferred and processed internationally where permitted by
              applicable law.
            </p>
          </PolicySection>

          <PolicySection
            icon={<ShieldCheck size={20} />}
            title="13. Changes to This Privacy Policy"
          >
            <p>
              We may update this Privacy Policy from time to time. When
              material changes are made, we may update the date displayed at
              the top of this page and provide additional notice where
              required.
            </p>

            <p>
              Your continued use of LumoClip after an updated Privacy Policy
              becomes effective constitutes acceptance of the updated policy
              to the extent permitted by law.
            </p>
          </PolicySection>

          <PolicySection icon={<Mail size={20} />} title="14. Contact Us">
            <p>
              If you have questions, concerns, or requests regarding this
              Privacy Policy or your personal information, please contact
              LumoClip through the contact information provided on our
              website.
            </p>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="font-semibold text-white">LumoClip</p>
              <p className="mt-1 text-gray-400">
                AI Video Clipping & Repurposing Platform
              </p>
              <p className="mt-2 text-blue-400">https://lumo-clip.com</p>
            </div>
          </PolicySection>
        </div>

        {/* Footer navigation */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} LumoClip. All rights reserved.
          </p>

          <div className="flex gap-5 text-sm">
            <Link
              to="/terms"
              className="text-gray-400 transition hover:text-white"
            >
              Terms of Service
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

interface PolicySectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const PolicySection: React.FC<PolicySectionProps> = ({
  icon,
  title,
  children,
}) => {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/10 md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-400">
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

export default PrivacyPolicy;