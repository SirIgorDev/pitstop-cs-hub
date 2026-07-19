export function AppFooter() {
  return (
    <footer className="sticky bottom-0 z-30 border-t border-border bg-background/95 px-6 py-4 text-center text-xs text-muted-foreground shadow-[0_-2px_8px_rgba(0,0,0,0.04)] backdrop-blur">
      Desenvolvido por Igor Mota · Contato:{" "}
      <a
        href="mailto:igormota@fortestecnologia.com.br"
        className="font-medium text-primary hover:underline"
      >
        igormota@fortestecnologia.com.br
      </a>
    </footer>
  );
}
