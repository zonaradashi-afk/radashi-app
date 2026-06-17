import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import { doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import MiMoto from "./MiMoto";

const COLORS = {
  bg: "#0A0A0A", surface: "#141414", card: "#1A1A1A",
  orange: "#FF6B00", orangeGlow: "#FF6B0022", gold: "#FFB800",
  text: "#F0F0F0", muted: "#888", border: "#2A2A2A",
  green: "#22C55E", greenGlow: "#22C55E22",
};

const nearbyUsers = [
  { id: 1, name: "TonoMotos", city: "Cuautitlán", km: 2, avatar: "🏍️", clan: true, moto: "Honda CB500F 2022", bio: "Fanático del mantenimiento preventivo.", posts: 34, conexiones: 12 },
  { id: 2, name: "Fer_Rueda", city: "Tlalnepantla", km: 5, avatar: "🔩", clan: false, moto: "Yamaha MT-03 2021", bio: "Aprendiendo mecánica con el Clan.", posts: 8, conexiones: 5 },
  { id: 3, name: "Xochitl_Z", city: "Naucalpan", km: 8, avatar: "⚡", clan: true, moto: "Kawasaki Z400 2023", bio: "Primera moto este año. El Clan me salvó la vida.", posts: 21, conexiones: 9 },
  { id: 4, name: "Beto_Piston", city: "Ecatepec", km: 11, avatar: "🔧", clan: false, moto: "Italika 250Z 2020", bio: "Mecánico de hobby. Le entro a todo.", posts: 45, conexiones: 20 },
  { id: 5, name: "Diana_Moto", city: "Tultitlán", km: 14, avatar: "🌟", clan: true, moto: "Bajaj Dominar 400 2022", bio: "Viajes largos y carretera.", posts: 60, conexiones: 31 },
];

function Avatar({ foto, size = 48, emoji = "😎" }) {
  if (foto) return <img src={foto} alt="perfil" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid " + COLORS.orange, flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, flexShrink: 0 }}>{emoji}</div>;
}

function EditarPerfil({ user, perfil, onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(perfil.nombre || "");
  const [ciudad, setCiudad] = useState(perfil.ciudad || "");
  const [marca, setMarca] = useState(perfil.marca || "");
  const [modelo, setModelo] = useState(perfil.modelo || "");
  const [anio, setAnio] = useState(perfil.anio || "");
  const [bio, setBio] = useState(perfil.bio || "");
  const [foto, setFoto] = useState(perfil.foto || null);
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileRef = useRef();

  const handleFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const storageRef = ref(storage, "fotos/" + user.uid + "/perfil.jpg");
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFoto(url);
    } catch (err) { console.error(err); }
    setUploadingFoto(false);
  };

  const handleGuardar = async () => {
    setLoading(true);
    try {
      const data = { nombre, ciudad, marca, modelo, anio, bio, foto, email: user.email, updatedAt: new Date() };
      await setDoc(doc(db, "usuarios", user.uid), data, { merge: true });
      onGuardar(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const campos = [
    { label: "Tu nombre", val: nombre, set: setNombre, placeholder: "Ej: Miguel Radashi" },
    { label: "Ciudad", val: ciudad, set: setCiudad, placeholder: "Ej: Cuautitlán Izcalli" },
    { label: "Marca de tu moto", val: marca, set: setMarca, placeholder: "Ej: Honda, Yamaha..." },
    { label: "Modelo", val: modelo, set: setModelo, placeholder: "Ej: CB500F, MT-03..." },
    { label: "Año", val: anio, set: setAnio, placeholder: "Ej: 2022" },
    { label: "Tu bio", val: bio, set: setBio, placeholder: "Cuéntanos de ti y tu moto..." },
  ];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: 20, paddingBottom: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onCancelar} style={{ background: "none", border: "none", color: COLORS.orange, fontSize: 22, cursor: "pointer" }}>←</button>
        <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20 }}>Editar perfil</div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <Avatar foto={foto} size={90} />
          <button onClick={() => fileRef.current.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: "50%", background: COLORS.orange, border: "2px solid " + COLORS.bg, color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>📷</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: "none" }} />
        <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 8 }}>{uploadingFoto ? "Subiendo foto..." : "Toca 📷 para cambiar foto"}</div>
      </div>
      {campos.map((c, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 6, fontWeight: 600 }}>{c.label.toUpperCase()}</div>
          <input value={c.val} onChange={e => c.set(e.target.value)} placeholder={c.placeholder} style={{ width: "100%", background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 12, padding: "12px 16px", color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
      ))}
      <button onClick={handleGuardar} disabled={loading || uploadingFoto} style={{ width: "100%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer", marginTop: 8 }}>
        {loading ? "Guardando..." : "Guardar perfil 🔥"}
      </button>
    </div>
  );
}

function NuevoPost({ user, perfil, onCerrar }) {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePublicar = async () => {
    if (!texto.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "posts"), {
        texto, userId: user.uid,
        userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null,
        userMoto: perfil.marca ? perfil.marca + " " + perfil.modelo : null,
        likes: 0, comentarios: 0,
        createdAt: serverTimestamp(),
      });
      onCerrar();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={onCerrar}>
      <div style={{ background: COLORS.surface, borderRadius: "24px 24px 0 0", width: "100%", padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: COLORS.border, borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
          <Avatar foto={perfil.foto} size={44} />
          <textarea value={texto} onChange={e => setTexto(e.target.value)} placeholder="¿Qué le pasa a tu moto hoy? 🏍️" autoFocus style={{ flex: 1, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 12, padding: "12px 16px", color: COLORS.text, fontSize: 14, outline: "none", resize: "none", minHeight: 100, fontFamily: "system-ui, sans-serif" }} />
        </div>
        <button onClick={handlePublicar} disabled={loading || !texto.trim()} style={{ width: "100%", background: texto.trim() ? "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)" : COLORS.card, border: "none", borderRadius: 14, padding: 14, color: texto.trim() ? "#fff" : COLORS.muted, fontWeight: 900, fontSize: 15, cursor: texto.trim() ? "pointer" : "default" }}>
          {loading ? "Publicando..." : "Publicar 🔥"}
        </button>
      </div>
    </div>
  );
}

function Comentarios({ postId, user, perfil, onCerrar }) {
  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "posts", postId, "comentarios"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [postId]);

  const handleComentar = async () => {
    if (!texto.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "posts", postId, "comentarios"), {
        texto, userId: user.uid,
        userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "posts", postId), { comentarios: comentarios.length + 1 }, { merge: true });
      setTexto("");
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const formatTime = (ts) => {
    if (!ts) return "ahora";
    const d = ts.toDate();
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "hace " + Math.floor(diff) + "s";
    if (diff < 3600) return "hace " + Math.floor(diff / 60) + " min";
    if (diff < 86400) return "hace " + Math.floor(diff / 3600) + " hr";
    return "hace " + Math.floor(diff / 86400) + " días";
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={onCerrar}>
      <div style={{ background: COLORS.surface, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid " + COLORS.border }}>
          <div style={{ width: 40, height: 4, background: COLORS.border, borderRadius: 2, margin: "0 auto 16px" }} />
          <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 16 }}>Comentarios 💬</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {comentarios.length === 0 && (
            <div style={{ textAlign: "center", padding: 30, color: COLORS.muted, fontSize: 14 }}>Sé el primero en comentar 🏍️</div>
          )}
          {comentarios.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <Avatar foto={c.userFoto} size={36} />
              <div style={{ flex: 1, background: COLORS.card, borderRadius: 12, padding: "10px 14px" }}>
                <div style={{ color: COLORS.orange, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{c.userNombre}</div>
                <div style={{ color: COLORS.text, fontSize: 14 }}>{c.texto}</div>
                <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 4 }}>{formatTime(c.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 16px 32px", borderTop: "1px solid " + COLORS.border, display: "flex", gap: 10, alignItems: "center" }}>
          <Avatar foto={perfil.foto} size={36} />
          <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === "Enter" && handleComentar()} placeholder="Escribe un comentario..." style={{ flex: 1, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 20, padding: "10px 16px", color: COLORS.text, fontSize: 14, outline: "none" }} />
          <button onClick={handleComentar} disabled={loading || !texto.trim()} style={{ width: 40, height: 40, borderRadius: "50%", background: texto.trim() ? COLORS.orange : COLORS.card, border: "none", cursor: "pointer", fontSize: 18, color: "#fff" }}>↑</button>
        </div>
      </div>
    </div>
  );
}

function Feed({ user, perfil }) {
  const [posts, setPosts] = useState([]);
  const [nuevoPost, setNuevoPost] = useState(false);
  const [liked, setLiked] = useState({});
  const [verComentarios, setVerComentarios] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const formatTime = (ts) => {
    if (!ts) return "ahora";
    const d = ts.toDate();
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "hace " + Math.floor(diff) + "s";
    if (diff < 3600) return "hace " + Math.floor(diff / 60) + " min";
    if (diff < 86400) return "hace " + Math.floor(diff / 3600) + " hr";
    return "hace " + Math.floor(diff / 86400) + " días";
  };

  return (
    <div>
      <div onClick={() => setNuevoPost(true)} style={{ background: COLORS.card, borderRadius: 14, border: "1px solid " + COLORS.border, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <Avatar foto={perfil.foto} size={40} />
        <div style={{ flex: 1, background: COLORS.surface, borderRadius: 20, padding: "10px 16px", color: COLORS.muted, fontSize: 14 }}>¿Qué le pasa a tu moto hoy? 🏍️</div>
      </div>
      {posts.length === 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48 }}>🏍️</div>
          <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 18, marginTop: 12 }}>Sé el primero en publicar</div>
          <div style={{ color: COLORS.muted, fontSize: 14, marginTop: 8 }}>Comparte algo con la comunidad Radashi</div>
        </div>
      )}
      {posts.map(p => (
        <div key={p.id} style={{ background: COLORS.card, borderRadius: 16, border: "1px solid " + COLORS.border, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar foto={p.userFoto} size={42} />
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 14 }}>{p.userNombre}</div>
              <div style={{ color: COLORS.muted, fontSize: 12 }}>
                {p.userMoto && <span>🏍️ {p.userMoto} · </span>}
                {formatTime(p.createdAt)}
              </div>
            </div>
          </div>
          <div style={{ padding: "0 14px 12px" }}>
            <p style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.5, margin: 0 }}>{p.texto}</p>
          </div>
          <div style={{ display: "flex", padding: "10px 14px", borderTop: "1px solid " + COLORS.border, gap: 20 }}>
            <button onClick={async () => {
              const nuevoLiked = !liked[p.id];
              setLiked(l => ({ ...l, [p.id]: nuevoLiked }));
              await setDoc(doc(db, "posts", p.id), { likes: (p.likes || 0) + (nuevoLiked ? 1 : -1) }, { merge: true });
            }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: liked[p.id] ? COLORS.orange : COLORS.muted, fontSize: 13, fontWeight: liked[p.id] ? 700 : 400 }}>
              🔥 {liked[p.id] ? (p.likes || 0) + 1 : (p.likes || 0)}
            </button>
            <button onClick={() => setVerComentarios(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
              💬 {p.comentarios || 0}
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", color: COLORS.muted, fontSize: 13 }}>↗ Compartir</button>
          </div>
        </div>
      ))}
      {nuevoPost && <NuevoPost user={user} perfil={perfil} onCerrar={() => setNuevoPost(false)} />}
      {verComentarios && <Comentarios postId={verComentarios} user={user} perfil={perfil} onCerrar={() => setVerComentarios(null)} />}
    </div>
  );
}

// ── VISOR INTERNO ──────────────────────────────────────────────
function Visor({ url, titulo, onCerrar }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ background: COLORS.surface, padding: "16px 20px", borderBottom: "1px solid " + COLORS.border, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onCerrar} style={{ background: "none", border: "none", color: COLORS.orange, fontSize: 22, cursor: "pointer", flexShrink: 0 }}>←</button>
        <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{titulo}</div>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.muted, fontSize: 12, flexShrink: 0, textDecoration: "none" }}>↗ Abrir</a>
      </div>
      {cargando && !error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 36 }}>⚙️</div>
          <div style={{ color: COLORS.muted, fontSize: 14 }}>Cargando...</div>
        </div>
      )}
      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 16, flex: 1 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16, textAlign: "center" }}>Esta página no permite abrirse aquí</div>
          <div style={{ color: COLORS.muted, fontSize: 13, textAlign: "center" }}>Toca el botón de abajo para verla en tu navegador</div>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", borderRadius: 14, padding: "14px 32px", color: "#fff", fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
            Abrir en navegador ↗
          </a>
        </div>
      )}
      <iframe
        src={url}
        style={{ flex: 1, border: "none", width: "100%", minHeight: "calc(100vh - 60px)", display: error ? "none" : "block" }}
        title={titulo}
        onLoad={() => setCargando(false)}
        onError={() => { setCargando(false); setError(true); }}
      />
    </div>
  );
}

// ── APP PRINCIPAL ──────────────────────────────────────────────
export default function RadashiApp({ user, onLogout }) {
  const [tab, setTab] = useState("feed");
  const [connected, setConnected] = useState({ 1: true, 3: true });
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [chatUser, setChatUser] = useState(null);
  const [editando, setEditando] = useState(false);
  const [perfil, setPerfil] = useState({});
  const [visor, setVisor] = useState(null); // { url, titulo }
  const [chats, setChats] = useState({
    1: [{ from: "them", text: "Hey! Vi que estás en Cuautitlán también", time: "10:14" }, { from: "me", text: "Sí! Tienes CB500 verdad?", time: "10:16" }],
    3: [{ from: "them", text: "Hola! Vi que también eres del Clan", time: "ayer" }, { from: "me", text: "Sí! Ya viste la clase de frenos?", time: "ayer" }],
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "usuarios", user.uid)).then(snap => {
        if (snap.exists()) setPerfil(snap.data());
      });
    }
  }, [user]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const handleConnect = (id) => {
    setConnected(c => ({ ...c, [id]: true }));
    const u = nearbyUsers.find(u => u.id === id);
    showToast("Conectado con " + u.name + "! 🤝");
    setSelected(null);
  };

  const handleSend = () => {
    if (!msg.trim() || !chatUser) return;
    setChats(c => ({ ...c, [chatUser.id]: [...(c[chatUser.id] || []), { from: "me", text: msg, time: "ahora" }] }));
    setMsg("");
  };

  const tabs = [
    { id: "feed", icon: "🏠", label: "Inicio" },
    { id: "cerca", icon: "📡", label: "Radar" },
    { id: "clan", icon: "⭐", label: "Clan" },
    { id: "perfil", icon: "👤", label: "Mi Moto" },
  ];

  if (editando) return <EditarPerfil user={user} perfil={perfil} onGuardar={(data) => { setPerfil(data); setEditando(false); showToast("Perfil guardado! 🔥"); }} onCancelar={() => setEditando(false)} />;

  if (visor) return <Visor url={visor.url} titulo={visor.titulo} onCerrar={() => setVisor(null)} />;

  if (chatUser) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
        <div style={{ background: COLORS.surface, padding: "16px", borderBottom: "1px solid " + COLORS.border, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setChatUser(null)} style={{ background: "none", border: "none", color: COLORS.orange, fontSize: 22, cursor: "pointer" }}>←</button>
          <Avatar emoji={chatUser.avatar} size={40} />
          <div>
            <div style={{ color: COLORS.text, fontWeight: 700 }}>{chatUser.name}</div>
            <div style={{ color: COLORS.green, fontSize: 12 }}>● En línea</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {(chats[chatUser.id] || []).map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
              <div style={{ background: m.from === "me" ? COLORS.orange : COLORS.card, color: "#fff", padding: "10px 14px", borderRadius: 18, maxWidth: "75%", fontSize: 14 }}>
                {m.text}<div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>{m.time}</div>
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
      {toast && <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: COLORS.green, color: "#fff", padding: "10px 20px", borderRadius: 20, fontWeight: 700, fontSize: 14, zIndex: 500 }}>{toast}</div>}

      <div style={{ background: COLORS.surface, borderBottom: "1px solid " + COLORS.border, padding: "16px 20px 12px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar foto={perfil.foto} size={36} />
            <div>
              <div style={{ color: COLORS.orange, fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>ZONA RADASHI</div>
              <div style={{ color: COLORS.muted, fontSize: 11 }}>{perfil.nombre || user?.email}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 20, padding: "6px 14px", color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>Salir</button>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {tab === "feed" && <Feed user={user} perfil={perfil} />}

        {tab === "cerca" && (
          <div>
            <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Radashis cerca 📡</div>
            {nearbyUsers.map(u => (
              <div key={u.id} onClick={() => setSelected(u)} style={{ background: COLORS.card, borderRadius: 14, border: "1px solid " + (connected[u.id] ? COLORS.green + "55" : COLORS.border), padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <Avatar emoji={u.avatar} size={48} />
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

        {tab === "clan" && (
          <div>
            {/* CLAN */}
            <div style={{ background: "linear-gradient(135deg, #1A1000, #2A1800)", border: "1px solid " + COLORS.gold + "44", borderRadius: 18, padding: 20, marginBottom: 16 }}>
              <div style={{ color: COLORS.gold, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>⭐ CLAN RADASHI</div>
              <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20, lineHeight: 1.2, marginBottom: 8 }}>Deja de adivinar, empieza a entender tu moto</div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Clases en vivo · Grabaciones · Guías · Comunidad exclusiva</div>
              <button
                onClick={() => setVisor({ url: "https://nas.com/es-mx/zona-radashi/home", titulo: "Clan Radashi" })}
                style={{ background: "linear-gradient(135deg, " + COLORS.gold + ", " + COLORS.orange + ")", border: "none", borderRadius: 12, padding: "12px 24px", color: "#000", fontWeight: 900, fontSize: 15, cursor: "pointer", width: "100%" }}
              >
                Únete al Clan 🔥
              </button>
            </div>

            {/* TIENDA */}
            <div style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 18, padding: 20 }}>
              <div style={{ color: COLORS.orange, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>🛒 TIENDA OFICIAL</div>
              <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20, lineHeight: 1.2, marginBottom: 8 }}>Refacciones, accesorios y más</div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Todo lo que tu moto necesita en un solo lugar</div>
              <button
                onClick={() => setVisor({ url: "https://tallerdemotoszonaradashi.com/", titulo: "Tienda Zona Radashi" })}
                style={{ background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", border: "none", borderRadius: 12, padding: "12px 24px", color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer", width: "100%" }}
              >
                Ir a la Tienda 🛍️
              </button>
            </div>
          </div>
        )}

        {tab === "perfil" && (
          <div>
            <div style={{ background: COLORS.card, borderRadius: 18, border: "1px solid " + COLORS.border, padding: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar foto={perfil.foto} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>{perfil.nombre || "Sin nombre"}</div>
                <div style={{ color: COLORS.muted, fontSize: 12 }}>{user?.email}</div>
                {perfil.ciudad && <div style={{ color: COLORS.muted, fontSize: 12 }}>📍 {perfil.ciudad}</div>}
              </div>
              <button onClick={() => setEditando(true)} style={{ background: COLORS.orangeGlow, border: "1px solid " + COLORS.orange, color: COLORS.orange, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️ Editar</button>
            </div>
            <MiMoto user={user} />
          </div>
        )}
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setSelected(null)}>
          <div style={{ background: COLORS.surface, borderRadius: "24px 24px 0 0", width: "100%", padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: COLORS.border, borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <Avatar emoji={selected.avatar} size={64} />
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
