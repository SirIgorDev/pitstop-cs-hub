import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, ShieldOff } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { useAuth } from "@/lib/mock-role";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login" });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (session && user.id && !user.ativo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="max-w-md rounded-lg border border-border bg-background p-8 text-center">
          <ShieldOff className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-lg font-semibold text-foreground">Acesso desativado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta está inativa. Fale com um administrador do Controller CS para reativar seu
            acesso.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => void signOut()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-surface">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-surface">
          <AppHeader />
          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-7xl px-6 py-8">
              <Outlet />
            </div>
          </main>
          <AppFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
