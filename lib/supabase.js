import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
    console.warn('[Supabase] Warning: Supabase environment variables are not set. Using placeholder client.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getCurrentUserId = () => {
    if (typeof window === 'undefined') return null;
    try {
        // Check if localStorage is available
        const testKey = '__localStorage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        const user = JSON.parse(localStorage.getItem('zyro_user'));
        return user?.id || null;
    } catch (error) {
        console.error('localStorage error:', error);
        return null;
    }
};

export const saveUserToStorage = (user) => {
    if (typeof window === 'undefined') return false;
    try {
        // Check if localStorage is available
        const testKey = '__localStorage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        const userString = JSON.stringify(user);
        localStorage.setItem('zyro_user', userString);
        return true;
    } catch (error) {
        console.error('Failed to save user to localStorage:', error);
        return false;
    }
};
