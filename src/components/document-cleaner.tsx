import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DocumentCleaner() {
  const [input, setInput] = useState("");
  const cleaned = input.replace(/\D/g, "");

  const copy = async () => {
    if (!cleaned) return toast.error("Cole um CPF ou CNPJ");
    await navigator.clipboard.writeText(cleaned);
    toast.success("Copiado com sucesso");
  };

  return (
    <section className="max-w-xl rounded-md border border-border bg-background p-6">
      <h2 className="text-base font-semibold text-foreground">Limpar CPF/CNPJ</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Remove pontos, barras, traços e espaços. O documento não é salvo.
      </p>
      <div className="mt-5 grid gap-2">
        <Label htmlFor="documento">CPF ou CNPJ</Label>
        <Input
          id="documento"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ex.: 12.345.678/0001-90"
          autoComplete="off"
        />
      </div>
      <div className="mt-4 grid gap-2">
        <Label htmlFor="documento-limpo">Somente números</Label>
        <div className="flex gap-2">
          <Input id="documento-limpo" value={cleaned} readOnly />
          <Button type="button" onClick={copy} disabled={!cleaned}>
            <Copy className="mr-2 h-4 w-4" /> Copiar
          </Button>
        </div>
      </div>
    </section>
  );
}
