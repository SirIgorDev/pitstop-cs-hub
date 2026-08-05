export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_control_settings: {
        Row: {
          id: boolean
          rbac_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          rbac_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          rbac_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      canal_atendimento_options: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cargo_permissoes: {
        Row: {
          cargo_id: string
          created_at: string
          escopo: string
          permissao_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cargo_id: string
          created_at?: string
          escopo?: string
          permissao_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cargo_id?: string
          created_at?: string
          escopo?: string
          permissao_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargo_permissoes_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_permissoes_permissao_id_fkey"
            columns: ["permissao_id"]
            isOneToOne: false
            referencedRelation: "permissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          perfil_base: Database["public"]["Enums"]["app_role"]
          protegido: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          perfil_base?: Database["public"]["Enums"]["app_role"]
          protegido?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          perfil_base?: Database["public"]["Enums"]["app_role"]
          protegido?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      categoria_gargalo_options: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      churn_files: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string
          error_message: string | null
          file_name: string
          id: string
          import_id: string
          imported_rows: number
          invalid_rows: number
          macro_reason: string | null
          status: string
          tipo: string
          updated_at: string
          valid_rows: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by: string
          error_message?: string | null
          file_name: string
          id?: string
          import_id: string
          imported_rows?: number
          invalid_rows?: number
          macro_reason?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valid_rows?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string
          error_message?: string | null
          file_name?: string
          id?: string
          import_id?: string
          imported_rows?: number
          invalid_rows?: number
          macro_reason?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "churn_files_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "churn_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_imports: {
        Row: {
          ativo: boolean
          competencia: string
          created_at: string
          error_message: string | null
          id: string
          owner_id: string
          processed_at: string | null
          status: string
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          competencia: string
          created_at?: string
          error_message?: string | null
          id?: string
          owner_id: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          competencia?: string
          created_at?: string
          error_message?: string | null
          id?: string
          owner_id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      churn_records: {
        Row: {
          acquisition_date: string | null
          cancellation_date: string | null
          cancellation_reason: string | null
          cancellation_value: number
          churn_type: string | null
          client_id: string
          client_name: string
          client_status: string | null
          created_at: string
          file_id: string
          id: string
          import_id: string
          macro_reason: string
          market: string | null
          modality: string | null
          observation: string | null
          plan_name: string | null
          revenue_type: string | null
          service_product: string
          source_row: number
          unit_name: string | null
        }
        Insert: {
          acquisition_date?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          cancellation_value?: number
          churn_type?: string | null
          client_id: string
          client_name?: string
          client_status?: string | null
          created_at?: string
          file_id: string
          id?: string
          import_id: string
          macro_reason: string
          market?: string | null
          modality?: string | null
          observation?: string | null
          plan_name?: string | null
          revenue_type?: string | null
          service_product?: string
          source_row: number
          unit_name?: string | null
        }
        Update: {
          acquisition_date?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          cancellation_value?: number
          churn_type?: string | null
          client_id?: string
          client_name?: string
          client_status?: string | null
          created_at?: string
          file_id?: string
          id?: string
          import_id?: string
          macro_reason?: string
          market?: string | null
          modality?: string | null
          observation?: string | null
          plan_name?: string | null
          revenue_type?: string | null
          service_product?: string
          source_row?: number
          unit_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "churn_records_file_fk"
            columns: ["file_id", "import_id"]
            isOneToOne: false
            referencedRelation: "churn_files"
            referencedColumns: ["id", "import_id"]
          },
          {
            foreignKeyName: "churn_records_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "churn_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_summary: {
        Row: {
          churn_quantity: number
          churn_value: number
          created_at: string
          file_id: string
          id: string
          import_id: string
          macro_reason: string
        }
        Insert: {
          churn_quantity: number
          churn_value: number
          created_at?: string
          file_id: string
          id?: string
          import_id: string
          macro_reason: string
        }
        Update: {
          churn_quantity?: number
          churn_value?: number
          created_at?: string
          file_id?: string
          id?: string
          import_id?: string
          macro_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "churn_summary_file_fk"
            columns: ["file_id", "import_id"]
            isOneToOne: false
            referencedRelation: "churn_files"
            referencedColumns: ["id", "import_id"]
          },
          {
            foreignKeyName: "churn_summary_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "churn_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      escalonou_para_options: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      esteira_neo_options: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      gargalos: {
        Row: {
          acao_plano: string | null
          categoria: string
          cliente: string
          created_at: string
          created_by: string | null
          data_prevista_resolucao: string | null
          data_registro: string
          data_resolucao: string | null
          deleted_at: string | null
          descricao: string
          id: string
          impacto_cliente: Database["public"]["Enums"]["impacto_gargalo"]
          pitstop: string | null
          responsavel_id: string
          risco_churn: Database["public"]["Enums"]["risco_churn"]
          segmento: Database["public"]["Enums"]["segmento_gargalo"]
          status: Database["public"]["Enums"]["status_gargalo"]
          tempo_resolucao_dias: number | null
          updated_at: string
          updated_by: string | null
          urgencia: Database["public"]["Enums"]["urgencia_gargalo"]
        }
        Insert: {
          acao_plano?: string | null
          categoria: string
          cliente: string
          created_at?: string
          created_by?: string | null
          data_prevista_resolucao?: string | null
          data_registro?: string
          data_resolucao?: string | null
          deleted_at?: string | null
          descricao: string
          id?: string
          impacto_cliente: Database["public"]["Enums"]["impacto_gargalo"]
          pitstop?: string | null
          responsavel_id: string
          risco_churn: Database["public"]["Enums"]["risco_churn"]
          segmento: Database["public"]["Enums"]["segmento_gargalo"]
          status?: Database["public"]["Enums"]["status_gargalo"]
          tempo_resolucao_dias?: number | null
          updated_at?: string
          updated_by?: string | null
          urgencia: Database["public"]["Enums"]["urgencia_gargalo"]
        }
        Update: {
          acao_plano?: string | null
          categoria?: string
          cliente?: string
          created_at?: string
          created_by?: string | null
          data_prevista_resolucao?: string | null
          data_registro?: string
          data_resolucao?: string | null
          deleted_at?: string | null
          descricao?: string
          id?: string
          impacto_cliente?: Database["public"]["Enums"]["impacto_gargalo"]
          pitstop?: string | null
          responsavel_id?: string
          risco_churn?: Database["public"]["Enums"]["risco_churn"]
          segmento?: Database["public"]["Enums"]["segmento_gargalo"]
          status?: Database["public"]["Enums"]["status_gargalo"]
          tempo_resolucao_dias?: number | null
          updated_at?: string
          updated_by?: string | null
          urgencia?: Database["public"]["Enums"]["urgencia_gargalo"]
        }
        Relationships: [
          {
            foreignKeyName: "gargalos_categoria_option_fk"
            columns: ["categoria"]
            isOneToOne: false
            referencedRelation: "categoria_gargalo_options"
            referencedColumns: ["nome"]
          },
        ]
      }
      permissoes: {
        Row: {
          acao: string
          codigo: string
          created_at: string
          id: string
          modulo: string
          ordem: number
          permite_escopo: boolean
          rotina: string
        }
        Insert: {
          acao: string
          codigo: string
          created_at?: string
          id?: string
          modulo: string
          ordem?: number
          permite_escopo?: boolean
          rotina: string
        }
        Update: {
          acao?: string
          codigo?: string
          created_at?: string
          id?: string
          modulo?: string
          ordem?: number
          permite_escopo?: boolean
          rotina?: string
        }
        Relationships: []
      }
      pitstop_options: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      process_exports: {
        Row: {
          created_at: string
          created_by: string
          id: string
          import_id: string
          row_count: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          import_id: string
          row_count: number
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          import_id?: string
          row_count?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_exports_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "process_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      process_import_rows: {
        Row: {
          added_ninth_digit: boolean
          client_name: string
          contact_name: string
          created_at: string
          document_normalized: string | null
          document_raw: string
          email: string
          id: string
          import_id: string
          outcome: string
          phone_1: string
          phone_2: string
          phone_3: string
          phone_source: string | null
          source_row: number
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          added_ninth_digit?: boolean
          client_name?: string
          contact_name?: string
          created_at?: string
          document_normalized?: string | null
          document_raw?: string
          email?: string
          id?: string
          import_id: string
          outcome?: string
          phone_1?: string
          phone_2?: string
          phone_3?: string
          phone_source?: string | null
          source_row: number
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          added_ninth_digit?: boolean
          client_name?: string
          contact_name?: string
          created_at?: string
          document_normalized?: string | null
          document_raw?: string
          email?: string
          id?: string
          import_id?: string
          outcome?: string
          phone_1?: string
          phone_2?: string
          phone_3?: string
          phone_source?: string | null
          source_row?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "process_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      process_imports: {
        Row: {
          created_at: string
          documents_without_whatsapp: number
          duplicate_documents: number
          duplicate_rows: number
          error_message: string | null
          file_name: string
          fixed_phone_candidates: number
          generated_rows: number
          id: string
          imported_rows: number
          invalid_document_rows: number
          invalid_phone_candidates: number
          is_current: boolean
          owner_id: string
          phones_with_added_ninth_digit: number
          processed_at: string | null
          source_sheet_name: string | null
          source_spreadsheet_id: string | null
          source_type: string
          status: string
          storage_path: string | null
          unique_valid_documents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          documents_without_whatsapp?: number
          duplicate_documents?: number
          duplicate_rows?: number
          error_message?: string | null
          file_name: string
          fixed_phone_candidates?: number
          generated_rows?: number
          id?: string
          imported_rows?: number
          invalid_document_rows?: number
          invalid_phone_candidates?: number
          is_current?: boolean
          owner_id: string
          phones_with_added_ninth_digit?: number
          processed_at?: string | null
          source_sheet_name?: string | null
          source_spreadsheet_id?: string | null
          source_type?: string
          status?: string
          storage_path?: string | null
          unique_valid_documents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          documents_without_whatsapp?: number
          duplicate_documents?: number
          duplicate_rows?: number
          error_message?: string | null
          file_name?: string
          fixed_phone_candidates?: number
          generated_rows?: number
          id?: string
          imported_rows?: number
          invalid_document_rows?: number
          invalid_phone_candidates?: number
          is_current?: boolean
          owner_id?: string
          phones_with_added_ninth_digit?: number
          processed_at?: string | null
          source_sheet_name?: string | null
          source_spreadsheet_id?: string | null
          source_type?: string
          status?: string
          storage_path?: string | null
          unique_valid_documents?: number
          updated_at?: string
        }
        Relationships: []
      }
      process_review_decisions: {
        Row: {
          created_at: string
          decided_by: string
          decision: string
          document_normalized: string
          id: string
          import_id: string
          previous_row_id: string | null
          selected_row_id: string | null
          undone_at: string | null
          undone_by: string | null
        }
        Insert: {
          created_at?: string
          decided_by: string
          decision: string
          document_normalized: string
          id?: string
          import_id: string
          previous_row_id?: string | null
          selected_row_id?: string | null
          undone_at?: string | null
          undone_by?: string | null
        }
        Update: {
          created_at?: string
          decided_by?: string
          decision?: string
          document_normalized?: string
          id?: string
          import_id?: string
          previous_row_id?: string | null
          selected_row_id?: string | null
          undone_at?: string | null
          undone_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_review_decisions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "process_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_review_previous_row_fk"
            columns: ["previous_row_id", "import_id"]
            isOneToOne: false
            referencedRelation: "process_import_rows"
            referencedColumns: ["id", "import_id"]
          },
          {
            foreignKeyName: "process_review_selected_row_fk"
            columns: ["selected_row_id", "import_id"]
            isOneToOne: false
            referencedRelation: "process_import_rows"
            referencedColumns: ["id", "import_id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_path: string | null
          cargo_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          avatar_path?: string | null
          cargo_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email: string
          id: string
          nome: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          avatar_path?: string | null
          cargo_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_neo: {
        Row: {
          canal_atendimento: string | null
          created_at: string
          created_by: string | null
          data_contato: string
          deleted_at: string | null
          escalonou_para: string | null
          esteira: string
          id: string
          nome_cliente: string
          observacao: string | null
          protocolo_neo: string
          responsavel_id: string
          status: string
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_neo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canal_atendimento?: string | null
          created_at?: string
          created_by?: string | null
          data_contato?: string
          deleted_at?: string | null
          escalonou_para?: string | null
          esteira: string
          id?: string
          nome_cliente: string
          observacao?: string | null
          protocolo_neo: string
          responsavel_id: string
          status: string
          telefone?: string | null
          tipo: Database["public"]["Enums"]["tipo_neo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canal_atendimento?: string | null
          created_at?: string
          created_by?: string | null
          data_contato?: string
          deleted_at?: string | null
          escalonou_para?: string | null
          esteira?: string
          id?: string
          nome_cliente?: string
          observacao?: string | null
          protocolo_neo?: string
          responsavel_id?: string
          status?: string
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_neo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_neo_canal_atendimento_option_fk"
            columns: ["canal_atendimento"]
            isOneToOne: false
            referencedRelation: "canal_atendimento_options"
            referencedColumns: ["nome"]
          },
          {
            foreignKeyName: "registros_neo_esteira_option_fk"
            columns: ["esteira"]
            isOneToOne: false
            referencedRelation: "esteira_neo_options"
            referencedColumns: ["nome"]
          },
        ]
      }
      status_neo_options: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_user_cargo: {
        Args: {
          next_active: boolean
          next_cargo_id: string
          target_user_id: string
        }
        Returns: undefined
      }
      admin_save_cargo: {
        Args: {
          base_role: Database["public"]["Enums"]["app_role"]
          cargo_active: boolean
          cargo_description: string
          cargo_name: string
          permission_entries: Json
          target_cargo_id: string
        }
        Returns: string
      }
      admin_set_rbac_enabled: {
        Args: { next_enabled: boolean }
        Returns: undefined
      }
      admin_soft_delete_option: {
        Args: { target_id: string; target_table: string }
        Returns: undefined
      }
      admin_update_user: {
        Args: {
          next_active: boolean
          next_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      current_permission_scope: {
        Args: { permission_code: string }
        Returns: string
      }
      current_user_access: { Args: never; Returns: Json }
      current_user_has_permission: {
        Args: { permission_code: string }
        Returns: boolean
      }
      finalize_process_import: {
        Args: { target_import_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active: { Args: { _user_id: string }; Returns: boolean }
      rbac_enabled: { Args: never; Returns: boolean }
      review_process_document: {
        Args: { target_import_id: string; target_selected_row_id: string }
        Returns: undefined
      }
      undo_process_review: {
        Args: { target_decision_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "analyst" | "coordinator" | "admin" | "process_analyst"
      categoria_gargalo:
        | "Documentação / Processos"
        | "Prazo de Atendimento / SLA"
        | "Funcionalidades / Produto"
        | "Legislação / Compliance Fiscal"
        | "Comunicação / Relacionamento"
        | "Treinamento / Capacitação"
        | "Integração de Sistemas"
        | "Financeiro / Cobrança"
        | "Suporte Técnico / Sistema"
        | "Onboarding / Implantação"
      esteira_neo:
        | "Contato realizado"
        | "1° Contato"
        | "2° Contato"
        | "Cliente Proativo"
        | "Em acompanhamento"
        | "Contato sem sucesso"
        | "Onboarding"
        | "Cliente ativo"
        | "Tentativa"
        | "Meet Agendada"
        | "Visita"
      impacto_gargalo: "Baixo" | "Médio" | "Alto" | "Crítico"
      risco_churn: "Baixo" | "Médio" | "Alto"
      segmento_gargalo: "Corporativo" | "Contábil"
      status_gargalo: "Aberto" | "Em Andamento" | "Monitorando" | "Resolvido"
      tipo_neo: "Proativo" | "Reativo"
      urgencia_gargalo: "Baixa" | "Média" | "Alta" | "Crítica"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["analyst", "coordinator", "admin", "process_analyst"],
      categoria_gargalo: [
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
      ],
      esteira_neo: [
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
      ],
      impacto_gargalo: ["Baixo", "Médio", "Alto", "Crítico"],
      risco_churn: ["Baixo", "Médio", "Alto"],
      segmento_gargalo: ["Corporativo", "Contábil"],
      status_gargalo: ["Aberto", "Em Andamento", "Monitorando", "Resolvido"],
      tipo_neo: ["Proativo", "Reativo"],
      urgencia_gargalo: ["Baixa", "Média", "Alta", "Crítica"],
    },
  },
} as const
