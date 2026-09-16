"use client";

import { createContext, useContext, useState, useRef, ReactNode } from "react";

type ConsultaTimerContextType = {
  rodando: boolean;
  travado: boolean;
  segundosDecorridos: number;
  iniciar: () => void;
  pararEObterDuracao: () => number | null; // retorna a duração final em segundos, e trava o timer
  resetar: () => void;
};

const ConsultaTimerContext = createContext<ConsultaTimerContextType | null>(null);

export function ConsultaTimerProvider({ children }: { children: ReactNode }) {
  const [rodando, setRodando] = useState(false);
  const [travado, setTravado] = useState(false);
  const [segundosDecorridos, setSegundosDecorridos] = useState(0);
  const inicioRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function iniciar() {
    if (rodando || travado) return;
    inicioRef.current = Date.now();
    setRodando(true);
    intervalRef.current = setInterval(() => {
      if (inicioRef.current) {
        setSegundosDecorridos(Math.floor((Date.now() - inicioRef.current) / 1000));
      }
    }, 1000);
  }

  function pararEObterDuracao(): number | null {
    if (!rodando || !inicioRef.current) return null;
    const duracaoFinal = Math.floor((Date.now() - inicioRef.current) / 1000);
    if (intervalRef.current) clearInterval(intervalRef.current);
    inicioRef.current = null;
    setRodando(false);
    setTravado(false);
    setSegundosDecorridos(0);
    return duracaoFinal;
  }

  function resetar() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    inicioRef.current = null;
    setRodando(false);
    setTravado(false);
    setSegundosDecorridos(0);
  }

  return (
    <ConsultaTimerContext.Provider value={{ rodando, travado, segundosDecorridos, iniciar, pararEObterDuracao, resetar }}>
      {children}
    </ConsultaTimerContext.Provider>
  );
}

export function useConsultaTimer() {
  const ctx = useContext(ConsultaTimerContext);
  if (!ctx) throw new Error("useConsultaTimer precisa estar dentro de um ConsultaTimerProvider");
  return ctx;
}
