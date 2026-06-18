import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import { doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import MiMoto from "./MiMoto";

const COLORS = {
  bg: "#0A0A0A", surface: "#141414", card: "#1A1A1A",
  orange: "#FF6B00", orangeGlow: "#FF6B0022", gold: "#FFB800",
  text: "#F0F0F0", muted: "#888", border: "#2A2A2A",
  green: "#22C55E", greenGlow: "#22C55E22", red: "#EF4444",
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

function Avatar({ foto, size = 48, emoji = "😎" }) {
  if (foto) return <img src={foto} alt="perfil" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid " + COLORS.orange, flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, flexShrink: 0 }}>{emoji}</div>;
}

function ChatAyuda({ chatId, user, perfil, alerta, onCerrar }) {
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
      userId: user.uid,
      userNombre: perfil.nombre || user.email,
      userFoto: perfil.foto || null,
      tipo: "numero",
      createdAt: serverTimestamp(),
    });
  };

  const marcarResuelto = async () => {
    try {
      await updateDoc(doc(db, "emergencias", alerta.id), { activa: false, resuelta: true });
      await addDoc(collection(db, "chats", chatId, "mensajes"), {
        texto: "✅ Emergencia marcada como resuelta. ¡Gracias a todos!",
        userId: "sistema", userNombre: "Sistema", tipo: "sistema",
        createdAt: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = ts.toDate();
    return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
  };

  const esMio = (msg) => msg.userId === user.uid;

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.bg, zIndex: 500, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: COLORS.surface, padding: "16px 20px", borderBottom: "1px solid " + COLORS.border, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onCerrar} style={{ background: "none", border: "none", color: COLORS.orange, fontSize: 22, cursor: "pointer" }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORS.red, fontWeight: 800, fontSize: 14 }}>🆘 Chat de ayuda</div>
          <div style={{ color: COLORS.muted, fontSize: 12 }}>{alerta.tipo} · {alerta.zona}</div>
        </div>
        {alerta.userId === user.uid && (
          <button onClick={marcarResuelto} style={{ background: COLORS.green, border: "none", borderRadius: 20, padding: "6px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✅ Resuelto</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {mensajes.map((m, i) => (
          <div key={i}>
            {m.tipo === "sistema" ? (
              <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 12, padding: "4px 0" }}>{m.texto}</div>
            ) : (
              <div style={{ display: "flex", justifyContent: esMio(m) ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                {!esMio(m) && <Avatar foto={m.userFoto} size={28} />}
                <div style={{ maxWidth: "75%" }}>
                  {!esMio(m) && <div style={{ color: COLORS.orange, fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{m.userNombre}</div>}
                  <div style={{ background: esMio(m) ? COLORS.orange : COLORS.card, color: "#fff", padding: "10px 14px", borderRadius: esMio(m) ? "18px 18px 4px 18px" : "18px 18px 18px 4px", fontSize: 14 }}>
                    {m.tipo === "ubicacion" ? (
                      <div>{m.texto}<br /><a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", fontSize: 12, opacity: 0.8 }}>Ver en Google Maps ↗</a></div>
                    ) : m.texto}
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>{formatTime(m.createdAt)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ background: COLORS.surface, borderTop: "1px solid " + COLORS.border, padding: "10px 16px 0" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
          <button onClick={compartirUbicacion} style={{ flexShrink: 0, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 20, padding: "6px 14px", color: COLORS.text, fontSize: 12, cursor: "pointer" }}>📍 Mi ubicación</button>
          <button onClick={compartirNumero} style={{ flexShrink: 0, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 20, padding: "6px 14px", color: COLORS.text, fontSize: 12, cursor: "pointer" }}>📞 Mi número</button>
          <a href={"https://wa.me/" + SOPORTE_WA} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 20, padding: "6px 14px", color: COLORS.text, fontSize: 12, cursor: "pointer", textDecoration: "none" }}>🟢 Soporte</a>
          {alerta.userId === user.uid && (
            <button onClick={marcarResuelto} style={{ flexShrink: 0, background: COLORS.greenGlow, border: "1px solid " + COLORS.green, borderRadius: 20, padding: "6px 14px", color: COLORS.green, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✅ Ya estoy bien</button>
          )}
        </div>
      </div>

      <div style={{ background: COLORS.surface, padding: "8px 16px 28px", display: "flex", gap: 10, alignItems: "center" }}>
        <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === "Enter" && enviar()} placeholder="Escribe algo..." style={{ flex: 1, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 20, padding: "10px 16px", color: COLORS.text, fontSize: 14, outline: "none" }} />
        <button onClick={() => enviar()} disabled={loading || !texto.trim()} style={{ width: 42, height: 42, borderRadius: "50%", background: texto.trim() ? COLORS.orange : COLORS.card, border: "none", cursor: "pointer", fontSize: 18, color: "#fff" }}>↑</button>
      </div>
    </div>
  );
}

function PedirAyuda({ user, perfil, onCerrar, onAlertaCreada }) {
  const [paso, setPaso] = useState(1);
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [zonaTexto, setZonaTexto] = useState("");
  const [usandoGPS, setUsandoGPS] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const usarGPS = () => {
    setUsandoGPS(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { setZonaTexto("Ubicación aproximada compartida"); setUsandoGPS(false); },
        () => { setUsandoGPS(false); }
      );
    }
  };

  const enviarAlerta = async () => {
    if (!tipoSeleccionado || !zonaTexto.trim()) return;
    setEnviando(true);
    try {
      const docRef = await addDoc(collection(db, "emergencias"), {
        tipo: tipoSeleccionado.label,
        icon: tipoSeleccionado.icon,
        userId: user.uid,
        userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null,
        userMoto: perfil.marca ? perfil.marca + " " + perfil.modelo : null,
        zona: zonaTexto,
        activa: true,
        createdAt: serverTimestamp(),
      });
      onAlertaCreada({ id: docRef.id, tipo: tipoSeleccionado.label, icon: tipoSeleccionado.icon, zona: zonaTexto, userId: user.uid, userNombre: perfil.nombre || user.email });
      onCerrar();
    } catch (e) { console.error(e); }
    setEnviando(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={onCerrar}>
      <div style={{ background: COLORS.surface, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid " + COLORS.border }}>
          <div style={{ width: 40, height: 4, background: COLORS.border, borderRadius: 2, margin: "0 auto 16px" }} />
          <div style={{ color: COLORS.red, fontWeight: 900, fontSize: 18 }}>{paso === 1 ? "🆘 ¿Qué pasó?" : "📍 ¿Dónde estás?"}</div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>{paso === 1 ? "Elige tu situación" : "Comparte tu zona aproximada"}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {paso === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {tiposEmergencia.map(t => (
                <button key={t.id} onClick={() => { setTipoSeleccionado(t); setPaso(2); }} style={{ background: COLORS.card, border: "2px solid " + COLORS.border, borderRadius: 14, padding: 16, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
                  <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 13 }}>{t.label}</div>
                </button>
              ))}
            </div>
          )}
          {paso === 2 && (
            <div>
              <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{tipoSeleccionado?.icon} {tipoSeleccionado?.label}</div>
              <div style={{ background: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ color: COLORS.orange, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>QUÉ HACER MIENTRAS:</div>
                {(guias[tipoSeleccionado?.id] || []).map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: COLORS.orange, color: "#fff", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ color: COLORS.muted, fontSize: 13 }}>{p}</div>
                  </div>
                ))}
              </div>
              <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>¿Dónde estás?</div>
              <button onClick={usarGPS} disabled={usandoGPS} style={{ width: "100%", background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 14, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {usandoGPS ? "Obteniendo ubicación..." : "📍 Usar mi ubicación aproximada"}
              </button>
              <div style={{ color: COLORS.muted, fontSize: 12, textAlign: "center", marginBottom: 10 }}>— o escribe tu zona —</div>
              <input value={zonaTexto} onChange={e => setZonaTexto(e.target.value)} placeholder="Ej: Coacalco, cerca de López Portillo" style={{ width: "100%", background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 12, padding: "12px 16px", color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
              <button onClick={enviarAlerta} disabled={enviando || !zonaTexto.trim()} style={{ width: "100%", background: zonaTexto.trim() ? COLORS.red : COLORS.card, border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 900, fontSize: 16, cursor: zonaTexto.trim() ? "pointer" : "default" }}>
                {enviando ? "Enviando alerta..." : "🆘 Pedir ayuda ahora"}
              </button>
            </div>
          )}
        </div>
        {paso === 2 && (
          <div style={{ padding: "12px 20px 32px", borderTop: "1px solid " + COLORS.border }}>
            <button onClick={() => setPaso(1)} style={{ width: "100%", background: "none", border: "none", color: COLORS.muted, fontSize: 14, cursor: "pointer" }}>← Volver</button>
          </div>
        )}
      </div>
    </div>
  );
}

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
          {comentarios.length === 0 && <div style={{ textAlign: "center", padding: 30, color: COLORS.muted, fontSize: 14 }}>Sé el primero en comentar 🏍️</div>}
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
      {cargando && !error && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 12 }}><div style={{ fontSize: 36 }}>⚙️</div><div style={{ color: COLORS.muted, fontSize: 14 }}>Cargando...</div></div>}
      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 16, flex: 1 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16, textAlign: "center" }}>Esta página no permite abrirse aquí</div>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", borderRadius: 14, padding: "14px 32px", color: "#fff", fontWeight: 900, fontSize: 15, textDecoration: "none" }}>Abrir en navegador ↗</a>
        </div>
      )}
      <iframe src={url} style={{ flex: 1, border: "none", width: "100%", minHeight: "calc(100vh - 60px)", display: error ? "none" : "block" }} title={titulo} onLoad={() => setCargando(false)} onError={() => { setCargando(false); setError(true); }} />
    </div>
  );
}

function Radar({ user, perfil, showToast, miAlerta, setMiAlerta }) {
  const [radarTab, setRadarTab] = useState("radashis");
  const [selected, setSelected] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [alertasActivas, setAlertasActivas] = useState([]);
  const [pedirAyuda, setPedirAyuda] = useState(false);
  const [chatAbierto, setChatAbierto] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "emergencias"), where("activa", "==", true), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setAlertasActivas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Escuchar chats dirigidos al usuario que pidió ayuda
  useEffect(() => {
    if (!miAlerta) return;
    const q = query(collection(db, "chats"), orderBy("createdAt", "desc"));
    // Detectar si alguien abrió un chat de ayuda para mi alerta
    const chatPrefix = "ayuda_" + miAlerta.id + "_";
    const unsub = onSnapshot(
      query(collection(db, "chats", chatPrefix + user.uid, "mensajes"), orderBy("createdAt", "asc")),
      snap => {
        if (snap.docs.length > 0 && !chatAbierto) {
          // Alguien mandó mensaje, abrir chat automáticamente
        }
      }
    );
    return unsub;
  }, [miAlerta, user.uid]);

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
        userId: user.uid,
        userNombre: perfil.nombre || user.email,
        userFoto: perfil.foto || null,
        tipo: "texto",
        createdAt: serverTimestamp(),
      });
      setChatAbierto({ chatId, alerta });
    } catch (e) { console.error(e); }
  };

  // El que pidió ayuda puede ver los chats de su alerta
  const verMiChat = (alerta, ayudanteId) => {
    const chatId = "ayuda_" + alerta.id + "_" + ayudanteId;
    setChatAbierto({ chatId, alerta });
  };

  const alertasOtros = alertasActivas.filter(a => a.userId !== user.uid);
  const puntosFiltrados = categoriaFiltro === "Todos" ? puntosUtiles : puntosUtiles.filter(p => p.tipo === categoriaFiltro);

  const radarTabs = [
    { id: "radashis", icon: "👥", label: "Radashis" },
    { id: "puntos", icon: "🧭", label: "Puntos" },
    { id: "emergencia", icon: "🆘", label: "Emergencia" },
  ];

  if (chatAbierto) return <ChatAyuda chatId={chatAbierto.chatId} user={user} perfil={perfil} alerta={chatAbierto.alerta} onCerrar={() => setChatAbierto(null)} />;

  return (
    <div>
      {/* Banner alertas de otros */}
      {alertasOtros.length > 0 && (
        <div style={{ background: "#2A0000", border: "1px solid " + COLORS.red, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ color: COLORS.red, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>🆘 Un Radashi necesita ayuda cerca</div>
          {alertasOtros.map((a, i) => (
            <div key={i} style={{ background: COLORS.card, borderRadius: 12, padding: 12, marginBottom: i < alertasOtros.length - 1 ? 8 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}>{a.userNombre} — {a.tipo}</div>
                  <div style={{ color: COLORS.muted, fontSize: 12 }}>📍 {a.zona}{a.userMoto ? " · 🏍️ " + a.userMoto : ""}</div>
                </div>
              </div>
              <button onClick={() => puedoAyudar(a)} style={{ width: "100%", background: COLORS.red, border: "none", borderRadius: 10, padding: "10px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🤝 Puedo ayudar</button>
            </div>
          ))}
        </div>
      )}

      {/* Banner mi alerta activa — SIEMPRE visible */}
      {miAlerta && (
        <div style={{ background: "#1A0000", border: "1px solid " + COLORS.red + "88", borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 24 }}>{miAlerta.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.red, fontWeight: 800, fontSize: 13 }}>Tu alerta está activa</div>
              <div style={{ color: COLORS.muted, fontSize: 12 }}>{miAlerta.tipo} · {miAlerta.zona}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={desactivarAlerta} style={{ flex: 1, background: COLORS.green, border: "none", borderRadius: 10, padding: "10px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✅ Ya estoy bien</button>
            <button onClick={() => { const chatId = "ayuda_" + miAlerta.id + "_ver"; setChatAbierto({ chatId: "ayuda_" + miAlerta.id + "_" + user.uid, alerta: miAlerta }); }} style={{ flex: 1, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 10, padding: "10px", color: COLORS.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>💬 Ver respuestas</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", background: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 16, border: "1px solid " + COLORS.border }}>
        {radarTabs.map(t => (
          <button key={t.id} onClick={() => setRadarTab(t.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", background: radarTab === t.id ? (t.id === "emergencia" ? COLORS.red : COLORS.orange) : "transparent", color: radarTab === t.id ? "#fff" : COLORS.muted, fontWeight: radarTab === t.id ? 700 : 400, fontSize: 12 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {radarTab === "radashis" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20 }}>Radashis cerca 📡</div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>Conecta con moteros de la comunidad cerca de tu zona.</div>
          </div>
          {nearbyUsers.map(u => (
            <div key={u.id} onClick={() => setSelected(u)} style={{ background: COLORS.card, borderRadius: 14, border: "1px solid " + COLORS.border, padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{u.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 15 }}>{u.name}</span>
                  {u.clan && <span style={{ background: COLORS.gold, color: "#000", fontSize: 9, padding: "1px 6px", borderRadius: 10, fontWeight: 800 }}>CLAN</span>}
                </div>
                <div style={{ color: COLORS.muted, fontSize: 12 }}>📍 {u.zona} · ~{u.km} km</div>
                <div style={{ color: COLORS.orange, fontSize: 12 }}>🏍️ {u.moto}</div>
              </div>
              <span style={{ color: COLORS.muted, fontSize: 20 }}>›</span>
            </div>
          ))}
          {selected && (
            <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setSelected(null)}>
              <div style={{ background: COLORS.surface, borderRadius: "24px 24px 0 0", width: "100%", padding: 24 }} onClick={e => e.stopPropagation()}>
                <div style={{ width: 40, height: 4, background: COLORS.border, borderRadius: 2, margin: "0 auto 20px" }} />
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>{selected.avatar}</div>
                  <div>
                    <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20 }}>{selected.name}</div>
                    <div style={{ color: COLORS.muted, fontSize: 13 }}>📍 {selected.zona} · ~{selected.km} km</div>
                    <div style={{ color: COLORS.orange, fontSize: 13 }}>🏍️ {selected.moto}</div>
                    {selected.clan && <span style={{ background: COLORS.gold, color: "#000", fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 800 }}>⭐ CLAN</span>}
                  </div>
                </div>
                <div style={{ color: COLORS.text, fontSize: 14, padding: "12px 16px", background: COLORS.card, borderRadius: 12, marginBottom: 16 }}>"{selected.bio}"</div>
                <button onClick={() => setSelected(null)} style={{ width: "100%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", border: "none", borderRadius: 14, padding: 14, color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>💬 Enviar mensaje</button>
              </div>
            </div>
          )}
        </div>
      )}

      {radarTab === "puntos" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20 }}>Puntos útiles 🧭</div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>Lugares que pueden ayudarte si vas en moto o estás en ruta.</div>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 8 }}>
            {categoriasFiltro.map(cat => (
              <button key={cat} onClick={() => setCategoriaFiltro(cat)} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "1px solid " + (categoriaFiltro === cat ? COLORS.orange : COLORS.border), background: categoriaFiltro === cat ? COLORS.orangeGlow : "transparent", color: categoriaFiltro === cat ? COLORS.orange : COLORS.muted, fontSize: 12, cursor: "pointer", fontWeight: categoriaFiltro === cat ? 700 : 400 }}>{cat}</button>
            ))}
          </div>
          {puntosFiltrados.map(p => (
            <div key={p.id} style={{ background: COLORS.card, borderRadius: 14, border: "1px solid " + (p.aliado ? COLORS.gold + "55" : COLORS.border), padding: 14, marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 14 }}>{p.nombre}</span>
                  {p.aliado && <span style={{ background: COLORS.gold, color: "#000", fontSize: 9, padding: "1px 6px", borderRadius: 10, fontWeight: 800 }}>ALIADO</span>}
                </div>
                <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 2 }}>📍 {p.zona}</div>
                <div style={{ color: COLORS.muted, fontSize: 12 }}>{p.desc}</div>
                <div style={{ marginTop: 6 }}><span style={{ background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 20, padding: "3px 10px", color: COLORS.muted, fontSize: 11 }}>{p.tipo}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {radarTab === "emergencia" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: COLORS.red, fontWeight: 800, fontSize: 20 }}>Modo emergencia 🆘</div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>¿Necesitas ayuda? Activa una alerta y un Radashi cercano puede ayudarte.</div>
          </div>
          {!miAlerta ? (
            <button onClick={() => setPedirAyuda(true)} style={{ width: "100%", background: COLORS.red, border: "none", borderRadius: 16, padding: 20, color: "#fff", fontWeight: 900, fontSize: 18, cursor: "pointer", marginBottom: 16 }}>
              🆘 Pedir ayuda ahora
            </button>
          ) : (
            <div style={{ background: "#2A0000", border: "1px solid " + COLORS.red, borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{miAlerta.icon}</div>
              <div style={{ color: COLORS.red, fontWeight: 900, fontSize: 16, marginBottom: 4 }}>Alerta activa</div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>{miAlerta.tipo} · {miAlerta.zona}</div>
              <button onClick={desactivarAlerta} style={{ background: COLORS.green, border: "none", borderRadius: 12, padding: "12px 24px", color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>✅ Ya estoy bien</button>
            </div>
          )}
          <div style={{ background: "#0A1A0A", border: "1px solid " + COLORS.green + "44", borderRadius: 14, padding: 14 }}>
            <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>⚠️ Importante</div>
            <div style={{ color: COLORS.muted, fontSize: 12, lineHeight: 1.6 }}>En caso de emergencia médica real, llama al 911. Esta sección es apoyo entre moteros para situaciones comunes.</div>
            <a href={"https://wa.me/" + SOPORTE_WA} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 10, color: COLORS.green, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>🟢 Contactar soporte Radashi por WhatsApp</a>
          </div>
        </div>
      )}

      {pedirAyuda && <PedirAyuda user={user} perfil={perfil} onCerrar={() => setPedirAyuda(false)} onAlertaCreada={(alerta) => { setMiAlerta(alerta); showToast("¡Alerta enviada! Los Radashis cercanos pueden verte 🆘"); }} />}
    </div>
  );
}

export default function RadashiApp({ user, onLogout }) {
  const [tab, setTab] = useState("feed");
  const [toast, setToast] = useState(null);
  const [editando, setEditando] = useState(false);
  const [perfil, setPerfil] = useState({});
  const [visor, setVisor] = useState(null);
  const [miAlerta, setMiAlerta] = useState(null); // Estado global de mi alerta

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "usuarios", user.uid)).then(snap => {
        if (snap.exists()) setPerfil(snap.data());
      });
    }
  }, [user]);

  // Escuchar si hay alerta activa mía en Firestore al cargar
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

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const tabs = [
    { id: "feed", icon: "🏠", label: "Inicio" },
    { id: "cerca", icon: "📡", label: "Radar" },
    { id: "clan", icon: "⭐", label: "Clan" },
    { id: "perfil", icon: "👤", label: "Mi Moto" },
  ];

  if (editando) return <EditarPerfil user={user} perfil={perfil} onGuardar={(data) => { setPerfil(data); setEditando(false); showToast("Perfil guardado! 🔥"); }} onCancelar={() => setEditando(false)} />;
  if (visor) return <Visor url={visor.url} titulo={visor.titulo} onCerrar={() => setVisor(null)} />;

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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {miAlerta && <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.red, animation: "pulse 1s infinite" }} />}
            <button onClick={onLogout} style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 20, padding: "6px 14px", color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {tab === "feed" && <Feed user={user} perfil={perfil} />}
        {tab === "cerca" && <Radar user={user} perfil={perfil} showToast={showToast} miAlerta={miAlerta} setMiAlerta={setMiAlerta} />}

        {tab === "clan" && (
          <div>
            <div style={{ background: "linear-gradient(135deg, #1A1000, #2A1800)", border: "1px solid " + COLORS.gold + "44", borderRadius: 18, padding: 20, marginBottom: 16 }}>
              <div style={{ color: COLORS.gold, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>⭐ CLAN RADASHI</div>
              <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20, lineHeight: 1.2, marginBottom: 8 }}>Deja de adivinar, empieza a entender tu moto</div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Clases en vivo · Grabaciones · Guías · Comunidad exclusiva</div>
              <button onClick={() => setVisor({ url: "https://nas.com/es-mx/zona-radashi/home", titulo: "Clan Radashi" })} style={{ background: "linear-gradient(135deg, " + COLORS.gold + ", " + COLORS.orange + ")", border: "none", borderRadius: 12, padding: "12px 24px", color: "#000", fontWeight: 900, fontSize: 15, cursor: "pointer", width: "100%" }}>Únete al Clan 🔥</button>
            </div>
            <div style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 18, padding: 20 }}>
              <div style={{ color: COLORS.orange, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>🛒 TIENDA OFICIAL</div>
              <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20, lineHeight: 1.2, marginBottom: 8 }}>Refacciones, accesorios y más</div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Todo lo que tu moto necesita en un solo lugar</div>
              <button onClick={() => setVisor({ url: "https://tallerdemotoszonaradashi.com/", titulo: "Tienda Zona Radashi" })} style={{ background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", border: "none", borderRadius: 12, padding: "12px 24px", color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer", width: "100%" }}>Ir a la Tienda 🛍️</button>
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
