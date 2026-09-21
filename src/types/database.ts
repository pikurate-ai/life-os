export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface EssentialInfoItem {
  id: string;
  user_id: string;
  category: 'account' | 'address' | 'vehicle' | 'id_number' | 'insurance' | 'custom';
  title: string;
  value: string;
  is_masked?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  content: string;
  entry_date: string;
  mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  is_archived_from_past?: boolean;
  source_type?: 'direct' | 'google_docs' | 'email' | 'app';
  created_at?: string;
}

export interface RoutineItem {
  id: string;
  user_id: string;
  title: string;
  frequency: 'daily' | 'weekdays' | 'weekly';
  streak_count: number;
  is_completed_today?: boolean;
}

export interface Workout1RM {
  id: string;
  user_id: string;
  exercise_name: string;
  weight: number;
  reps: number;
  calculated_1rm: number;
  logged_date: string;
}
