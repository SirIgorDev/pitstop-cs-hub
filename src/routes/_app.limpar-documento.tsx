import { createFileRoute } from "@tanstack/react-router";
import { DocumentCleaner } from "@/components/document-cleaner";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/limpar-documento")({
  component: LimparDocumentoPage,
  head: () => ({
    meta: [{ title: "Limpar CPF/CNPJ — Controller CS" }, { name: "robots", content: "noindex" }],
  }),
});

function LimparDocumentoPage() {
  return (
    <>
      <PageHeader
        title="Limpar CPF/CNPJ"
        description="Remova a máscara de CPF ou CNPJ com segurança, sem armazenar o documento."
      />
      <DocumentCleaner />
    </>
  );
}
