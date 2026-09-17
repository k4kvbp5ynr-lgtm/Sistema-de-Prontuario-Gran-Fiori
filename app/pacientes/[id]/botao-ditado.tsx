"use client";

import { useEffect, useRef, useState } from "react";

export default function BotaoDitado({ onTexto }: { onTexto: (textoReconhecido: string) => void }) {
  const [gravando, setGravando] = useState(false);
  const [suportado, setSuportado] = useState(true);
  const reconhecimentoRef = useRef<any>(null);
  const deveContinuarRef = useRef(false);
  // Guarda o trecho que o navegador ainda não confirmou como "final" — se o usuário
  // clicar em parar no meio de uma frase (sem pausa antes), isso evita perder o trecho.
  const pendenteRef = useRef("");

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
      reconhecimento.interimResults = true;

      reconhecimento.onresult = (evento: any) => {
        let textoFinalNovo = "";
        let textoInterim = "";
        for (let i = evento.resultIndex; i < evento.results.length; i++) {
          if (evento.results[i].isFinal) {
            textoFinalNovo += evento.results[i][0].transcript;
          } else {
            textoInterim += evento.results[i][0].transcript;
          }
        }
        if (textoFinalNovo.trim()) {
          onTexto(textoFinalNovo.trim());
          pendenteRef.current = "";
        } else {
          pendenteRef.current = textoInterim;
        }
      };

      reconhecimento.onend = () => {
        // Flush de segurança: qualquer trecho ainda não confirmado quando a sessão
        // encerra (seja por ter clicado em parar, seja por corte automático) entra
        // no texto mesmo assim, em vez de ser descartado.
        if (pendenteRef.current.trim()) {
          onTexto(pendenteRef.current.trim());
          pendenteRef.current = "";
        }
        if (deveContinuarRef.current) {
          try {
            reconhecimento.start();
          } catch {
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
      reconhecimentoRef.current.stop(); // onend cuida do flush do texto pendente
      setGravando(false);
    } else {
      pendenteRef.current = "";
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
