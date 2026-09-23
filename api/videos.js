// api/videos.js — Vercel Serverless Function
// Proxy pour POST /v1/videos (creation de tache video)
// La cle API est stockee dans les variables d'environnement Vercel, jamais exposee au client.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });

    const apiKey = process.env.AGNES_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Cle API non configuree sur le serveur.' });

    try {
        const upstream = await fetch('https://apihub.agnes-ai.com/v1/videos', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });
        const data = await upstream.json();
        return res.status(upstream.status).json(data);
    } catch (err) {
        return res.status(502).json({ error: 'Erreur proxy : ' + err.message });
    }
}
