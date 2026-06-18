import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import { doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import MiMoto from "./MiMoto";

const C = {
  bg: "#0A0A0A",
  surface: "#141414",
  card: "#1A1A1A",
  orange: "#ffa22e",
  orangeGlow: "#ffa22e18",
  red: "#980604",
  redGlow: "#98060418",
  gold: "#ffa22e",
  text: "#F0F0F0",
  muted: "#888888",
  border: "#2A2A2A",
  green: "#22C55E",
  greenGlow: "#22C55E18",
};

const nearbyUsers = [
  { id: 1, name: "TonoMotos", zona: "Cuautitlán", km: 2, avatar: "🏍️", clan: true, moto: "Honda CB500F 2022", bio: "Fanático del mantenimiento preventivo." },
  { id: 2, name: "Fer_Rueda", zona: "Tlalnepantla", km: 5, avatar: "🔩", clan: false, moto: "Yamaha MT-03 2021", bio: "Aprendiendo mecánica con el Clan." },
  { id: 3, name: "Xochitl_Z", zona: "Naucalpan", km: 8, avatar: "⚡", clan: true, moto: "Kawasaki Z400 2023", bio: "Primera moto este año. El Clan me salvó la vida." },
  { id: 4, name: "Beto_Piston", zona: "Ecatepec", km: 11, avatar: "🔧", clan: false, moto: "Italika 250Z 2020", bio: "Mecánico de hobby. Le entro a todo." },
  { id: 5, name: "Diana_Moto", zona: "Tultitlán", km: 14, avatar: "🌟", clan: true, moto: "Bajaj Dominar 400 2022", bio: "Viajes largos y carretera." },
];

const puntosUtiles = [
  { id: 1, tipo: "Taller", icon: "🔧", nombre: "Taller Zona Radashi", zona: "Cuautitlán Izcalli", desc: "Taller oficial de la comunidad", aliado: true },
  { id: 2, tipo: "Gasolina", icon: "⛽", nombre: "Pemex Cuautitlán", zona: "Cuautitlán", desc: "24 horas, abierta toda la semana" },
  { id: 3, tipo: "Vulcanizadora", icon: "🛞", nombre: "Vulca-Moto", zona: "Tlalnepantla", desc: "Especialistas en motos, rápido y barato" },
  { id: 4, tipo: "Refaccionaria", icon: "⚙️", nombre: "Refacciones El Pistón", zona: "Naucalpan", desc: "Todo tipo de refacciones para moto" },
  { id: 5, tipo: "Punto de reunión", icon: "📍", nombre: "Glorieta de los Moteros", zona: "Cuautitlán Izcalli", desc: "Punto de encuentro cada domingo 8am" },
  { id: 6, tipo: "Evento", icon: "🏁", nombre: "Rodada Mensual Radashi", zona: "CDMX", desc: "Primer sábado de cada mes" },
  { id: 7, tipo: "Aliado Radashi", icon: "⭐", nombre: "Moto Accesorios MX", zona: "Ecatepec", desc: "10% descuento con código RADASHI" },
  { id: 8, tipo: "Gasolina", icon: "⛽", nombre: "Pemex Tultitlán", zona: "Tultitlán", desc: "Cerca de la autopista, fácil acceso" },
];

const tiposEmergencia = [
  { id: "ponche", icon: "🛞", label: "Me ponché" },
  { id: "noprende", icon: "🔑", label: "No prende" },
  { id: "singasolina", icon: "⛽", label: "Sin gasolina" },
  { id: "accidente", icon: "🚨", label: "Tuve un accidente" },
  { id: "apoyo", icon: "🤝", label: "Necesito apoyo" },
  { id: "otro", icon: "❓", label: "Otro" },
];

const guias = {
  ponche: ["Busca un lugar seguro fuera del carril", "Enciende las luces de emergencia", "Coloca la moto sobre el caballete", "Busca una vulcanizadora en Puntos Útiles", "Si estás en carretera, llama a grúa"],
  noprende: ["Verifica que el switch esté en ON", "Revisa si tiene gasolina", "Revisa el caballete lateral", "Intenta arrancar en neutro", "Si nada funciona, llama a un mecánico"],
  singasolina: ["Busca una gasolinera en Puntos Útiles", "Empuja la moto al acotamiento", "Avisa a alguien de tu ubicación", "Muchas gasolineras venden combustible en contenedor"],
  accidente: ["Tu seguridad primero", "Llama al 911 si hay heridos", "Toma fotos del lugar y daños", "No admitas culpa en el momento", "Llama a tu aseguradora"],
  apoyo: ["Mantente en un lugar seguro y visible", "Avisa a alguien de confianza tu ubicación", "Espera respuesta de un Radashi cercano"],
  otro: ["Mantente en un lugar seguro", "Espera respuesta de un Radashi cercano"],
};

const categoriasFiltro = ["Todos", "Taller", "Gasolina", "Vulcanizadora", "Refaccionaria", "Punto de reunión", "Evento", "Aliado Radashi"];
const SOPORTE_WA = "5610246564";

// ── ENGRANE SVG ──────────────────────────────────────────────
function Gear({ size = 40, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={style}>
      <circle cx="20" cy="20" r="18" fill="#140800" stroke={C.red} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="11" fill="none" stroke={C.orange} strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="20" cy="20" r="6" fill={C.red} />
      <circle cx="20" cy="20" r="2.5" fill={C.orange} />
      <rect x="19" y="2" width="2" height="5" rx="1" fill={C.orange} />
      <rect x="19" y="33" width="2" height="5" rx="1" fill={C.orange} />
      <rect x="2" y="19" width="5" height="2" rx="1" fill={C.orange} />
      <rect x="33" y="19" width="5" height="2" rx="1" fill={C.orange} />
      <rect x="27" y="5" width="2" height="4" rx="1" fill={C.red} transform="rotate(45 28 7)" />
      <rect x="5" y="27" width="2" height="4" rx="1" fill={C.red} transform="rotate(45 6 29)" />
      <rect x="27" y="27" width="2" height="4" rx="1" fill={C.red} transform="rotate(-45 28 29)" />
      <rect x="5" y="5" width="2" height="4" rx="1" fill={C.red} transform="rotate(-45 6 7)" />
    </svg>
  );
}

// ── SECTION HEADER ───────────────────────────────────────────
function SectionBar({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 4 }}>
      <div style={{ width: 20, height: 2, background: C.red }} />
      <div style={{ color: C.orange, fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: C.surface }} />
    </div>
  );
}

// ── HEADER ───────────────────────────────────────────────────
function AppHeader({ user, perfil, onLogout, subtitulo }) {
  return (
    <div style={{ background: C.bg, borderBottom: `2px solid ${C.red}`, padding: "14px 16px 12px", position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", gap: 10 }}>
      <Gear size={40} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 2, lineHeight: 1 }}>
          <span style={{ color: C.red }}>ZONA </span>
          <span style={{ color: C.orange }}>RADASHI</span>
        </div>
        <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{subtitulo || perfil.nombre || user?.email}</div>
      </div>
      <button onClick={onLogout} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px", color: C.muted, fontSize: 10, cursor: "pointer" }}>Salir</button>
    </div>
  );
}

// ── AVATAR ───────────────────────────────────────────────────
function Avatar({ foto, size = 48, emoji = "😎", accent = C.orange }) {
  if (foto) return <img src={foto} alt="perfil" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${accent}`, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.surface, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, flexShrink: 0 }}>
      {emoji}
    </div>
  );
}

// ── CLAN BADGE ───────────────────────────────────────────────
function ClanBadge() {
  return <span style={{ background: C.red, color: C.orange, fontSize: 8, padding: "1px 5px", borderRadius: 6, fontWeight: 800, letterSpacing: 1 }}>CLAN</span>;
}

// ── CARD ────────────────────────────────────────────────────
function Card({ children, accent = C.orange, style = {} }) {
  return (
    <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, borderTop: `2px solid ${accent}`, padding: 12, marginBottom: 8, ...style }}>
      {children}
    </div>
  );
}

// ── BTN ─────────────────────────────────────────────────────
function BtnMain({ children, onClick, disabled, red, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: "100%", background: red ? C.red : C.orange, border: "none", borderRadius: 10, padding: 13, color: red ? C.orange : C.bg, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, ...style }}>
      {children}
    </button>
  );
}

// ── CHAT DE AYUDA ────────────────────────────────────────────
function ChatAyuda({ chatId, user, perfil, alerta, onCerrar, onResuelto }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    const q = query(collection(db, "chats", chatId, "mensajes"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMensajes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [chatId]);

  const enviar = async (textoMsg) => {
    const msg = textoMsg || texto;
    if (!msg.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "chats", chatId, "mensajes"), {
        texto: msg, userId: user.uid,
        userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null,
        tipo: "texto",
        createdAt: serverTimestamp(),
      });
      setTexto("");
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const compartirUbicacion = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const url = `https://maps.google.com/?q=${latitude},${longitude}`;
      await addDoc(collection(db, "chats", chatId, "mensajes"), {
        texto: `📍 ${perfil.nombre || "Yo"} compartió su ubicación aproximada`,
        url, userId: user.uid,
        userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null,
        tipo: "ubicacion",
        createdAt: serverTimestamp(),
      });
    });
  };

  const compartirNumero = async () => {
    await addDoc(collection(db, "chats", chatId, "mensajes"), {
      texto: `📞 ${perfil.nombre || "Yo"} compartió su número: ${perfil.telefono || "No registrado"}`,
      userId: user.uid, userNombre: perfil.nombre || user.email,
      userFoto: perfil.foto || null, tipo: "numero",
      createdAt: serverTimestamp(),
    });
  };

  const marcarResuelto = async () => {
    try {
      await updateDoc(doc(db, "emergencias", alerta.id), { activa: false, resuelta: true });
      await addDoc(collection(db, "chats", chatId, "mensajes"), {
        texto: "✅ Emergencia resuelta. ¡Gracias a todos!",
        userId: "sistema", userNombre: "Sistema", tipo: "sistema",
        createdAt: serverTimestamp(),
      });
      if (onResuelto) onResuelto();
    } catch (e) { console.error(e); }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = ts.toDate();
    return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
  };

  const esMio = (msg) => msg.userId === user.uid;

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 500, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: C.bg, borderBottom: `2px solid ${C.red}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onCerrar} style={{ background: "none", border: "none", color: C.orange, fontSize: 22, cursor: "pointer" }}>←</button>
        <Gear size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ color: C.red, fontWeight: 800, fontSize: 13 }}>🆘 CHAT DE AYUDA</div>
          <div style={{ color: C.muted, fontSize: 11 }}>{alerta.tipo} · {alerta.zona}</div>
        </div>
        {alerta.userId === user.uid && (
          <button onClick={marcarResuelto} style={{ background: C.green, border: "none", borderRadius: 20, padding: "6px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✅ Resuelto</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {mensajes.map((m, i) => (
          <div key={i}>
            {m.tipo === "sistema" ? (
              <div style={{ textAlign: "center", color: C.muted, fontSize: 12, padding: "4px 0" }}>{m.texto}</div>
            ) : (
              <div style={{ display: "flex", justifyContent: esMio(m) ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                {!esMio(m) && <Avatar foto={m.userFoto} size={28} />}
                <div style={{ maxWidth: "75%" }}>
                  {!esMio(m) && <div style={{ color: C.orange, fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{m.userNombre}</div>}
                  <div style={{ background: esMio(m) ? C.orange : C.surface, color: esMio(m) ? C.bg : C.text, padding: "10px 14px", borderRadius: esMio(m) ? "18px 18px 4px 18px" : "18px 18px 18px 4px", fontSize: 14, border: esMio(m) ? "none" : `1px solid ${C.border}` }}>
                    {m.tipo === "ubicacion" ? (
                      <div>{m.texto}<br /><a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: esMio(m) ? C.bg : C.orange, fontSize: 12, opacity: 0.8 }}>Ver en Google Maps ↗</a></div>
                    ) : m.texto}
                    <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: "right" }}>{formatTime(m.createdAt)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: "10px 16px 0" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
          {[
            { label: "📍 Mi ubicación", action: compartirUbicacion },
            { label: "📞 Mi número", action: compartirNumero },
          ].map((b, i) => (
            <button key={i} onClick={b.action} style={{ flexShrink: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 14px", color: C.text, fontSize: 12, cursor: "pointer" }}>{b.label}</button>
          ))}
          <a href={"https://wa.me/" + SOPORTE_WA} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 14px", color: C.green, fontSize: 12, cursor: "pointer", textDecoration: "none" }}>🟢 Soporte</a>
          {alerta.userId === user.uid && (
            <button onClick={marcarResuelto} style={{ flexShrink: 0, background: C.greenGlow, border: `1px solid ${C.green}`, borderRadius: 20, padding: "6px 14px", color: C.green, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✅ Ya estoy bien</button>
          )}
        </div>
      </div>

      <div style={{ background: C.surface, padding: "8px 16px 28px", display: "flex", gap: 10, alignItems: "center" }}>
        <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === "Enter" && enviar()} placeholder="Escribe algo..." style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "10px 16px", color: C.text, fontSize: 14, outline: "none" }} />
        <button onClick={() => enviar()} disabled={loading || !texto.trim()} style={{ width: 42, height: 42, borderRadius: "50%", background: texto.trim() ? C.orange : C.card, border: "none", cursor: "pointer", fontSize: 18, color: C.bg }}>↑</button>
      </div>
    </div>
  );
}

// ── PEDIR AYUDA ──────────────────────────────────────────────
function PedirAyuda({ user, perfil, onCerrar, onAlertaCreada }) {
  const [paso, setPaso] = useState(1);
  const [tipo, setTipo] = useState(null);
  const [zona, setZona] = useState("");
  const [usandoGPS, setUsandoGPS] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const usarGPS = () => {
    setUsandoGPS(true);
    navigator.geolocation?.getCurrentPosition(
      () => { setZona("Ubicación aproximada compartida"); setUsandoGPS(false); },
      () => setUsandoGPS(false)
    );
  };

  const enviarAlerta = async () => {
    if (!tipo || !zona.trim()) return;
    setEnviando(true);
    try {
      const docRef = await addDoc(collection(db, "emergencias"), {
        tipo: tipo.label, icon: tipo.icon,
        userId: user.uid, userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null,
        userMoto: perfil.marca ? perfil.marca + " " + perfil.modelo : null,
        zona, activa: true, createdAt: serverTimestamp(),
      });
      onAlertaCreada({ id: docRef.id, tipo: tipo.label, icon: tipo.icon, zona, userId: user.uid, userNombre: perfil.nombre || user.email });
      onCerrar();
    } catch (e) { console.error(e); }
    setEnviando(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={onCerrar}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", borderTop: `2px solid ${C.red}` }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 36, height: 3, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
          <div style={{ color: C.red, fontWeight: 900, fontSize: 17, letterSpacing: 1 }}>{paso === 1 ? "🆘 ¿QUÉ PASÓ?" : "📍 ¿DÓNDE ESTÁS?"}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{paso === 1 ? "Elige tu situación" : "Comparte tu zona aproximada"}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {paso === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {tiposEmergencia.map(t => (
                <button key={t.id} onClick={() => { setTipo(t); setPaso(2); }} style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.red}`, borderRadius: 10, padding: 14, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{t.icon}</div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 12 }}>{t.label}</div>
                </button>
              ))}
            </div>
          )}
          {paso === 2 && (
            <div>
              <div style={{ background: C.card, borderRadius: 10, padding: 12, marginBottom: 14, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.orange}` }}>
                <div style={{ color: C.orange, fontWeight: 800, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>QUÉ HACER MIENTRAS:</div>
                {(guias[tipo?.id] || []).map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: C.red, color: C.orange, fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{p}</div>
                  </div>
                ))}
              </div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 13, marginBottom: 10, letterSpacing: 1 }}>¿DÓNDE ESTÁS?</div>
              <button onClick={usarGPS} disabled={usandoGPS} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.text, fontSize: 13, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {usandoGPS ? "Obteniendo ubicación..." : "📍 Usar mi ubicación aproximada"}
              </button>
              <div style={{ color: C.muted, fontSize: 11, textAlign: "center", marginBottom: 8 }}>— o escribe tu zona —</div>
              <input value={zona} onChange={e => setZona(e.target.value)} placeholder="Ej: Coacalco, cerca de López Portillo" style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
              <BtnMain red onClick={enviarAlerta} disabled={enviando || !zona.trim()}>
                {enviando ? "ENVIANDO ALERTA..." : "🆘 PEDIR AYUDA AHORA"}
              </BtnMain>
            </div>
          )}
        </div>
        {paso === 2 && (
          <div style={{ padding: "10px 16px 28px", borderTop: `1px solid ${C.border}` }}>
            <button onClick={() => setPaso(1)} style={{ width: "100%", background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer" }}>← Volver</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── EDITAR PERFIL ────────────────────────────────────────────
function EditarPerfil({ user, perfil, onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(perfil.nombre || "");
  const [ciudad, setCiudad] = useState(perfil.ciudad || "");
  const [marca, setMarca] = useState(perfil.marca || "");
  const [modelo, setModelo] = useState(perfil.modelo || "");
  const [anio, setAnio] = useState(perfil.anio || "");
  const [bio, setBio] = useState(perfil.bio || "");
  const [telefono, setTelefono] = useState(perfil.telefono || "");
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
      const data = { nombre, ciudad, marca, modelo, anio, bio, foto, telefono, email: user.email, updatedAt: new Date() };
      await setDoc(doc(db, "usuarios", user.uid), data, { merge: true });
      onGuardar(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const campos = [
    { label: "Tu nombre", val: nombre, set: setNombre, placeholder: "Ej: Miguel Radashi" },
    { label: "Ciudad", val: ciudad, set: setCiudad, placeholder: "Ej: Cuautitlán Izcalli" },
    { label: "Teléfono (opcional)", val: telefono, set: setTelefono, placeholder: "Ej: 5512345678" },
    { label: "Marca de tu moto", val: marca, set: setMarca, placeholder: "Ej: Honda, Yamaha..." },
    { label: "Modelo", val: modelo, set: setModelo, placeholder: "Ej: CB500F, MT-03..." },
    { label: "Año", val: anio, set: setAnio, placeholder: "Ej: 2022" },
    { label: "Tu bio", val: bio, set: setBio, placeholder: "Cuéntanos de ti y tu moto..." },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: C.bg, borderBottom: `2px solid ${C.red}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onCancelar} style={{ background: "none", border: "none", color: C.orange, fontSize: 22, cursor: "pointer" }}>←</button>
        <Gear size={32} />
        <div style={{ color: C.text, fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>EDITAR PERFIL</div>
      </div>
      <div style={{ padding: 20, paddingBottom: 100 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Avatar foto={foto} size={90} />
            <button onClick={() => fileRef.current.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: C.orange, border: `2px solid ${C.bg}`, color: C.bg, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>📷</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: "none" }} />
          <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>{uploadingFoto ? "Subiendo foto..." : "Toca 📷 para cambiar foto"}</div>
        </div>
        {campos.map((c, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ color: C.orange, fontSize: 10, marginBottom: 5, fontWeight: 800, letterSpacing: 1 }}>{c.label.toUpperCase()}</div>
            <input value={c.val} onChange={e => c.set(e.target.value)} placeholder={c.placeholder} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
        ))}
        <BtnMain onClick={handleGuardar} disabled={loading || uploadingFoto}>
          {loading ? "GUARDANDO..." : "GUARDAR PERFIL 🔥"}
        </BtnMain>
      </div>
    </div>
  );
}

// ── NUEVO POST ───────────────────────────────────────────────
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
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", padding: 20, borderTop: `2px solid ${C.orange}` }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 3, background: C.border, borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
          <Avatar foto={perfil.foto} size={42} />
          <textarea value={texto} onChange={e => setTexto(e.target.value)} placeholder="¿Qué le pasa a tu moto hoy? 🏍️" autoFocus style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 13, outline: "none", resize: "none", minHeight: 90, fontFamily: "system-ui, sans-serif" }} />
        </div>
        <BtnMain onClick={handlePublicar} disabled={loading || !texto.trim()}>
          {loading ? "PUBLICANDO..." : "PUBLICAR 🔥"}
        </BtnMain>
      </div>
    </div>
  );
}

// ── COMENTARIOS ──────────────────────────────────────────────
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
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", borderTop: `2px solid ${C.orange}` }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 36, height: 3, background: C.border, borderRadius: 2, margin: "0 auto 12px" }} />
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14, letterSpacing: 1 }}>COMENTARIOS 💬</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          {comentarios.length === 0 && <div style={{ textAlign: "center", padding: 28, color: C.muted, fontSize: 13 }}>Sé el primero en comentar 🏍️</div>}
          {comentarios.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <Avatar foto={c.userFoto} size={34} />
              <div style={{ flex: 1, background: C.card, borderRadius: 10, padding: "9px 12px", border: `1px solid ${C.border}` }}>
                <div style={{ color: C.orange, fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{c.userNombre}</div>
                <div style={{ color: C.text, fontSize: 13 }}>{c.texto}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{formatTime(c.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 14px 28px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center" }}>
          <Avatar foto={perfil.foto} size={34} />
          <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === "Enter" && handleComentar()} placeholder="Escribe un comentario..." style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "9px 14px", color: C.text, fontSize: 13, outline: "none" }} />
          <button onClick={handleComentar} disabled={loading || !texto.trim()} style={{ width: 38, height: 38, borderRadius: "50%", background: texto.trim() ? C.orange : C.card, border: "none", cursor: "pointer", fontSize: 16, color: C.bg }}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ── FEED ─────────────────────────────────────────────────────
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
      <div onClick={() => setNuevoPost(true)} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.orange}`, padding: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <Avatar foto={perfil.foto} size={38} />
        <div style={{ flex: 1, background: C.bg, borderRadius: 20, padding: "9px 14px", color: C.muted, fontSize: 13 }}>¿Qué le pasa a tu moto hoy? 🏍️</div>
      </div>

      {posts.length === 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48 }}>🏍️</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginTop: 10 }}>Sé el primero en publicar</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>Comparte algo con la comunidad Radashi</div>
        </div>
      )}

      {posts.map(p => (
        <div key={p.id} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, borderTop: `2px solid ${p.userId === user.uid ? C.orange : C.red}`, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 12px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar foto={p.userFoto} size={40} accent={p.userId === user.uid ? C.orange : C.red} />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{p.userNombre}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>
                {p.userMoto && <span>🏍️ {p.userMoto} · </span>}
                {formatTime(p.createdAt)}
              </div>
            </div>
          </div>
          <div style={{ padding: "0 12px 10px" }}>
            <p style={{ color: C.text, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{p.texto}</p>
          </div>
          <div style={{ display: "flex", padding: "8px 12px", borderTop: `1px solid ${C.border}`, gap: 16 }}>
            <button onClick={async () => {
              const nuevoLiked = !liked[p.id];
              setLiked(l => ({ ...l, [p.id]: nuevoLiked }));
              await setDoc(doc(db, "posts", p.id), { likes: (p.likes || 0) + (nuevoLiked ? 1 : -1) }, { merge: true });
            }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: liked[p.id] ? C.orange : C.muted, fontSize: 12, fontWeight: liked[p.id] ? 700 : 400 }}>
              🔥 {liked[p.id] ? (p.likes || 0) + 1 : (p.likes || 0)}
            </button>
            <button onClick={() => setVerComentarios(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
              💬 {p.comentarios || 0}
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", color: C.muted, fontSize: 12 }}>↗ Compartir</button>
          </div>
        </div>
      ))}

      {nuevoPost && <NuevoPost user={user} perfil={perfil} onCerrar={() => setNuevoPost(false)} />}
      {verComentarios && <Comentarios postId={verComentarios} user={user} perfil={perfil} onCerrar={() => setVerComentarios(null)} />}
    </div>
  );
}

// ── VISOR ────────────────────────────────────────────────────
function Visor({ url, titulo, onCerrar }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ background: C.bg, borderBottom: `2px solid ${C.red}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button onClick={onCerrar} style={{ background: "none", border: "none", color: C.orange, fontSize: 22, cursor: "pointer", flexShrink: 0 }}>←</button>
        <Gear size={32} />
        <div style={{ color: C.text, fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{titulo}</div>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, fontSize: 12, flexShrink: 0, textDecoration: "none" }}>↗</a>
      </div>
      {cargando && !error && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 10 }}><Gear size={48} /><div style={{ color: C.muted, fontSize: 13 }}>Cargando...</div></div>}
      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 16, flex: 1 }}>
          <div style={{ fontSize: 44 }}>🔒</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 15, textAlign: "center" }}>Esta página no permite abrirse aquí</div>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: C.orange, borderRadius: 10, padding: "12px 28px", color: C.bg, fontWeight: 900, fontSize: 14, textDecoration: "none", letterSpacing: 1 }}>ABRIR EN NAVEGADOR ↗</a>
        </div>
      )}
      <iframe src={url} style={{ flex: 1, border: "none", width: "100%", minHeight: "calc(100vh - 60px)", display: error ? "none" : "block" }} title={titulo} onLoad={() => setCargando(false)} onError={() => { setCargando(false); setError(true); }} />
    </div>
  );
}

// ── RADAR ────────────────────────────────────────────────────
function Radar({ user, perfil, showToast, miAlerta, setMiAlerta, chatGlobal, setChatGlobal }) {
  const [radarTab, setRadarTab] = useState("radashis");
  const [selected, setSelected] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [alertasActivas, setAlertasActivas] = useState([]);
  const [pedirAyuda, setPedirAyuda] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "emergencias"), where("activa", "==", true), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setAlertasActivas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const desactivarAlerta = async () => {
    if (!miAlerta) return;
    try {
      await updateDoc(doc(db, "emergencias", miAlerta.id), { activa: false });
      setMiAlerta(null);
      showToast("Alerta desactivada ✅");
    } catch (e) { console.error(e); }
  };

  const puedoAyudar = async (alerta) => {
    const chatId = "ayuda_" + alerta.id + "_" + user.uid;
    try {
      await addDoc(collection(db, "chats", chatId, "mensajes"), {
        texto: `Hola, soy ${perfil.nombre || user.email}. Vi tu alerta de "${alerta.tipo}" en ${alerta.zona}. ¿Todavía necesitas ayuda?`,
        userId: user.uid, userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null, tipo: "texto",
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "notificaciones", alerta.userId), {
        chatId, alertaId: alerta.id, tipo: alerta.tipo, zona: alerta.zona,
        ayudanteNombre: perfil.nombre || user.email,
        ayudanteId: user.uid, leido: false, updatedAt: serverTimestamp(),
      }, { merge: true });
      setChatGlobal({ chatId, alerta });
    } catch (e) { console.error(e); }
  };

  const alertasOtros = alertasActivas.filter(a => a.userId !== user.uid);
  const puntosFiltrados = categoriaFiltro === "Todos" ? puntosUtiles : puntosUtiles.filter(p => p.tipo === categoriaFiltro);

  const radarTabs = [
    { id: "radashis", label: "👥 Radashis" },
    { id: "puntos", label: "🧭 Puntos" },
    { id: "emergencia", label: "🆘 Emergencia" },
  ];

  if (chatGlobal) return <ChatAyuda chatId={chatGlobal.chatId} user={user} perfil={perfil} alerta={chatGlobal.alerta} onCerrar={() => setChatGlobal(null)} onResuelto={() => { setMiAlerta(null); setChatGlobal(null); }} />;

  return (
    <div>
      {alertasOtros.length > 0 && (
        <div style={{ background: "#140404", border: `1px solid ${C.red}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ color: C.red, fontWeight: 800, fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>🆘 RADASHI NECESITA AYUDA</div>
          {alertasOtros.map((a, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 8, padding: 10, marginBottom: i < alertasOtros.length - 1 ? 6 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{a.userNombre} — {a.tipo}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>📍 {a.zona}{a.userMoto ? " · 🏍️ " + a.userMoto : ""}</div>
                </div>
              </div>
              <button onClick={() => puedoAyudar(a)} style={{ width: "100%", background: C.red, border: "none", borderRadius: 8, padding: 9, color: C.orange, fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: 1 }}>🤝 PUEDO AYUDAR</button>
            </div>
          ))}
        </div>
      )}

      {miAlerta && (
        <div style={{ background: "#140400", border: `1px solid ${C.red}66`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{miAlerta.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.red, fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>TU ALERTA ESTÁ ACTIVA</div>
              <div style={{ color: C.muted, fontSize: 11 }}>{miAlerta.tipo} · {miAlerta.zona}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={desactivarAlerta} style={{ flex: 1, background: C.green, border: "none", borderRadius: 8, padding: 9, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>✅ YA ESTOY BIEN</button>
            {chatGlobal && <button onClick={() => setChatGlobal(chatGlobal)} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 9, color: C.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>💬 Ver chat</button>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", background: C.surface, borderRadius: 10, padding: 3, marginBottom: 14, border: `1px solid ${C.border}` }}>
        {radarTabs.map(t => (
          <button key={t.id} onClick={() => setRadarTab(t.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", background: radarTab === t.id ? (t.id === "emergencia" ? C.red : C.orange) : "transparent", color: radarTab === t.id ? (t.id === "emergencia" ? C.orange : C.bg) : C.muted, fontWeight: radarTab === t.id ? 800 : 400, fontSize: 11, letterSpacing: radarTab === t.id ? 0.5 : 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {radarTab === "radashis" && (
        <div>
          <SectionBar label="RADASHIS CERCA 📡" />
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>Conecta con moteros de la comunidad cerca de tu zona.</div>
          {nearbyUsers.map(u => (
            <div key={u.id} onClick={() => setSelected(u)} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, borderTop: `2px solid ${u.clan ? C.orange : C.red}`, padding: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.card, border: `2px solid ${u.clan ? C.orange : C.red}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{u.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                  {u.clan && <ClanBadge />}
                </div>
                <div style={{ color: C.muted, fontSize: 11 }}>📍 {u.zona} · ~{u.km} km</div>
                <div style={{ color: C.orange, fontSize: 11 }}>🏍️ {u.moto}</div>
              </div>
              <span style={{ color: C.border, fontSize: 18 }}>›</span>
            </div>
          ))}
          {selected && (
            <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setSelected(null)}>
              <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", padding: 22, borderTop: `2px solid ${C.orange}` }} onClick={e => e.stopPropagation()}>
                <div style={{ width: 36, height: 3, background: C.border, borderRadius: 2, margin: "0 auto 18px" }} />
                <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.card, border: `2px solid ${selected.clan ? C.orange : C.red}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{selected.avatar}</div>
                  <div>
                    <div style={{ color: C.text, fontWeight: 900, fontSize: 18 }}>{selected.name}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>📍 {selected.zona} · ~{selected.km} km</div>
                    <div style={{ color: C.orange, fontSize: 12 }}>🏍️ {selected.moto}</div>
                    {selected.clan && <ClanBadge />}
                  </div>
                </div>
                <div style={{ color: C.muted, fontSize: 13, padding: "10px 14px", background: C.card, borderRadius: 10, marginBottom: 14, borderLeft: `3px solid ${C.orange}` }}>"{selected.bio}"</div>
                <BtnMain onClick={() => setSelected(null)}>💬 ENVIAR MENSAJE</BtnMain>
              </div>
            </div>
          )}
        </div>
      )}

      {radarTab === "puntos" && (
        <div>
          <SectionBar label="PUNTOS ÚTILES 🧭" />
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>Lugares que pueden ayudarte si vas en moto o estás en ruta.</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, marginBottom: 8 }}>
            {categoriasFiltro.map(cat => (
              <button key={cat} onClick={() => setCategoriaFiltro(cat)} style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 20, border: `1px solid ${categoriaFiltro === cat ? C.orange : C.border}`, background: categoriaFiltro === cat ? C.orangeGlow : "transparent", color: categoriaFiltro === cat ? C.orange : C.muted, fontSize: 11, cursor: "pointer", fontWeight: categoriaFiltro === cat ? 700 : 400 }}>{cat}</button>
            ))}
          </div>
          {puntosFiltrados.map(p => (
            <div key={p.id} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, borderTop: `2px solid ${p.aliado ? C.orange : C.red}`, padding: 12, marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{p.nombre}</span>
                  {p.aliado && <span style={{ background: C.orange, color: C.bg, fontSize: 8, padding: "1px 5px", borderRadius: 6, fontWeight: 800, letterSpacing: 1 }}>ALIADO</span>}
                </div>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 2 }}>📍 {p.zona}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{p.desc}</div>
                <span style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "2px 8px", color: C.muted, fontSize: 10, display: "inline-block", marginTop: 5 }}>{p.tipo}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {radarTab === "emergencia" && (
        <div>
          <SectionBar label="MODO EMERGENCIA 🆘" />
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>¿Necesitas ayuda? Activa una alerta y un Radashi cercano puede ayudarte.</div>

          {!miAlerta ? (
            <BtnMain red onClick={() => setPedirAyuda(true)} style={{ marginBottom: 12, fontSize: 16, padding: 16 }}>
              🆘 PEDIR AYUDA AHORA
            </BtnMain>
          ) : (
            <div style={{ background: "#140404", border: `1px solid ${C.red}`, borderRadius: 10, padding: 18, marginBottom: 12, textAlign: "center" }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>{miAlerta.icon}</div>
              <div style={{ color: C.red, fontWeight: 900, fontSize: 15, marginBottom: 4, letterSpacing: 1 }}>ALERTA ACTIVA</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>{miAlerta.tipo} · {miAlerta.zona}</div>
              <button onClick={desactivarAlerta} style={{ background: C.green, border: "none", borderRadius: 10, padding: "11px 24px", color: "#fff", fontWeight: 900, fontSize: 13, cursor: "pointer", letterSpacing: 1 }}>✅ YA ESTOY BIEN</button>
            </div>
          )}

          <div style={{ background: "#040A04", border: `1px solid ${C.green}44`, borderRadius: 10, padding: 12 }}>
            <div style={{ color: C.green, fontWeight: 700, fontSize: 12, marginBottom: 4, letterSpacing: 1 }}>⚠️ IMPORTANTE</div>
            <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>En caso de emergencia médica real, llama al 911. Esta sección es apoyo entre moteros para situaciones comunes.</div>
            <a href={"https://wa.me/" + SOPORTE_WA} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 10, color: C.green, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>🟢 Contactar soporte Radashi por WhatsApp</a>
          </div>
        </div>
      )}

      {pedirAyuda && <PedirAyuda user={user} perfil={perfil} onCerrar={() => setPedirAyuda(false)} onAlertaCreada={(alerta) => { setMiAlerta(alerta); showToast("¡Alerta enviada! Los Radashis cercanos pueden verte 🆘"); }} />}
    </div>
  );
}

// ── APP PRINCIPAL ────────────────────────────────────────────
export default function RadashiApp({ user, onLogout }) {
  const [tab, setTab] = useState("feed");
  const [toast, setToast] = useState(null);
  const [editando, setEditando] = useState(false);
  const [perfil, setPerfil] = useState({});
  const [visor, setVisor] = useState(null);
  const [miAlerta, setMiAlerta] = useState(null);
  const [chatGlobal, setChatGlobal] = useState(null);
  const [notificacion, setNotificacion] = useState(null);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "usuarios", user.uid)).then(snap => {
        if (snap.exists()) setPerfil(snap.data());
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "emergencias"), where("userId", "==", user.uid), where("activa", "==", true), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      if (snap.docs.length > 0) {
        const d = snap.docs[0];
        setMiAlerta({ id: d.id, ...d.data() });
      } else {
        setMiAlerta(null);
      }
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "notificaciones", user.uid), snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (!data.leido) setNotificacion(data);
      }
    });
    return unsub;
  }, [user]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const desactivarAlertaGlobal = async () => {
    if (!miAlerta) return;
    try {
      await updateDoc(doc(db, "emergencias", miAlerta.id), { activa: false });
      setMiAlerta(null);
      showToast("Alerta desactivada ✅");
    } catch (e) { console.error(e); }
  };

  const tabs = [
    { id: "feed", icon: "🏠", label: "Inicio" },
    { id: "cerca", icon: "📡", label: "Radar" },
    { id: "clan", icon: "⭐", label: "Clan" },
    { id: "perfil", icon: "👤", label: "Mi Moto" },
  ];

  const subtitulos = {
    feed: perfil.nombre || user?.email,
    cerca: "Radar · Comunidad",
    clan: "Clan · Contenido exclusivo",
    perfil: "Mi Moto · Perfil técnico",
  };

  if (editando) return <EditarPerfil user={user} perfil={perfil} onGuardar={(data) => { setPerfil(data); setEditando(false); showToast("Perfil guardado 🔥"); }} onCancelar={() => setEditando(false)} />;
  if (visor) return <Visor url={visor.url} titulo={visor.titulo} onCerrar={() => setVisor(null)} />;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 90, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#fff", padding: "10px 20px", borderRadius: 20, fontWeight: 700, fontSize: 13, zIndex: 500, letterSpacing: 1 }}>{toast}</div>
      )}

      {/* Notificación global */}
      {notificacion && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: C.red, padding: "12px 16px", zIndex: 600, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🆘</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>{notificacion.ayudanteNombre} quiere ayudarte</div>
            <div style={{ color: "#ffffff88", fontSize: 11 }}>{notificacion.tipo}</div>
          </div>
          <button onClick={async () => {
            await updateDoc(doc(db, "notificaciones", user.uid), { leido: true });
            setChatGlobal({ chatId: notificacion.chatId, alerta: { id: notificacion.alertaId, tipo: notificacion.tipo, zona: notificacion.zona, userId: user.uid } });
            setNotificacion(null);
          }} style={{ background: "#fff", border: "none", borderRadius: 20, padding: "5px 12px", color: C.red, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>VER CHAT</button>
          <button onClick={async () => { await updateDoc(doc(db, "notificaciones", user.uid), { leido: true }); setNotificacion(null); }} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Banner alerta activa global */}
      {miAlerta && (
        <div style={{ background: "#140400", borderBottom: `1px solid ${C.red}66`, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{miAlerta.icon}</span>
          <div style={{ flex: 1, color: C.red, fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>ALERTA ACTIVA — {miAlerta.tipo}</div>
          <button onClick={desactivarAlertaGlobal} style={{ background: C.green, border: "none", borderRadius: 20, padding: "4px 10px", color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: 1, flexShrink: 0 }}>✅ YA ESTOY BIEN</button>
        </div>
      )}

      {/* Header */}
      <AppHeader user={user} perfil={perfil} onLogout={onLogout} subtitulo={subtitulos[tab]} />

      {/* Chat global */}
      {chatGlobal && (
        <ChatAyuda chatId={chatGlobal.chatId} user={user} perfil={perfil} alerta={chatGlobal.alerta} onCerrar={() => setChatGlobal(null)} onResuelto={() => { setMiAlerta(null); setChatGlobal(null); }} />
      )}

      <div style={{ padding: 14 }}>

        {/* FEED */}
        {tab === "feed" && <Feed user={user} perfil={perfil} />}

        {/* RADAR */}
        {tab === "cerca" && <Radar user={user} perfil={perfil} showToast={showToast} miAlerta={miAlerta} setMiAlerta={setMiAlerta} chatGlobal={chatGlobal} setChatGlobal={setChatGlobal} />}

        {/* CLAN */}
        {tab === "clan" && (
          <div>
            <div style={{ background: "linear-gradient(135deg, #140800, #1A0C00)", border: `1px solid ${C.orange}44`, borderTop: `2px solid ${C.orange}`, borderRadius: 12, padding: 18, marginBottom: 12 }}>
              <div style={{ color: C.orange, fontSize: 10, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>⭐ CLAN RADASHI</div>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 18, lineHeight: 1.2, marginBottom: 6 }}>Deja de adivinar, empieza a entender tu moto</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>Clases en vivo · Grabaciones · Guías · Comunidad exclusiva</div>
              <BtnMain onClick={() => setVisor({ url: "https://nas.com/es-mx/zona-radashi/home", titulo: "Clan Radashi" })}>
                ÚNETE AL CLAN 🔥
              </BtnMain>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.red}`, borderRadius: 12, padding: 18 }}>
              <div style={{ color: C.red, fontSize: 10, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>🛒 TIENDA OFICIAL</div>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 18, lineHeight: 1.2, marginBottom: 6 }}>Refacciones, accesorios y más</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>Todo lo que tu moto necesita en un solo lugar</div>
              <BtnMain onClick={() => setVisor({ url: "https://tallerdemotoszonaradashi.com/", titulo: "Tienda Zona Radashi" })}>
                IR A LA TIENDA 🛍️
              </BtnMain>
            </div>
          </div>
        )}

        {/* MI MOTO */}
        {tab === "perfil" && (
          <div>
            <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.orange}`, padding: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar foto={perfil.foto} size={54} />
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontWeight: 900, fontSize: 17 }}>{perfil.nombre || "Sin nombre"}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{user?.email}</div>
                {perfil.ciudad && <div style={{ color: C.muted, fontSize: 11 }}>📍 {perfil.ciudad}</div>}
              </div>
              <button onClick={() => setEditando(true)} style={{ background: C.orangeGlow, border: `1px solid ${C.orange}`, color: C.orange, borderRadius: 20, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✏️ Editar</button>
            </div>
            <MiMoto user={user} />
          </div>
        )}
      </div>

      {/* TAB BAR */}
      <div style={{ position: "fixed", bottom: 0, width: "100%", background: C.bg, borderTop: `2px solid ${C.red}`, display: "flex", padding: "8px 0 18px" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ fontSize: 20, filter: tab === t.id ? "none" : "grayscale(1) opacity(0.25)" }}>{t.icon}</div>
            <div style={{ fontSize: 9, fontWeight: tab === t.id ? 800 : 400, color: tab === t.id ? C.orange : "#444", letterSpacing: tab === t.id ? 0.5 : 0 }}>{t.label}</div>
            {tab === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.orange }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
