import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/services/whatsappService';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const userId = request.headers.get('x-user-id') || new URL(request.url).searchParams.get('userId');
        const data = await whatsappService.getWhatsappData(userId);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
