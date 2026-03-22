"use client";

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";
import AuthForm from "./auth-form";

export default function Home() {
  const [user, setUser] = useState(null);
  const [clientName, setClientName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [projectType, setProjectType] = useState("renovation");
  const [typeEmetteur, setTypeEmetteur] = useState("radiateurs");
  const [puissance, setPuissance] = useState("");
  const [volume, setVolume] = useState("");
  const [temperature, setTemperature] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [soupape, setSoupape] = useState("");
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user || null);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  function calculer() {
    setErreur("");
    setMessage("");
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
    const volumeRecommande = volumesStandards.find((v) => v >= Vn) || null;

    setResultat({
      clientName,
      siteAddress,
      projectType,
      typeEmetteur,
      puissance_generateur_kw: puissanceNum,
      volume_installation_l: !isNaN(volumeNum) && volumeNum > 0 ? volumeNum : null,
      temperature_maxi_c: temperatureNum,
      hauteur_statique_m: hauteurNum,
      pression_soupape_bar: soupapeNum,
      origineVolume,
      Va: Number(Va.toFixed(1)),
      Pst: Number(Pst.toFixed(2)),
      P0: Number(P0.toFixed(2)),
      Per: Number(Per.toFixed(2)),
      Pa: Number(Pa.toFixed(2)),
      Pe: Number(Pe.toFixed(2)),
      n: Number(n.toFixed(3)),
      e: Number(e.toFixed(4)),
      Ve: Number(Ve.toFixed(2)),
      Vn: Number(Vn.toFixed(2)),
      volumeRecommande,
    });
  }

  async function enregistrerEtude() {
    if (!resultat) {
      setErreur("Veuillez d’abord faire le calcul.");
      return;
    }

    if (!user) {
      setErreur("Veuillez vous connecter pour enregistrer l’étude.");
      return;
    }

    setErreur("");
    setMessage("");

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert([
        {
          user_id: user.id,
          client_name: resultat.clientName || null,
          site_address: resultat.siteAddress || null,
          project_type: resultat.projectType,
          type_emetteur: resultat.typeEmetteur,
          puissance_generateur_kw: resultat.puissance_generateur_kw,
          volume_installation_l: resultat.volume_installation_l,
          temperature_maxi_c: resultat.temperature_maxi_c,
          hauteur_statique_m: resultat.hauteur_statique_m,
          pression_soupape_bar: resultat.pression_soupape_bar,
          glycol_pourcent: 0,
          status: "calculated",
        },
      ])
      .select()
      .single();

    if (projectError) {
      setErreur("Erreur lors de l’enregistrement du projet.");
      return;
    }

    const { error: calculationError } = await supabase
      .from("calculations")
      .insert([
        {
          project_id: project.id,
          origine_volume: resultat.origineVolume,
          va_l: resultat.Va,
          pst_bar: resultat.Pst,
          p0_bar: resultat.P0,
          per_bar: resultat.Per,
          pa_bar: resultat.Pa,
          pe_bar: resultat.Pe,
          n_value: resultat.n,
          e_value: resultat.e,
          ve_l: resultat.Ve,
          vn_l: resultat.Vn,
          volume_recommande_l: resultat.volumeRecommande,
          success: true,
          message: "Calcul réalisé avec succès.",
        },
      ]);

    if (calculationError) {
      setErreur("Projet enregistré, mais erreur lors de l’enregistrement du calcul.");
      return;
    }

    setMessage("Étude enregistrée avec succès dans votre compte.");
  }

  function genererPdfTest() {
    if (!resultat) {
      setErreur("Veuillez d’abord faire le calcul.");
      return;
    }

    const doc = new jsPDF();
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Note de dimensionnement du vase d'expansion", 14, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 14, y);

    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Informations chantier", 14, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Client : ${resultat.clientName || "Non renseigne"}`, 14, y);
    y += 7;
    doc.text(`Adresse : ${resultat.siteAddress || "Non renseignee"}`, 14, y);
    y += 7;
    doc.text(`Type de projet : ${resultat.projectType}`, 14, y);

    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Donnees de calcul", 14, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Type d'emetteur : ${resultat.typeEmetteur}`, 14, y);
    y += 7;
    doc.text(`Puissance generateur : ${resultat.puissance_generateur_kw} kW`, 14, y);
    y += 7;
    doc.text(`Volume installation retenu : ${resultat.Va} L`, 14, y);
    y += 7;
    doc.text(`Origine du volume : ${resultat.origineVolume}`, 14, y);
    y += 7;
    doc.text(`Temperature maxi : ${resultat.temperature_maxi_c} °C`, 14, y);
    y += 7;
    doc.text(`Hauteur statique : ${resultat.hauteur_statique_m} m`, 14, y);
    y += 7;
    doc.text(`Pression soupape : ${resultat.pression_soupape_bar} bar`, 14, y);

    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Resultats", 14, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Pression statique : ${resultat.Pst} bar`, 14, y);
    y += 7;
    doc.text(`Pression initiale : ${resultat.P0} bar`, 14, y);
    y += 7;
    doc.text(`Pression max d'exercice : ${resultat.Per} bar`, 14, y);
    y += 7;
    doc.text(`Coefficient d'expansion : ${resultat.e}`, 14, y);
    y += 7;
    doc.text(`Volume d'expansion : ${resultat.Ve} L`, 14, y);
    y += 7;
    doc.text(`Volume minimal du vase : ${resultat.Vn} L`, 14, y);

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(
      `Volume recommande : ${resultat.volumeRecommande ?? "hors plage standard"} L`,
      14,
      y
    );

    y += 14;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Cette note est etablie a partir des donnees saisies par l'utilisateur.",
      14,
      y
    );
    y += 6;
    doc.text(
      "Lorsque le volume d'eau n'est pas renseigne, il est estime selon une methode simplifiee.",
      14,
      y
    );

    const nomFichier = `note-vase-${(resultat.clientName || "chantier")
      .toLowerCase()
      .replace(/\s+/g, "-")}.pdf`;

    doc.save(nomFichier);
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
    setMessage("Déconnexion réussie.");
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
          <h1 style={{ marginTop: 0 }}>NotePAC</h1>
          <p style={{ fontSize: 18, lineHeight: 1.6 }}>
            Faites votre étude gratuitement, visualisez le résultat immédiatement,
            puis payez seulement 2,50 € pour obtenir le PDF.
          </p>

          {user ? (
            <div style={{ marginTop: 16 }}>
              Connecté : <strong>{user.email}</strong>
              <button onClick={seDeconnecter} style={{ ...buttonStyle, marginTop: 12 }}>
                Se déconnecter
              </button>
            </div>
          ) : null}
        </div>

        {!user ? <AuthForm onAuthSuccess={() => setMessage("Connexion réussie.")} /> : null}

        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Informations chantier</h2>

          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label>Nom du client</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label>Adresse du chantier</label>
              <input type="text" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label>Type de projet</label>
              <select value={projectType} onChange={(e) => setProjectType(e.target.value)} style={inputStyle}>
                <option value="renovation">Rénovation</option>
                <option value="neuf">Neuf</option>
              </select>
            </div>
          </div>

          <h2 style={{ marginTop: 32 }}>Calculateur de vase d’expansion</h2>

          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label>Type d’émetteur</label>
              <select value={typeEmetteur} onChange={(e) => setTypeEmetteur(e.target.value)} style={inputStyle}>
                <option value="radiateurs">Radiateurs</option>
                <option value="plancher_chauffant">Plancher chauffant</option>
              </select>
            </div>

            <div>
              <label>Puissance du générateur (kW)</label>
              <input type="number" value={puissance} onChange={(e) => setPuissance(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label>Volume d’eau installation (L) si connu</label>
              <input type="number" value={volume} onChange={(e) => setVolume(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label>Température maxi (°C)</label>
              <input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label>Hauteur statique (m)</label>
              <input type="number" value={hauteur} onChange={(e) => setHauteur(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label>Pression soupape (bar)</label>
              <input type="number" value={soupape} onChange={(e) => setSoupape(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <button onClick={calculer} style={buttonStyle}>
            Calculer
          </button>

          {erreur ? (
            <div style={{ marginTop: 20, background: "#fee2e2", color: "#991b1b", padding: 16, borderRadius: 12 }}>
              {erreur}
            </div>
          ) : null}

          {message ? (
            <div style={{ marginTop: 20, background: "#dcfce7", color: "#166534", padding: 16, borderRadius: 12 }}>
              {message}
            </div>
          ) : null}

          {resultat ? (
            <div style={{ marginTop: 24, background: "#ecfeff", borderRadius: 16, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Résultat</h2>

              <p><strong>Client :</strong> {resultat.clientName || "Non renseigné"}</p>
              <p><strong>Adresse :</strong> {resultat.siteAddress || "Non renseignée"}</p>
              <p><strong>Type de projet :</strong> {resultat.projectType}</p>
              <p><strong>Type d’émetteur :</strong> {resultat.typeEmetteur}</p>
              <p><strong>Origine du volume :</strong> {resultat.origineVolume}</p>
              <p><strong>Volume installation retenu :</strong> {resultat.Va} L</p>
              <p><strong>Pression statique :</strong> {resultat.Pst} bar</p>
              <p><strong>Pression initiale :</strong> {resultat.P0} bar</p>
              <p><strong>Pression max d’exercice :</strong> {resultat.Per} bar</p>
              <p><strong>Coefficient d’expansion :</strong> {resultat.e}</p>
              <p><strong>Volume d’expansion :</strong> {resultat.Ve} L</p>
              <p><strong>Volume minimal du vase :</strong> {resultat.Vn} L</p>

              <div style={{ marginTop: 16, fontSize: 28, fontWeight: "bold" }}>
                Volume recommandé : {resultat.volumeRecommande ?? "hors plage standard"} L
              </div>

              <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: "#fff7ed" }}>
                Pour obtenir la note PDF, l’utilisateur paiera 2,50 € à la fin.
              </div>

              <button onClick={enregistrerEtude} style={buttonStyle}>
                Enregistrer l’étude
              </button>

              <button onClick={genererPdfTest} style={secondaryButtonStyle}>
                Télécharger un PDF de test
              </button>
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

const secondaryButtonStyle = {
  marginTop: 12,
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  fontWeight: "bold",
  cursor: "pointer",
};
