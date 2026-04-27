import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getCurrentUserId = () => {
    if (typeof window === 'undefined') return null;
    try {
        const user = JSON.parse(localStorage.getItem('zyro_user'));
        return user?.id || null;
    } catch {
        return null;
    }
};
