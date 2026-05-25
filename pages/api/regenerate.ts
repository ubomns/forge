import type { NextApiRequest, NextApiResponse } from 'next';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: { code: 'INVALID_REQUEST', message: 'Only POST is supported' } });
        return;
    }

    const targetUrl = `${FASTAPI_URL}/api/regenerate`;

    let upstream: Response;
    try {
        const controller = new AbortController();
        // 90s — single-section regen with full-plan context + instruction can take
        // 40–60s on gpt-4.1-mini for dense sections (Financials, GTM, Market). 30s
        // was triggering false-positive timeouts on real regen calls.
        const timeout = setTimeout(() => controller.abort(), 90_000);
        try {
            upstream = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            res.status(504).json({ error: { code: 'UPSTREAM_ERROR', message: 'Service request timed out' } });
            return;
        }
        res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: 'Could not connect to the regeneration service. Is it running?' } });
        return;
    }

    if (!upstream.ok) {
        try {
            const body = await upstream.json();
            res.status(upstream.status).json({ error: body?.error || { code: 'UPSTREAM_ERROR', message: `Service returned ${upstream.status}` } });
        } catch {
            res.status(upstream.status).json({ error: { code: 'UPSTREAM_ERROR', message: `Service returned ${upstream.status}` } });
        }
        return;
    }

    const data = await upstream.json();
    res.status(200).json(data);
}