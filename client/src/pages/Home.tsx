import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileSearch, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const riskClass = (level: string) => `risk-badge ${level === "LOW" ? "risk-low" : level === "MEDIUM" ? "risk-medium" : level === "HIGH" ? "risk-high" : "risk-critical"}`;
const statusLabel = (status: string) => status === "needs_review" ? "Needs review" : status === "processing" ? "Processing" : "Completed";
const formatMs = (value: number) => value > 1000 ? `${(value / 1000).toFixed(1)} s` : `${value} ms`;

export default function Home() {
  const dashboard = trpc.dashboard.summary.useQuery(undefined, { retry: false });
  const data = dashboard.data;
  const metrics = data?.metrics;
  const metricItems: Array<{ label: string; value: string | number; meta: string; Icon: typeof FileSearch }> = [
    { label: "Today’s screenings", value: metrics?.todayCount ?? 0, meta: "DEMO DATA", Icon: FileSearch },
    { label: "Low risk", value: metrics?.low ?? 0, meta: "Standard review", Icon: CheckCircle2 },
    { label: "Needs analyst review", value: metrics?.reviewCount ?? 0, meta: "Medium / high / critical", Icon: ShieldAlert },
    { label: "Average processing", value: formatMs(metrics?.avgProcessingMs ?? 0), meta: "Across synthetic cases", Icon: Clock3 },
  ];
  return <div>
    <div className="page-header">
      <div><p className="eyebrow">Workspace overview</p><h1>Screening dashboard</h1><p>Monitor today’s synthetic screening activity, review risk signals, and open a case evidence chain.</p></div>
      <div className="page-actions"><Link href="/screening/new" className="button button-primary"><Plus size={16} /> New screening</Link><Link href="/history" className="button button-secondary">View history <ArrowRight size={15} /></Link></div>
    </div>
    <div className="notice notice-info" style={{ marginBottom: 18 }}><strong>Important information</strong><span>Please verify screening results before using them for official, academic, legal, or professional purposes.</span></div>
    {dashboard.isError && <div className="notice notice-danger" style={{ marginBottom: 18 }}><strong>Unable to load the workspace summary.</strong><span>The service could not be reached. Please try again after a few moments.</span><button className="button button-secondary" onClick={() => dashboard.refetch()} style={{ width: "fit-content", marginTop: 6 }}><RefreshCw size={14} /> Try again</button></div>}
    <section aria-label="Today's screening metrics" className="metric-grid" style={{ marginBottom: 18 }}>
      {metricItems.map(({ label, value, meta, Icon }) => <div className="metric" key={label}><div className="metric-label">{label}</div><div className="metric-value">{dashboard.isLoading ? "—" : value}</div><div className="metric-meta"><Icon size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} /> {meta}</div></div>)}
    </section>
    <div className="dashboard-grid">
      <div className="stack">
        <section className="panel" aria-labelledby="risk-distribution-title"><div className="panel-header"><div><h2 id="risk-distribution-title">Risk distribution</h2><p>Cases by explainable risk level</p></div><span className="demo-label">DEMO DATA</span></div><div className="chart-wrap"><div style={{ display: "grid", gap: 17, height: "100%", alignContent: "center" }}>{(data?.distribution ?? []).map((item) => <div key={item.label} style={{ display: "grid", gridTemplateColumns: "70px 1fr 32px", gap: 12, alignItems: "center", fontSize: 12 }}><span className="muted">{item.label}</span><div className="progress-line"><span style={{ width: `${Math.max(5, (item.value / Math.max(1, metrics?.todayCount ?? 1)) * 100)}%`, background: item.color }} /></div><strong style={{ color: item.color }}>{item.value}</strong></div>)}</div></div><div className="chart-legend">{(data?.distribution ?? []).map((item) => <span className="legend-item" key={item.label}><i className="legend-color" style={{ background: item.color }} />{item.label}</span>)}</div></section>
        <section className="panel" aria-labelledby="recent-cases-title"><div className="panel-header"><div><h2 id="recent-cases-title">Recent cases</h2><p>Latest synthetic screening decisions</p></div><Link className="button button-quiet" href="/history">Open all <ArrowRight size={14} /></Link></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Case ID</th><th>Identity</th><th>Score</th><th>Risk</th><th>Status</th></tr></thead><tbody>{data?.recentCases?.map((item) => <tr key={item.caseId}><td><Link className="table-link" href={`/case/${item.caseId}`}>{item.caseId}</Link></td><td><strong>{item.fullName}</strong><div className="muted small">{item.syntheticId}</div></td><td><strong>{item.score}</strong> <span className="muted small">/ 100</span></td><td><span className={riskClass(item.riskLevel)}>{item.riskLevel} RISK</span></td><td><span className="status-chip"><span className={`status-dot ${item.status === "completed" ? "status-dot-green" : "status-dot-amber"}`} />{statusLabel(item.status)}</span></td></tr>)}</tbody></table>{!dashboard.isLoading && !data?.recentCases?.length && <div className="empty-state"><strong>No result available.</strong><span>Submit a document to begin screening.</span></div>}</div></section>
      </div>
      <aside className="stack">
        <section className="panel" aria-labelledby="alerts-title"><div className="panel-header"><div><h2 id="alerts-title">Recent alerts</h2><p>Signals requiring attention</p></div><AlertTriangle size={18} color="#E67E22" /></div><div className="alert-list">{data?.recentAlerts?.map((alert) => <Link href={`/case/${alert.caseId}`} className="alert-row" key={alert.caseId}><i className="alert-marker" /><div><strong>{alert.title}</strong><span>{alert.detail}</span></div><ArrowRight size={15} color="#5F6B73" /></Link>)}{!dashboard.isLoading && !data?.recentAlerts?.length && <div className="empty-state"><strong>No active alerts</strong><span>All current demo cases are within expected review status.</span></div>}</div></section>
        <section className="panel" aria-labelledby="health-title"><div className="panel-header"><div><h2 id="health-title">System health</h2><p>Operational view of screening services</p></div><span className="status-chip"><span className="status-dot status-dot-green" /> Operational</span></div><div className="panel-body"><div style={{ display: "grid", gap: 13 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Screening queue</span><strong>{metrics?.queueCount ?? 0} cases</strong></div><div className="progress-line"><span style={{ width: "18%" }} /></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Persistent dataset</span><strong style={{ color: "var(--green)" }}>Available</strong></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Operating mode</span><strong style={{ color: "var(--blue)" }}>Synthetic demo</strong></div><Link href="/system" className="button button-secondary" style={{ marginTop: 5 }}>View system status <ArrowRight size={14} /></Link></div></div></section>
        <div className="notice notice-privacy"><strong>Privacy notice</strong><span>This system uses synthetic demonstration data only. Do not submit real identity documents or biometric data.</span></div>
      </aside>
    </div>
  </div>;
}
