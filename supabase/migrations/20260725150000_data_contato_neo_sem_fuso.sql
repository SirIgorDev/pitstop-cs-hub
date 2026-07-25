ALTER TABLE public.registros_neo
  ALTER COLUMN data_contato DROP DEFAULT;

ALTER TABLE public.registros_neo
  ALTER COLUMN data_contato TYPE DATE
  USING (data_contato AT TIME ZONE 'UTC')::DATE;

ALTER TABLE public.registros_neo
  ALTER COLUMN data_contato SET DEFAULT CURRENT_DATE;
