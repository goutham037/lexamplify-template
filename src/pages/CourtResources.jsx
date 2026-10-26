import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Ic from '../icons.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const TABS = [
  { id: 'supreme', label: 'Supreme Court' },
  { id: 'high', label: 'High Courts' },
  { id: 'judges', label: 'Judges' },
  { id: 'rosters', label: 'Rosters' },
  { id: 'bar', label: 'Bar Councils' },
  { id: 'acts', label: 'Bare Acts' },
  { id: 'causelists', label: 'Cause Lists' },
  { id: 'feed', label: 'Legal Feed' },
];

// District complexes whose judicial-officer rosters are served live by
// /api/directory/judges. Delhi HC itself uses the national roster below.
const DISTRICT_COMPLEXES = [
  { key: 'delhi_rohini', label: 'Rohini — North District' },
  { key: 'delhi_rohini_nw', label: 'Rohini — North-West District' },
];

async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(res.status === 401
      ? 'Your session has expired. Please sign in again.'
      : `The directory service is unavailable right now (${res.status}).`);
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('The server returned an unexpected response.');
  return res.json();
}

const asArray = (v) => (Array.isArray(v) ? v : []);
const openExternal = (url) => url && window.open(url, '_blank', 'noopener,noreferrer');

// Backend /api/court-data/<id> falls back to Delhi's roster for any id it
// doesn't recognise, so a returned court is only trusted when its name
// actually matches the court the user picked.
function sameCourt(a, b) {
  if (!a || !b) return false;
  const key = (s) => String(s).toLowerCase().replace(/high court|of|and|&|the/g, '').replace(/[^a-z]/g, '');
  const ka = key(a); const kb = key(b);
  return !!ka && !!kb && (ka.includes(kb) || kb.includes(ka));
}

function prettify(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bHc\b/g, 'HC')
    .replace(/\bSc\b/g, 'SC');
}

function Loading({ label }) {
  return <div className="lx-empty"><p>{label}</p></div>;
}
function ErrorState({ message, onRetry }) {
  return (
    <div className="lx-empty">
      <div className="lx-empty__ico"><Ic.Shield size={22} /></div>
      <h4>Couldn’t load this directory</h4>
      <p>{message}</p>
      {onRetry && <button className="lx-btn lx-btn--sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}
function Empty({ icon: Icon = Ic.Scale, title, children }) {
  return (
    <div className="lx-empty">
      <div className="lx-empty__ico"><Icon size={22} /></div>
      <h4>{title}</h4>
      <p>{children}</p>
    </div>
  );
}

export default function CourtResources() {
  const [tab, setTab] = useState('supreme');
  const [copied, setCopied] = useState('');

  const copy = (text, key) => {
    if (!text) return;
    try { navigator.clipboard?.writeText(text); } catch { /* clipboard unavailable */ }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1600);
  };

  // ── Shared globals: bare acts + cause-list portals ──────────────────────
  const [globals, setGlobals] = useState({ bare_acts: [], cause_list_urls: {} });
  const [globalsState, setGlobalsState] = useState('idle');
  const loadGlobals = useCallback(async () => {
    setGlobalsState('loading');
    try {
      const data = await getJSON('/api/court-globals');
      setGlobals({
        bare_acts: asArray(data?.bare_acts),
        cause_list_urls: data?.cause_list_urls && typeof data.cause_list_urls === 'object' ? data.cause_list_urls : {},
      });
      setGlobalsState('ready');
    } catch (e) { setGlobalsState('error:' + e.message); }
  }, []);

  // ── Supreme Court roster ────────────────────────────────────────────────
  const [sc, setSc] = useState([]);
  const [scState, setScState] = useState('idle');
  const [scQ, setScQ] = useState('');
  const loadSc = useCallback(async () => {
    setScState('loading');
    try { setSc(asArray(await getJSON('/api/directory/supreme-court'))); setScState('ready'); }
    catch (e) { setScState('error:' + e.message); }
  }, []);

  // ── High Courts: searchable list + per-court detail ─────────────────────
  const [hcList, setHcList] = useState([]);
  const [hcListState, setHcListState] = useState('idle');
  const [hcQ, setHcQ] = useState('');
  const [selectedHc, setSelectedHc] = useState(null);
  const [hcDetail, setHcDetail] = useState({ hc: null, judges: [], forms: [], trusted: false });
  const [hcDetailState, setHcDetailState] = useState('idle');

  const loadHcList = useCallback(async () => {
    setHcListState('loading');
    try {
      const data = await getJSON('/api/courts/high-courts');
      setHcList(asArray(data).filter((c) => c && c.id));
      setHcListState('ready');
    } catch (e) { setHcListState('error:' + e.message); }
  }, []);

  const openHighCourt = useCallback(async (court) => {
    setSelectedHc(court);
    setHcDetailState('loading');
    try {
      const data = await getJSON(`/api/court-data/${encodeURIComponent(court.id)}`);
      const trusted = sameCourt(data?.hc?.name, court.name);
      setHcDetail({
        hc: data?.hc && typeof data.hc === 'object' ? data.hc : null,
        judges: trusted ? asArray(data?.judges) : [],
        forms: trusted ? asArray(data?.forms) : [],
        trusted,
      });
      setHcDetailState('ready');
    } catch (e) { setHcDetailState('error:' + e.message); }
  }, []);

  // ── Judges: national roster + district officers ─────────────────────────
  const [jMode, setJMode] = useState('national');
  const [national, setNational] = useState({ judges: [], errors: [] });
  const [nationalState, setNationalState] = useState('idle');
  const [jQ, setJQ] = useState('');
  const [courtFilter, setCourtFilter] = useState('All');
  const loadNational = useCallback(async () => {
    setNationalState('loading');
    try {
      const data = await getJSON('/api/courts/judges');
      setNational({ judges: asArray(data?.judges), errors: asArray(data?.errors) });
      setNationalState('ready');
    } catch (e) { setNationalState('error:' + e.message); }
  }, []);

  const [distKey, setDistKey] = useState(DISTRICT_COMPLEXES[0].key);
  const [distJudges, setDistJudges] = useState([]);
  const [distState, setDistState] = useState('idle');
  const loadDistrict = useCallback(async (key) => {
    setDistState('loading');
    try { setDistJudges(asArray(await getJSON(`/api/directory/judges?district=${encodeURIComponent(key)}`))); setDistState('ready'); }
    catch (e) { setDistState('error:' + e.message); }
  }, []);

  // ── Legal feed ──────────────────────────────────────────────────────────
  const [events, setEvents] = useState([]);
  const [eventsState, setEventsState] = useState('idle');
  const [eventCat, setEventCat] = useState('all');
  const loadEvents = useCallback(async () => {
    setEventsState('loading');
    try {
      const data = await getJSON('/api/legal-events');
      if (data?.error) throw new Error(data.error);
      setEvents(asArray(data?.events));
      setEventsState('ready');
    } catch (e) { setEventsState('error:' + e.message); }
  }, []);

  // ── Court rosters (sitting / bail / duty / vacation) ────────────────────
  const [rosters, setRosters] = useState([]);
  const [rostersState, setRostersState] = useState('idle');
  const [rosterCat, setRosterCat] = useState('all');
  const [rosterQ, setRosterQ] = useState('');
  const loadRosters = useCallback(async () => {
    setRostersState('loading');
    try { const data = await getJSON('/api/court-rosters'); setRosters(asArray(data?.rosters)); setRostersState('ready'); }
    catch (e) { setRostersState('error:' + e.message); }
  }, []);

  // ── Bar associations / councils directory ───────────────────────────────
  const [bars, setBars] = useState([]);
  const [barsState, setBarsState] = useState('idle');
  const [barQ, setBarQ] = useState('');
  const loadBars = useCallback(async () => {
    setBarsState('loading');
    try { const data = await getJSON('/api/court-bar-associations'); setBars(asArray(data?.bar_associations)); setBarsState('ready'); }
    catch (e) { setBarsState('error:' + e.message); }
  }, []);

  // ── Lazy per-tab loading ────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'supreme' && scState === 'idle') loadSc();
    if (tab === 'high' && hcListState === 'idle') loadHcList();
    if (tab === 'judges' && nationalState === 'idle') loadNational();
    if ((tab === 'acts' || tab === 'causelists') && globalsState === 'idle') loadGlobals();
    if (tab === 'feed' && eventsState === 'idle') loadEvents();
    if (tab === 'rosters' && rostersState === 'idle') loadRosters();
    if (tab === 'bar' && barsState === 'idle') loadBars();
  }, [tab, scState, hcListState, nationalState, globalsState, eventsState, rostersState, barsState,
      loadSc, loadHcList, loadNational, loadGlobals, loadEvents, loadRosters, loadBars]);

  useEffect(() => { if (jMode === 'district') loadDistrict(distKey); }, [jMode, distKey, loadDistrict]);

  // ── Derived views ───────────────────────────────────────────────────────
  const scRows = useMemo(() => {
    const q = scQ.trim().toLowerCase();
    return sc.filter((c) => !q
      || String(c.court_room).toLowerCase().includes(q)
      || String(c.judges || '').toLowerCase().includes(q));
  }, [sc, scQ]);

  const hcRows = useMemo(() => {
    const q = hcQ.trim().toLowerCase();
    return hcList.filter((c) => !q
      || String(c.name || '').toLowerCase().includes(q)
      || String(c.jurisdiction || '').toLowerCase().includes(q));
  }, [hcList, hcQ]);

  const courtOptions = useMemo(() => {
    const set = new Set(national.judges.map((j) => j.court).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [national.judges]);

  const nationalRows = useMemo(() => {
    const q = jQ.trim().toLowerCase();
    return national.judges.filter((j) =>
      (courtFilter === 'All' || j.court === courtFilter) &&
      (!q || String(j.name || '').toLowerCase().includes(q) || String(j.designation || '').toLowerCase().includes(q)));
  }, [national.judges, jQ, courtFilter]);

  const eventCats = useMemo(() => {
    const set = new Set(events.map((e) => e.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [events]);
  const eventRows = useMemo(
    () => events.filter((e) => eventCat === 'all' || e.category === eventCat),
    [events, eventCat]);

  const [actQ, setActQ] = useState('');
  const actRows = useMemo(() => {
    const q = actQ.trim().toLowerCase();
    return globals.bare_acts
      .map((a) => ({ name: a?.name || a?.title || a?.act || 'Untitled', url: a?.url || a?.link || a?.href || '' }))
      .filter((a) => !q || a.name.toLowerCase().includes(q));
  }, [globals.bare_acts, actQ]);

  const causeRows = useMemo(() =>
    Object.entries(globals.cause_list_urls || {})
      .filter(([, url]) => typeof url === 'string' && url)
      .map(([key, url]) => ({ label: prettify(key), url })),
  [globals.cause_list_urls]);

  const rosterCats = useMemo(() => {
    const set = new Set(rosters.map((r) => r.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [rosters]);
  const rosterRows = useMemo(() => {
    const q = rosterQ.trim().toLowerCase();
    return rosters.filter((r) =>
      (rosterCat === 'all' || r.category === rosterCat) &&
      (!q || String(r.title || '').toLowerCase().includes(q) || String(r.court || '').toLowerCase().includes(q)));
  }, [rosters, rosterCat, rosterQ]);

  const barRows = useMemo(() => {
    const q = barQ.trim().toLowerCase();
    return bars.filter((b) => !q
      || String(b.name || '').toLowerCase().includes(q)
      || String(b.state || '').toLowerCase().includes(q)
      || String(b.kind || '').toLowerCase().includes(q));
  }, [bars, barQ]);

  const errMsg = (s) => (s.startsWith('error:') ? s.slice(6) : '');

  return (
    <div className="lx-page lx-rise">
      <div className="ph">
        <span className="ph__eyebrow">Reference</span>
        <h1 className="ph__title">Court Resources</h1>
        <p className="ph__sub">The Supreme Court, every High Court, judges, sitting &amp; bail rosters, bar councils, bare acts and daily cause lists — one considered desk.</p>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── SUPREME COURT ── */}
      {tab === 'supreme' && (
        <section className="lx-stack" style={{ gap: 20 }}>
          <div className="lx-between" style={{ flexWrap: 'wrap', gap: 14 }}>
            <div className="lx-field" style={{ height: 40, maxWidth: 300 }}>
              <Ic.Search size={15} />
              <input value={scQ} onChange={(e) => setScQ(e.target.value)} placeholder="Filter by court or judge…" style={{ fontSize: 14 }} />
            </div>
            {causeRows.length === 0 && (
              <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => openExternal('https://www.sci.gov.in/cause-list/')}>
                <Ic.Calendar size={15} /> Official cause list
              </button>
            )}
          </div>

          <div className="lx-card lx-card--pad">
            {scState === 'loading' ? <Loading label="Loading the Supreme Court directory…" />
              : scState.startsWith('error') ? <ErrorState message={errMsg(scState)} onRetry={loadSc} />
              : scRows.length === 0 ? <Empty icon={Ic.Gavel} title="No courtrooms here">{sc.length === 0 ? 'The roster is empty right now.' : 'Nothing matches that search.'}</Empty>
              : (
                <div className="lx-list">
                  {scRows.map((c) => {
                    const hasVc = typeof c.vc_link === 'string' && c.vc_link.startsWith('http');
                    return (
                      <div className="lx-item" key={c.id || c.court_room}>
                        <div className="lx-item__ico"><Ic.Gavel size={18} /></div>
                        <div className="lx-item__body">
                          <div className="lx-item__title">Court {c.court_room}</div>
                          <div className="lx-item__meta">{c.judges || 'Vacant court'}{c.court_master_email ? ` · ${c.court_master_email}` : ''}</div>
                        </div>
                        {hasVc && (
                          <div className="lx-row" style={{ gap: 8 }}>
                            <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => copy(c.vc_link, 'sc' + c.id)}>
                              <Ic.Copy size={14} /> {copied === 'sc' + c.id ? 'Copied' : 'Copy'}
                            </button>
                            <button className="lx-btn lx-btn--primary lx-btn--sm" onClick={() => openExternal(c.vc_link)}>
                              Join court <Ic.Arrow size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </section>
      )}

      {/* ── HIGH COURTS ── */}
      {tab === 'high' && (
        <div className="lx-stack" style={{ gap: 20 }}>
          <div className="lx-field" style={{ height: 40, maxWidth: 340 }}>
            <Ic.Search size={15} />
            <input value={hcQ} onChange={(e) => setHcQ(e.target.value)} placeholder="Search all 25 High Courts…" style={{ fontSize: 14 }} />
          </div>

          <div className="lx-card lx-card--pad">
            {hcListState === 'loading' ? <Loading label="Loading High Courts…" />
              : hcListState.startsWith('error') ? <ErrorState message={errMsg(hcListState)} onRetry={loadHcList} />
              : hcRows.length === 0 ? <Empty title="No courts found">Try a different search term.</Empty>
              : (
                <div className="lx-list">
                  {hcRows.map((c) => (
                    <div className="lx-item" key={c.id} onClick={() => openHighCourt(c)} style={{ cursor: 'pointer' }}>
                      <div className="lx-item__ico"><Ic.Scale size={18} /></div>
                      <div className="lx-item__body">
                        <div className="lx-item__title">{c.name}</div>
                        <div className="lx-item__meta">{c.jurisdiction || 'High Court'}</div>
                      </div>
                      {selectedHc?.id === c.id
                        ? <span className="lx-badge lx-badge--ok">Selected</span>
                        : <Ic.Chevron size={16} />}
                    </div>
                  ))}
                </div>
              )}
          </div>

          {selectedHc && (
            <div className="lx-card lx-card--pad">
              <div className="lx-section-head"><h3>{selectedHc.name}</h3></div>
              {hcDetailState === 'loading' ? <Loading label="Opening the court directory…" />
                : hcDetailState.startsWith('error') ? <ErrorState message={errMsg(hcDetailState)} onRetry={() => openHighCourt(selectedHc)} />
                : !hcDetail.trusted ? (
                  <Empty icon={Ic.Scale} title="Roster not yet published">
                    The judges roster and forms for {selectedHc.name} haven’t been added to the directory yet. Its official portals remain accessible from the eCourts services.
                  </Empty>
                ) : (
                  <div className="lx-stack" style={{ gap: 26 }}>
                    <section>
                      <div className="lx-section-head" style={{ marginBottom: 12 }}>
                        <h3 style={{ fontSize: 15 }}>Judges roster</h3>
                        <span className="lx-item__meta">{hcDetail.judges.length} sitting</span>
                      </div>
                      {hcDetail.judges.length === 0 ? <Empty icon={Ic.Users} title="No roster loaded">This court’s sitting roster isn’t available yet.</Empty> : (
                        <div className="lx-list">
                          {hcDetail.judges.map((j, i) => {
                            const hasVc = typeof j.vc === 'string' && j.vc.startsWith('http');
                            return (
                              <div className="lx-item" key={i}>
                                <div className="lx-item__body">
                                  <div className="lx-item__title">{j.name}</div>
                                  <div className="lx-item__meta">{[j.room, j.email].filter(Boolean).join(' · ') || '—'}</div>
                                </div>
                                {hasVc && (
                                  <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => openExternal(j.vc)}>
                                    <Ic.Link size={14} /> Virtual court
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {hcDetail.forms.length > 0 && (
                      <section>
                        <div className="lx-section-head" style={{ marginBottom: 12 }}><h3 style={{ fontSize: 15 }}>Forms &amp; templates</h3></div>
                        <div className="lx-list">
                          {hcDetail.forms.map((f, i) => (
                            <div className="lx-item" key={i} onClick={() => openExternal(f.url)} style={{ cursor: f.url ? 'pointer' : 'default' }}>
                              <div className="lx-item__ico"><Ic.Doc size={18} /></div>
                              <div className="lx-item__body">
                                <div className="lx-item__title">{f.name}</div>
                                <div className="lx-item__meta">{[f.court, f.cat].filter(Boolean).join(' · ') || 'Template'}</div>
                              </div>
                              {f.url && <Ic.Arrow size={15} />}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* ── JUDGES ── */}
      {tab === 'judges' && (
        <div className="lx-stack" style={{ gap: 20 }}>
          <div className="chip-row">
            <span className={`chip ${jMode === 'national' ? 'is-on' : ''}`} onClick={() => setJMode('national')}>Superior courts</span>
            <span className={`chip ${jMode === 'district' ? 'is-on' : ''}`} onClick={() => setJMode('district')}>District officers</span>
          </div>

          {jMode === 'national' ? (
            <>
              <div className="lx-between" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div className="lx-field" style={{ height: 40, maxWidth: 300 }}>
                  <Ic.Search size={15} />
                  <input value={jQ} onChange={(e) => setJQ(e.target.value)} placeholder="Search by name or designation…" style={{ fontSize: 14 }} />
                </div>
                <select className="inp" style={{ width: 'auto', minWidth: 200 }} value={courtFilter} onChange={(e) => setCourtFilter(e.target.value)}>
                  {courtOptions.map((c) => <option key={c} value={c}>{c === 'All' ? 'All courts' : c}</option>)}
                </select>
              </div>

              <div className="lx-card lx-card--pad">
                {nationalState === 'loading' ? <Loading label="Gathering the judges directory…" />
                  : nationalState.startsWith('error') ? <ErrorState message={errMsg(nationalState)} onRetry={loadNational} />
                  : nationalRows.length === 0 ? <Empty icon={Ic.Users} title="No judges to show">{national.judges.length === 0 ? 'The live sources returned no judges right now.' : 'Nothing matches those filters.'}</Empty>
                  : (
                    <>
                      {national.errors.length > 0 && (
                        <p className="lx-item__meta" style={{ marginBottom: 14 }}>Some sources were slow to respond — this list may be partial.</p>
                      )}
                      <div className="lx-list">
                        {nationalRows.map((j, i) => (
                          <div className="lx-item" key={`${j.court}-${j.name}-${i}`}>
                            <div className="lx-item__body">
                              <div className="lx-item__title">{j.name}</div>
                              <div className="lx-item__meta">{[j.designation, j.term].filter(Boolean).join(' · ') || '—'}</div>
                            </div>
                            {j.court && <span className="lx-badge lx-badge--muted">{j.court}</span>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
              </div>
            </>
          ) : (
            <>
              <select className="inp" style={{ width: 'auto', minWidth: 240, maxWidth: '100%' }} value={distKey} onChange={(e) => setDistKey(e.target.value)}>
                {DISTRICT_COMPLEXES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>

              <div className="lx-card lx-card--pad">
                {distState === 'loading' ? <Loading label="Loading judicial officers…" />
                  : distState.startsWith('error') ? <ErrorState message={errMsg(distState)} onRetry={() => loadDistrict(distKey)} />
                  : distJudges.length === 0 ? <Empty icon={Ic.Users} title="No officers listed">This complex has no roster published right now.</Empty>
                  : (
                    <div className="lx-list">
                      {distJudges.map((j) => {
                        const hasVc = typeof j.vc_link === 'string' && j.vc_link.startsWith('http');
                        return (
                          <div className="lx-item" key={j.id}>
                            <div className="lx-item__body">
                              <div className="lx-item__title">{j.hmj || j.name || 'Judicial officer'}</div>
                              <div className="lx-item__meta">{[j.designation, j.court_room && `Court ${j.court_room}`, j.email_id].filter(Boolean).join(' · ') || '—'}</div>
                            </div>
                            {j.vc_meeting_id && (
                              <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => copy(j.vc_meeting_id, 'd' + j.id)}>
                                <Ic.Copy size={14} /> {copied === 'd' + j.id ? 'Copied' : 'Meeting ID'}
                              </button>
                            )}
                            {hasVc && (
                              <button className="lx-btn lx-btn--primary lx-btn--sm" onClick={() => openExternal(j.vc_link)}>
                                Join <Ic.Arrow size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── BARE ACTS ── */}
      {tab === 'acts' && (
        <div className="lx-stack" style={{ gap: 20 }}>
          <div className="lx-field" style={{ height: 40, maxWidth: 340 }}>
            <Ic.Search size={15} />
            <input value={actQ} onChange={(e) => setActQ(e.target.value)} placeholder="Search bare acts…" style={{ fontSize: 14 }} />
          </div>
          <div className="lx-card lx-card--pad">
            {globalsState === 'loading' ? <Loading label="Loading the statute library…" />
              : globalsState.startsWith('error') ? <ErrorState message={errMsg(globalsState)} onRetry={loadGlobals} />
              : actRows.length === 0 ? <Empty icon={Ic.Doc} title="No acts found">{globals.bare_acts.length === 0 ? 'No statutes are published right now.' : 'Nothing matches that search.'}</Empty>
              : (
                <div className="lx-list">
                  {actRows.map((a, i) => (
                    <div className="lx-item" key={i} onClick={() => openExternal(a.url)} style={{ cursor: a.url ? 'pointer' : 'default' }}>
                      <div className="lx-item__ico"><Ic.Doc size={18} /></div>
                      <div className="lx-item__body"><div className="lx-item__title">{a.name}</div></div>
                      {a.url && <span className="lx-row" style={{ gap: 6, color: 'var(--accent-ink)', fontSize: 12.5, fontWeight: 500 }}>Read <Ic.Arrow size={14} /></span>}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {/* ── CAUSE LISTS ── */}
      {tab === 'causelists' && (
        <div className="lx-card lx-card--pad">
          {globalsState === 'loading' ? <Loading label="Loading cause-list portals…" />
            : globalsState.startsWith('error') ? <ErrorState message={errMsg(globalsState)} onRetry={loadGlobals} />
            : causeRows.length === 0 ? <Empty icon={Ic.Calendar} title="No portals listed">Daily cause-list portals haven’t been published to the directory yet.</Empty>
            : (
              <div className="lx-list">
                {causeRows.map((r, i) => (
                  <div className="lx-item" key={i} onClick={() => openExternal(r.url)} style={{ cursor: 'pointer' }}>
                    <div className="lx-item__ico"><Ic.Calendar size={18} /></div>
                    <div className="lx-item__body">
                      <div className="lx-item__title">{r.label}</div>
                      <div className="lx-item__meta">Daily cause list &amp; board</div>
                    </div>
                    <Ic.Globe size={16} />
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* ── ROSTERS ── */}
      {tab === 'rosters' && (
        <div className="lx-stack" style={{ gap: 20 }}>
          <div className="lx-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="chip-row">
              {rosterCats.map((c) => (
                <span key={c} className={`chip ${rosterCat === c ? 'is-on' : ''}`} onClick={() => setRosterCat(c)} style={{ textTransform: 'capitalize' }}>
                  {c === 'all' ? 'All' : c}
                </span>
              ))}
            </div>
            <div className="lx-field" style={{ height: 40, maxWidth: 280 }}>
              <Ic.Search size={15} />
              <input value={rosterQ} onChange={(e) => setRosterQ(e.target.value)} placeholder="Filter rosters…" style={{ fontSize: 14 }} />
            </div>
          </div>

          <div className="lx-card lx-card--pad">
            {rostersState === 'loading' ? <Loading label="Loading court rosters…" />
              : rostersState.startsWith('error') ? <ErrorState message={errMsg(rostersState)} onRetry={loadRosters} />
              : rosterRows.length === 0 ? <Empty icon={Ic.Calendar} title="No rosters published">{rosters.length === 0 ? 'The latest sitting, bail, duty and vacation rosters appear here once the daily capture has run.' : 'Nothing matches those filters.'}</Empty>
              : (
                <div className="lx-list">
                  {rosterRows.map((r, i) => (
                    <div className="lx-item" key={r.url || i} onClick={() => openExternal(r.url)} style={{ cursor: r.url ? 'pointer' : 'default', alignItems: 'flex-start' }}>
                      <div className="lx-item__ico"><Ic.Doc size={18} /></div>
                      <div className="lx-item__body">
                        <div className="lx-row" style={{ gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          {r.category && <span className="lx-badge lx-badge--muted" style={{ textTransform: 'capitalize' }}>{r.category}</span>}
                          {r.effective_date && <span className="lx-item__meta">w.e.f. {r.effective_date}</span>}
                        </div>
                        <div className="lx-item__title" style={{ whiteSpace: 'normal' }}>{r.title}</div>
                        <div className="lx-item__meta">{r.court}</div>
                      </div>
                      {r.url && <Ic.Arrow size={15} />}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {/* ── BAR COUNCILS ── */}
      {tab === 'bar' && (
        <div className="lx-stack" style={{ gap: 20 }}>
          <div className="lx-field" style={{ height: 40, maxWidth: 340 }}>
            <Ic.Search size={15} />
            <input value={barQ} onChange={(e) => setBarQ(e.target.value)} placeholder="Search bar councils & associations…" style={{ fontSize: 14 }} />
          </div>
          <div className="lx-card lx-card--pad">
            {barsState === 'loading' ? <Loading label="Loading the bar directory…" />
              : barsState.startsWith('error') ? <ErrorState message={errMsg(barsState)} onRetry={loadBars} />
              : barRows.length === 0 ? <Empty icon={Ic.Scale} title="No bodies listed">{bars.length === 0 ? 'The bar directory hasn’t been populated yet. Verified councils and associations appear here once added.' : 'Nothing matches that search.'}</Empty>
              : (
                <div className="lx-list">
                  {barRows.map((b, i) => (
                    <div className="lx-item" key={b.url || i} onClick={() => openExternal(b.url)} style={{ cursor: b.url ? 'pointer' : 'default' }}>
                      <div className="lx-item__ico"><Ic.Scale size={18} /></div>
                      <div className="lx-item__body">
                        <div className="lx-item__title">{b.name}</div>
                        <div className="lx-item__meta">{[b.state, b.phone, b.email].filter(Boolean).join(' · ') || 'Bar body'}</div>
                      </div>
                      {b.kind && <span className="lx-badge lx-badge--muted">{b.kind}</span>}
                      {b.url && <Ic.Arrow size={15} />}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {/* ── LEGAL FEED ── */}
      {tab === 'feed' && (
        <div className="lx-stack" style={{ gap: 20 }}>
          <div className="lx-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="chip-row">
              {eventCats.map((c) => (
                <span key={c} className={`chip ${eventCat === c ? 'is-on' : ''}`} onClick={() => setEventCat(c)} style={{ textTransform: 'capitalize' }}>
                  {c === 'all' ? 'All' : c}
                </span>
              ))}
            </div>
            <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={loadEvents} disabled={eventsState === 'loading'}>
              <Ic.Sparkle size={14} /> Refresh
            </button>
          </div>

          <div className="lx-card lx-card--pad">
            {eventsState === 'loading' ? <Loading label="Pulling the live legal feed…" />
              : eventsState.startsWith('error') ? <ErrorState message={errMsg(eventsState)} onRetry={loadEvents} />
              : eventRows.length === 0 ? <Empty icon={Ic.Bell} title="Nothing in the feed">{events.length === 0 ? 'No updates are available right now.' : `No ${eventCat} items at the moment.`}</Empty>
              : (
                <div className="lx-list">
                  {eventRows.map((e) => (
                    <div className="lx-item" key={e.id} onClick={() => openExternal(e.link)} style={{ cursor: e.link ? 'pointer' : 'default', alignItems: 'flex-start' }}>
                      <div className="lx-item__body">
                        <div className="lx-row" style={{ gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          {e.category && <span className="lx-badge lx-badge--muted" style={{ textTransform: 'capitalize' }}>{e.category}</span>}
                          {e.source && <span className="lx-item__meta">{e.source}</span>}
                          {e.date && <span className="lx-item__meta">· {e.date}</span>}
                        </div>
                        <div className="lx-item__title" style={{ whiteSpace: 'normal' }}>{e.title}</div>
                        {e.description && <div className="lx-item__meta" style={{ whiteSpace: 'normal', marginTop: 4 }}>{e.description}</div>}
                      </div>
                      {e.link && <Ic.Arrow size={15} />}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
