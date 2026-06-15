import React, { useState } from "react";

const COLORS = {
  bg: "#0A0A0A", surface: "#141414", card: "#1A1A1A",
  orange: "#FF6B00", orangeGlow: "#FF6B0022", gold: "#FFB800",
  text: "#F0F0F0", muted: "#888", border: "#2A2A2A",
  green: "#22C55E", greenGlow: "#22C55E22",
};

const nearbyUsers = [
  { id: 1, name: "TonoMotos", city: "Cuautitlán", km: 2, avatar: "🏍️", clan: true, moto: "Honda CB500F 2022", bio: "Fanático del mantenimiento preventivo. Salidas los fines.", posts: 34, conexiones: 12 },
  { id: 2, name: "Fer_Rueda", city: "Tlalnepantla", km: 5, avatar: "🔩", clan: false, moto: "Yamaha MT-03 2021", bio: "Aprendiendo mecánica con el Clan. Siempre listo pa rodar.", posts: 8, conexiones: 5 },
  { id: 3, name: "Xochitl_Z", city: "Naucalpan", km: 8, avatar: "⚡", clan: true, moto: "Kawasaki Z400 2023", bio: "Primera moto este año. El Clan me salvó la vida.", posts: 21, conexiones: 9 },
  { id: 4, name: "Beto_Piston", city: "Ecatepec", km: 11, avatar: "🔧", clan: false, moto: "Italika 250Z 2020", bio: "Mecánico de hobby. Le entro a todo.", posts: 45, conexiones: 20 },
  { id: 5, name: "Diana_Moto", city: "Tultitlán", km: 14, avatar: "🌟", clan: true, moto: "Bajaj Dominar 400 2022", bio: "Viajes largos y carretera. Radashi desde siempre.", posts: 60, conexiones: 31 },
];

export default function RadashiApp() {
  const [tab, setTab] = useState("cerca");
  const [connected, setConnected] = useState({ 1: true, 3: true });
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [chatUser, setChatUser] = useState(null);
  const [chats, setChats] = useState({
    1: [
      { from: "them", text: "Hey! Vi que estás en Cuautitlán también", time: "10:14" },
      { from: "me", text: "Sí! Tienes CB500 verdad? Muy buena moto", time: "10:16" },
    ],
    3: [
      { from: "them", text: "Hola! Vi que también eres del Clan", time: "ayer" },
      { from: "me", text: "Sí! Ya viste la clase de frenos?", time: "ayer" },
    ],
  });
  const [msg, setMsg] = useState("");

  const handleConnect = (id) => {
    setConnected(c => ({ ...c, [id]: true }));
    const u = nearbyUsers.find(u => u.id === id);
    setToast("Conectado con " + u.name + "! 🤝");
    setTimeout(() => setToast(null), 3000);
    setSelected(null);
  };

  const handleSend = () => {
    if (!msg.trim() || !chatUser) return;
    setChats(c => ({
      ...c,
      [chatUser.id]: [...(c[chatUser.id] || []), { from: "me", text: msg, time: "ahora" }],
    }));
    setMsg("");
  };

  const tabs = [
    { id: "feed", icon: "🏠", label: "Inicio" },
    { id: "cerca", icon: "📡", label: "Radar" },
    { id: "clan", icon: "⭐", label: "Clan" },
    { id: "perfil", icon: "👤", label: "Mi Moto" },
  ];

  if (chatUser) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
        <div style={{ background: COLORS.surface, padding: "16px", borderBottom: "1px solid " + COLORS.border, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setChatUser(null)} style={{ background: "none", border: "none", color: COLORS.orange, fontSize: 22, cursor: "pointer" }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{chatUser.avatar}</div>
          <div>
            <div style={{ color: COLORS.text, fontWeight: 700 }}>{chatUser.name}</div>
            <div style={{ color: COLORS.green, fontSize: 12 }}>● En línea</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {(chats[chatUser.id] || []).map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
              <div style={{ background: m.from === "me" ? COLORS.orange : COLORS.card, color: "#fff", padding: "10px 14px", borderRadius: 18, maxWidth: "75%", fontSize: 14 }}>
                {m.text}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>{m.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: COLORS.surface, padding: "12px 16px 28px", borderTop: "1px solid " + COLORS.border, display: "flex", gap: 10 }}>
          <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Escribe algo... 🏍️" style={{ flex: 1, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 20, padding: "10px 16px", color: COLORS.text, fontSize: 14, outline: "none" }} />
          <button onClick={handleSend} style={{ width: 42, height: 42, borderRadius: "50%", background: COLORS.orange, border: "none", cursor: "pointer", fontSize: 18, color: "#fff" }}>↑</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: COLORS.green, color: "#fff", padding: "10px 20px", borderRadius: 20, fontWeight: 700, fontSize: 14, zIndex: 500 }}>{toast}</div>
      )}
      <div style={{ background: COLORS.surface, borderBottom: "1px solid " + COLORS.border, padding: "16px 20px 12px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚙️</div>
            <div>
              <div style={{ color: COLORS.orange, fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>ZONA RADASHI</div>
              <div style={{ color: COLORS.muted, fontSize: 11 }}>Comunidad Radashi</div>
            </div>
          </div>
          <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>🔔</button>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {tab === "cerca" && (
          <div>
            <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Radashis cerca 📡</div>
            {nearbyUsers.map(u => (
              <div key={u.id} onClick={() => setSelected(u)} style={{ background: COLORS.card, borderRadius: 14, border: "1px solid " + (connected[u.id] ? COLORS.green + "55" : COLORS.border), padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{u.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 15 }}>{u.name}</span>
                    {u.clan && <span style={{ background: COLORS.gold, color: "#000", fontSize: 9, padding: "1px 6px", borderRadius: 10, fontWeight: 800 }}>CLAN</span>}
                  </div>
                  <div style={{ color: COLORS.muted, fontSize: 12 }}>📍 {u.city} · {u.km} km</div>
                  <div style={{ color: COLORS.orange, fontSize: 12 }}>🏍️ {u.moto}</div>
                </div>
                {connected[u.id]
                  ? <button onClick={e => { e.stopPropagation(); setChatUser(u); }} style={{ background: COLORS.greenGlow, border: "1px solid " + COLORS.green, color: COLORS.green, borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>💬 Chat</button>
                  : <span style={{ color: COLORS.muted, fontSize: 20 }}>›</span>
                }
              </div>
            ))}
          </div>
        )}
        {tab === "feed" && (
          <div style={{ color: COLORS.text, textAlign: "center", marginTop: 60 }}>
            <div style={{ fontSize: 60 }}>🏍️</div>
            <div style={{ fontWeight: 800, fontSize: 22, marginTop: 16 }}>Feed de Radashis</div>
            <div style={{ color: COLORS.muted, fontSize: 14, marginTop: 8 }}>Próximamente...</div>
          </div>
        )}
        {tab === "clan" && (
          <div>
            <div style={{ background: "linear-gradient(135deg, #1A1000, #2A1800)", border: "1px solid " + COLORS.gold + "44", borderRadius: 18, padding: 20, marginBottom: 16 }}>
              <div style={{ color: COLORS.gold, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>⭐ CLAN RADASHI</div>
              <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20, lineHeight: 1.2, marginBottom: 8 }}>Deja de adivinar, empieza a entender tu moto</div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Clases en vivo · Grabaciones · Guías · Comunidad exclusiva</div>
              <button style={{ background: "linear-gradient(135deg, " + COLORS.gold + ", " + COLORS.orange + ")", border: "none", borderRadius: 12, padding: "12px 24px", color: "#000", fontWeight: 900, fontSize: 15, cursor: "pointer", width: "100%" }}>Únete al Clan 🔥</button>
            </div>
          </div>
        )}
        {tab === "perfil" && (
          <div style={{ textAlign: "center", paddingTop: 20 }}>
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto" }}>😎</div>
            <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20, marginTop: 12 }}>Tu perfil</div>
            <div style={{ color: COLORS.muted, fontSize: 13 }}>@radashi_user</div>
            <div style={{ color: COLORS.orange, marginTop: 8, fontWeight: 700 }}>{Object.keys(connected).length} conexiones activas 🤝</div>
          </div>
        )}
      </div>
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setSelected(null)}>
          <div style={{ background: COLORS.surface, borderRadius: "24px 24px 0 0", width: "100%", padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: COLORS.border, borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{selected.avatar}</div>
              <div>
                <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20 }}>{selected.name}</div>
                <div style={{ color: COLORS.muted, fontSize: 13 }}>📍 {selected.city} · {selected.km} km</div>
                <div style={{ color: COLORS.orange, fontSize: 13 }}>🏍️ {selected.moto}</div>
              </div>
            </div>
            <div style={{ color: COLORS.text, fontSize: 14, padding: "12px 16px", background: COLORS.card, borderRadius: 12, marginBottom: 16 }}>"{selected.bio}"</div>
            {connected[selected.id]
              ? <button onClick={() => { setChatUser(selected); setSelected(null); }} style={{ width: "100%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", border: "none", borderRadius: 14, padding: 14, color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>💬 Enviar mensaje</button>
              : <button onClick={() => handleConnect(selected.id)} style={{ width: "100%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", border: "none", borderRadius: 14, padding: 14, color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>🤝 Conectar con {selected.name.split("_")[0]}</button>
            }
          </div>
        </div>
      )}
      <div style={{ position: "fixed", bottom: 0, width: "100%", background: COLORS.surface, borderTop: "1px solid " + COLORS.border, display: "flex", padding: "10px 0 20px" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ fontSize: 22, filter: tab === t.id ? "none" : "grayscale(1) opacity(0.4)" }}>{t.icon}</div>
            <div style={{ fontSize: 10, fontWeight: tab === t.id ? 800 : 400, color: tab === t.id ? COLORS.orange : COLORS.muted }}>{t.label}</div>
            {tab === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: COLORS.orange }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
