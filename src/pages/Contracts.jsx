import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import Modal from '../components/Modal.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export default function Contracts() {
  const navigate = useNavigate();
  const [upload, setUpload] = useState(false);

  return (
    <div className="lx-page lx-rise">
      <div className="lx-between ph" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
        <div>
          <span className="ph__eyebrow">Contract review</span>
          <h1 className="ph__title">Contracts</h1>
          <p className="ph__sub">Clauses read, risks surfaced and terms benchmarked against the market — in minutes.</p>
        </div>
        <button className="lx-btn lx-btn--gold" onClick={() => setUpload(true)}><Ic.Upload size={15} /> Upload contract</button>
      </div>

      <div className="lx-section-head lx-mt-xl"><h3>Review a contract</h3></div>
      <div className="lx-card lx-card--pad">
        <div className="lx-empty" style={{ padding: '48px 20px' }}>
          <div className="lx-empty__ico"><Ic.Contracts size={22} /></div>
          <h4>Start a new contract review</h4>
          <p style={{ maxWidth: 440, margin: '0 auto' }}>
            Upload a PDF or Word file, or paste the text, and the AI reads every clause — surfacing risks,
            missing protections and anything that sits below market. Reviewed in under a minute.
          </p>
          <button className="lx-btn lx-btn--gold" style={{ marginTop: 16 }} onClick={() => setUpload(true)}>
            <Ic.Upload size={15} /> Upload or paste a contract
          </button>
        </div>
      </div>

      {upload && (
        <UploadModal
          onClose={() => setUpload(false)}
          onStarted={(jobId) => { setUpload(false); navigate('/contracts/' + jobId); }}
        />
      )}
    </div>
  );
}

function UploadModal({ onClose, onStarted }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  const pick = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErr('');
    }
  };

  const start = async () => {
    setErr('');
    if (!file && !text.trim()) { setErr('Upload a file or paste contract text to begin.'); return; }
    setBusy(true);
    try {
      let contractText = text.trim();

      // For an uploaded file, extract its text first (same route the analyzer uses),
      // then dispatch the analysis on the extracted text.
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const exRes = await fetch(`${API_BASE}/api/contract/extract-text`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-CSRF-TOKEN': csrf() },
          body: fd,
        });
        if (exRes.status === 401) throw new Error('Your session has expired. Please sign in again.');
        if (!exRes.ok) {
          const d = await exRes.json().catch(() => ({}));
          throw new Error(d.message || 'We could not read that file. Try a PDF or Word file with selectable text.');
        }
        const exData = await exRes.json();
        contractText = (exData.raw_text || exData.text || '').trim();
        if (!contractText) throw new Error('No readable text could be extracted from that file.');
      }

      const res = await fetch(`${API_BASE}/api/contract/analyze`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ text: contractText, ruleBook: '', scanStrategy: 'balanced' }),
      });
      if (res.status === 401) throw new Error('Your session has expired. Please sign in again.');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.job_id) {
        throw new Error(data.message || (typeof data.error === 'string' ? data.error : '') || 'The analysis could not be started. Please try again.');
      }
      onStarted(data.job_id);
    } catch (e) {
      setErr(e.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Review a contract"
      onClose={busy ? () => {} : onClose}
      footer={<>
        <button className="lx-btn lx-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="lx-btn lx-btn--primary" onClick={start} disabled={busy}>{busy ? 'Starting review…' : 'Analyze contract'}</button>
      </>}
    >
      {err && <div role="alert" style={{ marginBottom: 12, color: 'var(--risk)', fontSize: 13 }}>{err}</div>}

      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={pick} />
      <div
        onClick={() => !busy && fileRef.current && fileRef.current.click()}
        style={{ border: '1.5px dashed var(--rule)', borderRadius: 14, padding: '36px 20px', textAlign: 'center', background: 'var(--paper-2)', cursor: busy ? 'default' : 'pointer' }}
      >
        <div className="lx-empty__ico" style={{ margin: '0 auto 14px' }}><Ic.Upload size={22} /></div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--ink)' }}>
          {file ? file.name : 'Drop a PDF or Word file'}
        </div>
        <div className="lx-muted" style={{ marginTop: 6 }}>
          {file ? 'Click to choose a different file' : 'or click to browse — reviewed in under a minute'}
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '16px 0 4px', color: 'var(--muted)', fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase' }}>or paste the text</div>
      <div>
        <label className="lbl">Paste contract text</label>
        <textarea
          className="inp"
          value={text}
          onChange={(e) => { setText(e.target.value); if (e.target.value) setErr(''); }}
          placeholder="Paste the full contract text here…"
          style={{ minHeight: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
      </div>
    </Modal>
  );
}
