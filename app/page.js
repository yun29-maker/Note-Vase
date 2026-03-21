"use client";

import { useState } from "react";

export default function Home() {
  const [typeEmetteur, setTypeEmetteur] = useState("radiateurs");
  const [puissance, setPuissance] = useState("");
  const [volume, setVolume] = useState("");
  const [temperature, setTemperature] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [soupape, setSoupape] = useState("");
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");

  function calculer() {
    setErreur("");
    setResultat(null);

    const puissanceNum = parseFloat(puissance);
    const volumeNum = parseFloat(volume);
    const temperatureNum = parseFloat(temperature);
    const hauteurNum = parseFloat(hauteur);
    const soupapeNum = parseFloat(soupape);

    if (!puissanceNum || puissanceNum <= 0) {
      setErreur("Veuillez renseigner une puissance valide.");
      return;
    }

    if (!temperatureNum || temperatureNum <= 0) {
      setErreur("Veuillez renseigner une température maxi valide.");
      return;
    }

    if (isNaN(hauteurNum) || hauteurNum < 0) {
      setErreur("Veuillez renseigner une hauteur statique valide.");
      return;
    }

    if (!soupapeNum || soupapeNum <= 0.5) {
      setErreur("La pression soupape doit être supérieure à 0,5 bar.");
      return;
    }

    let Va;
    let origineVolume;

    if (!isNaN(volumeNum) && volumeNum > 0) {
      Va = volumeNum;
      origineVolume = "saisi";
    } else {
      Va = typeEmetteur === "radiateurs" ? puissanceNum * 14 : puissanceNum * 12;
      origineVolume = "estimé";
    }

    const Pst = hauteurNum / 10;
    const P0 = Pst + 0.3;
    const Per = soupapeNum - 0.5;
    const Pa = P0 + 1;
    const Pe = Per + 1;

    if (Pe <= Pa) {
      setErreur("Le calcul est impossible avec les valeurs saisies.");
      return;
    }

    const n = 0.31 + 0.00039 * temperatureNum * temperatureNum;
    const e = n / 100;
    const Ve = Va * e;
    const Vn = Ve / (1 - Pa / Pe);

    const volumesStandards = [8, 12, 18, 25, 35, 50, 80, 100, 140, 200, 250, 300, 400, 500, 600];
    const volumeRecommande = volumesStandards.find((v) => v >= Vn) || "hors plage standard";

    setResultat({
      origineVolume,
      Va: Va.toFixed(1),
      Pst: Pst.toFixed(2),
      P0: P0.toFixed(2),
      Per: Per.toFixed(2),
      e: e.toFixed(4),
      Ve: Ve.toFixed(2),
      Vn: Vn.toFixed(2),
      volumeRecommande,
    });
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            marginBottom: 24,
          }}
        >
          <h1 style={{ marginTop: 0 }}>NoteVase</h1>
          <p style={{ fontSize: 18, lineHeight: 1.6 }}>
            Faites votre étude gratuitement, visualisez le résultat immédiatement,
            puis payez seulement 2,50 € pour obtenir le PDF.
          </p>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Calculateur de vase d’expansion</h2>

          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label>Type d’émetteur</label>
              <select
                value={typeEmetteur}
                onChange={(e) => setTypeEmetteur(e.target.value)}
                style={inputStyle}
              >
                <option value="radiateurs">Radiateurs</option>
                <option value="plancher_chauffant">Plancher chauffant</option>
              </select>
            </div>

            <div>
              <label>Puissance du générateur (kW)</label>
              <input
                type="number"
                value={puissance}
                onChange={(e) => setPuissance(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label>Volume d’eau installation (L) si connu</label>
              <input
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label>Température maxi (°C)</label>
              <input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label>Hauteur statique (m)</label>
              <input
                type="number"
                value={hauteur}
                onChange={(e) => setHauteur(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label>Pression soupape (bar)</label>
              <input
                type="number"
                value={soupape}
                onChange={(e) => setSoupape(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <button onClick={calculer} style={buttonStyle}>
            Calculer
          </button>

          {erreur ? (
            <div
              style={{
                marginTop: 20,
                background: "#fee2e2",
                color: "#991b1b",
                padding: 16,
                borderRadius: 12,
              }}
            >
              {erreur}
            </div>
          ) : null}

          {resultat ? (
            <div
              style={{
                marginTop: 24,
                background: "#ecfeff",
                borderRadius: 16,
                padding: 24,
              }}
            >
              <h2 style={{ marginTop: 0 }}>Résultat</h2>
              <p><strong>Origine du volume :</strong> {resultat.origineVolume}</p>
              <p><strong>Volume installation retenu :</strong> {resultat.Va} L</p>
              <p><strong>Pression statique :</strong> {resultat.Pst} bar</p>
              <p><strong>Pression initiale :</strong> {resultat.P0} bar</p>
              <p><strong>Pression max d’exercice :</strong> {resultat.Per} bar</p>
              <p><strong>Coefficient d’expansion :</strong> {resultat.e}</p>
              <p><strong>Volume d’expansion :</strong> {resultat.Ve} L</p>
              <p><strong>Volume minimal du vase :</strong> {resultat.Vn} L</p>

              <div
                style={{
                  marginTop: 16,
                  fontSize: 28,
                  fontWeight: "bold",
                }}
              >
                Volume recommandé : {resultat.volumeRecommande} L
              </div>

              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 12,
                  background: "#fff7ed",
                }}
              >
                Pour obtenir la note PDF, l’utilisateur paiera 2,50 € à la fin.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  marginTop: 6,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};

const buttonStyle = {
  marginTop: 20,
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: "#0f172a",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};
