-- Metadados de cada processamento. Uma importação permanece atual até que a
-- próxima seja concluída pelo mesmo usuário.
CREATE TABLE public.process_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT,
  source_type TEXT NOT NULL DEFAULT 'upload'
    CHECK (source_type IN ('upload', 'google_sheets')),
  source_spreadsheet_id TEXT,
  source_sheet_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  is_current BOOLEAN NOT NULL DEFAULT true,
  imported_rows INTEGER NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
  invalid_document_rows INTEGER NOT NULL DEFAULT 0 CHECK (invalid_document_rows >= 0),
  unique_valid_documents INTEGER NOT NULL DEFAULT 0 CHECK (unique_valid_documents >= 0),
  duplicate_documents INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_documents >= 0),
  duplicate_rows INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
  documents_without_whatsapp INTEGER NOT NULL DEFAULT 0
    CHECK (documents_without_whatsapp >= 0),
  generated_rows INTEGER NOT NULL DEFAULT 0 CHECK (generated_rows >= 0),
  fixed_phone_candidates INTEGER NOT NULL DEFAULT 0 CHECK (fixed_phone_candidates >= 0),
  invalid_phone_candidates INTEGER NOT NULL DEFAULT 0 CHECK (invalid_phone_candidates >= 0),
  phones_with_added_ninth_digit INTEGER NOT NULL DEFAULT 0
    CHECK (phones_with_added_ninth_digit >= 0),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX process_imports_one_current_per_owner_idx
  ON public.process_imports (owner_id)
  WHERE is_current;
CREATE INDEX process_imports_owner_created_idx
  ON public.process_imports (owner_id, created_at DESC);
CREATE INDEX process_imports_status_idx
  ON public.process_imports (status);

-- Mantém tanto a origem quanto o resultado normalizado. Isso permite explicar
-- e revisar cada escolha sem alterar a planilha original.
CREATE TABLE public.process_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.process_imports(id) ON DELETE CASCADE,
  source_row INTEGER NOT NULL CHECK (source_row > 0),
  document_raw TEXT NOT NULL DEFAULT '',
  document_normalized TEXT
    CHECK (
      document_normalized IS NULL
      OR document_normalized ~ '^([0-9]{11}|[0-9]{14})$'
    ),
  client_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone_1 TEXT NOT NULL DEFAULT '',
  phone_2 TEXT NOT NULL DEFAULT '',
  phone_3 TEXT NOT NULL DEFAULT '',
  whatsapp TEXT CHECK (whatsapp IS NULL OR whatsapp ~ '^[0-9]{11}$'),
  phone_source TEXT CHECK (phone_source IN ('telefone1', 'telefone2', 'telefone3')),
  outcome TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      outcome IN (
        'pending',
        'generated',
        'discarded_invalid_document',
        'discarded_no_whatsapp'
      )
    ),
  added_ninth_digit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (import_id, source_row),
  UNIQUE (id, import_id)
);

CREATE INDEX process_import_rows_import_outcome_idx
  ON public.process_import_rows (import_id, outcome);
CREATE INDEX process_import_rows_import_document_idx
  ON public.process_import_rows (import_id, document_normalized);
CREATE UNIQUE INDEX process_import_rows_one_generated_document_idx
  ON public.process_import_rows (import_id, document_normalized)
  WHERE outcome = 'generated';

-- Histórico das escolhas manuais. Uma decisão desfeita continua registrada e
-- deixa de ser considerada ativa.
CREATE TABLE public.process_review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.process_imports(id) ON DELETE CASCADE,
  document_normalized TEXT NOT NULL
    CHECK (document_normalized ~ '^([0-9]{11}|[0-9]{14})$'),
  previous_row_id UUID,
  selected_row_id UUID,
  decision TEXT NOT NULL CHECK (decision IN ('select', 'discard')),
  decided_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES auth.users(id),
  CONSTRAINT process_review_decision_payload_check
    CHECK (
      (decision = 'select' AND selected_row_id IS NOT NULL)
      OR (decision = 'discard' AND selected_row_id IS NULL)
    ),
  CONSTRAINT process_review_undo_check
    CHECK (
      (undone_at IS NULL AND undone_by IS NULL)
      OR (undone_at IS NOT NULL AND undone_by IS NOT NULL)
    ),
  CONSTRAINT process_review_previous_row_fk
    FOREIGN KEY (previous_row_id, import_id)
    REFERENCES public.process_import_rows(id, import_id)
    ON DELETE NO ACTION,
  CONSTRAINT process_review_selected_row_fk
    FOREIGN KEY (selected_row_id, import_id)
    REFERENCES public.process_import_rows(id, import_id)
    ON DELETE NO ACTION
);

CREATE UNIQUE INDEX process_review_one_active_decision_idx
  ON public.process_review_decisions (import_id, document_normalized)
  WHERE undone_at IS NULL;
CREATE INDEX process_review_import_created_idx
  ON public.process_review_decisions (import_id, created_at DESC);
CREATE INDEX process_review_decided_by_idx
  ON public.process_review_decisions (decided_by);

CREATE TABLE public.process_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.process_imports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX process_exports_import_created_idx
  ON public.process_exports (import_id, created_at DESC);
CREATE INDEX process_exports_created_by_idx
  ON public.process_exports (created_by);

CREATE OR REPLACE FUNCTION public.tg_process_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER process_imports_set_updated_at
BEFORE UPDATE ON public.process_imports
FOR EACH ROW EXECUTE FUNCTION public.tg_process_set_updated_at();

CREATE TRIGGER process_import_rows_set_updated_at
BEFORE UPDATE ON public.process_import_rows
FOR EACH ROW EXECUTE FUNCTION public.tg_process_set_updated_at();

REVOKE ALL ON FUNCTION public.tg_process_set_updated_at() FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.process_imports,
     public.process_import_rows,
     public.process_exports
  TO authenticated;
GRANT SELECT, INSERT, UPDATE
  ON public.process_review_decisions
  TO authenticated;
GRANT ALL
  ON public.process_imports,
     public.process_import_rows,
     public.process_review_decisions,
     public.process_exports
  TO service_role;

ALTER TABLE public.process_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_exports ENABLE ROW LEVEL SECURITY;

-- Importações: Analista de Processos acessa apenas as próprias; Administrador
-- acessa todas. Ambos precisam estar ativos.
CREATE POLICY "process_imports_select"
ON public.process_imports FOR SELECT TO authenticated
USING (
  (SELECT public.is_active(auth.uid()))
  AND (
    (
      owner_id = (SELECT auth.uid())
      AND (SELECT public.has_role(auth.uid(), 'process_analyst'::public.app_role))
    )
    OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

CREATE POLICY "process_imports_insert"
ON public.process_imports FOR INSERT TO authenticated
WITH CHECK (
  owner_id = (SELECT auth.uid())
  AND (SELECT public.is_active(auth.uid()))
  AND (
    (SELECT public.has_role(auth.uid(), 'process_analyst'::public.app_role))
    OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

CREATE POLICY "process_imports_update"
ON public.process_imports FOR UPDATE TO authenticated
USING (
  (SELECT public.is_active(auth.uid()))
  AND (
    (
      owner_id = (SELECT auth.uid())
      AND (SELECT public.has_role(auth.uid(), 'process_analyst'::public.app_role))
    )
    OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
  )
)
WITH CHECK (
  (SELECT public.is_active(auth.uid()))
  AND (
    (
      owner_id = (SELECT auth.uid())
      AND (SELECT public.has_role(auth.uid(), 'process_analyst'::public.app_role))
    )
    OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

CREATE POLICY "process_imports_delete"
ON public.process_imports FOR DELETE TO authenticated
USING (
  (SELECT public.is_active(auth.uid()))
  AND (
    (
      owner_id = (SELECT auth.uid())
      AND (SELECT public.has_role(auth.uid(), 'process_analyst'::public.app_role))
    )
    OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

-- As tabelas filhas herdam a autorização da importação a que pertencem.
CREATE POLICY "process_import_rows_select"
ON public.process_import_rows FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_import_rows.import_id
  )
);

CREATE POLICY "process_import_rows_insert"
ON public.process_import_rows FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_import_rows.import_id
  )
);

CREATE POLICY "process_import_rows_update"
ON public.process_import_rows FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_import_rows.import_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_import_rows.import_id
  )
);

CREATE POLICY "process_import_rows_delete"
ON public.process_import_rows FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_import_rows.import_id
  )
);

CREATE POLICY "process_review_decisions_select"
ON public.process_review_decisions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_review_decisions.import_id
  )
);

CREATE POLICY "process_review_decisions_insert"
ON public.process_review_decisions FOR INSERT TO authenticated
WITH CHECK (
  decided_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_review_decisions.import_id
  )
);

CREATE POLICY "process_review_decisions_update"
ON public.process_review_decisions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_review_decisions.import_id
  )
)
WITH CHECK (
  (
    decided_by = (SELECT auth.uid())
    OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
  )
  AND (
    undone_by IS NULL
    OR undone_by = (SELECT auth.uid())
    OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
  )
  AND EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_review_decisions.import_id
  )
);

CREATE POLICY "process_exports_select"
ON public.process_exports FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_exports.import_id
  )
);

CREATE POLICY "process_exports_insert"
ON public.process_exports FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_exports.import_id
  )
);

CREATE POLICY "process_exports_delete"
ON public.process_exports FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.process_imports AS process_import
    WHERE process_import.id = process_exports.import_id
  )
);
