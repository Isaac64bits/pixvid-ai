// api/poll.js — Vercel Serverless Function
// Proxy pour GET /agnesapi?video_id=...&model_name=... (polling du statut)
// La cle API est stockee dans les variables d'environnement Vercel, jamais exposee au client.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Methode non autorisee' });

    const apiKey = process.env.AGNES_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Cle API non configuree sur le serveur.' });

    const { video_id, model_name } = req.query;
    if (!video_id) return res.status(400).json({ error: 'video_id manquant' });

    const upstreamUrl = 'https://apihub.agnes-ai.com/agnesapi?video_id=' +
        encodeURIComponent(video_id) +
        (model_name ? '&model_name=' + encodeURIComponent(model_name) : '');

    try {
        const upstream = await fetch(upstreamUrl, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + apiKey }
        });
        const data = await upstream.json();
        return res.status(upstream.status).json(data);
    } catch (err) {
        return res.status(502).json({ error: 'Erreur proxy : ' + err.message });
    }
}
