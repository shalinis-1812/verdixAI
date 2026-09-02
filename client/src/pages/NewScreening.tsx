import { Check, FileUp, Play, ShieldCheck, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const steps = ["Document Detection", "OCR", "MRZ Analysis", "Structure Analysis", "Forensics", "Face Verification", "Consistency", "Risk Fusion", "Explanation"];
const manipulations = [
  ["change_dob", "Change date of birth", "Creates a visual / MRZ mismatch"],
  ["change_name", "Change name", "Creates an identity field mismatch"],
  ["change_expiry", "Change expiry date", "Tests validity-window review"],
  ["change_doc", "Change document number", "Tests number consistency"],
  ["modify_mrz", "Modify MRZ", "Tests checksum handling"],
  ["replace_photo", "Replace portrait region", "Tests artifact detection"],
  ["add_artifact", "Add document artifact", "Tests forensic review"],
  ["multiple", "Multiple manipulations", "Combines high-signal changes"],
] as const;

export default function NewScreening() {
  const [, setLocation] = useLocation();
  const [selectedIdentityId, setSelectedIdentityId] = useState<number | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [filePayload, setFilePayload] = useState<{ base64: string; mimeType: string } | null>(null);
  const [fileKind, setFileKind] = useState<"photo" | "dataset" | null>(null);
  const [validation, setValidation] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const summary = trpc.dashboard.summary.useQuery(undefined, { retry: false });
  const screen = trpc.cases.screen.useMutation();
  const identities = summary.data?.syntheticIdentities ?? [];
  const selectedIdentity = useMemo(() => identities.find((identity) => identity.id === selectedIdentityId), [identities, selectedIdentityId]);

  useEffect(() => {
    if (!processing) return;
    setActiveStep(0);
    const timer = window.setInterval(() => setActiveStep((value) => value >= steps.length - 1 ? value : value + 1), 160);
    return () => window.clearInterval(timer);
  }, [processing]);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.toLowerCase().split(".").pop() ?? "";
    const photoExtensions = ["png", "jpg", "jpeg", "webp"];
    const datasetExtensions = ["xlsx", "xls", "csv", "json"];
    const kind = photoExtensions.includes(extension) ? "photo" : datasetExtensions.includes(extension) ? "dataset" : null;
    if (!kind) { setValidation("Upload a passport, ID, PAN card, or licence photo. Structured XLSX, CSV, and JSON rows are also supported for dataset testing."); setFileName(""); setFilePayload(null); setFileKind(null); return; }
    if (file.size > 8 * 1024 * 1024) { setValidation("The file is larger than 8 MB. Please choose a smaller dataset."); setFileName(""); setFilePayload(null); setFileKind(null); return; }
    setValidation("");
    setFileName(file.name);
    setFileKind(kind);
    const reader = new FileReader();
    reader.onload = () => { const result = String(reader.result ?? ""); setFilePayload({ base64: result.split(",")[1] ?? result, mimeType: file.type || (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg") }); };
    reader.onerror = () => setValidation("The document photo could not be read. Please try again with a JPG, PNG, or WEBP image.");
    reader.readAsDataURL(file);
    if (!selectedIdentityId && identities[0]) setSelectedIdentityId(identities[0].id);
  };

  const submit = async () => {
    if (!selectedIdentityId && !filePayload) { setValidation("Select a synthetic identity or choose Use Demo Document before screening."); return; }
    setValidation("");
    setProcessing(true);
    try {
      const result = filePayload && fileName
        ? await screen.mutateAsync({ fileName, mimeType: filePayload.mimeType, fileBase64: filePayload.base64, rowIndex: 0, uploadKind: fileKind ?? "photo", manipulationCodes: [] })
        : await screen.mutateAsync({ identityId: selectedIdentityId ?? undefined, manipulationCodes: selectedCodes });
      if (result) setLocation(`/case/${result.caseId}`);
    } catch {
      setProcessing(false);
      setValidation("Unable to process the request. Please check your input and try again.");
    }
  };

  if (processing) return <div><div className="page-header"><div><p className="eyebrow">New screening / processing</p><h1>Preparing explainable result</h1><p>Each check is shown as it completes. No real identity data is used in this prototype.</p></div></div><section className="panel processing-panel"><div className="panel-body"><div className="notice notice-info"><strong>PROCESSING REQUEST</strong><span>Request received · Input validated · Generating result</span></div><div className="processing-list">{steps.map((step, index) => <div className={`processing-step ${index < activeStep ? "done" : index === activeStep ? "current" : "pending"}`} key={step}><span className="step-icon">{index < activeStep ? <Check size={15} /> : index === activeStep ? "●" : "○"}</span>{step}</div>)}</div><div className="helper">Results will appear below once processing completes.</div></div></section></div>;

  return <div>
    <div className="page-header"><div><p className="eyebrow">Case intake</p><h1>Start a new screening</h1><p>Upload a synthetic document or choose a prepared demo case, then run the screening checks in one guided flow.</p></div><div className="page-actions"><span className="status-chip"><span className="status-dot status-dot-green" /> Synthetic mode active</span></div></div>
    <div className="notice notice-privacy" style={{ marginBottom: 18 }}><strong>Privacy notice</strong><span>This system uses synthetic demonstration data only. Do not submit real identity documents or biometric data.</span></div>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-header"><div><h2>1. Choose an input</h2><p>Upload a document photo for vision extraction, or use a prepared synthetic case.</p></div><span className="section-kicker" style={{ margin: 0 }}>REQUIRED</span></div><div className="panel-body" style={{ display: "grid", gap: 18 }}><label className="upload-zone"><UploadCloud size={28} color="var(--blue)" /><strong>{fileName || "Upload a document photo"}</strong><p>Passport, ID, PAN card, licence · JPG, PNG, or WEBP · maximum 8 MB</p><span className="upload-actions"><span className="button button-secondary"><FileUp size={15} /> Choose file</span><input type="file" accept=".png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.json" onChange={handleFile} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} aria-label="Choose a document photo or synthetic dataset file" /></span></label><div style={{ display: "grid", gap: 9 }}><div className="section-kicker">Or use demo document</div>{identities.map((identity) => <button key={identity.id} className={`choice ${selectedIdentityId === identity.id ? "selected" : ""}`} onClick={() => { setSelectedIdentityId(identity.id); setFileName(`${identity.syntheticId.toLowerCase()}-synthetic`); setValidation(""); }}><ShieldCheck size={16} color="var(--blue)" /><span style={{ textAlign: "left" }}><strong>{identity.fullName}</strong><small>{identity.syntheticId} · {identity.documentType}</small></span></button>)}</div></div></section>
      <section className="panel"><div className="panel-header"><div><h2>2. Optional synthetic reference</h2><p>Photo screening extracts visible fields directly; a reference record is only needed for the prepared demo path.</p></div></div><div className="panel-body"><div className="field"><label htmlFor="identity-select">Synthetic identity record</label><select className="select" id="identity-select" value={selectedIdentityId ?? ""} onChange={(event) => setSelectedIdentityId(event.target.value ? Number(event.target.value) : null)}><option value="">Select a synthetic identity</option>{identities.map((identity) => <option value={identity.id} key={identity.id}>{identity.fullName} · {identity.syntheticId}</option>)}</select><span className="helper">{selectedIdentity ? `${selectedIdentity.documentType} · synthetic record ready for screening` : "The case cannot be screened until a record is selected."}</span></div><div className="notice notice-info" style={{ marginTop: 18 }}><strong>Guided flow</strong><span>Upload → Processing → Result → Evidence → Report</span></div></div></section>
    </div>
    <section className="panel" style={{ marginTop: 18 }}><div className="panel-header"><div><h2>3. Run screening</h2><p>Run the configured checks using the selected synthetic case.</p></div></div><div className="panel-body"><div className="page-actions" style={{ justifyContent: "flex-start" }}><button className="button button-primary" onClick={submit} disabled={screen.isPending}><Play size={15} /> {screen.isPending ? "Starting screening" : "Run screening"}</button><button className="button button-secondary" onClick={() => { setSelectedIdentityId(null); setFileName(""); setFilePayload(null); setFileKind(null); setSelectedCodes([]); setValidation(""); }}>Clear</button></div>{validation && <p style={{ color: "var(--alert)", fontSize: 13, margin: "12px 0 0" }} role="alert">{validation}</p>}</div></section>
    <p className="helper" style={{ marginTop: 16 }}>Photo screening extracts visible fields and visual cues before applying the dataset-informed risk model. Results require human review and are not official verification decisions.</p>
    <section className="panel" style={{ marginTop: 18 }}><div className="panel-header"><div><h2>Optional manipulation set</h2><p>Use the risk simulator for deliberate changes; this intake screen uses the prepared identity record.</p></div></div><div className="panel-body"><div className="choice-grid">{manipulations.slice(0, 4).map(([code, label, help]) => <label className="choice" key={code}><input type="checkbox" checked={selectedCodes.includes(code)} onChange={() => setSelectedCodes((items) => items.includes(code) ? items.filter((item) => item !== code) : [...items, code])} /><span><strong>{label}</strong><small>{help}</small></span></label>)}</div></div></section>
  </div>;
}
