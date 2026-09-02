import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { LogOut, Menu, Search, ShieldCheck, SlidersHorizontal, Type, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

const tamilLabels: Record<string, string> = { Dashboard: "டாஷ்போர்டு", "New Screening": "புதிய திரையிடல்", "Screening History": "திரையிடல் வரலாறு", "Document Forensics": "ஆவண தடயவியல்", "Identity Graph": "அடையாள வரைபடம்", "Risk Simulator": "ஆபத்து மாதிரி", Reports: "அறிக்கைகள்", "System Status": "அமைப்பு நிலை" };

const navItems = [
  { label: "Dashboard", path: "/", short: "Overview" },
  { label: "New Screening", path: "/screening/new", short: "Start a case" },
  { label: "Screening History", path: "/history", short: "Past cases" },
  { label: "Document Forensics", path: "/forensics", short: "Evidence" },
  { label: "Identity Graph", path: "/identity-graph", short: "Consistency" },
  { label: "Risk Simulator", path: "/simulator", short: "Explore signals" },
  { label: "Reports", path: "/reports", short: "Downloads" },
  { label: "System Status", path: "/system", short: "Engine health" },
];

function initials(name?: string | null) {
  if (!name) return "VR";
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contrast, setContrast] = useState(() => localStorage.getItem("veridex-contrast") === "on");
  const [largeText, setLargeText] = useState(() => localStorage.getItem("veridex-text") === "large");
  const [tamil, setTamil] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("contrast-mode", contrast);
    document.documentElement.lang = tamil ? "ta" : "en";
    document.documentElement.classList.toggle("large-text", largeText);
    localStorage.setItem("veridex-contrast", contrast ? "on" : "off");
    localStorage.setItem("veridex-text", largeText ? "large" : "normal");
  }, [contrast, largeText, tamil]);

  const pageTitle = useMemo(() => { const label = navItems.find((item) => item.path === location)?.label ?? "Case Detail"; return tamil ? (tamilLabels[label] ?? label) : label; }, [location, tamil]);

  if (loading) {
    return <div className="auth-loading"><div className="loading-mark"><ShieldCheck size={22} /></div><p>Checking secure workspace access</p><span className="loading-line" /></div>;
  }

  if (!user) {
    return (
      <main className="login-screen" aria-labelledby="login-title">
        <div className="login-rail"><div className="emblem emblem-large"><ShieldCheck size={30} /></div><div><p className="eyebrow">Government Digital Service — Prototype</p><h1>VERIDEX AI</h1><p>AI-Based Document Screening Prototype</p></div></div>
        <div className="login-panel">
          <div className="login-kicker">RESTRICTED WORKSPACE</div>
          <h2 id="login-title">Sign in to the screening workspace</h2>
          <p className="muted">Use secure Manus access to review synthetic identity and document screening cases.</p>
          <div className="notice notice-info"><strong>Research / Demonstration Prototype — Synthetic Data Only</strong><span>Do not submit real identity documents or biometric data.</span></div>
          <button className="button button-primary button-wide" onClick={() => startLogin()}>Continue with secure access</button>
          <p className="login-note">Access is protected by Manus OAuth. No passwords are stored in this prototype.</p>
        </div>
        <p className="login-disclaimer">VERIDEX AI — Demonstration Prototype. Not an official Government of India website.</p>
      </main>
    );
  }

  return (
    <div className="site-root">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="utility-strip"><div>Government Digital Service — Prototype</div><div className="utility-links"><span>Accessibility</span><span>Screen Reader</span><span>Help</span><button onClick={() => setTamil((value) => !value)} className="utility-button" aria-pressed={tamil}>{tamil ? "தமிழ்" : "English"} | {tamil ? "English" : "தமிழ்"}</button></div></div>
      <header className="site-header">
        <Link href="/" className="brand-lockup" aria-label="VERIDEX AI dashboard">
          <div className="emblem"><ShieldCheck size={20} /></div>
          <div><div className="brand-name">VERIDEX AI</div><div className="brand-subtitle">AI-Based Document Screening Prototype</div></div>
        </Link>
        <div className="header-actions">
          <span className="workspace-status"><span className="status-dot status-dot-green" /> Workspace online</span>
          <button className="icon-button" aria-label="Search"><Search size={18} /></button>
          <button className="icon-button" aria-label="Accessibility tools" onClick={() => setToolsOpen((value) => !value)}><SlidersHorizontal size={18} /></button>
          <div className="user-menu"><span className="avatar">{initials(user.name)}</span><span className="user-name">{user.name || "Workspace user"}</span><button className="logout-button" onClick={() => logout()} aria-label="Sign out"><LogOut size={15} /></button></div>
          <button className="mobile-menu-button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </header>
      {toolsOpen && <div className="accessibility-panel" role="region" aria-label="Accessibility controls"><div><strong>Accessibility controls</strong><span className="muted">Adjust the workspace display.</span></div><div className="accessibility-actions"><button className="control-button" onClick={() => setLargeText((value) => !value)} aria-pressed={largeText}><Type size={15} /> Text size {largeText ? "A−" : "A+"}</button><button className="control-button" onClick={() => setContrast((value) => !value)} aria-pressed={contrast}><span className="contrast-icon" /> High contrast {contrast ? "on" : "off"}</button><button className="control-button" onClick={() => { setLargeText(false); setContrast(false); }}><span>Reset</span></button></div></div>}
      <nav className={`primary-nav ${mobileOpen ? "primary-nav-open" : ""}`} aria-label="Primary navigation">
        <div className="nav-inner">{navItems.map((item) => { const active = item.path === "/" ? location === "/" : location.startsWith(item.path); return <Link key={item.path} href={item.path} className={`nav-link ${active ? "nav-link-active" : ""}`} onClick={() => setMobileOpen(false)}>{tamil ? tamilLabels[item.label] : item.label}<span className="nav-short">{tamil ? "திற" : item.short}</span></Link>; })}</div>
      </nav>
      <main id="main-content" className="workspace-main"><div className="workspace-breadcrumb"><span>VERIDEX AI</span><span>/</span><strong>{pageTitle}</strong><span className="breadcrumb-demo">DEMO DATA</span></div>{children}</main>
      <footer className="site-footer"><div className="footer-grid"><div><strong>VERIDEX AI</strong><p>Explainable screening workspace for synthetic identity and document cases.</p></div><div><strong>Quick Links</strong><Link href="/">Dashboard</Link><Link href="/screening/new">New Screening</Link><Link href="/reports">Reports</Link></div><div><strong>Policies</strong><span>Privacy Notice</span><span>Terms of Use</span><span>Accessibility Statement</span></div><div><strong>Service Information</strong><span>Version 1.0</span><span>Last updated: 02 Sep 2026</span><Link href="/system">System status</Link></div></div><div className="footer-bottom">VERIDEX AI — Demonstration Prototype. Not an official Government of India website.<span>Research / Demonstration Prototype — Synthetic Data Only</span></div></footer>
    </div>
  );
}
