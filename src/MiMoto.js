import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { CATALOGO_MOTOS } from "./catalogoMotos";

const COLORS = {
  bg: "#0A0A0A", surface: "#141414", card: "#1A1A1A",
  orange: "#FF6B00", orangeGlow: "#FF6B0022", gold: "#FFB800",
  text: "#F0F0F0", muted: "#888", border: "#2A2A2A",
  green: "#22C55E", red: "#EF4444",
};

const CLAN_URL = "https://nas.com/es-mx/zona-radashi/home";

function Seccion({ titulo, children }) {
  return (
    <div style={{ background: COLORS.card, borderRadius: 16, border: "1px solid " + COLORS.border, padding: 16, marginBottom: 12 }}>
      <div style={{ color: COLORS.orange, fontWeight: 800, fontSize: 13, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>{titulo}</div>
      {children}
    </div>
  );
}

function Campo({ label, valor, onChange, placeholder, tipo = "text", suffix }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 4, fontWeight: 600 }}>{label.toUpperCase()}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type={tipo}
          value={valor}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
        />
        {suffix && <span style={{ color: COLORS.muted, fontSize: 13, flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

// Selector tipo dropdown simple, estilizado para tema oscuro
function Selector({ label, valor, onChange, opciones, placeholder, disabled }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 4, fontWeight: 600 }}>{label.toUpperCase()}</div>
      <select
        value={valor}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: "100%", background: disabled ? COLORS.card : COLORS.surface,
          border: "1px solid " + COLORS.border, borderRadius: 10, padding: "10px 14px",
          color: disabled ? COLORS.muted : COLORS.text, fontSize: 14, outline: "none",
          boxSizing: "border-box", opacity: disabled ? 0.5 : 1,
          WebkitAppearance: "none", appearance: "none",
        }}
      >
        <option value="">{placeholder}</option>
        {opciones.map(op => <option key={op} value={op}>{op}</option>)}
      </select>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// PIEZAS — definición visual de las piezas que mostramos
// ───────────────────────────────────────────────────────────────────────────

const PIEZAS_DEFINIDAS = [
  { id: "bujia", nombre: "Bujía", icono: "⚡", explicacion: "Genera la chispa que enciende la mezcla de combustible en el motor.", senal: "Si la moto cuesta trabajo encender o tiembla al ralentí, revisa la bujía." },
  { id: "aceite", nombre: "Aceite", icono: "🛢️", explicacion: "Lubrica el motor y reduce el desgaste entre piezas metálicas.", senal: "Cámbialo según el intervalo recomendado, aunque se vea limpio." },
  { id: "filtroAire", nombre: "Filtro de aire", icono: "🌬️", explicacion: "Evita que entre polvo y partículas al motor mientras respira aire.", senal: "Si notas que la moto pierde fuerza o gasta más gasolina, revísalo." },
  { id: "filtroAceite", nombre: "Filtro de aceite", icono: "🧰", explicacion: "Atrapa partículas e impurezas del aceite mientras circula por el motor.", senal: "Se cambia junto con el aceite en cada servicio." },
  { id: "kitTraccion", nombre: "Kit de tracción", icono: "⛓️", explicacion: "Cadena, piñón y catalina — transmiten la fuerza del motor a la llanta trasera.", senal: "Si la cadena suena, está floja o oxidada, revisa el kit completo." },
];

// ── Modal: aportar foto/dato de una pieza ────────────────────────────────────

function AportarPieza({ user, motoId, piezaId, piezaNombre, marca, modelo, version, onCerrar, onAportado }) {
  const [especificacion, setEspecificacion] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const fileRef = useRef();

  const handleArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivo(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const enviar = async () => {
    if (!especificacion.trim() && !archivo) return;
    setSubiendo(true);
    try {
      let imagenUrl = null;
      if (archivo) {
        const path = `aportesPiezas/${motoId}/${piezaId}_${Date.now()}.jpg`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, archivo);
        imagenUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "refaccionesEnRevision"), {
        motoId, marca, modelo, version,
        piezaId, piezaNombre,
        especificacion: especificacion.trim(),
        imagen: imagenUrl,
        aportadoPor: user.uid,
        aportadoPorNombre: user.email,
        estado: "pendiente",
        createdAt: serverTimestamp(),
      });

      onAportado();
      onCerrar();
    } catch (e) {
      console.error(e);
    }
    setSubiendo(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={onCerrar}>
      <div style={{ background: COLORS.surface, borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 20, borderTop: `3px solid ${COLORS.orange}` }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 3, background: COLORS.border, borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ color: COLORS.orange, fontWeight: 900, fontSize: 16, marginBottom: 4 }}>Aportar {piezaNombre}</div>
        <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 18, lineHeight: 1.5 }}>
          Tu aporte queda pendiente de revisión por el equipo Radashi antes de mostrarse a otros usuarios.
        </div>

        <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 6, fontWeight: 600 }}>FOTO DE LA PIEZA (OPCIONAL)</div>
        <div onClick={() => fileRef.current.click()} style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}`, borderRadius: 12, padding: previewUrl ? 0 : 24, textAlign: "center", cursor: "pointer", marginBottom: 16, overflow: "hidden" }}>
          {previewUrl ? (
            <img src={previewUrl} alt="preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ color: COLORS.muted, fontSize: 13 }}>📷 Toca para subir una foto</div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleArchivo} style={{ display: "none" }} />

        <Campo
          label="Especificación o dato (opcional)"
          valor={especificacion}
          onChange={setEspecificacion}
          placeholder="Ej: NGK CR8EH-9, o lo que sepas de esta pieza"
        />

        <button
          onClick={enviar}
          disabled={subiendo || (!especificacion.trim() && !archivo)}
          style={{ width: "100%", background: `linear-gradient(135deg, ${COLORS.orange}, #FF9500)`, border: "none", borderRadius: 14, padding: 15, color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer", marginTop: 8, opacity: (subiendo || (!especificacion.trim() && !archivo)) ? 0.5 : 1 }}
        >
          {subiendo ? "ENVIANDO..." : "ENVIAR APORTE 🔥"}
        </button>
        <button onClick={onCerrar} style={{ width: "100%", background: "none", border: "none", color: COLORS.muted, fontSize: 13, padding: 12, cursor: "pointer" }}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Construye el texto principal y detalle de cada pieza desde el doc de Firestore ──

function extraerInfoPieza(piezaId, motoData) {
  if (!motoData || !motoData.piezas) return null;
  const p = motoData.piezas[piezaId];
  if (!p) return null;

  if (piezaId === "bujia") {
    if (!p.especificacion) return null;
    return {
      principal: p.especificacion,
      detalle: [
        p.equivalente && `Equivalente: ${p.equivalente}`,
        p.luz_mm && `Luz: ${p.luz_mm} mm`,
      ].filter(Boolean).join(" · "),
      imagen: p.imagen,
    };
  }
  if (piezaId === "aceite") {
    if (!p.especificacion) return null;
    return {
      principal: p.especificacion,
      detalle: [
        p.norma && `Norma: ${p.norma}`,
        p.capacidad && `Capacidad: ${p.capacidad} L`,
      ].filter(Boolean).join(" · "),
      imagen: p.imagen,
    };
  }
  if (piezaId === "filtroAire" || piezaId === "filtroAceite") {
    if (!p.especificacion) return null;
    return { principal: p.especificacion, detalle: "", imagen: p.imagen };
  }
  if (piezaId === "kitTraccion") {
    if (!p.cadena_paso) return null;
    return {
      principal: `Cadena paso ${p.cadena_paso}`,
      detalle: [
        p.eslabones && `${p.eslabones} eslabones`,
        p.pinon && `Piñón ${p.pinon}`,
        p.sprocket && `Catalina ${p.sprocket}`,
      ].filter(Boolean).join(" · "),
      imagen: p.imagen,
    };
  }
  return null;
}

// ── Ficha visual de una pieza ────────────────────────────────────────────────

function FichaPieza({ pieza, motoData, motoVerificada, user, motoId, marca, modelo, version, onRefrescar }) {
  const [aportando, setAportando] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const info = extraerInfoPieza(pieza.id, motoData);

  let estado = "sinInfo";
  if (info && motoVerificada) estado = "verificado";
  else if (info && !motoVerificada) estado = "aportado";

  const estiloEstado = {
    verificado: { texto: "✅ Verificado por Radashi", color: COLORS.green },
    aportado: { texto: "🟡 En base de datos (por validar)", color: COLORS.gold },
    sinInfo: { texto: "❔ Sin información", color: COLORS.muted },
  }[estado];

  return (
    <div style={{ background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}`, marginBottom: 12, overflow: "hidden" }}>
      <div onClick={() => setExpandido(!expandido)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, cursor: "pointer" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, overflow: "hidden" }}>
          {info?.imagen ? <img src={info.imagen} alt={pieza.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : pieza.icono}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 14 }}>{pieza.nombre}</div>
          <div style={{ color: estiloEstado.color, fontSize: 11, fontWeight: 700, marginTop: 2 }}>{estiloEstado.texto}</div>
        </div>
        <span style={{ color: COLORS.muted, fontSize: 18, transform: expandido ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
      </div>

      {expandido && (
        <div style={{ padding: "0 14px 16px" }}>
          {info && (
            <div style={{ background: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{info.principal}</div>
              {info.detalle && <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 8 }}>{info.detalle}</div>}
              <div style={{ color: COLORS.muted, fontSize: 12, lineHeight: 1.5 }}>{pieza.explicacion}</div>
              <div style={{ color: COLORS.orange, fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>💡 {pieza.senal}</div>
            </div>
          )}

          {!info && (
            <div style={{ background: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>
                Aún no tenemos esta pieza verificada para tu moto.
              </div>
              <div style={{ color: COLORS.muted, fontSize: 12, lineHeight: 1.5 }}>{pieza.explicacion}</div>
            </div>
          )}

          {/* Enlace sutil al Clan — siempre visible */}
          <a
            href={CLAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, #2A1F0F, #2A1A05)",
              border: `1px solid ${COLORS.orange}44`, borderRadius: 10,
              padding: "10px 12px", marginBottom: info ? 0 : 4, textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 16 }}>⭐</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.orange, fontWeight: 700, fontSize: 12 }}>
                Aprende a cambiar {pieza.nombre.toLowerCase()} paso a paso
              </div>
              <div style={{ color: COLORS.muted, fontSize: 10 }}>en el Clan Radashi</div>
            </div>
            <span style={{ color: COLORS.orange, fontSize: 14 }}>↗</span>
          </a>

          {/* Solo se puede aportar si no hay info */}
          {!info && (
            <button
              onClick={() => setAportando(true)}
              style={{ width: "100%", background: COLORS.orangeGlow, border: `1px solid ${COLORS.orange}`, borderRadius: 10, padding: 11, color: COLORS.orange, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 10 }}
            >
              📷 Aportar foto o dato
            </button>
          )}
        </div>
      )}

      {aportando && (
        <AportarPieza
          user={user}
          motoId={motoId}
          piezaId={pieza.id}
          piezaNombre={pieza.nombre}
          marca={marca}
          modelo={modelo}
          version={version}
          onCerrar={() => setAportando(false)}
          onAportado={onRefrescar}
        />
      )}
    </div>
  );
}

// ── Ficha de info general de la moto (llantas, batería, frenos, problemas comunes) ──

function InfoGeneralMoto({ motoData }) {
  if (!motoData) return null;
  const tieneExtra = motoData.llantas?.delantera || motoData.bateria || motoData.frenos?.delantero || motoData.problemasComunes;
  if (!tieneExtra) return null;

  return (
    <Seccion titulo="🔍 Más datos de esta moto">
      {motoData.llantas?.delantera && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ color: COLORS.muted, fontSize: 12 }}>Llanta delantera</span>
          <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 600 }}>{motoData.llantas.delantera}</span>
        </div>
      )}
      {motoData.llantas?.trasera && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ color: COLORS.muted, fontSize: 12 }}>Llanta trasera</span>
          <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 600 }}>{motoData.llantas.trasera}</span>
        </div>
      )}
      {motoData.bateria && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ color: COLORS.muted, fontSize: 12 }}>Batería</span>
          <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 600 }}>{motoData.bateria}</span>
        </div>
      )}
      {motoData.frenos?.delantero && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ color: COLORS.muted, fontSize: 12 }}>Freno delantero</span>
          <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 600 }}>{motoData.frenos.delantero}</span>
        </div>
      )}
      {motoData.frenos?.trasero && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: motoData.problemasComunes ? `1px solid ${COLORS.border}` : "none" }}>
          <span style={{ color: COLORS.muted, fontSize: 12 }}>Freno trasero</span>
          <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 600 }}>{motoData.frenos.trasero}</span>
        </div>
      )}
      {motoData.problemasComunes && (
        <div style={{ marginTop: 10, background: COLORS.surface, borderRadius: 10, padding: 12 }}>
          <div style={{ color: COLORS.gold, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>⚠️ PROBLEMAS COMUNES EN ESTE MODELO</div>
          <div style={{ color: COLORS.muted, fontSize: 12, lineHeight: 1.5 }}>{motoData.problemasComunes}</div>
        </div>
      )}
    </Seccion>
  );
}

// ── Tab de Piezas completo ───────────────────────────────────────────────────

function TabPiezas({ user, motoSeleccionada }) {
  const [motoData, setMotoData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescar, setRefrescar] = useState(0);

  const motoId = motoSeleccionada?.id;
  const tieneMotoSeleccionada = !!motoId;

  useEffect(() => {
    if (!motoId) { setCargando(false); setMotoData(null); return; }

    const cargarMoto = async () => {
      setCargando(true);
      try {
        const snap = await getDoc(doc(db, "refacciones", motoId));
        setMotoData(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error(e);
        setMotoData(null);
      }
      setCargando(false);
    };

    cargarMoto();
  }, [motoId, refrescar]);

  if (!tieneMotoSeleccionada) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🏍️</div>
        <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Selecciona tu moto</div>
        <div style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.5 }}>
          Ve a la pestaña "Mi Moto" y elige marca, modelo y versión para ver las piezas que lleva.
        </div>
      </div>
    );
  }

  if (cargando) {
    return <div style={{ textAlign: "center", padding: 40, color: COLORS.muted, fontSize: 13 }}>Cargando piezas...</div>;
  }

  const motoVerificada = motoData?.verificada === true;

  return (
    <div>
      <div style={{ background: COLORS.card, borderRadius: 12, padding: "10px 14px", marginBottom: 14, border: `1px solid ${COLORS.border}` }}>
        <div style={{ color: COLORS.orange, fontWeight: 800, fontSize: 12 }}>
          🏍️ {motoSeleccionada.marca} {motoSeleccionada.modelo} {motoSeleccionada.version ? `· ${motoSeleccionada.version}` : ""}
        </div>
        <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>
          {motoData ? "Piezas y refacciones que lleva tu moto" : "Esta moto aún no está en nuestra base de datos"}
        </div>
      </div>

      {!motoData && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, marginBottom: 14, textAlign: "center" }}>
          <div style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.5 }}>
            Esta combinación todavía no tiene datos técnicos cargados. Puedes aportar información en cada pieza y el equipo Radashi la revisará.
          </div>
        </div>
      )}

      {PIEZAS_DEFINIDAS.map((pieza) => (
        <FichaPieza
          key={pieza.id}
          pieza={pieza}
          motoData={motoData}
          motoVerificada={motoVerificada}
          user={user}
          motoId={motoId}
          marca={motoSeleccionada.marca}
          modelo={motoSeleccionada.modelo}
          version={motoSeleccionada.version}
          onRefrescar={() => setRefrescar(r => r + 1)}
        />
      ))}

      <InfoGeneralMoto motoData={motoData} />

      <div style={{ color: COLORS.muted, fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
        ¿Tienes información de alguna pieza que falta? Tócala y aporta foto o dato. El equipo Radashi la revisa antes de publicarla. 🔧
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Componente principal MiMoto
// ───────────────────────────────────────────────────────────────────────────

export default function MiMoto({ user }) {
  const [datos, setDatos] = useState({
    marca: "", modelo: "", version: "", motoId: "",
    cilindraje: "", kmActuales: "",
    tipoAceite: "", tipoUso: "",
    kmUltimoServicio: "", intervaloServicio: "",
    km1: "", km2: "", litros: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("moto");

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "moto", user.uid)).then(snap => {
        if (snap.exists()) setDatos(d => ({ ...d, ...snap.data() }));
      });
    }
  }, [user]);

  const set = (campo) => (val) => setDatos(d => ({ ...d, [campo]: val }));

  // Selección en cascada: marca -> modelo -> versión
  const marcasDisponibles = Object.keys(CATALOGO_MOTOS).sort();
  const modelosDisponibles = datos.marca && CATALOGO_MOTOS[datos.marca]
    ? Object.keys(CATALOGO_MOTOS[datos.marca]).sort()
    : [];
  const versionesDisponibles = datos.marca && datos.modelo && CATALOGO_MOTOS[datos.marca]?.[datos.modelo]
    ? CATALOGO_MOTOS[datos.marca][datos.modelo]
    : [];

  const handleMarca = (marca) => {
    setDatos(d => ({ ...d, marca, modelo: "", version: "", motoId: "" }));
  };
  const handleModelo = (modelo) => {
    setDatos(d => ({ ...d, modelo, version: "", motoId: "" }));
    // Si solo hay una versión, seleccionarla automáticamente
    const versiones = CATALOGO_MOTOS[datos.marca]?.[modelo] || [];
    if (versiones.length === 1) {
      setDatos(d => ({ ...d, modelo, version: versiones[0].version, motoId: versiones[0].id }));
    }
  };
  const handleVersion = (versionTexto) => {
    const encontrada = versionesDisponibles.find(v => v.version === versionTexto);
    setDatos(d => ({ ...d, version: versionTexto, motoId: encontrada ? encontrada.id : "" }));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await setDoc(doc(db, "moto", user.uid), datos, { merge: true });
      setToast("Guardado 🔥");
      setTimeout(() => setToast(null), 2500);
    } catch (e) { console.error(e); }
    setGuardando(false);
  };

  const kmActuales = parseFloat(datos.kmActuales) || 0;
  const intervalo = parseFloat(datos.intervaloServicio) || 0;
  const kmProximo = kmActuales + intervalo;
  const kmFaltantes = intervalo;
  const servicioVencido = false;
  const servicioPronto = intervalo > 0 && intervalo <= 500;

  const km1 = parseFloat(datos.km1) || 0;
  const km2 = parseFloat(datos.km2) || 0;
  const litros = parseFloat(datos.litros) || 0;
  const kmRecorridos = km2 - km1;
  const rendimiento = litros > 0 && kmRecorridos > 0 ? (kmRecorridos / litros).toFixed(1) : null;

  const tabs = [
    { id: "moto", label: "Mi Moto" },
    { id: "servicio", label: "Servicio" },
    { id: "rendimiento", label: "Rendimiento" },
    { id: "piezas", label: "Piezas" },
  ];

  const motoSeleccionada = datos.motoId
    ? { id: datos.motoId, marca: datos.marca, modelo: datos.modelo, version: datos.version }
    : null;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: COLORS.green, color: "#fff", padding: "10px 20px", borderRadius: 20, fontWeight: 700, fontSize: 14, zIndex: 500 }}>{toast}</div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", background: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 16, border: "1px solid " + COLORS.border, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === t.id ? COLORS.orange : "transparent", color: tab === t.id ? "#fff" : COLORS.muted, fontWeight: tab === t.id ? 700 : 400, fontSize: 11, whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      {/* MI MOTO */}
      {tab === "moto" && (
        <div>
          <Seccion titulo="🏍️ Selecciona tu moto">
            <Selector
              label="Marca"
              valor={datos.marca}
              onChange={handleMarca}
              opciones={marcasDisponibles}
              placeholder="Elige tu marca..."
            />
            <Selector
              label="Modelo"
              valor={datos.modelo}
              onChange={handleModelo}
              opciones={modelosDisponibles}
              placeholder={datos.marca ? "Elige tu modelo..." : "Primero elige una marca"}
              disabled={!datos.marca}
            />
            {versionesDisponibles.length > 1 && (
              <Selector
                label="Versión"
                valor={datos.version}
                onChange={handleVersion}
                opciones={versionesDisponibles.map(v => v.version)}
                placeholder="Elige la versión..."
                disabled={!datos.modelo}
              />
            )}
            {datos.modelo && versionesDisponibles.length === 1 && (
              <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 12 }}>
                Versión: <span style={{ color: COLORS.orange, fontWeight: 700 }}>{datos.version}</span>
              </div>
            )}
            {datos.marca && modelosDisponibles.length === 0 && (
              <div style={{ color: COLORS.muted, fontSize: 12, lineHeight: 1.5, marginTop: -4, marginBottom: 8 }}>
                Aún no tenemos modelos de esta marca en nuestra base de datos.
              </div>
            )}
          </Seccion>

          <Seccion titulo="📋 Datos de mi moto">
            <Campo label="Cilindraje" valor={datos.cilindraje} onChange={set("cilindraje")} placeholder="500" tipo="number" suffix="cc" />
            <Campo label="Kilometraje actual" valor={datos.kmActuales} onChange={set("kmActuales")} placeholder="15000" tipo="number" suffix="km" />
          </Seccion>

          <Seccion titulo="⚙️ Datos técnicos">
            <Campo label="Tipo de aceite" valor={datos.tipoAceite} onChange={set("tipoAceite")} placeholder="10W-40, 20W-50..." />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 8, fontWeight: 600 }}>TIPO DE USO</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Diario", "Trabajo", "Carretera", "Fines de semana"].map(tipo => (
                  <button key={tipo} onClick={() => set("tipoUso")(tipo)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid " + (datos.tipoUso === tipo ? COLORS.orange : COLORS.border), background: datos.tipoUso === tipo ? COLORS.orangeGlow : "transparent", color: datos.tipoUso === tipo ? COLORS.orange : COLORS.muted, fontSize: 13, cursor: "pointer", fontWeight: datos.tipoUso === tipo ? 700 : 400 }}>{tipo}</button>
                ))}
              </div>
            </div>
          </Seccion>
        </div>
      )}

      {/* SERVICIO */}
      {tab === "servicio" && (
        <div>
          <Seccion titulo="🔧 Control de servicio">
            <Campo label="Kilometraje actual" valor={datos.kmActuales} onChange={set("kmActuales")} placeholder="33000" tipo="number" suffix="km" />
            <Campo label="Intervalo de servicio (cada cuántos km)" valor={datos.intervaloServicio} onChange={set("intervaloServicio")} placeholder="5000" tipo="number" suffix="km" />
            {kmActuales > 0 && intervalo > 0 && (
              <div style={{ background: COLORS.surface, borderRadius: 10, padding: "12px 14px", marginTop: 4 }}>
                <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 4, fontWeight: 600 }}>PRÓXIMO SERVICIO</div>
                <div style={{ color: COLORS.orange, fontWeight: 900, fontSize: 22 }}>{kmProximo.toLocaleString()} km</div>
                <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{kmActuales.toLocaleString()} + {intervalo.toLocaleString()} = {kmProximo.toLocaleString()} km</div>
              </div>
            )}
          </Seccion>

          {kmActuales > 0 && intervalo > 0 && (
            <div style={{
              background: servicioVencido ? "#2A0000" : servicioPronto ? "#2A1A00" : "#001A00",
              border: "1px solid " + (servicioVencido ? COLORS.red : servicioPronto ? COLORS.gold : COLORS.green),
              borderRadius: 16, padding: 20, marginBottom: 12,
            }}>
              <div style={{ color: servicioVencido ? COLORS.red : servicioPronto ? COLORS.gold : COLORS.green, fontWeight: 900, fontSize: 16, marginBottom: 8 }}>
                {servicioVencido ? "⚠️ Servicio vencido" : servicioPronto ? "⏰ Servicio próximo" : "✅ Servicio al corriente"}
              </div>
              <div style={{ color: COLORS.text, fontSize: 14, marginBottom: 4 }}>
                Próximo servicio: <strong style={{ color: COLORS.orange }}>{kmProximo.toLocaleString()} km</strong>
              </div>
              {servicioVencido ? (
                <div style={{ color: COLORS.red, fontSize: 14 }}>¡Te pasaste {Math.abs(kmFaltantes).toLocaleString()} km! Lleva tu moto al taller.</div>
              ) : (
                <div style={{ color: COLORS.muted, fontSize: 14 }}>Te faltan <strong style={{ color: servicioPronto ? COLORS.gold : COLORS.green }}>{kmFaltantes.toLocaleString()} km</strong> para tu próximo servicio</div>
              )}
            </div>
          )}

          {(servicioPronto || servicioVencido) && (
            <Seccion titulo="📋 Lleva esto al taller">
              {["Aceite: " + (datos.tipoAceite || "revisar tipo"), "Filtro de aceite", "Bujía", "Filtro de aire"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < 3 ? "1px solid " + COLORS.border : "none" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.orange, flexShrink: 0 }} />
                  <span style={{ color: COLORS.text, fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </Seccion>
          )}
        </div>
      )}

      {/* RENDIMIENTO */}
      {tab === "rendimiento" && (
        <div>
          <Seccion titulo="⛽ Paso 1 — Primera llenada">
            <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
              Llena el tanque completo y anota el kilometraje de tu odómetro en ese momento.
            </div>
            <Campo label="Kilometraje al llenar" valor={datos.km1} onChange={set("km1")} placeholder="15000" tipo="number" suffix="km" />
          </Seccion>

          <Seccion titulo="⛽ Paso 2 — Segunda llenada">
            <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
              Cuando se acabe la gasolina, vuelve a llenar el tanque completo. Anota cuántos litros cargaste y el nuevo kilometraje.
            </div>
            <Campo label="Kilometraje al rellenar" valor={datos.km2} onChange={set("km2")} placeholder="15350" tipo="number" suffix="km" />
            <Campo label="Litros cargados" valor={datos.litros} onChange={set("litros")} placeholder="8.5" tipo="number" suffix="L" />
          </Seccion>

          {rendimiento && (
            <div style={{ background: "linear-gradient(135deg, #001A10, #002A18)", border: "1px solid " + COLORS.green, borderRadius: 16, padding: 20, marginBottom: 12 }}>
              <div style={{ color: COLORS.green, fontWeight: 900, fontSize: 14, marginBottom: 12 }}>⛽ Tu rendimiento</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, background: COLORS.card, borderRadius: 12, padding: 14, textAlign: "center" }}>
                  <div style={{ color: COLORS.orange, fontWeight: 900, fontSize: 28 }}>{rendimiento}</div>
                  <div style={{ color: COLORS.muted, fontSize: 12 }}>km por litro</div>
                </div>
                <div style={{ flex: 1, background: COLORS.card, borderRadius: 12, padding: 14, textAlign: "center" }}>
                  <div style={{ color: COLORS.orange, fontWeight: 900, fontSize: 28 }}>{kmRecorridos.toLocaleString()}</div>
                  <div style={{ color: COLORS.muted, fontSize: 12 }}>km recorridos</div>
                </div>
              </div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 12, textAlign: "center" }}>
                Con {litros}L recorriste {kmRecorridos} km
              </div>
            </div>
          )}

          {km1 > 0 && km2 > 0 && km2 <= km1 && (
            <div style={{ background: "#2A0000", border: "1px solid " + COLORS.red, borderRadius: 12, padding: 14, color: COLORS.red, fontSize: 13 }}>
              ⚠️ El segundo kilometraje debe ser mayor al primero
            </div>
          )}
        </div>
      )}

      {/* PIEZAS */}
      {tab === "piezas" && (
        <TabPiezas user={user} motoSeleccionada={motoSeleccionada} />
      )}

      {/* Botón guardar — no aplica en Piezas */}
      {tab !== "piezas" && (
        <button onClick={guardar} disabled={guardando} style={{ width: "100%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer", marginTop: 8 }}>
          {guardando ? "Guardando..." : "Guardar 🔥"}
        </button>
      )}
    </div>
  );
}
