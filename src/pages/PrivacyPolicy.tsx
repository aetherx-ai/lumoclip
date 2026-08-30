import React from "react";
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

const sections = [
  {
    icon: ShieldCheck,
    title: "1. Introduction",
    content: (
      <>
        <p>
          Welcome to LumoClip. LumoClip is an AI-powered video clipping,
          editing, captioning, transcription, and content repurposing platform.
        </p>
        <p>
          This Privacy Policy explains what information we collect, how we use
          it, how we protect it, and the choices available to you when you use
          LumoClip.
        </p>
      </>
    ),
  },
  {
    icon: Database,
    title: "2. Information We Collect",
    content: (
      <>
        <h3>Account information</h3>
        <p>
          Depending on how you create your account, we may collect your name,
          email address, profile information, authentication identifiers, and
          account preferences.
        </p>
        <h3>Content you provide</h3>
        <p>
          When you use LumoClip, you may provide videos, audio, images, text,
          transcripts, captions, URLs, and other media. We process this
          information to provide the features you request.
        </p>
        <h3>Technical and usage information</h3>
        <p>
          We may collect information such as browser type, device information,
          IP address, approximate location derived from IP, pages or features
          used, timestamps, and diagnostic logs.
        </p>
      </>
    ),
  },
  {
    icon: Lock,
    title: "3. How We Use Information",
    content: (
      <>
        <p>We may use information to:</p>
        <ul>
          <li>Provide and maintain LumoClip.</li>
          <li>Create and authenticate accounts.</li>
          <li>Process videos, audio, captions, transcripts, and AI requests.</li>
          <li>Provide customer support.</li>
          <li>Process subscriptions and payments.</li>
          <li>Monitor security, prevent abuse, and troubleshoot problems.</li>
          <li>Improve reliability, performance, and product functionality.</li>
          <li>Comply with applicable legal obligations.</li>
        </ul>
      </>
    ),
  },
  {
    icon: UserCheck,
    title: "4. Google Sign-In and OAuth",
    content: (
      <>
        <p>
          LumoClip may offer Google Sign-In. If you choose this option, Google
          may provide us with information associated with your Google account,
          such as your name, email address, profile image, and authentication
          identifiers, according to the permissions you authorize.
        </p>
        <p>
          We use this information to authenticate you, create or maintain your
          LumoClip account, and provide account-related functionality.
        </p>
        <p>
          LumoClip does not sell Google user data. Information obtained through
          Google APIs is handled in accordance with applicable Google API
          requirements and your authorization.
        </p>
      </>
    ),
  },
  {
    icon: Database,
    title: "5. AI and Media Processing",
    content: (
      <>
        <p>
          LumoClip may use third-party infrastructure and AI services for
          tasks such as transcription, video analysis, clip selection,
          caption generation, and other processing requested by you.
        </p>
        <p>
          Your media is processed as necessary to provide the requested
          functionality. Specific retention periods may depend on the feature,
          storage configuration, and operational requirements of the service.
        </p>
      </>
    ),
  },
  {
    icon: Globe2,
    title: "6. Third-Party Service Providers",
    content: (
      <>
        <p>
          We may use third-party providers for hosting, databases,
          authentication, payments, analytics, AI processing, storage,
          communications, and security. These providers may process limited
          information on our behalf to provide their services.
        </p>
      </>
    ),
  },
  {
    icon: Cookie,
    title: "7. Cookies and Similar Technologies",
    content: (
      <>
        <p>
          LumoClip may use cookies, local storage, session technologies, and
          similar mechanisms to keep you signed in, remember preferences,
          improve functionality, and understand service usage.
        </p>
      </>
    ),
  },
  {
    icon: Lock,
    title: "8. Data Security",
    content: (
      <>
        <p>
          We use reasonable technical and organizational safeguards designed
          to protect information against unauthorized access, misuse, loss,
          alteration, or disclosure.
        </p>
        <p>
          No internet transmission or electronic storage system can be
          guaranteed to be completely secure.
        </p>
      </>
    ),
  },
  {
    icon: Database,
    title: "9. Data Retention and Deletion",
    content: (
      <>
        <p>
          We retain information for as long as reasonably necessary to provide
          the service, maintain accounts, meet legal obligations, resolve
          disputes, enforce agreements, and protect the service.
        </p>
        <p>
          Depending on the feature, uploaded media and generated files may be
          deleted according to LumoClip's operational retention policies.
        </p>
      </>
    ),
  },
  {
    icon: UserCheck,
    title: "10. Your Privacy Choices",
    content: (
      <>
        <p>
          Depending on your location and applicable law, you may have rights
          to request access, correction, deletion, restriction, objection, or
          a copy of certain personal information.
        </p>
        <p>
          You may also stop using the service or request account-related
          assistance by contacting LumoClip.
        </p>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "11. Children's Privacy",
    content: (
      <>
        <p>
          LumoClip is not intended for children who are below the minimum age
          required to independently use online services under applicable law.
          We do not knowingly collect children's personal information in
          violation of applicable law.
        </p>
      </>
    ),
  },
  {
    icon: Globe2,
    title: "12. International Processing",
    content: (
      <>
        <p>
          LumoClip and its service providers may process or store information
          in countries other than your country of residence where permitted by
          applicable law.
        </p>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "13. Changes to This Policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy as our services, technology, or
          legal requirements change. We will update the date shown below when
          changes are made.
        </p>
      </>
    ),
  },
  {
    icon: Mail,
    title: "14. Contact",
    content: (
      <>
        <p>
          For privacy questions or requests, please contact LumoClip through
          the contact information provided on the LumoClip website.
        </p>
        <div className="contact-card">
          <strong>LumoClip</strong>
          <span>AI Video Clipping & Repurposing Platform</span>
          <a href="https://lumo-clip.com/">https://lumo-clip.com</a>
        </div>
      </>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      badgeIcon={<ShieldCheck size={28} />}
      title="Privacy Policy"
      subtitle="How LumoClip collects, uses, protects, and handles information when you use our services."
      lastUpdated="August 30, 2026"
    >
      {sections.map(({ icon: Icon, title, content }) => (
        <section className="legal-section" key={title}>
          <div className="section-title">
            <span className="section-icon"><Icon size={19} /></span>
            <h2>{title}</h2>
          </div>
          <div className="legal-body">{content}</div>
        </section>
      ))}
    </LegalLayout>
  );
}

function LegalLayout({
  children,
  badgeIcon,
  title,
  subtitle,
  lastUpdated,
}: {
  children: React.ReactNode;
  badgeIcon: React.ReactNode;
  title: string;
  subtitle: string;
  lastUpdated: string;
}) {
  return (
    <>
      <style>{`
        .legal-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% -10%, rgba(59,130,246,.14), transparent 38%),
            radial-gradient(circle at 90% 90%, rgba(139,92,246,.10), transparent 30%),
            #050507;
          color: #fff;
          font-family: inherit;
        }
        .legal-header {
          position: sticky;
          top: 0;
          z-index: 20;
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(5,5,7,.78);
          backdrop-filter: blur(18px);
        }
        .legal-header-inner, .legal-container {
          width: min(100% - 32px, 960px);
          margin: 0 auto;
        }
        .legal-header-inner {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .brand {
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          font-size: 20px;
          letter-spacing: -.03em;
        }
        .brand span { color: #60a5fa; }
        .back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #cbd5e1;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          padding: 9px 13px;
          border-radius: 10px;
          font-size: 13px;
        }
        .back:hover { background: rgba(255,255,255,.08); color: #fff; }
        .legal-container { padding: 64px 0 70px; }
        .legal-hero { text-align: center; margin-bottom: 42px; }
        .legal-badge {
          width: 62px; height: 62px; margin: 0 auto 18px;
          display: grid; place-items: center;
          border: 1px solid rgba(96,165,250,.22);
          background: rgba(59,130,246,.10);
          color: #60a5fa; border-radius: 18px;
        }
        .legal-hero h1 {
          margin: 0; font-size: clamp(36px, 6vw, 54px);
          line-height: 1.05; letter-spacing: -.045em;
        }
        .legal-hero p {
          max-width: 680px; margin: 16px auto 0;
          color: #94a3b8; line-height: 1.7; font-size: 15px;
        }
        .legal-date { color: #64748b !important; font-size: 12px !important; }
        .legal-section {
          margin-top: 18px; padding: 25px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.025);
          border-radius: 18px;
        }
        .section-title { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }
        .section-title h2 { margin: 0; font-size: 19px; }
        .section-icon {
          width: 36px; height: 36px; display: grid; place-items: center;
          border-radius: 10px; color: #60a5fa;
          background: rgba(59,130,246,.09);
          border: 1px solid rgba(96,165,250,.16);
          flex: 0 0 auto;
        }
        .legal-body { color: #94a3b8; line-height: 1.78; font-size: 14px; }
        .legal-body p { margin: 0 0 13px; }
        .legal-body h3 { color: #e2e8f0; font-size: 15px; margin: 20px 0 8px; }
        .legal-body ul { margin: 8px 0 15px; padding-left: 21px; }
        .legal-body li { margin: 5px 0; }
        .contact-card {
          margin-top: 18px; padding: 16px;
          display: flex; flex-direction: column; gap: 5px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          border-radius: 12px;
        }
        .contact-card strong { color: #fff; }
        .contact-card a { color: #60a5fa; text-decoration: none; }
        .legal-footer {
          margin-top: 38px; padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,.08);
          display: flex; justify-content: space-between; gap: 16px;
          color: #64748b; font-size: 12px;
        }
        .legal-footer a { color: #94a3b8; text-decoration: none; }
        @media (max-width: 640px) {
          .legal-container { padding-top: 42px; }
          .legal-section { padding: 20px; }
          .legal-header-inner { min-height: 64px; }
          .back { padding: 8px 10px; }
          .legal-footer { flex-direction: column; }
        }
      `}</style>

      <div className="legal-page">
        <header className="legal-header">
          <div className="legal-header-inner">
            <a className="brand" href="/">
              Lumo<span>Clip</span>
            </a>
            <a className="back" href="/">
              <ArrowLeft size={15} /> Back to LumoClip
            </a>
          </div>
        </header>

        <main className="legal-container">
          <div className="legal-hero">
            <div className="legal-badge">{badgeIcon}</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <p className="legal-date">Last updated: {lastUpdated}</p>
          </div>

          {children}

          <footer className="legal-footer">
            <span>© {new Date().getFullYear()} LumoClip. All rights reserved.</span>
            <span>
              <a href="/privacy">Privacy Policy</a>
              {"  •  "}
              <a href="/terms">Terms of Service</a>
            </span>
          </footer>
        </main>
      </div>
    </>
  );
}
