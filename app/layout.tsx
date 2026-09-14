import "./globals.css";

export const metadata = {
  title: "Prontuário — Dr. Thiago Casagrande",
  description: "Sistema de prontuário eletrônico e gestão da clínica",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var tema = localStorage.getItem('tema');
                if (tema !== 'light') {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (e) {
                document.documentElement.setAttribute('data-theme', 'dark');
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
