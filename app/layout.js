export const metadata = {
  title: "NotePAC",
  description: "Calcul de vase d'expansion",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f8fafc" }}>
        {children}
      </body>
    </html>
  );
}
