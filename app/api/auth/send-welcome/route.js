import { NextResponse } from 'next/server';
import { emailService } from '@/lib/services/emailService';

export async function POST(request) {
    try {
        const { email, name, businessName } = await request.json();
        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        await emailService.sendWelcome(email, name, businessName);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Welcome Email Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
