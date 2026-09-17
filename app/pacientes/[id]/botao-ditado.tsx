"use client";

import { useEffect, useRef, useState } from "react";

export default function BotaoDitado({ onTexto }: { onTexto: (textoReconhecido: string) => void }) {
  const [gravando, setGravando] = useState(false);
  const [suportado, setSuportado] = useState(true);
  const reconhecimentoRef = useRef<any>(null);
  // Guarda a INTENÇÃO do usuário (separado do estado real da API) — é o que decide
  // se reinicia sozinho quando o navegador corta a sessão por conta própria.
  const deveContinuarRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSuportado(false);
      return;
    }

    function criarReconhecimento() {
      const reconhecimento = new SpeechRecognition();
      reconhecimento.lang = "pt-BR";
      reconhecimento.continuous = true;
      reconhecimento.interimResults = false;

      reconhecimento.onresult = (evento: any) => {
        let textoNovo = "";
        for (let i = evento.resultIndex; i < evento.results.length; i++) {
          if (evento.results[i].isFinal) {
            textoNovo += evento.results[i][0].transcript;
          }
        }
        if (textoNovo.trim()) onTexto(textoNovo.trim());
      };

      // O navegador corta a sessão sozinho de tempos em tempos (limite de ~1 minuto
      // é comum no Chrome), mesmo com "continuous". Se o usuário ainda quer gravar
      // (não clicou em parar), reinicia na hora — fica contínuo por quanto tempo
      // a consulta durar, sem perder trecho.
      reconhecimento.onend = () => {
        if (deveContinuarRef.current) {
          try {
            reconhecimento.start();
          } catch {
            // já estava rodando ou deu erro momentâneo — tenta de novo em 300ms
            setTimeout(() => {
              if (deveContinuarRef.current) {
                try {
                  reconhecimento.start();
                } catch {}
              }
            }, 300);
          }
        } else {
          setGravando(false);
        }
      };

      reconhecimento.onerror = (evento: any) => {
        // "no-speech" e "aborted" são normais em pausas de fala — não trata como erro fatal
        if (evento.error === "no-speech" || evento.error === "aborted") return;
        deveContinuarRef.current = false;
        setGravando(false);
      };

      return reconhecimento;
    }

    reconhecimentoRef.current = criarReconhecimento();

    return () => {
      deveContinuarRef.current = false;
      try {
        reconhecimentoRef.current?.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alternar() {
    if (!reconhecimentoRef.current) return;
    if (gravando) {
      deveContinuarRef.current = false;
      reconhecimentoRef.current.stop();
      setGravando(false);
    } else {
      deveContinuarRef.current = true;
      reconhecimentoRef.current.start();
      setGravando(true);
    }
  }

  if (!suportado) {
    return (
      <span title="Ditado por voz não disponível neste navegador — funciona no Chrome ou Edge." style={{ fontSize: 11, color: "var(--cor-texto-fraco)" }}>
        Ditado por voz indisponível neste navegador
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className={gravando ? undefined : "botao-secundario"}
      style={{
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: gravando ? "var(--cor-erro)" : undefined,
      }}
    >
      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: gravando ? "white" : "currentColor" }} />
      {gravando ? "Gravando... (clique pra parar)" : "Ditar por voz"}
    </button>
  );
}
