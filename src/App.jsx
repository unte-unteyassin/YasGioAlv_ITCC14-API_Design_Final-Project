import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { api, setToken, getToken, uploadPhoto, WASTE_TYPES, STATUSES, USE_MOCK } from './api.js';

const Auth = createContext(null);
const useAuth = () => useContext(Auth);

function Alert({ error }) {
  if (!error) return null;
  return (
    <div className="alert" role="alert">
      {error.message}
      {error.details && <ul>{[].concat(error.details).map((d, i) => <li key={i}>{typeof d === 'string' ? d : JSON.stringify(d)}</li>)}</ul>}
    </div>
  );
}
const Badge = ({ status }) => <span className={`badge ${status}`}>{status}</span>;
const fmt = (d) => new Date(d).toLocaleString();

function Protected({ admin, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/reports" replace />;
  return children;
}

const Toast = createContext(() => {});
const useToast = () => useContext(Toast);

const Dialog = createContext(() => Promise.resolve(null));
const useDialog = () => useContext(Dialog);

function DialogProvider({ children }) {
  const [d, setD] = useState(null);
  const [val, setVal] = useState('');
  const ask = useCallback((opts) => new Promise((resolve) => { setVal(opts.defaultValue || ''); setD({ ...opts, resolve }); }), []);
  const close = (result) => { d.resolve(result); setD(null); };
  useEffect(() => {
    if (!d) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { d.resolve(null); setD(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [d]);
  return (
    <Dialog.Provider value={ask}>
      {children}
      {d && (
        <div className="modalback" onMouseDown={(e) => { if (e.target === e.currentTarget) close(null); }}>
          <form className="modal" onSubmit={(e) => { e.preventDefault(); close(d.input ? val.trim() : true); }}>
            <h3>{d.title}</h3>
            {d.message && <p>{d.message}</p>}
            {d.input && <input autoFocus required value={val} onChange={(e) => setVal(e.target.value)} onFocus={(e) => e.target.select()} />}
            <div className="modalbtns">
              <button type="button" onClick={() => close(null)}>Cancel</button>
              <button className={d.danger ? 'danger solid' : 'primary'}>{d.confirmText || 'OK'}</button>
            </div>
          </form>
        </div>
      )}
    </Dialog.Provider>
  );
}

function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, type = 'success') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, type }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4500);
  }, []);
  return (
    <Toast.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((i) => <div key={i.id} className={`toast ${i.type}`}>{i.text}</div>)}
      </div>
    </Toast.Provider>
  );
}

function Bell() {
  const { user } = useAuth();
  const toast = useToast();
  const key = `notes_${user.id}`;
  const snapKey = `snap_${user.id}`;
  const [notes, setNotes] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } });
  const [open, setOpen] = useState(false);
  const admin = user.role === 'admin';
  useEffect(() => {
    let stop = false;
    async function check() {
      try {
        const res = await api.reports(admin ? { limit: 100 } : { mine: 'true', limit: 100 });
        const cur = Object.fromEntries(res.data.map((r) => [r.id, r.status]));
        let prev = null;
        try { prev = JSON.parse(localStorage.getItem(snapKey)); } catch { /* ignore */ }
        localStorage.setItem(snapKey, JSON.stringify(cur));
        if (!prev || stop) return;
        const fresh = [];
        for (const r of res.data) {
          if (!(r.id in prev)) {
            if (admin) fresh.push(`A new report was submitted for Laboratory ${r.laboratoryCode}.`);
          } else if (prev[r.id] !== r.status && !admin) {
            fresh.push(`Your report for Laboratory ${r.laboratoryCode} was marked as ${r.status}.`);
          }
        }
        if (fresh.length) {
          const made = fresh.map((text) => ({ id: Date.now() + Math.random(), text, time: new Date().toISOString(), read: false }));
          setNotes((n) => { const next = [...made, ...n].slice(0, 30); localStorage.setItem(key, JSON.stringify(next)); return next; });
          toast(fresh[0], 'info');
        }
      } catch { /* ignore network errors */ }
    }
    check();
    const t = setInterval(check, 15000);
    return () => { stop = true; clearInterval(t); };
  }, [user.id, admin]); // eslint-disable-line react-hooks/exhaustive-deps
  const unread = notes.filter((n) => !n.read).length;
  function toggle() {
    if (!open) return setOpen(true);
    const next = notes.map((n) => ({ ...n, read: true }));
    setNotes(next); localStorage.setItem(key, JSON.stringify(next)); setOpen(false);
  }
  return (
    <div className="bellwrap">
      <button className="bell" onClick={toggle} aria-label="Notifications">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {unread > 0 && <span className="count">{unread}</span>}
      </button>
      {open && (
        <div className="dropdown">
          <h4>Notifications</h4>
          {notes.length === 0 ? <p className="empty">No notifications yet.</p> : notes.map((n) => (
            <div key={n.id} className={`note ${n.read ? '' : 'unread'}`}>{n.text}<small>{fmt(n.time)}</small></div>
          ))}
        </div>
      )}
    </div>
  );
}

function Nav() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <Link to="/" className="brand"><img src="/logo.svg" alt="" />XU EcoLab</Link>
      {user ? (
        <nav className="menu">
          <NavLink end to="/reports" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>Reports</NavLink>
          <NavLink to="/reports/new" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>New Report</NavLink>
          {user.role === 'admin' && <NavLink to="/laboratories" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>Laboratories</NavLink>}
          <Bell />
          <span className="who">
            <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
            <span className="whotext"><b>{user.name}</b><small>{user.role === 'admin' ? 'Administrator' : 'User'}</small></span>
          </span>
          <button className="logout" onClick={logout}>Log out</button>
        </nav>
      ) : (
        <nav className="authnav"><Link className="btn" to="/login">Log in</Link><Link className="btn primary" to="/register">Register</Link></nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <div className="hero">
      <div className="brandrow">
        <img className="xulogo" src="/xu-logo.png" alt="Xavier University - Ateneo de Cagayan" />
        <img className="herologo" src="/logo.svg" alt="XU EcoLab logo" />
      </div>
      <h1>XU EcoLab</h1>
      <p className="tag">Energy waste reporter for Computer Studies Laboratories</p>
      <p>Report computers, air conditioners and lights left running, and help Xavier University reduce unnecessary energy use.</p>
      <div className="facts">
        <div><strong>SDG 13</strong><span>Climate Action, Target 13.3</span></div>
        <div><strong>6 laboratories</strong><span>Laboratories A to F</span></div>
        <div><strong>3 steps</strong><span>Pending, Verified, Resolved</span></div>
      </div>
      <ol className="steps">
        <li>Submit a report with the laboratory, waste type and an optional photo.</li>
        <li>A laboratory technician verifies the report.</li>
        <li>The report is marked resolved once the problem is fixed.</li>
      </ol>
    </div>
  );
}

function Aside() {
  return (
    <aside className="card side">
      <h3>How it works</h3>
      <p>Submit a report, wait for a laboratory technician to verify it, and follow it until it is resolved.</p>
      <h3>Statuses</h3>
      <p><Badge status="pending" /> Waiting for review</p>
      <p><Badge status="verified" /> Confirmed by a technician</p>
      <p><Badge status="resolved" /> Problem fixed</p>
      <h3>Waste types</h3>
      <p>{Object.values(WASTE_TYPES).join(', ')}</p>
    </aside>
  );
}

function AuthForm({ mode }) {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const reg = mode === 'register';
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      if (reg) await api.register(f);
      const res = await api.login({ email: f.email, password: f.password });
      await signIn(res.token);
      nav('/reports');
    } catch (err) { setError(err); }
  }
  return (
    <div className="split">
    <Hero />
    <form className="card narrow" onSubmit={submit}>
      <h2>{reg ? 'Create an Account' : 'Log In'}</h2>
      <Alert error={error} />
      {reg && <label>Full name<input required value={f.name} onChange={set('name')} /></label>}
      <label>Email<input type="email" required value={f.email} onChange={set('email')} /></label>
      <label>Password<input type="password" required minLength={reg ? 8 : 1} value={f.password} onChange={set('password')} /></label>
      <button className="primary">{reg ? 'Register' : 'Log in'}</button>
      <p className="swap">{reg ? <>Already registered? <Link to="/login">Log in</Link></> : <>No account yet? <Link to="/register">Register</Link></>}</p>
    </form>
    </div>
  );
}

function Reports() {
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [filters, setFilters] = useState({ status: '', wasteType: '', laboratoryCode: '', mine: '' });
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], total: 0, limit: 10 });
  const [error, setError] = useState(null);
  useEffect(() => { api.laboratories().then(setLabs).catch(() => {}); }, []);
  useEffect(() => {
    api.reports({ ...filters, page, limit: 10 }).then(setRes).catch(setError);
  }, [filters, page]);
  const set = (k) => (e) => { setPage(1); setFilters({ ...filters, [k]: e.target.value }); };
  const pages = Math.max(1, Math.ceil(res.total / (res.limit || 10)));
  return (
    <div className="withSide">
    <section>
      <h2>Energy Waste Reports</h2>
      <Alert error={error} />
      <div className="filters">
        <select value={filters.status} onChange={set('status')}>
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.wasteType} onChange={set('wasteType')}>
          <option value="">All waste types</option>
          {Object.entries(WASTE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.laboratoryCode} onChange={set('laboratoryCode')}>
          <option value="">All laboratories</option>
          {labs.map((l) => <option key={l.laboratoryCode} value={l.laboratoryCode}>{l.name}</option>)}
        </select>
        <select value={filters.mine} onChange={set('mine')}>
          <option value="">All reports</option><option value="true">My reports</option>
        </select>
      </div>
      {res.data.length === 0 ? <p>No reports found.</p> : (
        <div className="tablewrap">
        <table>
          <thead><tr><th>Laboratory</th><th>Waste type</th><th>Description</th><th>Status</th><th>Submitted</th><th /></tr></thead>
          <tbody>
            {res.data.map((r) => (
              <tr key={r.id}>
                <td>{r.laboratoryCode}</td><td>{WASTE_TYPES[r.wasteType]}</td>
                <td>{r.description}</td><td><Badge status={r.status} /></td><td>{fmt(r.createdAt)}</td>
                <td><Link to={`/reports/${r.id}`}>{r.userId === user.id ? 'Manage' : 'View'}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      <div className="pager">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </section>
    <Aside />
    </div>
  );
}

function SendAnimation({ lab, onDone }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf; let timer;
    const tick = (now) => {
      const v = Math.min(1, (now - t0) / 2400);
      setP(v);
      if (v < 1) raf = requestAnimationFrame(tick); else timer = setTimeout(onDone, 900);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const path = 'M90 200 C 190 10, 410 10, 510 150';
  return (
    <div className="sendfx" role="status">
      <div className="sendbox">
        <svg viewBox="0 0 600 260" className="sendsvg">
          <path d={path} className="trail" />
          <g className="from"><circle cx="90" cy="200" r="26" /><text x="90" y="206" textAnchor="middle">You</text></g>
          <g className="to">
            <circle className="pulse" cx="510" cy="150" r="30" />
            <circle className="dot" cx="510" cy="150" r="30" />
            <text x="510" y="156" textAnchor="middle">{lab}</text>
          </g>
          <g className="plane">
            <path d="M0 0 L-22 -11 L-14 0 L-22 11 Z" />
            <animateMotion dur="1.7s" begin="0.2s" fill="freeze" rotate="auto" path={path} />
          </g>
        </svg>
        <h3>{p < 1 ? 'Sending your report…' : `Delivered to Laboratory ${lab}`}</h3>
        <div className="sendbar"><i style={{ transform: `scaleX(${p})` }} /></div>
        <small>{Math.round(p * 100)}%</small>
      </div>
    </div>
  );
}

function ReportForm({ edit }) {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [labs, setLabs] = useState([]);
  const [f, setF] = useState({ laboratoryCode: '', wasteType: 'pc_monitor', description: '', photoUrl: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api.laboratories().then(setLabs).catch(setError);
    if (edit) api.report(id).then((r) => setF({ laboratoryCode: r.laboratoryCode, wasteType: r.wasteType, description: r.description, photoUrl: r.photoUrl || '' })).catch(setError);
  }, [edit, id]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const body = { ...f };
      if (file) body.photoUrl = await uploadPhoto(file);
      if (!body.photoUrl) delete body.photoUrl;
      const saved = edit ? await api.updateReport(id, body) : await api.createReport(body);
      if (edit) { toast('Your report was updated successfully.'); nav(`/reports/${saved.id || id}`); }
      else setSending({ code: body.laboratoryCode, id: saved.id });
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  return (
    <>
    {sending && <SendAnimation lab={sending.code} onDone={() => { toast('Your report was submitted successfully.'); nav(`/reports/${sending.id}`); }} />}
    <form className="card narrow" onSubmit={submit}>
      <h2>{edit ? 'Edit Report' : 'Submit a Report'}</h2>
      <Alert error={error} />
      <label>Laboratory
        <select required value={f.laboratoryCode} onChange={set('laboratoryCode')}>
          <option value="">Select a laboratory</option>
          {labs.map((l) => <option key={l.laboratoryCode} value={l.laboratoryCode}>{l.laboratoryCode} – {l.name}</option>)}
        </select>
      </label>
      <label>Waste type
        <select value={f.wasteType} onChange={set('wasteType')}>
          {Object.entries(WASTE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label>Description<textarea required rows={4} value={f.description} onChange={set('description')} /></label>
      <label>Photo (optional)<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} /></label>
      {f.photoUrl && !file && <img className="thumb" src={f.photoUrl} alt="Current report" />}
      <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
    </>
  );
}

function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const ask = useDialog();
  const [r, setR] = useState(null);
  const [hist, setHist] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    api.report(id).then(setR).catch(setError);
    api.history(id).then((h) => setHist(Array.isArray(h) ? h : h.data || [])).catch(() => {});
  }, [id]);
  useEffect(load, [load]);
  if (!r) return <Alert error={error} />;
  const own = r.userId === user.id;
  const next = r.status === 'pending' ? 'verified' : r.status === 'verified' ? 'resolved' : null;
  async function remove() {
    if (!(await ask({ title: 'Delete report', message: 'This report will be permanently deleted. This cannot be undone.', danger: true, confirmText: 'Delete' }))) return;
    try { await api.deleteReport(id); toast('Report deleted.'); nav('/reports'); } catch (err) { setError(err); }
  }
  async function advance(e) {
    e.preventDefault(); setError(null);
    try { await api.changeStatus(id, { status: next, note }); toast(`Report marked as ${next}.`); setNote(''); load(); } catch (err) { setError(err); }
  }
  return (
    <section className="card">
      <h2>Laboratory {r.laboratoryCode} <Badge status={r.status} /></h2>
      <Alert error={error} />
      <p><strong>{WASTE_TYPES[r.wasteType]}</strong> · submitted {fmt(r.createdAt)}</p>
      <p>{r.description}</p>
      {r.photoUrl && <img className="photo" src={r.photoUrl} alt="Report" />}
      <div className="actions">
        {own && r.status === 'pending' && <Link className="btn" to={`/reports/${id}/edit`}>Edit</Link>}
        {(user.role === 'admin' || (own && r.status === 'pending')) && <button className="danger" onClick={remove}>Delete</button>}
      </div>
      {user.role === 'admin' && next && (
        <form onSubmit={advance} className="statusForm">
          <label>Note (required)<input required value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button className="primary">Mark as {next}</button>
        </form>
      )}
      <h3>Status history</h3>
      {hist.length === 0 ? <p>No status changes yet.</p> : (
        <ul>{hist.map((h) => <li key={h.id}>{fmt(h.createdAt)}: {h.oldStatus} → {h.newStatus}{h.note ? ` — ${h.note}` : ''}</li>)}</ul>
      )}
    </section>
  );
}

function Laboratories() {
  const toast = useToast();
  const ask = useDialog();
  const [labs, setLabs] = useState([]);
  const [f, setF] = useState({ laboratoryCode: '', name: '', building: '', floor: '' });
  const [error, setError] = useState(null);
  const load = () => api.laboratories().then(setLabs).catch(setError);
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function add(e) {
    e.preventDefault(); setError(null);
    try { await api.createLab({ ...f, floor: Number(f.floor) }); setF({ laboratoryCode: '', name: '', building: '', floor: '' }); toast('Laboratory added.'); load(); } catch (err) { setError(err); }
  }
  async function rename(l) {
    const name = await ask({ title: 'Rename laboratory', message: `Enter a new name for Laboratory ${l.laboratoryCode}.`, input: true, defaultValue: l.name, confirmText: 'Save' });
    if (!name) return;
    try { await api.updateLab(l.laboratoryCode, { name, building: l.building, floor: l.floor }); toast('Laboratory updated.'); load(); } catch (err) { setError(err); }
  }
  async function remove(l) {
    if (!(await ask({ title: 'Delete laboratory', message: `Laboratory ${l.laboratoryCode} will be permanently deleted. This cannot be undone.`, danger: true, confirmText: 'Delete' }))) return;
    try { await api.deleteLab(l.laboratoryCode); toast('Laboratory deleted.'); load(); } catch (err) { setError(err); }
  }
  return (
    <section className="labpage">
      <h2>Manage Laboratories</h2>
      <Alert error={error} />
      <div className="tablewrap">
      <table>
        <thead><tr><th>Code</th><th>Name</th><th>Building</th><th>Floor</th><th /></tr></thead>
        <tbody>{labs.map((l) => (
          <tr key={l.laboratoryCode}><td>{l.laboratoryCode}</td><td>{l.name}</td><td>{l.building}</td><td>{l.floor}</td>
            <td><button onClick={() => rename(l)}>Rename</button> <button className="danger" onClick={() => remove(l)}>Delete</button></td></tr>
        ))}</tbody>
      </table>
      </div>
      <form className="card inline" onSubmit={add}>
        <h3>Add a laboratory</h3>
        <input required placeholder="Code (e.g. A)" value={f.laboratoryCode} onChange={set('laboratoryCode')} />
        <input required placeholder="Name" value={f.name} onChange={set('name')} />
        <input required placeholder="Building" value={f.building} onChange={set('building')} />
        <input required type="number" placeholder="Floor" value={f.floor} onChange={set('floor')} />
        <button className="primary">Add</button>
      </form>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const signIn = async (token) => { setToken(token); setUser(await api.me()); };
  const logout = () => { setToken(null); setUser(null); window.location.hash = '#/login'; };
  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api.me().then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  return (
    <Auth.Provider value={{ user, ready, signIn, logout }}>
      <ToastProvider>
      <DialogProvider>
      <Nav />
      {USE_MOCK && <div className="demo">Demonstration mode: no server connected. Admin: admin@xu.edu.ph / admin12345 · User: student@xu.edu.ph / student12345</div>}
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/reports" replace />} />
          <Route path="/login" element={<AuthForm mode="login" />} />
          <Route path="/register" element={<AuthForm mode="register" />} />
          <Route path="/reports" element={<Protected><Reports /></Protected>} />
          <Route path="/reports/new" element={<Protected><ReportForm /></Protected>} />
          <Route path="/reports/:id" element={<Protected><ReportDetail /></Protected>} />
          <Route path="/reports/:id/edit" element={<Protected><ReportForm edit /></Protected>} />
          <Route path="/laboratories" element={<Protected admin><Laboratories /></Protected>} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      <footer className="foot">XU EcoLab · Xavier University – Ateneo de Cagayan · SDG 13: Climate Action</footer>
      </DialogProvider>
      </ToastProvider>
    </Auth.Provider>
  );
}
