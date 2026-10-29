import React from "react";
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

// ✅ Explicit tuple type so TS knows exactly what each element is.
// Without this, TS infers each row as (string | Icon | JSX.Element)[]
// (a union array, not a tuple), which makes `content` pick up the
// Icon component type too — causing the "Type 'string | ForwardRefExoticComponent<...>'
// is not assignable to type 'ReactNode'" error on {content}.
type Section = [string, React.ComponentType<{ size?: number }>, React.ReactNode];

const sections: Section[] = [
  ["1. Acceptance of Terms", FileText, <>
    <p>
      These Terms of Service govern your access to and use of the LumoClip
      website, applications, software, APIs, and related services.
    </p>
    <p>
      By accessing or using LumoClip, you agree to these Terms. If you do not
      agree, please do not use the service.
    </p>
  </>],
  ["2. Accounts and Eligibility", UserCheck, <>
    <p>
      You are responsible for providing accurate account information and for
      keeping your credentials secure. You are responsible for activity
      performed through your account.
    </p>
    <p>
      You may not create an account for fraudulent purposes or use another
      person's account without authorization.
    </p>
  </>],
  ["3. LumoClip Services", Server, <>
    <p>
      LumoClip provides AI-powered video clipping, transcription, captioning,
      editing, repurposing, and related media-processing functionality.
    </p>
    <p>
      Features may be changed, suspended, or discontinued when reasonably
      necessary to maintain, improve, or secure the platform.
    </p>
  </>],
  ["4. Your Content", Copyright, <>
    <p>
      You retain ownership of content you upload to LumoClip. You grant
      LumoClip a limited, non-exclusive license to host, reproduce, process,
      transmit, modify, and otherwise use that content only as reasonably
      necessary to provide the services you request.
    </p>
    <p>
      You are responsible for ensuring that you have all rights, licenses,
      permissions, and consents required to upload and process your content.
    </p>
  </>],
  ["5. Prohibited Use", Ban, <>
    <p>You must not use LumoClip to:</p>
    <ul>
      <li>Violate applicable laws or regulations.</li>
      <li>Infringe intellectual property, privacy, or other rights.</li>
      <li>Upload malware or malicious code.</li>
      <li>Attempt to disrupt, compromise, or abuse the platform.</li>
      <li>Reverse engineer or circumvent security controls.</li>
      <li>Impersonate another person or organization.</li>
      <li>Process content you do not have permission to use.</li>
    </ul>
  </>],
  ["6. Subscriptions and Payments", CreditCard, <>
    <p>
      Some LumoClip features may require a paid subscription or usage-based
      payment. Prices, plans, credits, limits, and billing periods are shown
      at the time of purchase and may change in the future.
    </p>
    <p>
      By purchasing a subscription, you authorize the applicable payment
      provider to charge your selected payment method according to the
      billing terms presented to you.
    </p>
  </>],
  ["7. Cancellation and Refunds", CreditCard, <>
    <p>
      You may cancel a subscription using the cancellation mechanism provided
      by LumoClip or the applicable payment provider. Unless otherwise stated
      or required by law, cancellation generally prevents future renewal and
      does not automatically refund previous charges.
    </p>
  </>],
  ["8. AI-Generated Results", ShieldAlert, <>
    <p>
      LumoClip may use AI and machine-learning systems to generate clips,
      captions, transcripts, summaries, titles, descriptions, and other
      outputs.
    </p>
    <p>
      AI-generated results may contain errors or omissions. You are responsible
      for reviewing outputs before publishing them or relying on them.
    </p>
  </>],
  ["9. Service Availability", Server, <>
    <p>
      We aim to provide a reliable service but do not guarantee uninterrupted
      or error-free operation. Maintenance, infrastructure failures,
      third-party outages, security incidents, or events outside our
      reasonable control may affect availability.
    </p>
  </>],
  ["10. Suspension and Termination", ShieldAlert, <>
    <p>
      We may suspend or terminate access when we reasonably believe an account
      violates these Terms, applicable law, or creates a security, legal, or
      operational risk.
    </p>
  </>],
  ["11. Intellectual Property", Copyright, <>
    <p>
      LumoClip's software, branding, interface, designs, documentation,
      trademarks, and underlying technology are owned by or licensed to
      LumoClip and are protected by applicable intellectual property laws.
    </p>
  </>],
  ["12. Disclaimers", ShieldAlert, <>
    <p>
      To the maximum extent permitted by law, LumoClip is provided on an
      "as is" and "as available" basis. We do not guarantee that the service
      will satisfy every requirement or that AI-generated results will be
      accurate or error-free.
    </p>
  </>],
  ["13. Limitation of Liability", Scale, <>
    <p>
      To the maximum extent permitted by applicable law, LumoClip and its
      operators, affiliates, employees, and service providers will not be
      liable for indirect, incidental, consequential, special, exemplary, or
      punitive damages arising from your use of or inability to use the
      service.
    </p>
    <p>
      Nothing in these Terms limits liability that cannot legally be limited.
    </p>
  </>],
  ["14. Indemnification", Scale, <>
    <p>
      To the extent permitted by applicable law, you agree to indemnify and
      hold harmless LumoClip from claims, losses, liabilities, damages, and
      expenses arising from your unlawful use of the service, violation of
      these Terms, or infringement of third-party rights.
    </p>
  </>],
  ["15. Changes to These Terms", FileText, <>
    <p>
      We may update these Terms to reflect changes to the service, business
      practices, security requirements, or applicable law. The "Last updated"
      date will be changed when appropriate.
    </p>
  </>],
  ["16. Contact", Mail, <>
    <p>
      If you have questions about these Terms, please contact LumoClip through
      the contact information provided on our website.
    </p>
    <div className="contact-card">
      <strong>LumoClip</strong>
      <span>AI Video Clipping & Repurposing Platform</span>
      <a href="https://lumo-clip.com/">https://lumo-clip.com</a>
    </div>
  </>],
];

export default function TermsOfService() {
  return (
    <>
      <style>{`
        .legal-page{min-height:100vh;background:radial-gradient(circle at 50% -10%,rgba(139,92,246,.14),transparent 38%),radial-gradient(circle at 10% 90%,rgba(59,130,246,.10),transparent 30%),#050507;color:#fff;font-family:inherit}
        .legal-header{position:sticky;top:0;z-index:20;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(5,5,7,.78);backdrop-filter:blur(18px)}
        .legal-header-inner,.legal-container{width:min(100% - 32px,960px);margin:0 auto}
        .legal-header-inner{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .brand{color:#fff;text-decoration:none;font-weight:800;font-size:20px;letter-spacing:-.03em}.brand span{color:#a78bfa}
        .back{display:inline-flex;align-items:center;gap:8px;color:#cbd5e1;text-decoration:none;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);padding:9px 13px;border-radius:10px;font-size:13px}
        .back:hover{background:rgba(255,255,255,.08);color:#fff}
        .legal-container{padding:64px 0 70px}.legal-hero{text-align:center;margin-bottom:42px}
        .legal-badge{width:62px;height:62px;margin:0 auto 18px;display:grid;place-items:center;border:1px solid rgba(167,139,250,.22);background:rgba(139,92,246,.10);color:#a78bfa;border-radius:18px}
        .legal-hero h1{margin:0;font-size:clamp(36px,6vw,54px);line-height:1.05;letter-spacing:-.045em}
        .legal-hero p{max-width:680px;margin:16px auto 0;color:#94a3b8;line-height:1.7;font-size:15px}.legal-date{color:#64748b!important;font-size:12px!important}
        .legal-section{margin-top:18px;padding:25px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);border-radius:18px}
        .section-title{display:flex;align-items:center;gap:11px;margin-bottom:17px}.section-title h2{margin:0;font-size:19px}
        .section-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;color:#a78bfa;background:rgba(139,92,246,.09);border:1px solid rgba(167,139,250,.16);flex:0 0 auto}
        .legal-body{color:#94a3b8;line-height:1.78;font-size:14px}.legal-body p{margin:0 0 13px}.legal-body ul{margin:8px 0 15px;padding-left:21px}.legal-body li{margin:5px 0}
        .contact-card{margin-top:18px;padding:16px;display:flex;flex-direction:column;gap:5px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);border-radius:12px}
        .contact-card strong{color:#fff}.contact-card a{color:#a78bfa;text-decoration:none}
        .legal-footer{margin-top:38px;padding-top:24px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;gap:16px;color:#64748b;font-size:12px}
        .legal-footer a{color:#94a3b8;text-decoration:none}
        @media(max-width:640px){.legal-container{padding-top:42px}.legal-section{padding:20px}.legal-header-inner{min-height:64px}.back{padding:8px 10px}.legal-footer{flex-direction:column}}
      `}</style>

      <div className="legal-page">
        <header className="legal-header">
          <div className="legal-header-inner">
            <a className="brand" href="/">Lumo<span>Clip</span></a>
            <a className="back" href="/"><ArrowLeft size={15}/> Back to LumoClip</a>
          </div>
        </header>

        <main className="legal-container">
          <div className="legal-hero">
            <div className="legal-badge"><FileText size={28}/></div>
            <h1>Terms of Service</h1>
            <p>Terms governing your access to and use of the LumoClip platform.</p>
            <p className="legal-date">Last updated: August 30, 2026</p>
          </div>

          {sections.map(([title, Icon, content]) => {
            const SectionIcon = Icon;
            return (
              <section className="legal-section" key={title}>
                <div className="section-title">
                  <span className="section-icon"><SectionIcon size={19}/></span>
                  <h2>{title}</h2>
                </div>
                <div className="legal-body">{content}</div>
              </section>
            );
          })}

          <footer className="legal-footer">
            <span>© {new Date().getFullYear()} LumoClip. All rights reserved.</span>
            <span><a href="/privacy">Privacy Policy</a>{"  •  "}<a href="/terms">Terms of Service</a></span>
          </footer>
        </main>
      </div>
    </>
  );
}