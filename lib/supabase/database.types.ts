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
          title: string | null
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
          title?: string | null
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
          title?: string | null
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
      nlxh_ai_usage: {
        Row: {
          action: string
          cached: boolean
          created_at: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          source: string
          user_id: string | null
        }
        Insert: {
          action: string
          cached?: boolean
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          source?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          cached?: boolean
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nlxh_guides: {
        Row: {
          created_at: string
          created_by: string
          id: string
          mime: string
          original_name: string
          storage_path: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          mime: string
          original_name: string
          storage_path: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          mime?: string
          original_name?: string
          storage_path?: string
          title?: string
        }
        Relationships: []
      }
      nlxh_exercise_seeds: {
        Row: {
          ai_model: string | null
          created_at: string
          data: Json
          essay_id: string
          framework_version: string
          id: string
          level: number
          practice_mode: string
          prompt_version: string
          status: string
        }
        Insert: {
          ai_model?: string | null
          created_at?: string
          data: Json
          essay_id: string
          framework_version?: string
          id?: string
          level?: number
          practice_mode: string
          prompt_version?: string
          status?: string
        }
        Update: {
          ai_model?: string | null
          created_at?: string
          data?: Json
          essay_id?: string
          framework_version?: string
          id?: string
          level?: number
          practice_mode?: string
          prompt_version?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nlxh_exercise_seeds_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
      }
      nlxh_pack_drafts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          payload: Json
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      nlxh_path_enrollments: {
        Row: {
          current_essay_id: string | null
          current_step_id: string
          path_version: string
          remedial_return_step_id: string | null
          remedial_skill: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_essay_id?: string | null
          current_step_id?: string
          path_version?: string
          remedial_return_step_id?: string | null
          remedial_skill?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_essay_id?: string | null
          current_step_id?: string
          path_version?: string
          remedial_return_step_id?: string | null
          remedial_skill?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nlxh_path_enrollments_current_essay_id_fkey"
            columns: ["current_essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
      }
      nlxh_practice_attempts: {
        Row: {
          answer: Json
          created_at: string
          duration_seconds: number | null
          essay_id: string
          exercise_seed_id: string | null
          feedback: Json | null
          id: string
          level: number
          path_mode: string
          practice_mode: string
          rubric_scores: Json | null
          score: number | null
          step_id: string | null
          used_hint_count: number
          user_id: string
          word_count: number | null
        }
        Insert: {
          answer?: Json
          created_at?: string
          duration_seconds?: number | null
          essay_id: string
          exercise_seed_id?: string | null
          feedback?: Json | null
          id?: string
          level?: number
          path_mode?: string
          practice_mode: string
          rubric_scores?: Json | null
          score?: number | null
          step_id?: string | null
          used_hint_count?: number
          user_id: string
          word_count?: number | null
        }
        Update: {
          answer?: Json
          created_at?: string
          duration_seconds?: number | null
          essay_id?: string
          exercise_seed_id?: string | null
          feedback?: Json | null
          id?: string
          level?: number
          path_mode?: string
          practice_mode?: string
          rubric_scores?: Json | null
          score?: number | null
          step_id?: string | null
          used_hint_count?: number
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nlxh_practice_attempts_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nlxh_practice_attempts_exercise_seed_id_fkey"
            columns: ["exercise_seed_id"]
            isOneToOne: false
            referencedRelation: "nlxh_exercise_seeds"
            referencedColumns: ["id"]
          },
        ]
      }
      nlxh_question_analyses: {
        Row: {
          ai_model: string | null
          core_issue: string
          created_at: string
          essay_id: string
          framework_version: string
          id: string
          keywords: string[]
          main_topic: string
          question_type: string
          source: string
          suggested_position: string | null
        }
        Insert: {
          ai_model?: string | null
          core_issue: string
          created_at?: string
          essay_id: string
          framework_version?: string
          id?: string
          keywords?: string[]
          main_topic: string
          question_type: string
          source: string
          suggested_position?: string | null
        }
        Update: {
          ai_model?: string | null
          core_issue?: string
          created_at?: string
          essay_id?: string
          framework_version?: string
          id?: string
          keywords?: string[]
          main_topic?: string
          question_type?: string
          source?: string
          suggested_position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nlxh_question_analyses_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
      }
      nlxh_reference_essays: {
        Row: {
          created_at: string
          essay: string
          essay_id: string
          framework_version: string
          id: string
          outline: string[]
          source: string
        }
        Insert: {
          created_at?: string
          essay: string
          essay_id: string
          framework_version?: string
          id?: string
          outline?: string[]
          source: string
        }
        Update: {
          created_at?: string
          essay?: string
          essay_id?: string
          framework_version?: string
          id?: string
          outline?: string[]
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "nlxh_reference_essays_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
      }
      nlxh_skill_progress: {
        Row: {
          attempts: number
          average_score: number
          best_score: number
          mastery: string
          recent_average_score: number
          skill: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          average_score?: number
          best_score?: number
          mastery?: string
          recent_average_score?: number
          skill: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          average_score?: number
          best_score?: number
          mastery?: string
          recent_average_score?: number
          skill?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nlxh_section_attempts: {
        Row: {
          answers: Json
          created_at: string
          essay_id: string | null
          essay_prompt: string | null
          feedback: Json | null
          hint_counts: Json
          id: string
          scores: Json | null
          section_pack_id: string | null
          sections: string[]
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          essay_id?: string | null
          essay_prompt?: string | null
          feedback?: Json | null
          hint_counts?: Json
          id?: string
          scores?: Json | null
          section_pack_id?: string | null
          sections: string[]
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          essay_id?: string | null
          essay_prompt?: string | null
          feedback?: Json | null
          hint_counts?: Json
          id?: string
          scores?: Json | null
          section_pack_id?: string | null
          sections?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nlxh_section_attempts_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nlxh_section_attempts_section_pack_id_fkey"
            columns: ["section_pack_id"]
            isOneToOne: false
            referencedRelation: "nlxh_section_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      nlxh_section_pack_drafts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          payload: Json
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      nlxh_section_packs: {
        Row: {
          created_at: string
          created_by: string | null
          essay_fingerprint: string | null
          essay_id: string | null
          essay_prompt: string | null
          hints: Json
          id: string
          serial_number: number
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          essay_fingerprint?: string | null
          essay_id?: string | null
          essay_prompt?: string | null
          hints: Json
          id?: string
          serial_number?: number
          title?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          essay_fingerprint?: string | null
          essay_id?: string | null
          essay_prompt?: string | null
          hints?: Json
          id?: string
          serial_number?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nlxh_section_packs_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
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
