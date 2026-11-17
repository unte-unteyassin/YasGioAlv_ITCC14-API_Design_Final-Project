import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom';
import { api, setToken, getToken, uploadPhoto, WASTE_TYPES, STATUSES } from './api.js';

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

function Nav() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <Link to="/" className="brand"><img src="/logo.svg" alt="" />XU EcoLab</Link>
      {user ? (
        <nav>
          <Link to="/reports">Reports</Link>
          <Link to="/reports/new">New Report</Link>
          {user.role === 'admin' && <Link to="/laboratories">Laboratories</Link>}
          <span className="who">{user.name} ({user.role})</span>
          <button onClick={logout}>Log out</button>
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
      <img className="herologo" src="/logo.svg" alt="XU EcoLab logo" />
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

function ReportForm({ edit }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [labs, setLabs] = useState([]);
  const [f, setF] = useState({ laboratoryCode: '', wasteType: 'pc_monitor', description: '', photoUrl: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
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
      nav(`/reports/${saved.id || id}`);
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  return (
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
  );
}

function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
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
    if (!window.confirm('Delete this report?')) return;
    try { await api.deleteReport(id); nav('/reports'); } catch (err) { setError(err); }
  }
  async function advance(e) {
    e.preventDefault(); setError(null);
    try { await api.changeStatus(id, { status: next, note }); setNote(''); load(); } catch (err) { setError(err); }
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
  const [labs, setLabs] = useState([]);
  const [f, setF] = useState({ laboratoryCode: '', name: '', building: '', floor: '' });
  const [error, setError] = useState(null);
  const load = () => api.laboratories().then(setLabs).catch(setError);
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function add(e) {
    e.preventDefault(); setError(null);
    try { await api.createLab({ ...f, floor: Number(f.floor) }); setF({ laboratoryCode: '', name: '', building: '', floor: '' }); load(); } catch (err) { setError(err); }
  }
  async function rename(l) {
    const name = window.prompt('New name for this laboratory:', l.name);
    if (!name) return;
    try { await api.updateLab(l.laboratoryCode, { name, building: l.building, floor: l.floor }); load(); } catch (err) { setError(err); }
  }
  async function remove(l) {
    if (!window.confirm(`Delete laboratory ${l.laboratoryCode}?`)) return;
    try { await api.deleteLab(l.laboratoryCode); load(); } catch (err) { setError(err); }
  }
  return (
    <section>
      <h2>Manage Laboratories</h2>
      <Alert error={error} />
      <table>
        <thead><tr><th>Code</th><th>Name</th><th>Building</th><th>Floor</th><th /></tr></thead>
        <tbody>{labs.map((l) => (
          <tr key={l.laboratoryCode}><td>{l.laboratoryCode}</td><td>{l.name}</td><td>{l.building}</td><td>{l.floor}</td>
            <td><button onClick={() => rename(l)}>Rename</button> <button className="danger" onClick={() => remove(l)}>Delete</button></td></tr>
        ))}</tbody>
      </table>
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
      <Nav />
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
    </Auth.Provider>
  );
}
