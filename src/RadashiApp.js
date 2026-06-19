import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import {
  doc, setDoc, getDoc, collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, where, updateDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import MiMoto from "./MiMoto";

const C = {
  bg: "#F5F5F0", surface: "#FFFFFF", card: "#F0EFE8",
  orange: "#ffa22e", orangeGlow: "#ffa22e18",
  red: "#980604", redGlow: "#98060412",
  text: "#1A1A1A", muted: "#888888", border: "#E0DED8",
  green: "#22C55E", greenGlow: "#22C55E18",
};

const GEAR_SVG_LIGHT = `
<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 40 40' fill='none'>
  <circle cx='20' cy='20' r='18' fill='none' stroke='%23980604' stroke-width='0.4' opacity='0.15'/>
  <circle cx='20' cy='20' r='11' fill='none' stroke='%23ffa22e' stroke-width='0.4' stroke-dasharray='2 2' opacity='0.2'/>
  <circle cx='20' cy='20' r='4' fill='none' stroke='%23980604' stroke-width='0.4' opacity='0.15'/>
  <rect x='19.3' y='2' width='1.4' height='4' rx='0.7' fill='%23ffa22e' opacity='0.2'/>
  <rect x='19.3' y='34' width='1.4' height='4' rx='0.7' fill='%23ffa22e' opacity='0.2'/>
  <rect x='2' y='19.3' width='4' height='1.4' rx='0.7' fill='%23ffa22e' opacity='0.2'/>
  <rect x='34' y='19.3' width='4' height='1.4' rx='0.7' fill='%23ffa22e' opacity='0.2'/>
  <rect x='27' y='5' width='1.4' height='3.5' rx='0.7' fill='%23980604' opacity='0.15' transform='rotate(45 27.7 6.75)'/>
  <rect x='5' y='27' width='1.4' height='3.5' rx='0.7' fill='%23980604' opacity='0.15' transform='rotate(45 5.7 28.75)'/>
  <rect x='27' y='27' width='1.4' height='3.5' rx='0.7' fill='%23980604' opacity='0.15' transform='rotate(-45 27.7 28.75)'/>
  <rect x='5' y='5' width='1.4' height='3.5' rx='0.7' fill='%23980604' opacity='0.15' transform='rotate(-45 5.7 6.75)'/>
</svg>`;

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
const HEARTBEAT_INTERVAL = 30000;  // cada 30 segundos
const OFFLINE_THRESHOLD = 2 * 60 * 1000; // 2 minutos sin heartbeat = fuera de línea

const gearBg = {
  backgroundImage: `url("data:image/svg+xml,${GEAR_SVG_LIGHT}")`,
  backgroundSize: "80px 80px",
  backgroundRepeat: "repeat",
};

// ── presencia con heartbeat ──────────────────────────────────────────────────

async function enviarHeartbeat(uid) {
  try {
    await updateDoc(doc(db, "usuarios", uid), {
      enLinea: true,
      ultimoVisto: Date.now(), // timestamp numérico, no serverTimestamp
    });
  } catch (_) {}
}

async function marcarFueraDeLinea(uid) {
  try {
    await updateDoc(doc(db, "usuarios", uid), {
      enLinea: false,
      ultimoVisto: Date.now(),
    });
  } catch (_) {}
}

// Dado el ultimoVisto de un usuario, ¿está en línea?
function estaEnLinea(usuario) {
  if (!usuario.enLinea) return false;
  if (!usuario.ultimoVisto) return false;
  return (Date.now() - usuario.ultimoVisto) < OFFLINE_THRESHOLD;
}

// ── componentes base ─────────────────────────────────────────────────────────

function Gear({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" fill="#FFF3E0" stroke="#980604" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="#ffa22e" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="20" cy="20" r="6" fill="#980604" />
      <circle cx="20" cy="20" r="2.5" fill="#ffa22e" />
      <rect x="19" y="2" width="2" height="5" rx="1" fill="#ffa22e" />
      <rect x="19" y="33" width="2" height="5" rx="1" fill="#ffa22e" />
      <rect x="2" y="19" width="5" height="2" rx="1" fill="#ffa22e" />
      <rect x="33" y="19" width="5" height="2" rx="1" fill="#ffa22e" />
      <rect x="27" y="5" width="2" height="4" rx="1" fill="#980604" transform="rotate(45 28 7)" />
      <rect x="5" y="27" width="2" height="4" rx="1" fill="#980604" transform="rotate(45 6 29)" />
      <rect x="27" y="27" width="2" height="4" rx="1" fill="#980604" transform="rotate(-45 28 29)" />
      <rect x="5" y="5" width="2" height="4" rx="1" fill="#980604" transform="rotate(-45 6 7)" />
    </svg>
  );
}

function SectionBar({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 4 }}>
      <div style={{ width: 20, height: 2, background: C.red }} />
      <div style={{ color: C.orange, fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function AppHeader({ user, perfil, onLogout, subtitulo }) {
  return (
    <div style={{ background: C.surface, borderBottom: `2px solid ${C.red}`, padding: "14px 16px 12px", position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px #00000012" }}>
      <Gear size={40} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 2, lineHeight: 1 }}>
          <span style={{ color: C.red }}>ZONA </span>
          <span style={{ color: C.orange }}>RADASHI</span>
        </div>
        <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{subtitulo || perfil.nombre || user?.email}</div>
      </div>
      <button onClick={onLogout} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px", color: C.muted, fontSize: 10, cursor: "pointer" }}>Salir</button>
    </div>
  );
}

function Avatar({ foto, size = 48, emoji = "😎", accent = C.orange }) {
  if (foto) return <img src={foto} alt="perfil" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${accent}`, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: accent === C.orange ? "#FFF3E0" : "#FFF0F0", border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, flexShrink: 0 }}>
      {emoji}
    </div>
  );
}

function PuntoPresencia({ enLinea }) {
  return (
    <div style={{ width: 10, height: 10, borderRadius: "50%", background: enLinea ? C.green : C.border, border: `2px solid ${C.surface}`, flexShrink: 0 }} />
  );
}

function ClanBadge() {
  return <span style={{ background: C.red, color: C.orange, fontSize: 8, padding: "1px 5px", borderRadius: 6, fontWeight: 800, letterSpacing: 1 }}>CLAN</span>;
}

function BtnMain({ children, onClick, disabled, red, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: "100%", background: red ? C.red : C.orange, border: "none", borderRadius: 10, padding: 13, color: red ? C.orange : "#fff", fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, boxShadow: red ? `0 2px 8px ${C.red}44` : `0 2px 8px ${C.orange}44`, ...style }}>
      {children}
    </button>
  );
}

// ── ChatDirecto ───────────────────────────────────────────────────────────────

function ChatDirecto({ chatId, user, perfil, otroUsuario, onCerrar }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    const q = query(collection(db, "chatsDirectos", chatId, "mensajes"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMensajes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [chatId]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setLoading(true);
    const textoEnviar = texto;
    setTexto("");
    try {
      await addDoc(collection(db, "chatsDirectos", chatId, "mensajes"), {
        texto: textoEnviar,
        userId: user.uid,
        userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null,
        createdAt: serverTimestamp(),
      });

      // Guardar metadata del chat
      await setDoc(doc(db, "chatsDirectos", chatId), {
        participantes: [user.uid, otroUsuario.uid],
        ultimoMensaje: textoEnviar,
        ultimaFecha: serverTimestamp(),
        [user.uid + "_nombre"]: perfil.nombre || user.email,
        [otroUsuario.uid + "_nombre"]: otroUsuario.nombre || otroUsuario.email,
        [user.uid + "_foto"]: perfil.foto || null,
        [otroUsuario.uid + "_foto"]: otroUsuario.foto || null,
      }, { merge: true });

      // Notificación al destinatario
      await setDoc(doc(db, "notificacionesChat", otroUsuario.uid), {
        chatId,
        deChatId: chatId,
        deNombre: perfil.nombre || user.email,
        deFoto: perfil.foto || null,
        deUid: user.uid,
        ultimoMensaje: textoEnviar,
        leido: false,
        updatedAt: serverTimestamp(),
      }, { merge: true });

    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = ts.toDate();
    return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
  };

  const esMio = (msg) => msg.userId === user.uid;
  const online = estaEnLinea(otroUsuario);

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 500, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", ...gearBg }}>
      <div style={{ background: C.surface, borderBottom: `2px solid ${C.red}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px #00000012" }}>
        <button onClick={onCerrar} style={{ background: "none", border: "none", color: C.red, fontSize: 22, cursor: "pointer" }}>←</button>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFF3E0", border: `2px solid ${C.orange}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, overflow: "hidden" }}>
            {otroUsuario.foto ? <img src={otroUsuario.foto} alt="perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>😎</span>}
          </div>
          <div style={{ position: "absolute", bottom: 0, right: 0 }}><PuntoPresencia enLinea={online} /></div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>{otroUsuario.nombre || otroUsuario.email?.split("@")[0] || "Radashi"}</div>
          <div style={{ color: online ? C.green : C.muted, fontSize: 11 }}>{online ? "● En línea" : "○ Fuera de línea"}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {mensajes.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏍️</div>
            Saluda a {otroUsuario.nombre || "este Radashi"}
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: esMio(m) ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
            {!esMio(m) && <Avatar foto={m.userFoto} size={28} />}
            <div style={{ maxWidth: "75%" }}>
              {!esMio(m) && <div style={{ color: C.orange, fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{m.userNombre}</div>}
              <div style={{ background: esMio(m) ? C.orange : C.surface, color: esMio(m) ? "#fff" : C.text, padding: "10px 14px", borderRadius: esMio(m) ? "18px 18px 4px 18px" : "18px 18px 18px 4px", fontSize: 14, border: esMio(m) ? "none" : `1px solid ${C.border}`, boxShadow: "0 1px 4px #00000010" }}>
                {m.texto}
                <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: "right" }}>{formatTime(m.createdAt)}</div>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ background: C.surface, padding: "8px 16px 28px", display: "flex", gap: 10, alignItems: "center", borderTop: `1px solid ${C.border}` }}>
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === "Enter" && enviar()}
          placeholder={`Mensaje a ${otroUsuario.nombre || "Radashi"}...`}
          style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "10px 16px", color: C.text, fontSize: 14, outline: "none" }}
        />
        <button onClick={enviar} disabled={loading || !texto.trim()} style={{ width: 42, height: 42, borderRadius: "50%", background: texto.trim() ? C.orange : C.card, border: "none", cursor: "pointer", fontSize: 18, color: "#fff" }}>↑</button>
      </div>
    </div>
  );
}

// ── ChatAyuda ────────────────────────────────────────────────────────────────

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
        texto: msg, userId: user.uid, userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null, tipo: "texto", createdAt: serverTimestamp(),
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
        url, userId: user.uid, userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null, tipo: "ubicacion", createdAt: serverTimestamp(),
      });
    });
  };

  const compartirNumero = async () => {
    await addDoc(collection(db, "chats", chatId, "mensajes"), {
      texto: `📞 ${perfil.nombre || "Yo"} compartió su número: ${perfil.telefono || "No registrado"}`,
      userId: user.uid, userNombre: perfil.nombre || user.email,
      userFoto: perfil.foto || null, tipo: "numero", createdAt: serverTimestamp(),
    });
  };

  const marcarResuelto = async () => {
    try {
      await updateDoc(doc(db, "emergencias", alerta.id), { activa: false, resuelta: true });
      await addDoc(collection(db, "chats", chatId, "mensajes"), {
        texto: "✅ Emergencia resuelta. ¡Gracias a todos!",
        userId: "sistema", userNombre: "Sistema", tipo: "sistema", createdAt: serverTimestamp(),
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
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 500, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", ...gearBg }}>
      <div style={{ background: C.surface, borderBottom: `2px solid ${C.red}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px #00000012" }}>
        <button onClick={onCerrar} style={{ background: "none", border: "none", color: C.red, fontSize: 22, cursor: "pointer" }}>←</button>
        <Gear size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ color: C.red, fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>🆘 CHAT DE AYUDA</div>
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
                  <div style={{ background: esMio(m) ? C.orange : C.surface, color: esMio(m) ? "#fff" : C.text, padding: "10px 14px", borderRadius: esMio(m) ? "18px 18px 4px 18px" : "18px 18px 18px 4px", fontSize: 14, border: esMio(m) ? "none" : `1px solid ${C.border}`, boxShadow: "0 1px 4px #00000010" }}>
                    {m.tipo === "ubicacion" ? (
                      <div>{m.texto}<br /><a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: esMio(m) ? "#fff" : C.orange, fontSize: 12 }}>Ver en Google Maps ↗</a></div>
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
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: "10px 16px 0", boxShadow: "0 -2px 8px #00000010" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
          {[{ label: "📍 Mi ubicación", action: compartirUbicacion }, { label: "📞 Mi número", action: compartirNumero }].map((b, i) => (
            <button key={i} onClick={b.action} style={{ flexShrink: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 14px", color: C.text, fontSize: 12, cursor: "pointer" }}>{b.label}</button>
          ))}
          <a href={"https://wa.me/" + SOPORTE_WA} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, background: "#F0FFF4", border: `1px solid ${C.green}`, borderRadius: 20, padding: "6px 14px", color: C.green, fontSize: 12, cursor: "pointer", textDecoration: "none" }}>🟢 Soporte</a>
          {alerta.userId === user.uid && (
            <button onClick={marcarResuelto} style={{ flexShrink: 0, background: C.greenGlow, border: `1px solid ${C.green}`, borderRadius: 20, padding: "6px 14px", color: C.green, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✅ Ya estoy bien</button>
          )}
        </div>
      </div>
      <div style={{ background: C.surface, padding: "8px 16px 28px", display: "flex", gap: 10, alignItems: "center" }}>
        <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === "Enter" && enviar()} placeholder="Escribe algo..." style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "10px 16px", color: C.text, fontSize: 14, outline: "none" }} />
        <button onClick={() => enviar()} disabled={loading || !texto.trim()} style={{ width: 42, height: 42, borderRadius: "50%", background: texto.trim() ? C.orange : C.card, border: "none", cursor: "pointer", fontSize: 18, color: "#fff" }}>↑</button>
      </div>
    </div>
  );
}

// ── PedirAyuda ───────────────────────────────────────────────────────────────

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
        tipo: tipo.label, icon: tipo.icon, userId: user.uid,
        userNombre: perfil.nombre || user.email, userFoto: perfil.foto || null,
        userMoto: perfil.marca ? perfil.marca + " " + perfil.modelo : null,
        zona, activa: true, createdAt: serverTimestamp(),
      });
      onAlertaCreada({ id: docRef.id, tipo: tipo.label, icon: tipo.icon, zona, userId: user.uid, userNombre: perfil.nombre || user.email });
      onCerrar();
    } catch (e) { console.error(e); }
    setEnviando(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={onCerrar}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", borderTop: `3px solid ${C.red}` }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 36, height: 3, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
          <div style={{ color: C.red, fontWeight: 900, fontSize: 17, letterSpacing: 1 }}>{paso === 1 ? "🆘 ¿QUÉ PASÓ?" : "📍 ¿DÓNDE ESTÁS?"}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{paso === 1 ? "Elige tu situación" : "Comparte tu zona aproximada"}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {paso === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {tiposEmergencia.map(t => (
                <button key={t.id} onClick={() => { setTipo(t); setPaso(2); }} style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.red}`, borderRadius: 10, padding: 14, cursor: "pointer", textAlign: "left", boxShadow: "0 1px 4px #00000008" }}>
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
              <BtnMain red onClick={enviarAlerta} disabled={enviando || !zona.trim()}>{enviando ? "ENVIANDO ALERTA..." : "🆘 PEDIR AYUDA AHORA"}</BtnMain>
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

// ── EditarPerfil ─────────────────────────────────────────────────────────────

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
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", ...gearBg }}>
      <div style={{ background: C.surface, borderBottom: `2px solid ${C.red}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px #00000012" }}>
        <button onClick={onCancelar} style={{ background: "none", border: "none", color: C.red, fontSize: 22, cursor: "pointer" }}>←</button>
        <Gear size={32} />
        <div style={{ color: C.text, fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>EDITAR PERFIL</div>
      </div>
      <div style={{ padding: 20, paddingBottom: 100 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Avatar foto={foto} size={90} />
            <button onClick={() => fileRef.current.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: C.orange, border: `2px solid ${C.bg}`, color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>📷</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: "none" }} />
          <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>{uploadingFoto ? "Subiendo foto..." : "Toca 📷 para cambiar foto"}</div>
        </div>
        {campos.map((c, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ color: C.red, fontSize: 10, marginBottom: 5, fontWeight: 800, letterSpacing: 1 }}>{c.label.toUpperCase()}</div>
            <input value={c.val} onChange={e => c.set(e.target.value)} placeholder={c.placeholder} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", boxShadow: "0 1px 4px #00000008" }} />
          </div>
        ))}
        <BtnMain onClick={handleGuardar} disabled={loading || uploadingFoto}>{loading ? "GUARDANDO..." : "GUARDAR PERFIL 🔥"}</BtnMain>
      </div>
    </div>
  );
}

// ── NuevoPost ────────────────────────────────────────────────────────────────

function NuevoPost({ user, perfil, onCerrar }) {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePublicar = async () => {
    if (!texto.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "posts"), {
        texto, userId: user.uid, userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null,
        userMoto: perfil.marca ? perfil.marca + " " + perfil.modelo : null,
        likes: 0, comentarios: 0, createdAt: serverTimestamp(),
      });
      onCerrar();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={onCerrar}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", padding: 20, borderTop: `3px solid ${C.orange}` }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 3, background: C.border, borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
          <Avatar foto={perfil.foto} size={42} />
          <textarea value={texto} onChange={e => setTexto(e.target.value)} placeholder="¿Qué le pasa a tu moto hoy? 🏍️" autoFocus style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 13, outline: "none", resize: "none", minHeight: 90, fontFamily: "system-ui, sans-serif" }} />
        </div>
        <BtnMain onClick={handlePublicar} disabled={loading || !texto.trim()}>{loading ? "PUBLICANDO..." : "PUBLICAR 🔥"}</BtnMain>
      </div>
    </div>
  );
}

// ── Comentarios ──────────────────────────────────────────────────────────────

function Comentarios({ postId, user, perfil, onCerrar }) {
  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "posts", postId, "comentarios"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => { setComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return unsub;
  }, [postId]);

  const handleComentar = async () => {
    if (!texto.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "posts", postId, "comentarios"), {
        texto, userId: user.uid, userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null, createdAt: serverTimestamp(),
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
    <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={onCerrar}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", borderTop: `3px solid ${C.orange}` }} onClick={e => e.stopPropagation()}>
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
          <button onClick={handleComentar} disabled={loading || !texto.trim()} style={{ width: 38, height: 38, borderRadius: "50%", background: texto.trim() ? C.orange : C.card, border: "none", cursor: "pointer", fontSize: 16, color: "#fff" }}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ── Feed ─────────────────────────────────────────────────────────────────────

function Feed({ user, perfil }) {
  const [posts, setPosts] = useState([]);
  const [nuevoPost, setNuevoPost] = useState(false);
  const [liked, setLiked] = useState({});
  const [verComentarios, setVerComentarios] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => { setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
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
      <div onClick={() => setNuevoPost(true)} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.orange}`, padding: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", boxShadow: "0 1px 4px #00000008" }}>
        <Avatar foto={perfil.foto} size={38} />
        <div style={{ flex: 1, background: C.card, borderRadius: 20, padding: "9px 14px", color: C.muted, fontSize: 13 }}>¿Qué le pasa a tu moto hoy? 🏍️</div>
      </div>
      {posts.length === 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48 }}>🏍️</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginTop: 10 }}>Sé el primero en publicar</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>Comparte algo con la comunidad Radashi</div>
        </div>
      )}
      {posts.map(p => (
        <div key={p.id} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, borderTop: `2px solid ${p.userId === user.uid ? C.orange : C.red}`, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 4px #00000008" }}>
          <div style={{ padding: "12px 12px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar foto={p.userFoto} size={40} accent={p.userId === user.uid ? C.orange : C.red} />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{p.userNombre}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>{p.userMoto && <span>🏍️ {p.userMoto} · </span>}{formatTime(p.createdAt)}</div>
            </div>
          </div>
          <div style={{ padding: "0 12px 10px" }}>
            <p style={{ color: C.text, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{p.texto}</p>
          </div>
          <div style={{ display: "flex", padding: "8px 12px", borderTop: `1px solid ${C.border}`, gap: 16, background: C.card }}>
            <button onClick={async () => {
              const nuevoLiked = !liked[p.id];
              setLiked(l => ({ ...l, [p.id]: nuevoLiked }));
              await setDoc(doc(db, "posts", p.id), { likes: (p.likes || 0) + (nuevoLiked ? 1 : -1) }, { merge: true });
            }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: liked[p.id] ? C.orange : C.muted, fontSize: 12, fontWeight: liked[p.id] ? 700 : 400 }}>
              🔥 {liked[p.id] ? (p.likes || 0) + 1 : (p.likes || 0)}
            </button>
            <button onClick={() => setVerComentarios(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>💬 {p.comentarios || 0}</button>
            <button style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", color: C.muted, fontSize: 12 }}>↗ Compartir</button>
          </div>
        </div>
      ))}
      {nuevoPost && <NuevoPost user={user} perfil={perfil} onCerrar={() => setNuevoPost(false)} />}
      {verComentarios && <Comentarios postId={verComentarios} user={user} perfil={perfil} onCerrar={() => setVerComentarios(null)} />}
    </div>
  );
}

// ── Visor ────────────────────────────────────────────────────────────────────

function Visor({ url, titulo, onCerrar }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", ...gearBg }}>
      <div style={{ background: C.surface, borderBottom: `2px solid ${C.red}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, boxShadow: "0 2px 8px #00000012" }}>
        <button onClick={onCerrar} style={{ background: "none", border: "none", color: C.red, fontSize: 22, cursor: "pointer", flexShrink: 0 }}>←</button>
        <Gear size={32} />
        <div style={{ color: C.text, fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{titulo}</div>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, fontSize: 12, flexShrink: 0, textDecoration: "none" }}>↗</a>
      </div>
      {cargando && !error && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 10 }}><Gear size={48} /><div style={{ color: C.muted, fontSize: 13 }}>Cargando...</div></div>}
      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 16, flex: 1 }}>
          <div style={{ fontSize: 44 }}>🔒</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 15, textAlign: "center" }}>Esta página no permite abrirse aquí</div>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: C.orange, borderRadius: 10, padding: "12px 28px", color: "#fff", fontWeight: 900, fontSize: 14, textDecoration: "none", letterSpacing: 1 }}>ABRIR EN NAVEGADOR ↗</a>
        </div>
      )}
      <iframe src={url} style={{ flex: 1, border: "none", width: "100%", minHeight: "calc(100vh - 60px)", display: error ? "none" : "block" }} title={titulo} onLoad={() => setCargando(false)} onError={() => { setCargando(false); setError(true); }} />
    </div>
  );
}

// ── Radar ────────────────────────────────────────────────────────────────────

function Radar({ user, perfil, showToast, miAlerta, setMiAlerta, chatGlobal, setChatGlobal }) {
  const [radarTab, setRadarTab] = useState("radashis");
  const [selected, setSelected] = useState(null);
  const [chatDirecto, setChatDirecto] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [alertasActivas, setAlertasActivas] = useState([]);
  const [pedirAyuda, setPedirAyuda] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
  const ubicacionGuardadaRef = useRef(false);

  useEffect(() => {
    if (!user?.uid || ubicacionGuardadaRef.current) return;
    const guardarUbicacion = async () => {
      setCargandoUbicacion(true);
      try {
        const coords = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error("no-geo"));
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false });
        });
        const { latitude, longitude } = coords.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10&accept-language=es`, { headers: { "User-Agent": "ZonaRadashiApp/1.0" } });
        const data = await res.json();
        const addr = data.address || {};
        const ciudad = addr.city || addr.town || addr.municipality || addr.village || addr.county || "Desconocida";
        const estado = addr.state || addr.region || "Desconocido";
        const pais = addr.country_code?.toUpperCase() || "MX";
        setMiUbicacion({ ciudad, estado, pais });
        await updateDoc(doc(db, "usuarios", user.uid), { ubicacion: { ciudad, estado, pais, actualizadoEn: new Date().toISOString() } });
        ubicacionGuardadaRef.current = true;
      } catch (err) {
        setPermisoDenegado(true);
        try {
          const snap = await getDoc(doc(db, "usuarios", user.uid));
          if (snap.exists() && snap.data().ubicacion) setMiUbicacion(snap.data().ubicacion);
        } catch (_) {}
      } finally { setCargandoUbicacion(false); }
    };
    guardarUbicacion();
  }, [user?.uid]);

  // Escuchar TODOS los usuarios y filtrar por heartbeat reciente
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), (snapshot) => {
      const todos = snapshot.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => u.uid !== user?.uid && estaEnLinea(u));
      setUsuarios(todos);
    }, (err) => console.error(err));
    return () => unsub();
  }, [user?.uid]);

  const scoreCercania = (otraUbicacion) => {
    if (!miUbicacion || !otraUbicacion) return 3;
    if (miUbicacion.ciudad?.toLowerCase() === otraUbicacion.ciudad?.toLowerCase()) return 0;
    if (miUbicacion.estado?.toLowerCase() === otraUbicacion.estado?.toLowerCase()) return 1;
    if (miUbicacion.pais?.toLowerCase() === otraUbicacion.pais?.toLowerCase()) return 2;
    return 3;
  };

  const labelCercania = (score) => {
    switch (score) {
      case 0: return { texto: "Tu ciudad", color: C.green };
      case 1: return { texto: "Tu estado", color: C.orange };
      case 2: return { texto: "Tu país", color: C.muted };
      default: return { texto: "Otro país", color: C.border };
    }
  };

  const usuariosOrdenados = [...usuarios].sort((a, b) => scoreCercania(a.ubicacion) - scoreCercania(b.ubicacion));

  const abrirChatDirecto = (otroUsuario) => {
    const ids = [user.uid, otroUsuario.uid].sort();
    const chatId = "directo_" + ids[0] + "_" + ids[1];
    setChatDirecto({ chatId, otroUsuario });
    setSelected(null);
  };

  useEffect(() => {
    const q = query(collection(db, "emergencias"), where("activa", "==", true), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setAlertasActivas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); });
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
        userId: user.uid, userNombre: perfil.nombre || user.email, userFoto: perfil.foto || null, tipo: "texto", createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "notificaciones", alerta.userId), {
        chatId, alertaId: alerta.id, tipo: alerta.tipo, zona: alerta.zona,
        ayudanteNombre: perfil.nombre || user.email, ayudanteId: user.uid, leido: false, updatedAt: serverTimestamp(),
      }, { merge: true });
      setChatGlobal({ chatId, alerta });
    } catch (e) { console.error(e); }
  };

  const alertasOtros = alertasActivas.filter((a) => a.userId !== user.uid);
  const puntosFiltrados = categoriaFiltro === "Todos" ? puntosUtiles : puntosUtiles.filter((p) => p.tipo === categoriaFiltro);
  const radarTabs = [{ id: "radashis", label: "👥 Radashis" }, { id: "puntos", label: "🧭 Puntos" }, { id: "emergencia", label: "🆘 Emergencia" }];

  if (chatGlobal) return <ChatAyuda chatId={chatGlobal.chatId} user={user} perfil={perfil} alerta={chatGlobal.alerta} onCerrar={() => setChatGlobal(null)} onResuelto={() => { setMiAlerta(null); setChatGlobal(null); }} />;
  if (chatDirecto) return <ChatDirecto chatId={chatDirecto.chatId} user={user} perfil={perfil} otroUsuario={chatDirecto.otroUsuario} onCerrar={() => setChatDirecto(null)} />;

  return (
    <div>
      {alertasOtros.length > 0 && (
        <div style={{ background: "#FFF5F5", border: `1px solid ${C.red}44`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ color: C.red, fontWeight: 800, fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>🆘 RADASHI NECESITA AYUDA</div>
          {alertasOtros.map((a, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 8, padding: 10, marginBottom: i < alertasOtros.length - 1 ? 6 : 0, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px #00000008" }}>
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
        <div style={{ background: "#FFF5F5", border: `1px solid ${C.red}66`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{miAlerta.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.red, fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>TU ALERTA ESTÁ ACTIVA</div>
              <div style={{ color: C.muted, fontSize: 11 }}>{miAlerta.tipo} · {miAlerta.zona}</div>
            </div>
          </div>
          <button onClick={desactivarAlerta} style={{ width: "100%", background: C.green, border: "none", borderRadius: 8, padding: 9, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>✅ YA ESTOY BIEN</button>
        </div>
      )}

      <div style={{ display: "flex", background: C.surface, borderRadius: 10, padding: 3, marginBottom: 14, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px #00000008" }}>
        {radarTabs.map((t) => (
          <button key={t.id} onClick={() => setRadarTab(t.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", background: radarTab === t.id ? (t.id === "emergencia" ? C.red : C.orange) : "transparent", color: radarTab === t.id ? "#fff" : C.muted, fontWeight: radarTab === t.id ? 800 : 400, fontSize: 11 }}>{t.label}</button>
        ))}
      </div>

      {radarTab === "radashis" && (
        <div>
          <SectionBar label="RADASHIS EN LÍNEA 📡" />
          {cargandoUbicacion ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>📡</span>
              <div style={{ color: C.muted, fontSize: 12 }}>Detectando tu zona...</div>
            </div>
          ) : miUbicacion ? (
            <div style={{ background: C.greenGlow, border: `1px solid ${C.green}44`, borderRadius: 10, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <div style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>{miUbicacion.ciudad}, {miUbicacion.estado}</div>
              <div style={{ color: C.muted, fontSize: 11, marginLeft: "auto" }}>zona aproximada</div>
            </div>
          ) : permisoDenegado ? (
            <div style={{ background: "#FFF8F0", border: `1px solid ${C.orange}44`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ color: C.orange, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>📍 Activa tu ubicación para ver quién está cerca</div>
              <div style={{ color: C.muted, fontSize: 11 }}>Los usuarios se muestran igualmente, pero sin orden de cercanía.</div>
            </div>
          ) : null}

          {usuariosOrdenados.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 48 }}>🏍️</div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginTop: 10 }}>No hay Radashis en línea ahora</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Cuando otros usuarios abran la app aparecerán aquí</div>
            </div>
          ) : (
            usuariosOrdenados.map((u) => {
              const score = scoreCercania(u.ubicacion);
              const cerca = labelCercania(score);
              const esClan = u.clan || u.esClan || false;
              return (
                <div key={u.uid} onClick={() => setSelected(u)} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, borderTop: `2px solid ${esClan ? C.orange : C.red}`, padding: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", boxShadow: "0 1px 4px #00000008" }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: esClan ? "#FFF3E0" : "#FFF0F0", border: `2px solid ${esClan ? C.orange : C.red}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden" }}>
                      {u.foto ? <img src={u.foto} alt="perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>😎</span>}
                    </div>
                    <div style={{ position: "absolute", bottom: 1, right: 1 }}><PuntoPresencia enLinea={true} /></div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{u.nombre || u.email?.split("@")[0] || "Radashi"}</span>
                      {esClan && <ClanBadge />}
                    </div>
                    {u.ubicacion?.ciudad ? (
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>
                        📍 {u.ubicacion.ciudad}, {u.ubicacion.estado}
                        {miUbicacion && <span style={{ marginLeft: 6, color: cerca.color, fontWeight: 700, fontSize: 10 }}>· {cerca.texto}</span>}
                      </div>
                    ) : <div style={{ color: C.border, fontSize: 11, marginTop: 1 }}>📍 Zona no compartida</div>}
                    {(u.marca || u.modelo) && <div style={{ color: C.orange, fontSize: 11, fontWeight: 600, marginTop: 1 }}>🏍️ {[u.marca, u.modelo, u.anio].filter(Boolean).join(" ")}</div>}
                  </div>
                  <span style={{ color: C.border, fontSize: 18 }}>›</span>
                </div>
              );
            })
          )}

          {selected && (
            <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setSelected(null)}>
              <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", padding: 22, borderTop: `3px solid ${C.orange}` }} onClick={(e) => e.stopPropagation()}>
                <div style={{ width: 36, height: 3, background: C.border, borderRadius: 2, margin: "0 auto 18px" }} />
                <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#FFF3E0", border: `2px solid ${C.orange}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, overflow: "hidden" }}>
                      {selected.foto ? <img src={selected.foto} alt="perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>😎</span>}
                    </div>
                    <div style={{ position: "absolute", bottom: 2, right: 2 }}><PuntoPresencia enLinea={estaEnLinea(selected)} /></div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.text, fontWeight: 900, fontSize: 18 }}>{selected.nombre || selected.email?.split("@")[0] || "Radashi"}</div>
                    <div style={{ color: estaEnLinea(selected) ? C.green : C.muted, fontSize: 12 }}>{estaEnLinea(selected) ? "● En línea ahora" : "○ Fuera de línea"}</div>
                    {selected.ubicacion?.ciudad && (
                      <div style={{ color: C.muted, fontSize: 12 }}>
                        📍 {selected.ubicacion.ciudad}, {selected.ubicacion.estado}
                        {miUbicacion && <span style={{ marginLeft: 6, color: labelCercania(scoreCercania(selected.ubicacion)).color, fontWeight: 700 }}>· {labelCercania(scoreCercania(selected.ubicacion)).texto}</span>}
                      </div>
                    )}
                    {(selected.marca || selected.modelo) && <div style={{ color: C.orange, fontSize: 12, fontWeight: 600 }}>🏍️ {[selected.marca, selected.modelo, selected.anio].filter(Boolean).join(" ")}</div>}
                    {(selected.clan || selected.esClan) && <ClanBadge />}
                  </div>
                </div>
                {selected.bio && <div style={{ color: C.muted, fontSize: 13, padding: "10px 14px", background: C.card, borderRadius: 10, marginBottom: 14, borderLeft: `3px solid ${C.orange}` }}>"{selected.bio}"</div>}
                <BtnMain onClick={() => abrirChatDirecto(selected)}>💬 ENVIAR MENSAJE</BtnMain>
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
            {categoriasFiltro.map((cat) => (
              <button key={cat} onClick={() => setCategoriaFiltro(cat)} style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 20, border: `1px solid ${categoriaFiltro === cat ? C.orange : C.border}`, background: categoriaFiltro === cat ? C.orangeGlow : C.surface, color: categoriaFiltro === cat ? C.orange : C.muted, fontSize: 11, cursor: "pointer", fontWeight: categoriaFiltro === cat ? 700 : 400 }}>{cat}</button>
            ))}
          </div>
          {puntosFiltrados.map((p) => (
            <div key={p.id} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, borderTop: `2px solid ${p.aliado ? C.orange : C.red}`, padding: 12, marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start", boxShadow: "0 1px 4px #00000008" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{p.nombre}</span>
                  {p.aliado && <span style={{ background: C.orange, color: "#fff", fontSize: 8, padding: "1px 5px", borderRadius: 6, fontWeight: 800, letterSpacing: 1 }}>ALIADO</span>}
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
            <BtnMain red onClick={() => setPedirAyuda(true)} style={{ marginBottom: 12, fontSize: 16, padding: 16 }}>🆘 PEDIR AYUDA AHORA</BtnMain>
          ) : (
            <div style={{ background: "#FFF5F5", border: `1px solid ${C.red}`, borderRadius: 10, padding: 18, marginBottom: 12, textAlign: "center" }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>{miAlerta.icon}</div>
              <div style={{ color: C.red, fontWeight: 900, fontSize: 15, marginBottom: 4, letterSpacing: 1 }}>ALERTA ACTIVA</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>{miAlerta.tipo} · {miAlerta.zona}</div>
              <button onClick={desactivarAlerta} style={{ background: C.green, border: "none", borderRadius: 10, padding: "11px 24px", color: "#fff", fontWeight: 900, fontSize: 13, cursor: "pointer", letterSpacing: 1 }}>✅ YA ESTOY BIEN</button>
            </div>
          )}
          <div style={{ background: "#F0FFF4", border: `1px solid ${C.green}44`, borderRadius: 10, padding: 12 }}>
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

// ── RadashiApp ────────────────────────────────────────────────────────────────

export default function RadashiApp({ user, onLogout }) {
  const [tab, setTab] = useState("cerca");
  const [toast, setToast] = useState(null);
  const [editando, setEditando] = useState(false);
  const [perfil, setPerfil] = useState({});
  const [visor, setVisor] = useState(null);
  const [miAlerta, setMiAlerta] = useState(null);
  const [chatGlobal, setChatGlobal] = useState(null);
  const [notificacion, setNotificacion] = useState(null);
  const [notifChat, setNotifChat] = useState(null); // notificación de mensaje directo
  const heartbeatRef = useRef(null);

  // ── HEARTBEAT: cada 30s mientras la app esté abierta ──
  useEffect(() => {
    if (!user?.uid) return;

    // Primer heartbeat inmediato
    enviarHeartbeat(user.uid);

    // Repetir cada 30 segundos
    heartbeatRef.current = setInterval(() => {
      enviarHeartbeat(user.uid);
    }, HEARTBEAT_INTERVAL);

    // Cuando minimiza o cambia de pestaña, parar heartbeat (celular)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(heartbeatRef.current);
        marcarFueraDeLinea(user.uid);
      } else {
        enviarHeartbeat(user.uid);
        heartbeatRef.current = setInterval(() => {
          enviarHeartbeat(user.uid);
        }, HEARTBEAT_INTERVAL);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(heartbeatRef.current);
      marcarFueraDeLinea(user.uid);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "usuarios", user.uid)).then(snap => { if (snap.exists()) setPerfil(snap.data()); });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "emergencias"), where("userId", "==", user.uid), where("activa", "==", true), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      if (snap.docs.length > 0) { const d = snap.docs[0]; setMiAlerta({ id: d.id, ...d.data() }); }
      else setMiAlerta(null);
    });
    return unsub;
  }, [user]);

  // Notificaciones de emergencia
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "notificaciones", user.uid), snap => {
      if (snap.exists()) { const data = snap.data(); if (!data.leido) setNotificacion(data); }
    });
    return unsub;
  }, [user]);

  // Notificaciones de chat directo
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "notificacionesChat", user.uid), snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (!data.leido) setNotifChat(data);
      }
    });
    return unsub;
  }, [user]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const handleLogout = async () => {
    clearInterval(heartbeatRef.current);
    await marcarFueraDeLinea(user.uid);
    onLogout();
  };

  const desactivarAlertaGlobal = async () => {
    if (!miAlerta) return;
    try {
      await updateDoc(doc(db, "emergencias", miAlerta.id), { activa: false });
      setMiAlerta(null);
      showToast("Alerta desactivada ✅");
    } catch (e) { console.error(e); }
  };

  const tabs = [
    { id: "cerca", icon: "📡", label: "Radar" },
    { id: "perfil", icon: "🏍️", label: "Mi Moto" },
    { id: "clan", icon: "⭐", label: "Clan" },
  ];

  const subtitulos = { cerca: "Radar · Comunidad", perfil: "Mi Moto · Perfil técnico", clan: "Clan · Contenido exclusivo" };

  if (editando) return <EditarPerfil user={user} perfil={perfil} onGuardar={(data) => { setPerfil(data); setEditando(false); showToast("Perfil guardado 🔥"); }} onCancelar={() => setEditando(false)} />;
  if (visor) return <Visor url={visor.url} titulo={visor.titulo} onCerrar={() => setVisor(null)} />;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", paddingBottom: 80, ...gearBg }}>

      {toast && <div style={{ position: "fixed", top: 90, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#fff", padding: "10px 20px", borderRadius: 20, fontWeight: 700, fontSize: 13, zIndex: 500, letterSpacing: 1, boxShadow: "0 4px 12px #22C55E44" }}>{toast}</div>}

      {/* Notificación de emergencia */}
      {notificacion && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: C.red, padding: "12px 16px", zIndex: 600, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 12px #98060444" }}>
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

      {/* Notificación de mensaje directo */}
      {notifChat && !notificacion && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: C.orange, padding: "12px 16px", zIndex: 600, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 12px #ffa22e44" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFF3E0", border: `2px solid #fff`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, overflow: "hidden", flexShrink: 0 }}>
            {notifChat.deFoto ? <img src={notifChat.deFoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>😎</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>💬 {notifChat.deNombre}</div>
            <div style={{ color: "#ffffff99", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notifChat.ultimoMensaje}</div>
          </div>
          <button onClick={async () => {
            await updateDoc(doc(db, "notificacionesChat", user.uid), { leido: true });
            // Abrir el chat directo — reconstruir otroUsuario con los datos disponibles
            const otroUsuario = { uid: notifChat.deUid, nombre: notifChat.deNombre, foto: notifChat.deFoto };
            setChatGlobal({ chatId: notifChat.chatId, esChatDirecto: true, otroUsuario });
            setNotifChat(null);
          }} style={{ background: "#fff", border: "none", borderRadius: 20, padding: "5px 12px", color: C.orange, fontSize: 11, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>VER</button>
          <button onClick={async () => { await updateDoc(doc(db, "notificacionesChat", user.uid), { leido: true }); setNotifChat(null); }} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
      )}

      {miAlerta && (
        <div style={{ background: "#FFF5F5", borderBottom: `2px solid ${C.red}44`, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{miAlerta.icon}</span>
          <div style={{ flex: 1, color: C.red, fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>ALERTA ACTIVA — {miAlerta.tipo}</div>
          <button onClick={desactivarAlertaGlobal} style={{ background: C.green, border: "none", borderRadius: 20, padding: "4px 10px", color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: 1, flexShrink: 0 }}>✅ YA ESTOY BIEN</button>
        </div>
      )}

      <AppHeader user={user} perfil={perfil} onLogout={handleLogout} subtitulo={subtitulos[tab]} />

      {/* Chat de emergencia global */}
      {chatGlobal && !chatGlobal.esChatDirecto && (
        <ChatAyuda chatId={chatGlobal.chatId} user={user} perfil={perfil} alerta={chatGlobal.alerta} onCerrar={() => setChatGlobal(null)} onResuelto={() => { setMiAlerta(null); setChatGlobal(null); }} />
      )}

      {/* Chat directo abierto desde notificación */}
      {chatGlobal && chatGlobal.esChatDirecto && (
        <ChatDirecto chatId={chatGlobal.chatId} user={user} perfil={perfil} otroUsuario={chatGlobal.otroUsuario} onCerrar={() => setChatGlobal(null)} />
      )}

      <div style={{ padding: 14 }}>
        {tab === "cerca" && <Radar user={user} perfil={perfil} showToast={showToast} miAlerta={miAlerta} setMiAlerta={setMiAlerta} chatGlobal={chatGlobal} setChatGlobal={setChatGlobal} />}
        {tab === "perfil" && (
          <div>
            <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.orange}`, padding: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px #00000008" }}>
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
        {tab === "clan" && (
          <div>
            <div style={{ background: "linear-gradient(135deg, #FFF8F0, #FFF3E0)", border: `1px solid ${C.orange}44`, borderTop: `3px solid ${C.orange}`, borderRadius: 12, padding: 18, marginBottom: 12, boxShadow: "0 2px 8px #ffa22e18" }}>
              <div style={{ color: C.orange, fontSize: 10, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>⭐ CLAN RADASHI</div>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 18, lineHeight: 1.2, marginBottom: 6 }}>Deja de adivinar, empieza a entender tu moto</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>Clases en vivo · Grabaciones · Guías · Comunidad exclusiva</div>
              <BtnMain onClick={() => setVisor({ url: "https://nas.com/es-mx/zona-radashi/home", titulo: "Clan Radashi" })}>ÚNETE AL CLAN 🔥</BtnMain>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.red}`, borderRadius: 12, padding: 18, boxShadow: "0 2px 8px #00000008" }}>
              <div style={{ color: C.red, fontSize: 10, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>🛒 TIENDA OFICIAL</div>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 18, lineHeight: 1.2, marginBottom: 6 }}>Refacciones, accesorios y más</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>Todo lo que tu moto necesita en un solo lugar</div>
              <BtnMain onClick={() => setVisor({ url: "https://tallerdemotoszonaradashi.com/", titulo: "Tienda Zona Radashi" })}>IR A LA TIENDA 🛍️</BtnMain>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, width: "100%", background: C.surface, borderTop: `2px solid ${C.red}`, display: "flex", padding: "8px 0 18px", boxShadow: "0 -2px 12px #00000012" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ fontSize: 20, filter: tab === t.id ? "none" : "grayscale(1) opacity(0.25)" }}>{t.icon}</div>
            <div style={{ fontSize: 9, fontWeight: tab === t.id ? 800 : 400, color: tab === t.id ? C.orange : "#BBB", letterSpacing: tab === t.id ? 0.5 : 0 }}>{t.label}</div>
            {tab === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.orange }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
