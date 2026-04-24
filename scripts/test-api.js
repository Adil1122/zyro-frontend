
async function testWhatsapp() {
    try {
        const res = await fetch('http://localhost:4000/whatsapp');
        const json = await res.json();
        console.log('API Response:', JSON.stringify(json, null, 2));
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}
testWhatsapp();
