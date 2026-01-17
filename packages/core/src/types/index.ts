// Core types for Cerebro Diem

export type CaptureSource = 'voice' | 'text' | 'import';

export type Category = 'person' | 'project' | 'idea' | 'task';

export type ProjectStatus = 'active' | 'waiting' | 'blocked' | 'someday' | 'done';

export type TaskStatus = 'pending' | 'in_progress' | 'done';

export type ClassificationStatus =
  | 'pending'
  | 'auto_filed'
  | 'needs_review'
  | 'manually_filed'
  | 'manually_corrected';

export type VoiceMode = 'push_to_talk' | 'tap_to_start';

export type DigestType = 'daily' | 'weekly';

// Database row types
export interface Profile {
  id: string;
  display_name: string | null;
  digest_time: string;
  timezone: string;
  voice_mode: VoiceMode;
  confidence_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface Capture {
  id: string;
  user_id: string;
  raw_text: string;
  source: CaptureSource;
  audio_url: string | null;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
}

export interface Classification {
  id: string;
  capture_id: string;
  user_id: string;
  category: Category;
  confidence: number;
  extracted_fields: ExtractedFields;
  raw_llm_response: string | null;
  destination_id: string | null;
  status: ClassificationStatus;
  created_at: string;
}

export type ExtractedFields =
  | PersonExtracted
  | ProjectExtracted
  | IdeaExtracted
  | TaskExtracted;

export interface PersonExtracted {
  name: string;
  context: string;
  follow_ups: string[];
}

export interface ProjectExtracted {
  name: string;
  status: ProjectStatus;
  next_action: string;
  notes: string;
}

export interface IdeaExtracted {
  title: string;
  one_liner: string;
  notes: string;
}

export interface TaskExtracted {
  name: string;
  due_date: string | null;
  notes: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  context: string | null;
  follow_ups: string[];
  tags: string[];
  last_touched: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  next_action: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  one_liner: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  name: string;
  due_date: string | null;
  status: TaskStatus;
  notes: string | null;
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Digest {
  id: string;
  user_id: string;
  type: DigestType;
  content: string;
  read: boolean;
  generated_at: string;
}

// API response types
export interface ClassificationResponse {
  category: Category;
  confidence: number;
  extracted: ExtractedFields;
}

// Input types for creating/updating
export interface CaptureInput {
  raw_text: string;
  source: CaptureSource;
  audio_url?: string;
}

export interface PersonInput {
  name: string;
  context?: string;
  follow_ups?: string[];
  tags?: string[];
}

export interface ProjectInput {
  name: string;
  status?: ProjectStatus;
  next_action?: string;
  notes?: string;
  tags?: string[];
}

export interface IdeaInput {
  title: string;
  one_liner?: string;
  notes?: string;
  tags?: string[];
}

export interface TaskInput {
  name: string;
  due_date?: string;
  status?: TaskStatus;
  notes?: string;
  tags?: string[];
}
