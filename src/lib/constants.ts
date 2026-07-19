// Listas fixas dos módulos (enums do banco)

export const SEGMENTOS_GARGALO = ["Corporativo", "Contábil"] as const;
export type SegmentoGargalo = (typeof SEGMENTOS_GARGALO)[number];

export const CATEGORIAS_GARGALO = [
  "Documentação / Processos",
  "Prazo de Atendimento / SLA",
  "Funcionalidades / Produto",
  "Legislação / Compliance Fiscal",
  "Comunicação / Relacionamento",
  "Treinamento / Capacitação",
  "Integração de Sistemas",
  "Financeiro / Cobrança",
  "Suporte Técnico / Sistema",
  "Onboarding / Implantação",
] as const;
export type CategoriaGargalo = (typeof CATEGORIAS_GARGALO)[number];

export const IMPACTOS = ["Baixo", "Médio", "Alto", "Crítico"] as const;
export type Impacto = (typeof IMPACTOS)[number];

export const URGENCIAS = ["Baixa", "Média", "Alta", "Crítica"] as const;
export type Urgencia = (typeof URGENCIAS)[number];

export const STATUS_GARGALO = ["Aberto", "Em Andamento", "Monitorando", "Resolvido"] as const;
export type StatusGargalo = (typeof STATUS_GARGALO)[number];

export const RISCOS_CHURN = ["Baixo", "Médio", "Alto"] as const;
export type RiscoChurn = (typeof RISCOS_CHURN)[number];

export const TIPOS_NEO = ["Proativo", "Reativo"] as const;
export type TipoNeo = (typeof TIPOS_NEO)[number];

export const ESTEIRAS_NEO = [
  "Contato realizado",
  "1° Contato",
  "2° Contato",
  "Cliente Proativo",
  "Em acompanhamento",
  "Contato sem sucesso",
  "Onboarding",
  "Cliente ativo",
  "Tentativa",
  "Meet Agendada",
  "Visita",
] as const;
export type EsteiraNeo = (typeof ESTEIRAS_NEO)[number];

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function statusGargaloBadge(s: string) {
  if (s === "Aberto") return "border-primary/30 bg-primary/5 text-primary";
  if (s === "Em Andamento") return "border-warning/30 bg-warning/5 text-warning";
  if (s === "Monitorando") return "border-border bg-muted text-foreground";
  return "border-success/30 bg-success/5 text-success";
}

export function impactoBadge(p: string) {
  if (p === "Crítico" || p === "Alto") return "border-destructive/30 bg-destructive/5 text-destructive";
  if (p === "Médio") return "border-warning/30 bg-warning/5 text-warning";
  return "border-border bg-muted text-muted-foreground";
}

export function riscoBadge(r: string) {
  if (r === "Alto") return "border-destructive/30 bg-destructive/5 text-destructive";
  if (r === "Médio") return "border-warning/30 bg-warning/5 text-warning";
  return "border-border bg-muted text-muted-foreground";
}
