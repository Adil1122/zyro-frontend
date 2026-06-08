import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to make requests to PostEx API
const BASE_URL = 'https://api.postex.pk/services/integration/api';
async function postexRequest(endpoint, apiKey, params = {}, method = 'GET') {
    let url = `${BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: { 'token': apiKey, 'Content-Type': 'application/json' }
    };
    if (params && (method === 'POST' || method === 'PUT')) options.body = JSON.stringify(params);
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

export const dynamic = 'force-dynamic';

export async function POST(request) {
    let logs = [];
    
    try {
        const { data: user } = await supabase.from('users').select('postex_api_key').eq('id', 'e5940095-1560-4425-ab60-f8fc5f7874f4').single();
            
        // Let's try multiple endpoints for booking an order
        const endpoints = [
            { path: '/order/v1/book', method: 'PUT', payload: { trackingNumber: '26482690000060' } },
            { path: '/order/v1/book', method: 'POST', payload: { trackingNumber: '26482690000060' } },
            { path: '/order/v2/book', method: 'POST', payload: { trackingNumber: '26482690000060' } },
            { path: '/order/v3/book', method: 'POST', payload: { trackingNumber: '26482690000060' } },
            { path: '/order/v1/status', method: 'PUT', payload: { trackingNumber: '26482690000060', status: 'Booked' } },
        ];
        
        for (let ep of endpoints) {
            logs.push(`Trying ${ep.method} ${ep.path}...`);
            const res = await postexRequest(ep.path, user.postex_api_key, ep.payload, ep.method);
            logs.push(`Result: ${res.status} - ${JSON.stringify(res.data)}`);
            if (res.status === 200 && res.data.statusCode === "200") break;
        }
        
        return NextResponse.json({ success: true, logs });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
