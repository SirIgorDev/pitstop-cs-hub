import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL, useMockRole, type Role } from "@/lib/mock-role";

export function AppHeader() {
  const { user, role, setRole } = useMockRole();
  const navigate = useNavigate();

  const initials = user.nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-6" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted-foreground">
          Bem-vindo(a) de volta, <span className="font-medium text-foreground">{user.nome.split(" ")[0]}</span>
        </p>
      </div>

      <Badge
        variant="outline"
        className="hidden border-border bg-muted text-muted-foreground sm:inline-flex"
      >
        Perfil simulado
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:bg-muted">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-sm font-medium text-foreground">{user.nome}</div>
            <div className="truncate text-xs text-muted-foreground">{ROLE_LABEL[role]}</div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="font-medium text-foreground">{user.nome}</div>
            <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Alternar perfil (demo)
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as Role)}>
            <DropdownMenuRadioItem value="analista">Analista de CS</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="coordenador">Coordenador</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="administrador">Administrador</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserIcon className="mr-2 h-4 w-4" /> Meu perfil
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => navigate({ to: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
