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
          attempt_mode: string
          essay_feedback: string | null
          essay_flagged: boolean
          essay_score: number | null
          essay_text: string | null
          exam_id: string
          flagged: Json
          id: string
          mcq_detail: Json | null
          mcq_score: number | null
          section_mode: string
          show_topic: boolean
          shuffle: Json
          started_at: string
          submitted_at: string | null
          total_score: number | null
          user_id: string | null
        }
        Insert: {
          answers?: Json
          attempt_mode?: string
          essay_feedback?: string | null
          essay_flagged?: boolean
          essay_score?: number | null
          essay_text?: string | null
          exam_id: string
          flagged?: Json
          id?: string
          mcq_detail?: Json | null
          mcq_score?: number | null
          section_mode?: string
          show_topic?: boolean
          shuffle: Json
          started_at?: string
          submitted_at?: string | null
          total_score?: number | null
          user_id?: string | null
        }
        Update: {
          answers?: Json
          attempt_mode?: string
          essay_feedback?: string | null
          essay_flagged?: boolean
          essay_score?: number | null
          essay_text?: string | null
          exam_id?: string
          flagged?: Json
          id?: string
          mcq_detail?: Json | null
          mcq_score?: number | null
          section_mode?: string
          show_topic?: boolean
          shuffle?: Json
          started_at?: string
          submitted_at?: string | null
          total_score?: number | null
          user_id?: string | null
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
      contribution_drafts: {
        Row: {
          answer_filename: string | null
          created_at: string
          exam_code: string | null
          expires_at: string
          id: string
          kind: string
          payload: Json
          source_filename: string | null
          user_id: string
        }
        Insert: {
          answer_filename?: string | null
          created_at?: string
          exam_code?: string | null
          expires_at?: string
          id?: string
          kind: string
          payload: Json
          source_filename?: string | null
          user_id: string
        }
        Update: {
          answer_filename?: string | null
          created_at?: string
          exam_code?: string | null
          expires_at?: string
          id?: string
          kind?: string
          payload?: Json
          source_filename?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          added_count: number
          answer_filename: string | null
          created_at: string
          exam_code: string | null
          id: string
          kind: string
          skipped_count: number
          source_filename: string | null
          user_id: string
        }
        Insert: {
          added_count?: number
          answer_filename?: string | null
          created_at?: string
          exam_code?: string | null
          id?: string
          kind: string
          skipped_count?: number
          source_filename?: string | null
          user_id: string
        }
        Update: {
          added_count?: number
          answer_filename?: string | null
          created_at?: string
          exam_code?: string | null
          id?: string
          kind?: string
          skipped_count?: number
          source_filename?: string | null
          user_id?: string
        }
        Relationships: []
      }
      essays: {
        Row: {
          contribution_id: string | null
          created_at: string
          created_by: string | null
          fingerprint: string
          id: string
          prompt: string
          solution: string | null
          source_filename: string | null
          topic: string | null
        }
        Insert: {
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          fingerprint: string
          id?: string
          prompt: string
          solution?: string | null
          source_filename?: string | null
          topic?: string | null
        }
        Update: {
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          fingerprint?: string
          id?: string
          prompt?: string
          solution?: string | null
          source_filename?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "essays_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          answer_key: Json
          answer_path: string | null
          created_at: string
          essay_prompt: string
          essay_solution: string | null
          essay_topic: string | null
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
          essay_solution?: string | null
          essay_topic?: string | null
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
          essay_solution?: string | null
          essay_topic?: string | null
          exam_code?: string | null
          id?: string
          pdf_path?: string | null
          questions?: Json
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string
          id: string
          practice_insight: Json | null
          practice_insight_at: string | null
          practice_insight_hash: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          id: string
          practice_insight?: Json | null
          practice_insight_at?: string | null
          practice_insight_hash?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          id?: string
          practice_insight?: Json | null
          practice_insight_at?: string | null
          practice_insight_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_marks: {
        Row: {
          created_at: string
          exam_code: string | null
          fingerprint: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_code?: string | null
          fingerprint: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_code?: string | null
          fingerprint?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string
          cluster_id: string | null
          cluster_position: number | null
          contribution_id: string | null
          created_at: string
          created_by: string | null
          exam_code: string
          fingerprint: string
          id: string
          options: Json | null
          stem: string
          solution: string | null
          topic: string | null
          type: string
        }
        Insert: {
          answer: string
          cluster_id?: string | null
          cluster_position?: number | null
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_code: string
          fingerprint: string
          id?: string
          options?: Json | null
          stem: string
          solution?: string | null
          topic?: string | null
          type: string
        }
        Update: {
          answer?: string
          cluster_id?: string | null
          cluster_position?: number | null
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_code?: string
          fingerprint?: string
          id?: string
          options?: Json | null
          stem?: string
          solution?: string | null
          topic?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "question_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_clusters: {
        Row: {
          created_at: string
          exam_code: string
          fingerprint: string
          header_template: string
          id: string
          kind: string
          passage: string
        }
        Insert: {
          created_at?: string
          exam_code: string
          fingerprint: string
          header_template: string
          id?: string
          kind: string
          passage: string
        }
        Update: {
          created_at?: string
          exam_code?: string
          fingerprint?: string
          header_template?: string
          id?: string
          kind?: string
          passage?: string
        }
        Relationships: []
      }
      sample_exam_groups: {
        Row: {
          created_at: string
          exam_code: string
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_code: string
          id?: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          exam_code?: string
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      sample_exam_group_items: {
        Row: {
          exam_id: string
          group_id: string
          id: string
          section_mode: string
          sort_order: number
          user_id: string
        }
        Insert: {
          exam_id: string
          group_id: string
          id?: string
          section_mode: string
          sort_order?: number
          user_id: string
        }
        Update: {
          exam_id?: string
          group_id?: string
          id?: string
          section_mode?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_exam_group_items_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_exam_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "sample_exam_groups"
            referencedColumns: ["id"]
          },
        ]
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
