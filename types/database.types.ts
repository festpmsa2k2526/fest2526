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
      grade_settings: {
        Row: {
          id: string
          grade_type: 'A' | 'B' | 'C'
          first_place: number
          second_place: number
          third_place: number
        }
        Update: {
          first_place?: number
          second_place?: number
          third_place?: number
        }
      }
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'captain'
          team_id: string | null
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'captain'
          team_id?: string | null
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'captain'
          team_id?: string | null
          full_name?: string | null
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          color_hex: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          color_hex: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          color_hex?: string
          created_at?: string
        }
      }
      students: {
        Row: {
          id: string
          name: string
          chest_no: string | null
          class_grade: string | null
          section: 'Senior' | 'Junior' | 'Sub-Junior'
          team_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          chest_no?: string | null
          class_grade?: string | null
          section: 'Senior' | 'Junior' | 'Sub-Junior'
          team_id: string
          created_at?: string
        }
        Update: {
           id?: string
           chest_no?: string | null
        }
      }
      events: {
        Row: {
          id: string
          name: string
          event_code: string | null
          category: 'OFF STAGE' | 'ON STAGE'
          max_participants_per_team: number
          grade_type: 'A' | 'B' | 'C' | null
          applicable_section: string[] | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          event_code?: string | null
          category: 'OFF STAGE' | 'ON STAGE'
          max_participants_per_team?: number
          grade_type?: 'A' | 'B' | 'C' | null
          applicable_section?: string[] | null
          description?: string | null
          created_at?: string
        }
        Update: {
            id?: string
        }
      }
      participations: {
        Row: {
          id: string
          student_id: string | null
          event_id: string
          team_id: string
          status: 'registered' | 'completed' | 'disqualified' | 'winner'
          created_at: string
          result_position: 'FIRST' | 'SECOND' | 'THIRD' | null
          points_earned: number
        }
        Insert: {
          id?: string
          student_id?: string | null
          event_id: string
          team_id: string
          status?: 'registered' | 'completed' | 'disqualified' | 'winner'
          created_at?: string
          result_position?: 'FIRST' | 'SECOND' | 'THIRD' | null
          points_earned?: number
        }
        Update: {
            id?: string
            student_id?: string | null
            event_id?: string
            team_id?: string
            status?: 'registered' | 'completed' | 'disqualified' | 'winner'
            created_at?: string
            result_position?: 'FIRST' | 'SECOND' | 'THIRD' | null
            points_earned?: number
        }
      }
    }
  }
}