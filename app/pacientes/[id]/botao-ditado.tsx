"use client";

import { useEffect, useRef, useState } from "react";

export default function BotaoDitado({ onTexto }: { onTexto: (textoReconhecido: string) => void }) {
  const [gravando, setGravando] = useState(false);
  const [suportado, setSuportado] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [recebeuAlgumaFala, setRecebeuAlgumaFala] = useState(false);
  const reconhecimentoRef = useRef<any>(null);
  const deveContinuarRef = useRef(false);
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

      reconhecimento.onstart = () => {
        setErro(null);
        setRecebeuAlgumaFala(false);
      };

      reconhecimento.onresult = (evento: any) => {
        setRecebeuAlgumaFala(true);
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

      const MENSAGENS_ERRO: Record<string, string> = {
        "not-allowed": "Permissão de microfone negada. Verifique o ícone de cadeado/microfone na barra de endereço e permita o acesso.",
        "service-not-allowed":
          "Este navegador bloqueou o serviço de reconhecimento de voz — costuma ser alguma extensão de privacidade/bloqueio de anúncios. Tente numa aba anônima ou desative extensões.",
        "audio-capture": "Nenhum microfone encontrado. Verifique se há um microfone conectado e funcionando.",
        network: "Erro de rede ao conectar no serviço de reconhecimento de voz. Verifique sua conexão com a internet.",
      };

      reconhecimento.onerror = (evento: any) => {
        if (evento.error === "no-speech" || evento.error === "aborted") return;
        deveContinuarRef.current = false;
        setGravando(false);
        setErro(MENSAGENS_ERRO[evento.error] ?? `Erro no reconhecimento de voz: ${evento.error}`);
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
      pendenteRef.current = "";
      deveContinuarRef.current = true;
      setErro(null);
      try {
        reconhecimentoRef.current.start();
        setGravando(true);
      } catch (e: any) {
        setErro("Não foi possível iniciar: " + (e?.message ?? "erro desconhecido"));
      }
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
    <div>
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
      {gravando && !recebeuAlgumaFala && (
        <p style={{ fontSize: 10.5, color: "var(--cor-texto-fraco)", margin: "4px 0 0" }}>Ouvindo... (nada reconhecido ainda)</p>
      )}
      {erro && <p style={{ fontSize: 11, color: "var(--cor-erro)", margin: "4px 0 0", maxWidth: 280 }}>{erro}</p>}
    </div>
  );
}
