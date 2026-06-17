import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import { doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where } from "firebase/firestore";
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

const emergencias = [
  { id: "ponche", icon: "🛞", label: "Me ponché", guia: ["Busca un lugar seguro fuera del carril", "Enciende las luces de emergencia", "Coloca la moto sobre el caballete", "Busca una vulcanizadora cercana en Puntos Útiles", "Si estás en carretera, llama a grúa"] },
  { id: "noprende", icon: "🔑", label: "No prende", guia: ["Verifica que el switch esté en ON", "Revisa si tiene gasolina", "Revisa el caballete lateral (algunos cortan el motor)", "Intenta arrancar en neutro", "Si nada funciona, llama a un mecánico"] },
  { id: "singasolina", icon: "⛽", label: "Sin gasolina", guia: ["Busca una gasolinera en Puntos Útiles", "Si estás varado, empuja la moto al acotamiento", "Avisa a alguien de tu ubicación", "Muchas gasolineras venden combustible en contenedor"] },
  { id: "accidente", icon: "🚨", label: "Tuve un accidente", guia: ["Tu seguridad primero — no muevas la moto si hay riesgo", "Llama al 911 si hay heridos", "Toma fotos del lugar y daños", "No admitas culpa en el momento", "Llama a tu aseguradora", "Avisa a un familiar tu ubicación"] },
  { id: "grua", icon: "🚛", label: "Necesito grúa", guia: ["Llama a tu aseguradora primero (muchas incluyen grúa)", "Grúa de emergencia CDMX: 55 5684-1111", "Mantén la moto en lugar visible y seguro", "No dejes la moto sola hasta que llegue la grúa"] },
  { id: "desconocido", icon: "🗺️", label: "Zona desconocida", guia: ["Activa el GPS de tu celular", "Busca una gasolinera o tienda para orientarte", "Avisa tu ubicación a alguien de confianza", "Evita zonas oscuras o solitarias de noche", "Busca otros moteros en el Radar"] },
];

const categoriasFiltro = ["Todos", "Taller", "Gasolina", "Vulcanizadora", "Refaccionaria", "Punto de reunión", "Evento", "Aliado Radashi"];

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
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", borderRadius: 14, padding: "14px 32px", color: "#fff", fontWeight: 900, fontSize: 15, textDecoration: "none" }}>Abrir en navegador ↗</a>
        </div>
      )}
      <iframe src={url} style={{ flex: 1, border: "none", width: "100%", minHeight: "calc(100vh - 60px)", display: error ? "none" : "block" }} title={titulo} onLoad={() => setCargando(false)} onError={() => { setCargando(false); setError(true); }} />
    </div>
  );
}

function Radar({ user, perfil, showToast }) {
  const [radarTab, setRadarTab] = useState("radashis");
  const [selected, setSelected] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [emergenciaActiva, setEmergenciaActiva] = useState(null);
  const [alertaEnviada, setAlertaEnviada] = useState(false);
  const [alertasActivas, setAlertasActivas] = useState([]);
  const [enviandoAlerta, setEnviandoAlerta] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "emergencias"),
      where("activa", "==", true),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      const alertas = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => a.userId !== user.uid);
      setAlertasActivas(alertas);
    });
    return unsub;
  }, [user.uid]);

  const enviarAlerta = async (emergencia) => {
    setEnviandoAlerta(true);
    try {
      await addDoc(collection(db, "emergencias"), {
        tipo: emergencia.label,
        icon: emergencia.icon,
        userId: user.uid,
        userNombre: perfil.nombre || user.email,
        zona: perfil.ciudad || "Zona desconocida",
        activa: true,
        createdAt: serverTimestamp(),
      });
      setAlertaEnviada(true);
      showToast("¡Alerta enviada a Radashis cercanos! 🆘");
    } catch (e) { console.error(e); }
    setEnviandoAlerta(false);
  };

  const puntosFiltrados = categoriaFiltro === "Todos"
    ? puntosUtiles
    : puntosUtiles.filter(p => p.tipo === categoriaFiltro);

  const radarTabs = [
    { id: "radashis", icon: "👥", label: "Radashis" },
    { id: "puntos", icon: "🧭", label: "Puntos" },
    { id: "emergencia", icon: "🆘", label: "Emergencia" },
  ];

  return (
    <div>
      {alertasActivas.length > 0 && (
        <div style={{ background: "#2A0000", border: "1px solid " + COLORS.red, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ color: COLORS.red, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>🆘 Radashi necesita ayuda cerca</div>
          {alertasActivas.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? "1px solid #3A0000" : "none" }}>
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}>{a.userNombre} — {a.tipo}</div>
                <div style={{ color: COLORS.muted, fontSize: 12 }}>📍 {a.zona}</div>
              </div>
              <button style={{ background: COLORS.red, border: "none", borderRadius: 20, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Ayudar</button>
            </div>
          ))}
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
                <div style={{ marginTop: 6 }}>
                  <span style={{ background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 20, padding: "3px 10px", color: COLORS.muted, fontSize: 11 }}>{p.tipo}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {radarTab === "emergencia" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: COLORS.red, fontWeight: 800, fontSize: 20 }}>Modo emergencia 🆘</div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>Guía rápida para situaciones comunes. Toca tu situación.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {emergencias.map(e => (
              <button key={e.id} onClick={() => { setEmergenciaActiva(e); setAlertaEnviada(false); }} style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, padding: 16, cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{e.icon}</div>
                <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 13 }}>{e.label}</div>
              </button>
            ))}
          </div>
          <div style={{ background: "#0A1A0A", border: "1px solid " + COLORS.green + "44", borderRadius: 14, padding: 14 }}>
            <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>⚠️ Importante</div>
            <div style={{ color: COLORS.muted, fontSize: 12, lineHeight: 1.6 }}>En caso de emergencia médica real, llama al 911. Esta sección es una guía de apoyo para situaciones comunes en moto.</div>
          </div>
          {emergenciaActiva && (
            <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={() => setEmergenciaActiva(null)}>
              <div style={{ background: COLORS.surface, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid " + COLORS.border }}>
                  <div style={{ width: 40, height: 4, background: COLORS.border, borderRadius: 2, margin: "0 auto 16px" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 32 }}>{emergenciaActiva.icon}</span>
                    <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>{emergenciaActiva.label}</div>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                  <div style={{ color: COLORS.orange, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>QUÉ HACER:</div>
                  {emergenciaActiva.guia.map((paso, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: COLORS.orange, color: "#fff", fontWeight: 900, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <div style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.5, paddingTop: 4 }}>{paso}</div>
                    </div>
                  ))}
                  <div style={{ background: "#1A0000", border: "1px solid " + COLORS.red + "55", borderRadius: 14, padding: 16, marginTop: 8 }}>
                    <div style={{ color: COLORS.red, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>📡 Alertar a Radashis cercanos</div>
                    <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12 }}>
                      {alertaEnviada ? "✅ Alerta enviada. Los Radashis cercanos pueden ver tu situación y ofrecerte ayuda." : "Manda una alerta a los moteros de la comunidad que estén cerca. Alguien puede ayudarte."}
                    </div>
                    {!alertaEnviada && (
                      <button onClick={() => enviarAlerta(emergenciaActiva)} disabled={enviandoAlerta} style={{ width: "100%", background: COLORS.red, border: "none", borderRadius: 12, padding: "12px", color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
                        {enviandoAlerta ? "Enviando..." : "🆘 Pedir ayuda a Radashis"}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ padding: "12px 20px 32px", borderTop: "1px solid " + COLORS.border }}>
                  <button onClick={() => setEmergenciaActiva(null)} style={{ width: "100%", background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, padding: 14, color: COLORS.muted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cerrar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RadashiApp({ user, onLogout }) {
  const [tab, setTab] = useState("feed");
  const [toast, setToast] = useState(null);
  const [chatUser, setChatUser] = useState(null);
  const [editando, setEditando] = useState(false);
  const [perfil, setPerfil] = useState({});
  const [visor, setVisor] = useState(null);
  const [chats] = useState({
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

  const handleSend = () => {
    if (!msg.trim() || !chatUser) return;
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
        {tab === "cerca" && <Radar user={user} perfil={perfil} showToast={showToast} />}

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
