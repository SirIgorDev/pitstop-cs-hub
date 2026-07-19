import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertOctagon,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  ScrollText,
  Settings2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useMockRole, type Role } from "@/lib/mock-role";

type Item = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

const ITEMS: Item[] = [
  {
    title: "Visão Gargalos",
    url: "/",
    icon: LayoutDashboard,
    roles: ["analista", "coordenador", "administrador"],
  },
  {
    title: "Cadastro de Gargalo",
    url: "/gargalos",
    icon: AlertOctagon,
    roles: ["analista", "coordenador", "administrador"],
  },
  {
    title: "Cadastro Neo",
    url: "/neo/registros",
    icon: ClipboardList,
    roles: ["analista", "coordenador", "administrador"],
  },
  {
    title: "Visão Cobertura da Carteira",
    url: "/neo/dashboard",
    icon: LineChart,
    roles: ["analista", "coordenador", "administrador"],
  },
  {
    title: "Auditoria",
    url: "/auditoria",
    icon: ScrollText,
    roles: ["coordenador", "administrador"],
  },
  { title: "Administração", url: "/administracao", icon: Settings2, roles: ["administrador"] },
];

export function AppSidebar() {
  const { role } = useMockRole();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname === url || pathname.startsWith(url + "/");
  };

  const visible = ITEMS.filter((i) => i.roles.includes(role));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <img
            src="/fortes-oficial.jpg"
            alt="Fortes Tecnologia"
            className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-0.5"
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight text-foreground">
                Controller CS
              </div>
              <div className="truncate text-xs text-muted-foreground">Fortes Tecnologia</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
