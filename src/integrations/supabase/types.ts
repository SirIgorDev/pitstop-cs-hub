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
      profiles: {
        Row: {
          ativo: boolean
          avatar_path: string | null
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
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "analyst" | "coordinator" | "admin"
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
      app_role: ["analyst", "coordinator", "admin"],
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
