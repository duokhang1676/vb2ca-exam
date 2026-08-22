export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          answers: Json
          essay_feedback: string | null
          essay_score: number | null
          essay_text: string | null
          exam_id: string
          id: string
          mcq_detail: Json | null
          mcq_score: number | null
          shuffle: Json
          started_at: string
          submitted_at: string | null
          total_score: number | null
        }
        Insert: {
          answers?: Json
          essay_feedback?: string | null
          essay_score?: number | null
          essay_text?: string | null
          exam_id: string
          id?: string
          mcq_detail?: Json | null
          mcq_score?: number | null
          shuffle: Json
          started_at?: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Update: {
          answers?: Json
          essay_feedback?: string | null
          essay_score?: number | null
          essay_text?: string | null
          exam_id?: string
          id?: string
          mcq_detail?: Json | null
          mcq_score?: number | null
          shuffle?: Json
          started_at?: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      essays: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          prompt: string
          source_filename: string | null
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          prompt: string
          source_filename?: string | null
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          prompt?: string
          source_filename?: string | null
        }
        Relationships: []
      }
      exams: {
        Row: {
          answer_key: Json
          answer_path: string | null
          created_at: string
          essay_prompt: string
          exam_code: string | null
          id: string
          pdf_path: string | null
          questions: Json
          source: string | null
          title: string
        }
        Insert: {
          answer_key: Json
          answer_path?: string | null
          created_at?: string
          essay_prompt: string
          exam_code?: string | null
          id?: string
          pdf_path?: string | null
          questions: Json
          source?: string | null
          title: string
        }
        Update: {
          answer_key?: Json
          answer_path?: string | null
          created_at?: string
          essay_prompt?: string
          exam_code?: string | null
          id?: string
          pdf_path?: string | null
          questions?: Json
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string
          created_at: string
          exam_code: string
          fingerprint: string
          id: string
          options: Json | null
          stem: string
          type: string
        }
        Insert: {
          answer: string
          created_at?: string
          exam_code: string
          fingerprint: string
          id?: string
          options?: Json | null
          stem: string
          type: string
        }
        Update: {
          answer?: string
          created_at?: string
          exam_code?: string
          fingerprint?: string
          id?: string
          options?: Json | null
          stem?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
