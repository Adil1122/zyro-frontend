export const getCurrentUserId = () => {
    if (typeof window === 'undefined') return null;
    try {
        const user = JSON.parse(localStorage.getItem('zyro_user'));
        return user?.id || null;
    } catch {
        return null;
    }
};
