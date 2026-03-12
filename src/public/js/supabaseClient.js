import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://wjqhfpgkbpqyoudzedyb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcWhmcGdrYnBxeW91ZHplZHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjY5OTIsImV4cCI6MjA4ODc0Mjk5Mn0.MTljd7tM-9SjdSWUTzDSH2sYcww0SdCV6qnDdOElfe0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
