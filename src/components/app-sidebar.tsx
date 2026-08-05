import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertOctagon,
  ChevronRight,
  ClipboardList,
  Eraser,
  FileSpreadsheet,
  Handshake,
  Headset,
  LayoutDashboard,
  LineChart,
  ScrollText,
  Settings2,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useMockRole, type Role } from "@/lib/mock-role";

type Item = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  permission: string;
};

const RELATIONSHIP_ITEMS: Item[] = [
  {
    title: "Monitor - PitStop",
    url: "/",
    icon: LayoutDashboard,
    roles: ["analista", "analista_processos", "coordenador", "administrador"],
    permission: "pitstop.monitor.view",
  },
  {
    title: "Cadastro PitStop",
    url: "/gargalos",
    icon: AlertOctagon,
    roles: ["analista", "analista_processos", "coordenador", "administrador"],
    permission: "pitstop.records.view",
  },
  {
    title: "Monitor - Carteira",
    url: "/neo/dashboard",
    icon: LineChart,
    roles: ["analista", "analista_processos", "coordenador", "administrador"],
    permission: "carteira.monitor.view",
  },
  {
    title: "Cadastro Neo",
    url: "/neo/registros",
    icon: ClipboardList,
    roles: ["analista", "analista_processos", "coordenador", "administrador"],
    permission: "neo.records.view",
  },
  {
    title: "Base de Disparo",
    url: "/processamento-bases",
    icon: FileSpreadsheet,
    roles: ["analista_processos", "administrador"],
    permission: "dispatch.view",
  },
];

const GENERAL_ITEMS: Item[] = [
  {
    title: "Limpar CPF/CNPJ",
    url: "/limpar-documento",
    icon: Eraser,
    roles: ["analista", "analista_processos", "coordenador", "administrador"],
    permission: "document_cleaner.use",
  },
  {
    title: "Auditoria",
    url: "/auditoria",
    icon: ScrollText,
    roles: ["coordenador", "administrador"],
    permission: "audit.view",
  },
  {
    title: "Administração",
    url: "/administracao",
    icon: Settings2,
    roles: ["administrador"],
    permission: "administration.view",
  },
];

export function AppSidebar() {
  const { role, rbacEnabled, hasPermission } = useMockRole();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (routerState) => routerState.location.pathname });
  const [relationshipOpen, setRelationshipOpen] = useState(true);
  const [supportOpen, setSupportOpen] = useState(false);

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  const canSee = (item: Item) =>
    rbacEnabled ? hasPermission(item.permission) : item.roles.includes(role);
  const relationshipItems = RELATIONSHIP_ITEMS.filter(canSee);
  const generalItems = GENERAL_ITEMS.filter(canSee);
  const relationshipActive = relationshipItems.some((item) => isActive(item.url));
  const canViewRelationship = !rbacEnabled || hasPermission("relationship.view");
  const canViewSupport = !rbacEnabled || hasPermission("technical_support.view");

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
              {canViewRelationship && relationshipItems.length > 0 && (
                <Collapsible
                  asChild
                  open={relationshipOpen}
                  onOpenChange={setRelationshipOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={relationshipActive}
                        tooltip="Relacionamento"
                        className="data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
                      >
                        <Handshake className="h-4 w-4" />
                        <span>Relacionamento</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {relationshipItems.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(item.url)}
                              className="data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
                            >
                              <Link to={item.url}>
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {canViewSupport && (
                <Collapsible
                  asChild
                  open={supportOpen}
                  onOpenChange={setSupportOpen}
                  className="group/support-collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Suporte Técnico">
                        <Headset className="h-4 w-4" />
                        <span>Suporte Técnico</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/support-collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-9 py-1 text-xs text-muted-foreground">
                        Nenhuma rotina disponível
                      </div>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {generalItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
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
