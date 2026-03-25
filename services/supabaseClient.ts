import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgwakkvytqdncfxfnnfb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2Fra3Z5dHFkbmNmeGZubmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjkzMDAsImV4cCI6MjA4NjgwNTMwMH0.6avu0XaGvH36oRIc4DziLLrmmj8SO_jdyW-R6l_XV60';

export const supabase = createClient(supabaseUrl, supabaseKey);