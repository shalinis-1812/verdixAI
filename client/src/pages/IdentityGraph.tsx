import { GitBranch, Info } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const nodes = [
  { key: "name-match", label: "Name", x: 160, y: 82 },
  { key: "dob-mrz", label: "DOB", x: 160, y: 170 },
  { key: "doc-number", label: "Doc no.", x: 160, y: 258 },
  { key: "expiry-check", label: "Expiry", x: 160, y: 346 },
  { key: "mrz-checksum", label: "MRZ", x: 405, y: 60 },
  { key: "photo-artifact", label: "Photo", x: 555, y: 105 },
  { key: "metadata", label: "OCR", x: 640, y: 215 },
  { key: "face", label: "Face ref.", x: 610, y: 330 },
  { key: "consistency", label: "Consistency", x: 420, y: 390 },
];

export default function IdentityGraph() {
  const cases = trpc.cases.list.useQuery({}, { retry: false });
  const [caseId, setCaseId] = useState("");
  const activeCaseId = caseId || cases.data?.[0]?.caseId || "";
  const detail = trpc.cases.get.useQuery({ caseId: activeCaseId }, { enabled: Boolean(activeCaseId), retry: false });
  const item = detail.data;
  const statusFor = (key: string) => item?.evidence.find((evidence) => evidence.code === key)?.status ?? "UNKNOWN";
  const nodeClass = (status: string) => status === "MATCH" ? "" : status === "MISMATCH" ? "alert" : status === "SUSPICIOUS" ? "suspicious" : "";
  return <div><div className="page-header"><div><p className="eyebrow">Analysis visualization</p><h1>Identity consistency graph</h1><p>Trace how the synthetic person, document fields, OCR, MRZ, portrait, and consistency checks relate to one another.</p></div><div className="field" style={{ minWidth: 240 }}><label htmlFor="graph-case">Case</label><select id="graph-case" className="select" value={activeCaseId} onChange={(event) => setCaseId(event.target.value)}><option value="">Select case</option>{cases.data?.map((row) => <option key={row.caseId} value={row.caseId}>{row.caseId} · {row.fullName}</option>)}</select></div></div><div className="notice notice-info" style={{ marginBottom: 18 }}><strong>How to read this view</strong><span>This is a visualization of the analysis. It is not a separate AI verdict and should be interpreted alongside the supporting evidence.</span></div>{item && <section className="panel"><div className="panel-header"><div><h2>{item.caseId} · {item.fullName}</h2><p>Selected synthetic case relationship map</p></div><GitBranch size={18} color="var(--blue)" /></div><div className="panel-body"><div className="graph-wrap"><svg viewBox="0 0 760 450" role="img" aria-label="Identity consistency relationship graph"><line className="graph-edge" x1="380" y1="225" x2="160" y2="82" /><line className="graph-edge" x1="380" y1="225" x2="160" y2="170" /><line className="graph-edge" x1="380" y1="225" x2="160" y2="258" /><line className="graph-edge" x1="380" y1="225" x2="160" y2="346" /><line className="graph-edge" x1="380" y1="225" x2="405" y2="60" /><line className="graph-edge" x1="380" y1="225" x2="555" y2="105" /><line className="graph-edge" x1="380" y1="225" x2="640" y2="215" /><line className="graph-edge" x1="380" y1="225" x2="610" y2="330" /><line className="graph-edge" x1="380" y1="225" x2="420" y2="390" /><circle className="graph-center" cx="380" cy="225" r="45" /><text className="graph-label graph-center-label" x="380" y="222" textAnchor="middle">Person</text><text className="graph-label graph-center-label" x="380" y="238" textAnchor="middle">record</text>{nodes.map((node) => { const status = node.key === "face" ? "MATCH" : node.key === "consistency" ? (item.score >= 65 ? "SUSPICIOUS" : "MATCH") : statusFor(node.key); return <g key={node.key}><circle className={`graph-node ${nodeClass(status)}`} cx={node.x} cy={node.y} r="35" /><text className="graph-label" x={node.x} y={node.y - 2} textAnchor="middle">{node.label}</text><text className="graph-label" x={node.x} y={node.y + 14} textAnchor="middle" style={{ fontSize: 9, fill: status === "MATCH" ? "#2E7D32" : status === "MISMATCH" ? "#B7473A" : status === "SUSPICIOUS" ? "#A34D0B" : "#6f7d84" }}>{status}</text></g>; })}</svg></div><div className="graph-legend"><span className="legend-state state-consistent"><i /> Consistent</span><span className="legend-state state-mismatch"><i /> Mismatch</span><span className="legend-state state-suspicious"><i /> Suspicious</span><span className="legend-state state-unknown"><i /> Unknown</span></div></div></section>}{!item && <div className="empty-state panel"><Info size={20} color="var(--blue)" /><strong>Choose a synthetic case</strong><span>The graph will appear after a case is selected.</span></div>}</div>;
}
