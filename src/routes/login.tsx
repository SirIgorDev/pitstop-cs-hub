import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — PitStop CS" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    // Autenticação será implementada na próxima etapa.
    setTimeout(() => {
      setEnviando(false);
      navigate({ to: "/" });
    }, 600);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Painel de marca */}
      <aside className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary-foreground text-primary font-bold">
            F
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider opacity-90">
              Fortes Tecnologia
            </div>
            <div className="text-xs opacity-70">Customer Success</div>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            PitStop CS
          </h2>
          <p className="mt-3 text-sm leading-relaxed opacity-90">
            Centralize registros de gargalos e atendimentos Neo, acompanhe indicadores
            em tempo real e reduza o trabalho manual do time de Customer Success.
          </p>
        </div>

        <div className="text-xs opacity-70">
          © {new Date().getFullYear()} Fortes Tecnologia. Uso interno.
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]"
        />
      </aside>

      {/* Formulário */}
      <section className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
              F
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">PitStop CS</div>
              <div className="text-xs text-muted-foreground">Fortes Tecnologia</div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-foreground">Entrar na sua conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse com o e-mail corporativo da Fortes Tecnologia.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail corporativo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nome.sobrenome@fortestecnologia.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary-dark hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Input
                  id="senha"
                  type={mostrar ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrar((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox id="lembrar" />
              <span>Manter conectado neste dispositivo</span>
            </label>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary-dark"
              disabled={enviando}
            >
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Ao entrar, você concorda com as políticas internas de uso do sistema.
            <br />
            <Link to="/" className="text-primary hover:underline">
              Voltar para a visão geral
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
