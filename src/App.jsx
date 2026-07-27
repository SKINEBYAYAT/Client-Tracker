import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Calendar, X, Trash2, Phone, ChevronLeft, ChevronRight, LogOut, Pencil } from "lucide-react";
import { supabase } from "./supabaseClient";

function useFonts() {
  useEffect(() => {
    const id = "ct-fonts-v2";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

const todayStr = () => new Date().toISOString().slice(0, 10);

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
function daysUntil(d) {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(d + "T00:00:00") - today) / 86400000);
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

const INK = "#1E1E1C";
const PAPER = "#FAF8F3";
const CARD = "#FFFFFF";
const LINE = "#E1DCCF";
const MUTED = "#8A8478";
const STAMP = "#B33A2E";
const STAMP_BG = "#F7E9E6";

export default function App() {
  useFonts();
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }
  if (!session) {
    return <LoginScreen />;
  }
  return <ClientTracker />;
}

function CenteredMessage({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: PAPER, color: MUTED, fontFamily: "'Inter', sans-serif" }}>
      {children}
    </div>
  );
}

// ---------------- LOGIN ----------------
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: PAPER, fontFamily: "'Inter', sans-serif", padding: 20 }}>
      <form onSubmit={signIn} style={{ width: "100%", maxWidth: 340 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", color: MUTED, textAlign: "center", marginBottom: 4 }}>
          CLIENT LOG
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, textAlign: "center", margin: "0 0 24px", color: INK }}>Sign in</h1>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "12px 13px", borderRadius: 12, border: `1.5px solid ${LINE}`, fontSize: 15.5, marginBottom: 14, background: CARD }}
        />
        <label style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "12px 13px", borderRadius: 12, border: `1.5px solid ${LINE}`, fontSize: 15.5, marginBottom: 18, background: CARD }}
        />
        {error && <div style={{ color: STAMP, fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: INK, color: PAPER, fontWeight: 700, fontSize: 15.5, cursor: "pointer" }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

// ---------------- MAIN APP ----------------
function ClientTracker() {
  const [clients, setClients] = useState([]);
  const [visitsByClient, setVisitsByClient] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [screen, setScreen] = useState("list");
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setError("");
    const { data: clientRows, error: cErr } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    if (cErr) {
      setError("Couldn't load clients: " + cErr.message);
      setLoaded(true);
      return;
    }
    setClients(clientRows || []);
    const { data: visitRows, error: vErr } = await supabase.from("visits").select("*").order("visit_date", { ascending: false });
    if (vErr) {
      setError("Couldn't load visits: " + vErr.message);
      setLoaded(true);
      return;
    }
    const map = {};
    (clientRows || []).forEach((c) => (map[c.id] = []));
    (visitRows || []).forEach((v) => {
      if (!map[v.client_id]) map[v.client_id] = [];
      map[v.client_id].push({
        id: v.id,
        date: v.visit_date,
        services: v.services || [],
        nextDate: v.next_date,
        notes: v.notes,
      });
    });
    setVisitsByClient(map);
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openClient = (id) => {
    setSelectedId(id);
    setScreen("detail");
  };

  const addClient = async (data) => {
    const { data: row, error } = await supabase
      .from("clients")
      .insert({ name: data.name.trim(), phone: data.phone.trim(), notes: data.notes.trim() })
      .select()
      .single();
    if (error) {
      setError("Couldn't save client: " + error.message);
      return;
    }
    setClients((prev) => [row, ...prev]);
    setVisitsByClient((prev) => ({ ...prev, [row.id]: [] }));
    setSheet(null);
    openClient(row.id);
  };

  const updateClient = async (id, data) => {
    const { data: row, error } = await supabase
      .from("clients")
      .update({ name: data.name.trim(), phone: data.phone.trim(), notes: data.notes.trim() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      setError("Couldn't update client: " + error.message);
      return;
    }
    setClients((prev) => prev.map((c) => (c.id === id ? row : c)));
    setSheet(null);
  };

  const deleteClient = async (id) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      setError("Couldn't delete client: " + error.message);
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== id));
    setVisitsByClient((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setScreen("list");
  };

  const addVisit = async (clientId, visit) => {
    const { data: row, error } = await supabase
      .from("visits")
      .insert({
        client_id: clientId,
        visit_date: visit.date,
        services: visit.services,
        next_date: visit.nextDate || null,
        notes: visit.notes,
      })
      .select()
      .single();
    if (error) {
      setError("Couldn't save visit: " + error.message);
      return;
    }
    const newVisit = { id: row.id, date: row.visit_date, services: row.services, nextDate: row.next_date, notes: row.notes };
    setVisitsByClient((prev) => {
      const updated = [newVisit, ...(prev[clientId] || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
      return { ...prev, [clientId]: updated };
    });
    setSheet(null);
  };

  const updateVisit = async (clientId, visitId, visit) => {
    const { data: row, error } = await supabase
      .from("visits")
      .update({
        visit_date: visit.date,
        services: visit.services,
        next_date: visit.nextDate || null,
        notes: visit.notes,
      })
      .eq("id", visitId)
      .select()
      .single();
    if (error) {
      setError("Couldn't update visit: " + error.message);
      return;
    }
    const updatedVisit = { id: row.id, date: row.visit_date, services: row.services, nextDate: row.next_date, notes: row.notes };
    setVisitsByClient((prev) => {
      const updated = (prev[clientId] || [])
        .map((v) => (v.id === visitId ? updatedVisit : v))
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      return { ...prev, [clientId]: updated };
    });
    setSheet(null);
    setEditingVisit(null);
  };

  const deleteVisit = async (clientId, visitId) => {
    const { error } = await supabase.from("visits").delete().eq("id", visitId);
    if (error) {
      setError("Couldn't delete visit: " + error.message);
      return;
    }
    setVisitsByClient((prev) => ({ ...prev, [clientId]: (prev[clientId] || []).filter((v) => v.id !== visitId) }));
  };

  const selected = clients.find((c) => c.id === selectedId) || null;
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: PAPER,
        color: INK,
        minHeight: "100vh",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: "0 0 40px #0000000d",
      }}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        button { font-family: inherit; }
        button:active { transform: scale(0.97); }
        input:focus, textarea:focus { outline: none; border-color: ${INK} !important; }
        .tap { transition: transform 0.08s ease; }
      `}</style>

      {error && <div style={{ background: STAMP_BG, color: STAMP, padding: "8px 20px", fontSize: 12.5, fontWeight: 500 }}>{error}</div>}

      {screen === "list" && (
        <ListScreen
          clients={filtered}
          visitsByClient={visitsByClient}
          query={query}
          setQuery={setQuery}
          onOpen={openClient}
          onNew={() => setSheet("newClient")}
          loaded={loaded}
          totalCount={clients.length}
        />
      )}

      {screen === "detail" && selected && (
        <DetailScreen
          client={selected}
          visits={visitsByClient[selected.id] || []}
          onBack={() => setScreen("list")}
          onEdit={() => setSheet("editClient")}
          onDelete={() => deleteClient(selected.id)}
          onNewVisit={() => setSheet("newVisit")}
          onEditVisit={(v) => {
            setEditingVisit(v);
            setSheet("editVisit");
          }}
          onDeleteVisit={(vid) => deleteVisit(selected.id, vid)}
        />
      )}

      {sheet === "newClient" && <NewClientSheet onClose={() => setSheet(null)} onSave={addClient} />}
      {sheet === "editClient" && selected && (
        <EditClientSheet client={selected} onClose={() => setSheet(null)} onSave={(data) => updateClient(selected.id, data)} />
      )}
      {sheet === "newVisit" && selected && (
        <NewVisitSheet clientName={selected.name} onClose={() => setSheet(null)} onSave={(v) => addVisit(selected.id, v)} />
      )}
      {sheet === "editVisit" && selected && editingVisit && (
        <EditVisitSheet
          clientName={selected.name}
          visit={editingVisit}
          onClose={() => {
            setSheet(null);
            setEditingVisit(null);
          }}
          onSave={(v) => updateVisit(selected.id, editingVisit.id, v)}
        />
      )}
    </div>
  );
}

// ---------------- LIST SCREEN ----------------
function ListScreen({ clients, visitsByClient, query, setQuery, onOpen, onNew, loaded, totalCount }) {
  const signOut = () => supabase.auth.signOut();
  return (
    <>
      <div style={{ padding: "20px 20px 12px", borderBottom: `1px solid ${LINE}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", color: MUTED, fontWeight: 500 }}>
            CLIENT LOG · {totalCount}
          </div>
          <button onClick={signOut} className="tap" style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED, display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "2px 0 14px", letterSpacing: "-0.02em" }}>Clients</h1>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: MUTED }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            style={{ width: "100%", padding: "11px 12px 11px 36px", borderRadius: 10, border: `1.5px solid ${LINE}`, background: CARD, fontSize: 15 }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px 100px" }}>
        {!loaded && <div style={{ padding: 20, fontSize: 14, color: MUTED }}>Loading…</div>}
        {loaded && clients.length === 0 && (
          <div style={{ padding: "40px 16px", textAlign: "center", color: MUTED, fontSize: 14.5, lineHeight: 1.6 }}>
            {totalCount === 0 ? (
              <>No clients yet.<br />Tap <strong style={{ color: INK }}>+ New client</strong> below to add your first one.</>
            ) : (
              "No matches."
            )}
          </div>
        )}
        {clients.map((c) => {
          const visits = visitsByClient[c.id] || [];
          const last = visits[0];
          const next = visits.find((v) => v.nextDate && daysUntil(v.nextDate) >= 0);
          const nd = next ? daysUntil(next.nextDate) : null;
          return (
            <button
              key={c.id}
              onClick={() => onOpen(c.id)}
              className="tap"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 12px", marginBottom: 8, borderRadius: 14, border: `1px solid ${LINE}`, background: CARD, textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: INK, color: PAPER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                {initials(c.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: INK }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: MUTED, marginTop: 1 }}>{last ? `Last visit ${fmtDate(last.date)}` : "No visits logged"}</div>
              </div>
              {nd !== null && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: STAMP, background: STAMP_BG, padding: "4px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>
                  {nd === 0 ? "TODAY" : `${nd}D`}
                </div>
              )}
              <ChevronRight size={16} color={MUTED} />
            </button>
          );
        })}
      </div>

      <BottomBar>
        <button onClick={onNew} className="tap" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "15px 0", borderRadius: 14, border: "none", background: INK, color: PAPER, fontSize: 15.5, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={18} /> New client
        </button>
      </BottomBar>
    </>
  );
}

// ---------------- DETAIL SCREEN ----------------
function DetailScreen({ client, visits, onBack, onEdit, onDelete, onNewVisit, onEditVisit, onDeleteVisit }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <>
      <div style={{ padding: "14px 16px 14px", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onBack} className="tap" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 6, marginLeft: -6 }}>
          <ChevronLeft size={22} color={INK} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{client.name}</div>
          {client.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: MUTED }}>
              <Phone size={11} /> {client.phone}
            </div>
          )}
        </div>
        <button onClick={onEdit} className="tap" style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED, padding: 6 }}>
          <Pencil size={16} />
        </button>
        <button onClick={() => setConfirmDelete(true)} className="tap" style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED, padding: 6 }}>
          <Trash2 size={17} />
        </button>
      </div>

      {client.notes && <div style={{ padding: "12px 20px 0", fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{client.notes}</div>}

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 110px" }}>
        {visits.length === 0 && <div style={{ textAlign: "center", color: MUTED, fontSize: 14, padding: "40px 20px" }}>No visits logged yet.</div>}
        {visits.map((v) => (
          <VisitTicket key={v.id} visit={v} onEdit={() => onEditVisit(v)} onDelete={() => onDeleteVisit(v.id)} />
        ))}
      </div>

      <BottomBar>
        <button onClick={onNewVisit} className="tap" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "15px 0", borderRadius: 14, border: "none", background: INK, color: PAPER, fontSize: 15.5, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={18} /> Log a visit
        </button>
      </BottomBar>

      {confirmDelete && (
        <ConfirmSheet
          title={`Delete ${client.name}?`}
          body="This removes the client and their full visit history from the database. This can't be undone."
          onCancel={() => setConfirmDelete(false)}
          onConfirm={onDelete}
        />
      )}
    </>
  );
}

function VisitTicket({ visit, onEdit, onDelete }) {
  return (
    <div style={{ background: CARD, border: `1px dashed ${LINE}`, borderRadius: 12, padding: "14px 14px", marginBottom: 12, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, fontWeight: 700, color: INK }}>{fmtDate(visit.date)}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onEdit} className="tap" style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED }}>
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="tap" style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED }}>
            <X size={14} />
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {visit.services.map((s, i) => (
          <span key={i} style={{ fontSize: 12.5, background: PAPER, border: `1px solid ${LINE}`, padding: "3px 9px", borderRadius: 999, color: INK }}>
            {s}
          </span>
        ))}
      </div>
      {visit.notes && <div style={{ fontSize: 13, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>{visit.notes}</div>}
      {visit.nextDate && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 700, color: STAMP, background: STAMP_BG, padding: "5px 10px", borderRadius: 8, transform: "rotate(-1deg)" }}>
          <Calendar size={12} /> NEXT · {fmtDate(visit.nextDate)}
        </div>
      )}
    </div>
  );
}

// ---------------- SHARED ----------------
function BottomBar({ children }) {
  return (
    <div style={{ position: "sticky", bottom: 0, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", background: `linear-gradient(${PAPER}00, ${PAPER} 30%)` }}>
      {children}
    </div>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "flex-end", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: PAPER, borderRadius: "20px 20px 0 0", padding: "10px 20px calc(20px + env(safe-area-inset-bottom))", width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: LINE, borderRadius: 4, margin: "4px auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: INK }}>{title}</h3>
          <button onClick={onClose} className="tap" style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED }}>
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmSheet({ title, body, onCancel, onConfirm }) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.5, marginTop: 0 }}>{body}</p>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onCancel} className="tap" style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: `1.5px solid ${LINE}`, background: CARD, fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={onConfirm} className="tap" style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: STAMP, color: "#fff", fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}>
          Delete
        </button>
      </div>
    </Sheet>
  );
}

const fieldStyle = { width: "100%", padding: "12px 13px", borderRadius: 12, border: `1.5px solid ${LINE}`, fontSize: 15.5, background: CARD, fontFamily: "'Inter', sans-serif", color: INK };
const labelStyle = { fontSize: 12.5, fontWeight: 600, color: MUTED, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" };

function PrimaryButton({ children, disabled, onClick }) {
  return (
    <button disabled={disabled} onClick={onClick} className="tap" style={{ width: "100%", marginTop: 4, padding: "14px 0", borderRadius: 12, border: "none", background: disabled ? LINE : INK, color: disabled ? MUTED : PAPER, fontWeight: 700, fontSize: 15.5, cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}

function NewClientSheet({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const canSave = name.trim().length > 0;
  return (
    <Sheet title="New client" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Phone · optional</label>
          <input style={fieldStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+961 ..." type="tel" />
        </div>
        <div>
          <label style={labelStyle}>Notes · optional</label>
          <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: 64 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Skin type, allergies, preferences..." />
        </div>
        <PrimaryButton disabled={!canSave} onClick={() => onSave({ name, phone, notes })}>
          Save client
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function EditClientSheet({ client, onClose, onSave }) {
  const [name, setName] = useState(client.name || "");
  const [phone, setPhone] = useState(client.phone || "");
  const [notes, setNotes] = useState(client.notes || "");
  const canSave = name.trim().length > 0;
  return (
    <Sheet title="Edit client" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Phone · optional</label>
          <input style={fieldStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+961 ..." type="tel" />
        </div>
        <div>
          <label style={labelStyle}>Notes · optional</label>
          <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: 64 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Skin type, allergies, preferences..." />
        </div>
        <PrimaryButton disabled={!canSave} onClick={() => onSave({ name, phone, notes })}>
          Save changes
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function EditVisitSheet({ clientName, visit, onClose, onSave }) {
  const [date, setDate] = useState(visit.date || todayStr());
  const [serviceInput, setServiceInput] = useState("");
  const [services, setServices] = useState(visit.services || []);
  const [nextDate, setNextDate] = useState(visit.nextDate || "");
  const [notes, setNotes] = useState(visit.notes || "");

  const addService = () => {
    const s = serviceInput.trim();
    if (s) {
      setServices((prev) => [...prev, s]);
      setServiceInput("");
    }
  };
  const canSave = date && services.length > 0;

  return (
    <Sheet title="Edit visit" onClose={onClose}>
      <div style={{ fontSize: 13, color: MUTED, marginTop: -8, marginBottom: 14 }}>{clientName}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Date of visit</label>
          <input type="date" style={fieldStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Services performed</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={fieldStyle}
              value={serviceInput}
              onChange={(e) => setServiceInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
              placeholder="e.g. HydraFacial"
            />
            <button onClick={addService} type="button" className="tap" style={{ padding: "0 18px", borderRadius: 12, border: "none", background: INK, color: PAPER, fontWeight: 600, cursor: "pointer" }}>
              Add
            </button>
          </div>
          {services.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {services.map((s, i) => (
                <span key={i} style={{ fontSize: 13, background: CARD, border: `1px solid ${LINE}`, padding: "5px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 6 }}>
                  {s}
                  <X size={12} style={{ cursor: "pointer" }} onClick={() => setServices((prev) => prev.filter((_, idx) => idx !== i))} />
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Next scheduled date · optional</label>
          <input type="date" style={fieldStyle} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Notes · optional</label>
          <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: 56 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <PrimaryButton disabled={!canSave} onClick={() => onSave({ date, services, nextDate, notes })}>
          Save changes
        </PrimaryButton>
        {!canSave && <div style={{ fontSize: 12, color: STAMP, textAlign: "center" }}>Add a date and at least one service.</div>}
      </div>
    </Sheet>
  );
}

