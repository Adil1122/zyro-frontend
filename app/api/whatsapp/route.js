import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/services/whatsappService';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await whatsappService.getWhatsappData();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
