"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthForm({ onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email || !password) {
      setError("Veuillez renseigner un email et un mot de passe.");
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Compte créé. Vous êtes connecté ou un email de confirmation a été envoyé.");
      onAuthSuccess?.();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Connexion réussie.");
    onAuthSuccess?.();
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        marginBottom: 24,
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        {mode === "login" ? "Connexion" : "Créer un compte"}
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <button type="submit" style={buttonStyle}>
          {mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      {error ? (
        <div style={errorStyle}>{error}</div>
      ) : null}

      {message ? (
        <div style={successStyle}>{message}</div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setMessage("");
          setError("");
        }}
        style={secondaryButtonStyle}
      >
        {mode === "login"
          ? "Je n’ai pas de compte"
          : "J’ai déjà un compte"}
      </button>
    </div>
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
  padding: 12,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  fontWeight: "bold",
  cursor: "pointer",
};

const errorStyle = {
  marginTop: 16,
  background: "#fee2e2",
  color: "#991b1b",
  padding: 16,
  borderRadius: 12,
};

const successStyle = {
  marginTop: 16,
  background: "#dcfce7",
  color: "#166534",
  padding: 16,
  borderRadius: 12,
};
