import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhuyjadkrgahczjeexwk.supabase.co';
const supabaseKey = 'sb_publishable_Y4CysAM3MOBi3L0MBKCm3w_B2ksf4sz';

export const supabase = createClient(supabaseUrl, supabaseKey);