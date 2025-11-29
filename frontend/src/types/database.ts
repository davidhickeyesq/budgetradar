export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          api_tokens: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          api_tokens?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          api_tokens?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      daily_metrics: {
        Row: {
          id: string
          account_id: string
          date: string
          channel_name: string
          spend: number | null
          revenue: number | null
          impressions: number | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          date: string
          channel_name: string
          spend?: number | null
          revenue?: number | null
          impressions?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          date?: string
          channel_name?: string
          spend?: number | null
          revenue?: number | null
          impressions?: number | null
          created_at?: string
        }
      }
      mmm_models: {
        Row: {
          id: string
          account_id: string
          channel_name: string
          alpha: number | null
          beta: number | null
          kappa: number | null
          max_yield: number | null
          r_squared: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          channel_name: string
          alpha?: number | null
          beta?: number | null
          kappa?: number | null
          max_yield?: number | null
          r_squared?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          channel_name?: string
          alpha?: number | null
          beta?: number | null
          kappa?: number | null
          max_yield?: number | null
          r_squared?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      scenarios: {
        Row: {
          id: string
          account_id: string
          name: string
          description: string | null
          budget_allocation: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          name: string
          description?: string | null
          budget_allocation?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          name?: string
          description?: string | null
          budget_allocation?: Json | null
          created_at?: string
          updated_at?: string
        }
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
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
