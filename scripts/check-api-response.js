
async function check() {
    try {
        const res = await fetch('http://localhost:4000/whatsapp');
        const data = await res.json();
        console.log('Keys in data:', Object.keys(data));
        console.log('Full data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err.message);
    }
}
check();
