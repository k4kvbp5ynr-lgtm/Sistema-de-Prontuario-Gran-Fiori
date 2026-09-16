import "./globals.css";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--fonte-ui" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fonte-mono" });

export const metadata = {
  title: "Prontuário — Dr. Thiago Casagrande",
  description: "Sistema de prontuário eletrônico e gestão da clínica",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${plexMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var tema = localStorage.getItem('tema');
                if (tema === 'light') {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
