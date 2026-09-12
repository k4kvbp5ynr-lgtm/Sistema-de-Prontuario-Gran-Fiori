"use client";

import { createClient } from "@/lib/supabase/client";

export default function BotaoAbrirAnexo({ caminho }: { caminho: string }) {
  const supabase = createClient();

  async function abrir() {
    const { data, error } = await supabase.storage.from("exames").createSignedUrl(caminho, 60);
    if (error || !data) {
      alert("Não foi possível gerar o link do arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <button type="button" onClick={abrir} style={{ fontSize: "0.8rem", padding: "4px 10px" }}>
      Abrir
    </button>
  );
}
