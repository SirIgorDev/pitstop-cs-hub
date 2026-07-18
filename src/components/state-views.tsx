import { AlertCircle, CheckCircle2, Inbox, Loader2, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BaseProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

function Shell({
  icon,
  tone,
  title,
  description,
  action,
  className,
}: BaseProps & { icon: ReactNode; tone: "muted" | "primary" | "destructive" | "success" }) {
  const toneMap = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  } as const;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-border bg-background px-6 py-14 text-center",
        className,
      )}
    >
      <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-full", toneMap[tone])}>
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ title = "Carregando…", description }: Partial<BaseProps>) {
  return (
    <Shell
      tone="muted"
      icon={<Loader2 className="h-5 w-5 animate-spin" />}
      title={title}
      description={description}
    />
  );
}

export function EmptyState(props: BaseProps) {
  return <Shell tone="muted" icon={<Inbox className="h-5 w-5" />} {...props} />;
}

export function ErrorState(props: BaseProps) {
  return <Shell tone="destructive" icon={<AlertCircle className="h-5 w-5" />} {...props} />;
}

export function SuccessState(props: BaseProps) {
  return <Shell tone="success" icon={<CheckCircle2 className="h-5 w-5" />} {...props} />;
}

export function ForbiddenState({
  title = "Sem permissão para acessar",
  description = "Sua conta não tem permissão para visualizar esta página. Fale com um administrador se acredita que isso é um engano.",
  action,
}: Partial<BaseProps>) {
  return (
    <Shell
      tone="destructive"
      icon={<Lock className="h-5 w-5" />}
      title={title}
      description={description}
      action={action}
    />
  );
}
