import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const { url, key } = window.SUPABASE_CONFIG || {};
if (!url || !key) throw new Error('Adiciona window.SUPABASE_CONFIG = { url, key } ao index.html');

export const supabase = createClient(url, key);
