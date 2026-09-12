import "./globals.css";

export const metadata = {
  title: "Prontuário — Dr. Thiago Casagrande",
  description: "Sistema de prontuário eletrônico e gestão da clínica",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
