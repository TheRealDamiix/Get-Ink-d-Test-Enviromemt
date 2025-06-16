import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cbpopwnlcrdtfgtjusjy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicG9wd25sY3JkdGZndGp1c2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2ODQ0MDcsImV4cCI6MjA2NTI2MDQwN30.WosXzYm0WNFpkirujsD7qGAPUlRSXqwjLkEyeiCUZ0g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);