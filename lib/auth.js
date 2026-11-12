export const getCurrentUserId = () => {
    if (typeof window === 'undefined') return null;
    try {
        const user = JSON.parse(localStorage.getItem('zyro_user'));
        return user?.id || null;
    } catch {
        return null;
    }
};

export const getCurrentUser = () => {
    if (typeof window === 'undefined') return null;
    try {
        const user = JSON.parse(localStorage.getItem('zyro_user'));
        return user || null;
    } catch {
        return null;
    }
};

export const isZyroAdmin = (user) => {
    const u = user || getCurrentUser();
    return Boolean(u?.is_admin === true || (u?.email || '').toLowerCase().trim() === 'admin@zyro.com');
};

