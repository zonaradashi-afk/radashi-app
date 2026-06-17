import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const COLORS = {
  bg: "#0A0A0A", surface: "#141414", card: "#1A1A1A",
  orange: "#FF6B00", orangeGlow: "#FF6B0022", gold: "#FFB800",
  text: "#F0F0F0", muted: "#888", border: "#2A2A2A",
  green: "#22C55E", red: "#EF4444",
};

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

export default function MiMoto({ user }) {
  const [datos, setDatos] = useState({
    // Básicos
    marca: "", modelo: "", anio: "", cilindraje: "", kmActuales: "",
    tipoAceite: "", tipoUso: "",
    // Servicio
    kmUltimoServicio: "", intervaloServicio: "",
    // Rendimiento
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

  const guardar = async () => {
    setGuardando(true);
    try {
      await setDoc(doc(db, "moto", user.uid), datos, { merge: true });
      setToast("Guardado 🔥");
      setTimeout(() => setToast(null), 2500);
    } catch (e) { console.error(e); }
    setGuardando(false);
  };

  // Cálculo próximo servicio
  const kmActuales = parseFloat(datos.kmActuales) || 0;
  const kmUltimo = parseFloat(datos.kmUltimoServicio) || 0;
  const intervalo = parseFloat(datos.intervaloServicio) || 0;
  const kmProximo = kmUltimo + intervalo;
  const kmFaltantes = kmProximo - kmActuales;
  const servicioOk = kmFaltantes > 500;
  const servicioPronto = kmFaltantes <= 500 && kmFaltantes > 0;
  const servicioVencido = kmFaltantes <= 0;

  // Cálculo rendimiento
  const km1 = parseFloat(datos.km1) || 0;
  const km2 = parseFloat(datos.km2) || 0;
  const litros = parseFloat(datos.litros) || 0;
  const kmRecorridos = km2 - km1;
  const rendimiento = litros > 0 && kmRecorridos > 0 ? (kmRecorridos / litros).toFixed(1) : null;

  const tabs = [
    { id: "moto", label: "Mi Moto" },
    { id: "servicio", label: "Servicio" },
    { id: "rendimiento", label: "Rendimiento" },
  ];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: COLORS.green, color: "#fff", padding: "10px 20px", borderRadius: 20, fontWeight: 700, fontSize: 14, zIndex: 500 }}>{toast}</div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", background: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 16, border: "1px solid " + COLORS.border }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === t.id ? COLORS.orange : "transparent", color: tab === t.id ? "#fff" : COLORS.muted, fontWeight: tab === t.id ? 700 : 400, fontSize: 12 }}>{t.label}</button>
        ))}
      </div>

      {/* MI MOTO */}
      {tab === "moto" && (
        <div>
          <Seccion titulo="🏍️ Datos de mi moto">
            <Campo label="Marca" valor={datos.marca} onChange={set("marca")} placeholder="Honda, Yamaha, Kawasaki..." />
            <Campo label="Modelo" valor={datos.modelo} onChange={set("modelo")} placeholder="CB500F, MT-03..." />
            <Campo label="Año" valor={datos.anio} onChange={set("anio")} placeholder="2022" tipo="number" />
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
            <Campo label="Km del último servicio" valor={datos.kmUltimoServicio} onChange={set("kmUltimoServicio")} placeholder="12000" tipo="number" suffix="km" />
            <Campo label="Intervalo de servicio" valor={datos.intervaloServicio} onChange={set("intervaloServicio")} placeholder="3000" tipo="number" suffix="km" />
            <Campo label="Kilometraje actual" valor={datos.kmActuales} onChange={set("kmActuales")} placeholder="15000" tipo="number" suffix="km" />
          </Seccion>

          {/* Resultado próximo servicio */}
          {kmUltimo > 0 && intervalo > 0 && kmActuales > 0 && (
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

          {/* Info de qué llevar */}
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

          {/* Resultado rendimiento */}
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

      {/* Botón guardar */}
      <button onClick={guardar} disabled={guardando} style={{ width: "100%", background: "linear-gradient(135deg, " + COLORS.orange + ", #FF9500)", border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer", marginTop: 8 }}>
        {guardando ? "Guardando..." : "Guardar 🔥"}
      </button>
    </div>
  );
}
