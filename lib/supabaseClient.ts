import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhuyjadkrgahczjeexwk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odXlqYWRrcmdhaGN6amVleHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjE3NDAsImV4cCI6MjA4NjU5Nzc0MH0.pcNqLfpTCUyC-V1htX7oMCe4A1YIfZ3cQtdaa7GSxZI';

export const supabase = createClient(supabaseUrl, supabaseKey);