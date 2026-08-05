import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, Calendar, X, Trash2, Phone, ChevronLeft, ChevronRight, LogOut, Pencil, Users } from "lucide-react";
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
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}
// Reusable scheduling utility — returns first conflicting visit or null.
// Appointments = (next scheduled date, appointment time). Only visits whose
// NEXT scheduled date matches the given date are compared — never other dates.
// Extensible: add staff, room, or duration params here in future.
function checkConflict(allVisitsFlat, appointmentDate, timeStr, excludeVisitId = null) {
  if (!appointmentDate || !timeStr) return null;
  // Normalize dates to plain YYYY-MM-DD so only same-date appointments are compared
  const targetDate = String(appointmentDate).slice(0, 10);
  const [newH, newM] = timeStr.split(":").map(Number);
  const newMinutes = newH * 60 + newM;
  for (const v of allVisitsFlat) {
    if (excludeVisitId && v.id === excludeVisitId) continue;
    if (!v.nextDate || String(v.nextDate).slice(0, 10) !== targetDate) continue;
    if (!v.appointmentTime) continue;
    const t = v.appointmentTime.slice(0, 5);
    const [h, m] = t.split(":").map(Number);
    const diff = Math.abs(h * 60 + m - newMinutes);
    if (diff < 120) return { clientName: v.clientName, time: t };
  }
  return null;
}
function initials(name) {
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

const AVATAR_PALETTE = [
  "#1E1E1C", "#B33A2E", "#3E6B5A", "#5A5C9E", "#A9765A",
  "#2E5F6B", "#8A5A9E", "#6B7A2E", "#9E3E6F", "#3E7A9E",
  "#7A5A3E", "#4E8A6B", "#9E5A2E", "#5A3E7A", "#2E9E7A",
];

function avatarColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
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
  const [activeTab, setActiveTab] = useState("clients");

  // Flat list of ALL visits (with client name) — used for conflict detection
  const allVisitsFlat = useMemo(() => {
    const result = [];
    clients.forEach((client) => {
      (visitsByClient[client.id] || []).forEach((visit) => {
        result.push({ ...visit, clientName: client.name });
      });
    });
    return result;
  }, [clients, visitsByClient]);

  // Distinct list of every service ever logged — powers the service picker
  const allServices = useMemo(() => {
    const seen = new Map();
    allVisitsFlat.forEach((v) =>
      (v.services || []).forEach((s) => {
        const k = s.toLowerCase();
        if (!seen.has(k)) seen.set(k, s);
      })
    );
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [allVisitsFlat]);

  // Upcoming appointments derived from visits that have a next_date set
  const appointments = useMemo(() => {
    const result = [];
    clients.forEach((client) => {
      (visitsByClient[client.id] || []).forEach((visit) => {
        if (visit.nextDate) {
          result.push({
            clientId: client.id,
            clientName: client.name,
            visitId: visit.id,
            date: visit.nextDate,
            services: visit.services || [],
            appointmentTime: visit.appointmentTime || "",
          });
        }
      });
    });
    return result.sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      return dc !== 0 ? dc : (a.appointmentTime || "").localeCompare(b.appointmentTime || "");
    });
  }, [clients, visitsByClient]);

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
        appointmentTime: v.appointment_time || "",
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
        appointment_time: visit.appointmentTime,
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
    const newVisit = { id: row.id, date: row.visit_date, appointmentTime: row.appointment_time || "", services: row.services, nextDate: row.next_date, notes: row.notes };
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
        appointment_time: visit.appointmentTime,
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
    const updatedVisit = { id: row.id, date: row.visit_date, appointmentTime: row.appointment_time || "", services: row.services, nextDate: row.next_date, notes: row.notes };
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
        .expandIn { animation: expandIn 0.22s ease; }
        @keyframes expandIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
        .errIn { animation: errIn 0.18s ease; }
        @keyframes errIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
      `}</style>

      {error && <div style={{ background: STAMP_BG, color: STAMP, padding: "8px 20px", fontSize: 12.5, fontWeight: 500 }}>{error}</div>}

      {activeTab === "clients" && (
        <>
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
              appointments={appointments}
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
            <NewVisitSheet clientName={selected.name} onClose={() => setSheet(null)} onSave={(v) => addVisit(selected.id, v)} allVisitsFlat={allVisitsFlat} allServices={allServices} />
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
              allVisitsFlat={allVisitsFlat}
              allServices={allServices}
            />
          )}
        </>
      )}

      {activeTab === "schedule" && (
        <ScheduleScreen appointments={appointments} loaded={loaded} />
      )}

      <TabBar
        activeTab={activeTab}
        onSwitch={(tab) => { setActiveTab(tab); }}
        appointments={appointments}
      />
    </div>
  );
}

// ---------------- LIST SCREEN ----------------
function ListScreen({ clients, visitsByClient, query, setQuery, onOpen, onNew, loaded, totalCount, appointments }) {
  const signOut = () => supabase.auth.signOut();
  const today = todayStr();
  const tmrw = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const todayCount = appointments.filter((a) => a.date === today).length;
  const tmrwCount = appointments.filter((a) => a.date === tmrw).length;
  const weekCount = appointments.filter((a) => a.date > today && a.date <= weekEnd).length;

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
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "2px 0 10px", letterSpacing: "-0.02em" }}>Clients</h1>
        {loaded && (todayCount > 0 || tmrwCount > 0 || weekCount > 0) && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Today", count: todayCount },
              { label: "Tomorrow", count: tmrwCount },
              { label: "This Week", count: weekCount },
            ].map(({ label, count }) => (
              <div key={label} style={{ flex: 1, background: count > 0 ? STAMP_BG : PAPER, border: `1px solid ${count > 0 ? "#EDCECA" : LINE}`, borderRadius: 10, padding: "7px 8px", textAlign: "center" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: count > 0 ? STAMP : MUTED, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 3, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
        )}
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
              <div style={{ width: 40, height: 40, borderRadius: 10, background: avatarColor(c.id), color: PAPER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
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
        <div style={{ width: 34, height: 34, borderRadius: 9, background: avatarColor(client.id), color: PAPER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
          {initials(client.name)}
        </div>
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
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, fontWeight: 700, color: INK }}>{fmtDate(visit.date)}</div>
          {visit.appointmentTime && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: MUTED, marginTop: 2 }}>{fmtTime(visit.appointmentTime)}</div>
          )}
        </div>
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
    <div style={{ position: "sticky", bottom: "calc(57px + env(safe-area-inset-bottom))", padding: "12px 16px 12px", background: `linear-gradient(${PAPER}00, ${PAPER} 30%)` }}>
      {children}
    </div>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "flex-end", zIndex: 200 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: PAPER, borderRadius: "20px 20px 0 0", padding: "10px 20px calc(32px + env(safe-area-inset-bottom))", width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "92vh", overflowY: "auto" }}>
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

// Shared redesigned visit form used by both Log Visit and Edit Visit
function VisitForm({ clientName, initial, allServices, allVisitsFlat, excludeVisitId, onSave, saveLabel }) {
  const [date, setDate] = useState(initial?.date || todayStr());
  const [appointmentTime, setAppointmentTime] = useState(initial?.appointmentTime ? initial.appointmentTime.slice(0, 5) : "");
  const [services, setServices] = useState(initial?.services || []);
  const [serviceQuery, setServiceQuery] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const [nextDate, setNextDate] = useState(initial?.nextDate || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [showNotes, setShowNotes] = useState(Boolean(initial?.notes));
  const [showFollowUp, setShowFollowUp] = useState(Boolean(initial?.nextDate));
  const [attempted, setAttempted] = useState(false);

  const conflict = useMemo(
    () => checkConflict(allVisitsFlat, nextDate, appointmentTime, excludeVisitId),
    [allVisitsFlat, nextDate, appointmentTime, excludeVisitId]
  );

  const q = serviceQuery.trim();
  const options = useMemo(() => {
    const pool = allServices.filter((s) => !services.some((x) => x.toLowerCase() === s.toLowerCase()));
    const ql = q.toLowerCase();
    return (ql ? pool.filter((s) => s.toLowerCase().includes(ql)) : pool).slice(0, 30);
  }, [allServices, services, q]);
  const canCreate =
    q &&
    !allServices.some((s) => s.toLowerCase() === q.toLowerCase()) &&
    !services.some((s) => s.toLowerCase() === q.toLowerCase());

  const pickService = (s) => {
    setServices((prev) => [...prev, s]);
    setServiceQuery("");
  };

  const errors = {
    services: services.length === 0 ? "Please select a service." : "",
    date: !date ? "Please choose a date." : "",
    appointmentTime: !appointmentTime ? "Please choose a time." : "",
  };
  const showErr = (k) => attempted && errors[k];
  const errBorder = { border: `1.5px solid ${STAMP}` };

  const save = () => {
    setAttempted(true);
    if (errors.services || errors.date || errors.appointmentTime || conflict) return;
    onSave({ date, appointmentTime, services, nextDate, notes });
  };

  const ErrMsg = ({ children }) => (
    <div className="errIn" style={{ fontSize: 12.5, color: STAMP, marginTop: 6, fontWeight: 500 }}>{children}</div>
  );
  const ghostBtn = {
    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "13px 14px",
    borderRadius: 12, border: `1.5px dashed ${LINE}`, background: "transparent",
    color: MUTED, fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Client */}
      <div>
        <label style={labelStyle}>Client</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: "13px 14px", boxShadow: "0 1px 3px rgba(30,30,28,0.05)" }}>
          <span style={{ fontSize: 18 }}>👤</span>
          <span style={{ fontSize: 17.5, fontWeight: 700, color: INK }}>{clientName}</span>
        </div>
      </div>

      {/* Service */}
      <div>
        <label style={labelStyle}>Service <span style={{ color: STAMP }}>*</span></label>
        <div style={{ position: "relative" }}>
          <input
            style={{ ...fieldStyle, ...(showErr("services") ? errBorder : null) }}
            value={serviceQuery}
            onChange={(e) => setServiceQuery(e.target.value)}
            onFocus={() => setDropOpen(true)}
            onBlur={() => setTimeout(() => setDropOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (canCreate) pickService(q);
                else if (options.length > 0) pickService(options[0]);
              }
            }}
            placeholder="Select or search services…"
          />
          {dropOpen && (options.length > 0 || canCreate) && (
            <div className="expandIn" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20, background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, boxShadow: "0 8px 24px rgba(30,30,28,0.12)", overflow: "hidden", maxHeight: 220, overflowY: "auto" }}>
              {options.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickService(s); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "13px 14px", border: "none", borderBottom: `1px solid ${PAPER}`, background: "transparent", fontSize: 15, color: INK, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  {s}
                </button>
              ))}
              {canCreate && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickService(q); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "13px 14px", border: "none", background: PAPER, fontSize: 15, fontWeight: 600, color: INK, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  ＋ Create “{q}”
                </button>
              )}
            </div>
          )}
        </div>
        {services.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
            {services.map((s, i) => (
              <span key={i} className="expandIn" style={{ fontSize: 13.5, fontWeight: 500, background: INK, color: PAPER, padding: "7px 12px", borderRadius: 999, display: "flex", alignItems: "center", gap: 7 }}>
                {s}
                <X size={13} style={{ cursor: "pointer", opacity: 0.7 }} onClick={() => setServices((prev) => prev.filter((_, idx) => idx !== i))} />
              </span>
            ))}
          </div>
        )}
        {showErr("services") && <ErrMsg>{errors.services}</ErrMsg>}
      </div>

      {/* Date & time */}
      <div>
        <label style={labelStyle}>Appointment date</label>
        <input type="date" style={{ ...fieldStyle, ...(showErr("date") ? errBorder : null) }} value={date} onChange={(e) => setDate(e.target.value)} />
        {showErr("date") && <ErrMsg>{errors.date}</ErrMsg>}
      </div>
      <div>
        <label style={labelStyle}>Appointment time</label>
        <input type="time" style={{ ...fieldStyle, ...(showErr("appointmentTime") ? errBorder : null) }} value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} />
        {showErr("appointmentTime") && <ErrMsg>{errors.appointmentTime}</ErrMsg>}
      </div>

      {/* Notes — collapsed by default */}
      {!showNotes ? (
        <button type="button" className="tap" style={ghostBtn} onClick={() => setShowNotes(true)}>
          <Plus size={16} /> Add Notes
        </button>
      ) : (
        <div className="expandIn">
          <label style={labelStyle}>Notes</label>
          <textarea
            autoFocus={!initial?.notes}
            style={{ ...fieldStyle, resize: "vertical", minHeight: 72 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering…"
          />
        </div>
      )}

      {/* Follow-up — collapsed by default */}
      {!showFollowUp ? (
        <button type="button" className="tap" style={ghostBtn} onClick={() => setShowFollowUp(true)}>
          <Plus size={16} /> Schedule Follow-up
        </button>
      ) : (
        <div className="expandIn">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={labelStyle}>Follow-up date</label>
            <button type="button" onClick={() => { setShowFollowUp(false); setNextDate(""); }} style={{ border: "none", background: "transparent", color: MUTED, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Remove
            </button>
          </div>
          <input type="date" style={fieldStyle} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>Follow-up is booked at the appointment time above.</div>
          {conflict && (
            <div className="errIn" style={{ marginTop: 8, padding: "11px 13px", background: STAMP_BG, borderRadius: 12, fontSize: 13, color: STAMP, lineHeight: 1.6 }}>
              ⚠ Time unavailable — <strong>{conflict.clientName}</strong> already has an appointment at {fmtTime(conflict.time)} that day. Choose a time at least 2 hours before or after.
            </div>
          )}
        </div>
      )}

      {/* Sticky save */}
      <div style={{ position: "sticky", bottom: 0, background: PAPER, paddingTop: 6, marginTop: -6 }}>
        <PrimaryButton onClick={save}>{saveLabel}</PrimaryButton>
      </div>
    </div>
  );
}

function NewVisitSheet({ clientName, onClose, onSave, allVisitsFlat, allServices }) {
  return (
    <Sheet title="Log Visit" onClose={onClose}>
      <VisitForm
        clientName={clientName}
        initial={null}
        allServices={allServices}
        allVisitsFlat={allVisitsFlat}
        excludeVisitId={null}
        onSave={onSave}
        saveLabel="Save Visit"
      />
    </Sheet>
  );
}

// ---------------- HELPERS ----------------
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dateLabel(dateStr) {
  const today = todayStr();
  const tmrw = tomorrowStr();
  if (dateStr === today) return "Today";
  if (dateStr === tmrw) return "Tomorrow";
  return fmtDate(dateStr);
}

// ---------------- TAB BAR ----------------
function TabBar({ activeTab, onSwitch, appointments }) {
  const today = todayStr();
  const overdueCount = appointments.filter((a) => a.date < today).length;
  const todayCount = appointments.filter((a) => a.date === today).length;
  const badge = overdueCount + todayCount;

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", background: CARD, borderTop: `1px solid ${LINE}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[
          { id: "clients", label: "Clients", renderIcon: () => <Users size={20} />, badge: 0 },
          { id: "schedule", label: "Schedule", renderIcon: () => <Calendar size={20} />, badge },
        ].map(({ id, label, renderIcon, badge: b }) => (
          <button
            key={id}
            onClick={() => onSwitch(id)}
            className="tap"
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, height: 56, border: "none", background: "transparent", cursor: "pointer", color: activeTab === id ? INK : MUTED, fontSize: 10.5, fontWeight: activeTab === id ? 700 : 400, fontFamily: "'Inter', sans-serif", letterSpacing: "0.03em", position: "relative" }}
          >
            <div style={{ position: "relative" }}>
              {renderIcon()}
              {b > 0 && (
                <div style={{ position: "absolute", top: -5, right: -8, background: STAMP, color: "#fff", borderRadius: 999, fontSize: 9, fontWeight: 700, minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1 }}>
                  {b > 99 ? "99+" : b}
                </div>
              )}
            </div>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- SCHEDULE SCREEN ----------------
function ScheduleScreen({ appointments, loaded }) {
  const today = todayStr();
  const initMonth = today.slice(0, 7); // "YYYY-MM"
  const [calMonth, setCalMonth] = useState(initMonth);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  // Filtered appointments
  const filtered = useMemo(() => {
    let list = appointments;
    if (selectedDate) list = list.filter((a) => a.date === selectedDate);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((a) => a.clientName.toLowerCase().includes(q));
    }
    if (serviceFilter.trim()) {
      const sf = serviceFilter.trim().toLowerCase();
      list = list.filter((a) => a.services.some((s) => s.toLowerCase().includes(sf)));
    }
    return list;
  }, [appointments, selectedDate, searchQuery, serviceFilter]);

  // Group by date, sorted by date then by appointment time within each day
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((a) => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, apts]) => [
        date,
        [...apts].sort((a, b) => (a.appointmentTime || "").localeCompare(b.appointmentTime || "")),
      ]);
  }, [filtered]);

  // Dates that have appointments (for calendar dots)
  const appointmentDateSet = useMemo(() => new Set(appointments.map((a) => a.date)), [appointments]);

  // Stats
  const tmrw = tomorrowStr();
  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const todayCount = appointments.filter((a) => a.date === today).length;
  const tmrwCount = appointments.filter((a) => a.date === tmrw).length;
  const weekCount = appointments.filter((a) => a.date > today && a.date <= weekEnd).length;
  const overdueCount = appointments.filter((a) => a.date < today).length;

  const toggleDate = (d) => setSelectedDate((prev) => (prev === d ? null : d));

  const prevMonth = () => {
    const [y, m] = calMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const [y, m] = calMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const hasFilters = selectedDate || searchQuery.trim() || serviceFilter.trim();

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto", paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${LINE}` }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", color: MUTED, fontWeight: 500, marginBottom: 2 }}>
          CLIENT LOG
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 14px", letterSpacing: "-0.02em" }}>Schedule</h1>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Today", count: todayCount, alert: true },
            { label: "Tomorrow", count: tmrwCount, alert: false },
            { label: "This Week", count: weekCount, alert: false },
            ...(overdueCount > 0 ? [{ label: "Overdue", count: overdueCount, alert: true }] : []),
          ].map(({ label, count, alert }) => (
            <div key={label} style={{ flex: 1, background: (alert && count > 0) ? STAMP_BG : PAPER, border: `1px solid ${(alert && count > 0) ? "#EDCECA" : LINE}`, borderRadius: 10, padding: "7px 6px", textAlign: "center", minWidth: 0 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: (alert && count > 0) ? STAMP : (count > 0 ? INK : MUTED), lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 9.5, color: MUTED, marginTop: 3, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: MUTED }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name…"
            style={{ width: "100%", padding: "10px 10px 10px 34px", borderRadius: 10, border: `1.5px solid ${LINE}`, background: CARD, fontSize: 14, fontFamily: "'Inter', sans-serif", color: INK }}
          />
        </div>

        {/* Service filter */}
        <div style={{ position: "relative" }}>
          <input
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            placeholder="Filter by service…"
            style={{ width: "100%", padding: "10px 10px 10px 12px", borderRadius: 10, border: `1.5px solid ${LINE}`, background: CARD, fontSize: 14, fontFamily: "'Inter', sans-serif", color: INK }}
          />
        </div>
      </div>

      {/* Calendar */}
      <div style={{ padding: "14px 16px 0" }}>
        <MiniCalendar
          yearMonth={calMonth}
          appointmentDateSet={appointmentDateSet}
          selectedDate={selectedDate}
          onSelectDate={toggleDate}
          onPrev={prevMonth}
          onNext={nextMonth}
        />
      </div>

      {/* Clear filter pill */}
      {hasFilters && (
        <div style={{ padding: "10px 16px 0", display: "flex", gap: 6 }}>
          {selectedDate && (
            <button onClick={() => setSelectedDate(null)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999, border: `1px solid ${LINE}`, background: INK, color: PAPER, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              {dateLabel(selectedDate)} <X size={11} />
            </button>
          )}
          {(searchQuery.trim() || serviceFilter.trim()) && (
            <button onClick={() => { setSearchQuery(""); setServiceFilter(""); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999, border: `1px solid ${LINE}`, background: CARD, color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Clear filters <X size={11} />
            </button>
          )}
        </div>
      )}

      {/* Appointment list */}
      <div style={{ padding: "12px 16px 0" }}>
        {!loaded && (
          <div style={{ padding: "32px 0", textAlign: "center", color: MUTED, fontSize: 14 }}>Loading…</div>
        )}
        {loaded && grouped.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: MUTED, fontSize: 14.5, lineHeight: 1.7 }}>
            {hasFilters ? "No appointments match." : "No upcoming appointments."}
          </div>
        )}
        {grouped.map(([date, apts]) => {
          const isOverdue = date < today;
          return (
            <div key={date} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: isOverdue ? STAMP : (date === today ? INK : MUTED), letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {dateLabel(date)}
                  {isOverdue && <span style={{ marginLeft: 6, fontSize: 10, background: STAMP_BG, color: STAMP, padding: "2px 6px", borderRadius: 4 }}>OVERDUE</span>}
                </div>
                <div style={{ flex: 1, height: 1, background: LINE }} />
              </div>
              {apts.map((a, i) => (
                <div key={`${a.visitId}-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", marginBottom: 6, background: CARD, borderRadius: 12, border: `1px solid ${isOverdue ? "#EDCECA" : LINE}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: avatarColor(a.clientId), color: PAPER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                    {initials(a.clientName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                      {a.appointmentTime && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: isOverdue ? STAMP : INK, flexShrink: 0 }}>
                          {fmtTime(a.appointmentTime)}
                        </span>
                      )}
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{a.clientName}</span>
                    </div>
                    {a.services.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {a.services.map((s, si) => (
                          <span key={si} style={{ fontSize: 11.5, background: PAPER, border: `1px solid ${LINE}`, padding: "2px 7px", borderRadius: 999, color: MUTED }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- MINI CALENDAR ----------------
const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function MiniCalendar({ yearMonth, appointmentDateSet, selectedDate, onSelectDate, onPrev, onNext }) {
  const today = todayStr();
  const [year, month] = yearMonth.split("-").map(Number);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Build grid: nulls for padding, then day numbers
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full week rows
  while (cells.length % 7 !== 0) cells.push(null);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={onPrev} className="tap" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 6, color: MUTED }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: INK, letterSpacing: "0.04em" }}>
          {monthLabel.toUpperCase()}
        </div>
        <button onClick={onNext} className="tap" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 6, color: MUTED }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 600, color: MUTED, fontFamily: "'JetBrains Mono', monospace", padding: "2px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px 0" }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const dateStr = `${year}-${pad(month)}-${pad(day)}`;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasApt = appointmentDateSet.has(dateStr);
          const isPast = dateStr < today;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className="tap"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 2, padding: "5px 0", border: "none", cursor: "pointer", borderRadius: 8,
                background: isSelected ? INK : isToday ? "#EFEDE6" : "transparent",
              }}
            >
              <span style={{
                fontSize: 13, fontWeight: isToday || isSelected ? 700 : 400,
                color: isSelected ? PAPER : isToday ? INK : isPast ? "#C0BCB3" : INK,
                lineHeight: 1,
              }}>
                {day}
              </span>
              {hasApt ? (
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? PAPER : STAMP, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 5, height: 5 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EditVisitSheet({ clientName, visit, onClose, onSave, allVisitsFlat, allServices }) {
  return (
    <Sheet title="Edit Visit" onClose={onClose}>
      <VisitForm
        clientName={clientName}
        initial={visit}
        allServices={allServices}
        allVisitsFlat={allVisitsFlat}
        excludeVisitId={visit.id}
        onSave={onSave}
        saveLabel="Save Changes"
      />
    </Sheet>
  );
}

