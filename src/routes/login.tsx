import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-role";
import { toast } from "sonner";
import { AppFooter } from "@/components/app-footer";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Entrar — Controller CS" }, { name: "robots", content: "noindex" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviandoGoogle, setEnviandoGoogle] = useState(false);

  const emailCorporativo = (valor: string) =>
    valor.trim().toLowerCase().endsWith("@fortestecnologia.com.br");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailCorporativo(email)) {
      toast.error("Acesso restrito", {
        description: "Use um e-mail do domínio @fortestecnologia.com.br.",
      });
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    toast.success("Bem-vindo(a) ao Controller CS");
    navigate({ to: "/" });
  };

  const handleGoogleLogin = async () => {
    setEnviandoGoogle(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          hd: "fortestecnologia.com.br",
          prompt: "select_account",
        },
      },
    });
    setEnviandoGoogle(false);
    if (error) {
      toast.error("Não foi possível entrar com Google", { description: error.message });
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <img
            src="/fortes-oficial.jpg"
            alt="Fortes Tecnologia"
            className="h-12 w-12 rounded-md bg-white object-contain p-1"
          />
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider opacity-90">
              Fortes Tecnologia
            </div>
            <div className="text-xs opacity-70">Customer Success</div>
          </div>
        </div>

        <div className="w-full max-w-md text-center">
          <h2 className="text-left text-3xl font-semibold leading-tight text-white">
            Controller CS
          </h2>
          <p className="mt-3 text-center text-sm leading-relaxed text-white/90">
            Acompanhe indicadores em tempo real e reduza o trabalho manual
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

      <section className="relative flex items-center justify-center bg-background p-6 pb-24">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img
              src="/fortes-oficial.jpg"
              alt="Fortes Tecnologia"
              className="h-12 w-12 rounded-md bg-white object-contain p-1"
            />
            <div>
              <div className="text-sm font-semibold text-foreground">Controller CS</div>
              <div className="text-xs text-muted-foreground">Fortes Tecnologia</div>
            </div>
          </div>

          <h1 className="text-center text-2xl font-semibold text-foreground">
            Acesse o Controller CS
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Use seu e-mail corporativo da Fortes Tecnologia.
          </p>

          <div className="mt-6 space-y-5">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={enviandoGoogle || enviando}
            >
              {enviandoGoogle ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando…
                </>
              ) : (
                <>
                  <span className="mr-2 text-base font-bold text-primary" aria-hidden>
                    G
                  </span>
                  Entrar com Google
                </>
              )}
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">ou entre com sua senha</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
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
                  <Label htmlFor="senha">Senha</Label>
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
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Ao entrar, você concorda com as políticas internas de uso do sistema.
            <br />
            <Link to="/" className="text-primary hover:underline">
              Voltar para a visão geral
            </Link>
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0">
          <AppFooter />
        </div>
      </section>
    </div>
  );
}
