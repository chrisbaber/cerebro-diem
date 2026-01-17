import { supabase } from './supabase';
import type {
  Capture,
  CaptureInput,
  Classification,
  Person,
  PersonInput,
  Project,
  ProjectInput,
  Idea,
  IdeaInput,
  Task,
  TaskInput,
  Digest,
  Profile,
  Category,
} from '@cerebro-diem/core';

// Captures
export const createCapture = async (input: CaptureInput): Promise<Capture> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('captures')
    .insert({
      user_id: user.user.id,
      raw_text: input.raw_text,
      source: input.source,
      audio_url: input.audio_url,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getCaptures = async (limit = 50): Promise<Capture[]> => {
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

// Classifications
export const getClassifications = async (status?: string): Promise<Classification[]> => {
  let query = supabase
    .from('classifications')
    .select('*, captures(raw_text)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getNeedsReview = async (): Promise<Classification[]> => {
  return getClassifications('needs_review');
};

export const updateClassification = async (
  id: string,
  updates: Partial<Classification>
): Promise<Classification> => {
  const { data, error } = await supabase
    .from('classifications')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// People
export const getPeople = async (): Promise<Person[]> => {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .order('last_touched', { ascending: false });

  if (error) throw error;
  return data;
};

export const getPerson = async (id: string): Promise<Person> => {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createPerson = async (input: PersonInput): Promise<Person> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('people')
    .insert({
      user_id: user.user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updatePerson = async (id: string, updates: Partial<PersonInput>): Promise<Person> => {
  const { data, error } = await supabase
    .from('people')
    .update({ ...updates, last_touched: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletePerson = async (id: string): Promise<void> => {
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw error;
};

// Projects
export const getProjects = async (status?: string): Promise<Project[]> => {
  let query = supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getProject = async (id: string): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createProject = async (input: ProjectInput): Promise<Project> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProject = async (id: string, updates: Partial<ProjectInput>): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
};

// Ideas
export const getIdeas = async (): Promise<Idea[]> => {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getIdea = async (id: string): Promise<Idea> => {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createIdea = async (input: IdeaInput): Promise<Idea> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('ideas')
    .insert({
      user_id: user.user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateIdea = async (id: string, updates: Partial<IdeaInput>): Promise<Idea> => {
  const { data, error } = await supabase
    .from('ideas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteIdea = async (id: string): Promise<void> => {
  const { error } = await supabase.from('ideas').delete().eq('id', id);
  if (error) throw error;
};

// Tasks
export const getTasks = async (status?: string): Promise<Task[]> => {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getTask = async (id: string): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createTask = async (input: TaskInput): Promise<Task> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTask = async (id: string, updates: Partial<TaskInput>): Promise<Task> => {
  const updateData: Record<string, unknown> = { ...updates };

  // Set completed_at when marking as done
  if (updates.status === 'done') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTask = async (id: string): Promise<void> => {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
};

// Digests
export const getDigests = async (type?: 'daily' | 'weekly', limit = 10): Promise<Digest[]> => {
  let query = supabase
    .from('digests')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getLatestDigest = async (type: 'daily' | 'weekly' = 'daily'): Promise<Digest | null> => {
  const { data, error } = await supabase
    .from('digests')
    .select('*')
    .eq('type', type)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
};

export const markDigestRead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('digests')
    .update({ read: true })
    .eq('id', id);

  if (error) throw error;
};

// Profile
export const getProfile = async (): Promise<Profile | null> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const updateProfile = async (updates: Partial<Profile>): Promise<Profile> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Classify capture (calls Edge Function)
export const classifyCapture = async (captureId: string): Promise<Classification> => {
  const { data, error } = await supabase.functions.invoke('classify-capture', {
    body: { capture_id: captureId },
  });

  if (error) throw error;
  return data.classification;
};

// Transcribe audio (calls Edge Function)
export const transcribeAudio = async (
  audioBase64: string,
  format: 'webm' | 'm4a' | 'wav' = 'm4a'
): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('transcribe-audio', {
    body: { audio_base64: audioBase64, format },
  });

  if (error) throw error;
  return data.text;
};

// Generate digest (calls Edge Function)
export const generateDigest = async (type: 'daily' | 'weekly' = 'daily'): Promise<Digest> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('generate-digest', {
    body: { user_id: user.user.id, type },
  });

  if (error) throw error;
  return data.digest;
};

// Search across all categories
export const search = async (query: string): Promise<{
  people: Person[];
  projects: Project[];
  ideas: Idea[];
  tasks: Task[];
}> => {
  const searchTerm = `%${query}%`;

  const [peopleRes, projectsRes, ideasRes, tasksRes] = await Promise.all([
    supabase.from('people').select('*').or(`name.ilike.${searchTerm},context.ilike.${searchTerm}`),
    supabase.from('projects').select('*').or(`name.ilike.${searchTerm},notes.ilike.${searchTerm},next_action.ilike.${searchTerm}`),
    supabase.from('ideas').select('*').or(`title.ilike.${searchTerm},one_liner.ilike.${searchTerm},notes.ilike.${searchTerm}`),
    supabase.from('tasks').select('*').or(`name.ilike.${searchTerm},notes.ilike.${searchTerm}`),
  ]);

  return {
    people: peopleRes.data || [],
    projects: projectsRes.data || [],
    ideas: ideasRes.data || [],
    tasks: tasksRes.data || [],
  };
};
