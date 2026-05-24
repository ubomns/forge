import type { NextApiRequest, NextApiResponse } from 'next';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

type ApiError = {
    code: 'MISSING_API_KEY' | 'UPSTREAM_ERROR' | 'INVALID_REQUEST';
    message: string;
};

function sendError(res: NextApiResponse, status: number, error: ApiError) {
    res.status(status).json({ error });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        sendError(res, 405, { code: 'INVALID_REQUEST', message: 'Only POST is supported' });
        return;
    }

    const targetUrl = `${FASTAPI_URL}/api/generate`;

    let upstream: Response;
    try {
        upstream = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
    } catch {
        sendError(res, 502, { code: 'UPSTREAM_ERROR', message: 'Could not connect to the generation service. Is it running?' });
        return;
    }

    if (!upstream.ok) {
        try {
            const body = await upstream.json();
            if (body?.error?.code === 'MISSING_API_KEY') {
                sendError(res, 500, { code: 'MISSING_API_KEY', message: 'API key is not configured. Please set OPENAI_API_KEY.' });
            } else {
                sendError(res, upstream.status, {
                    code: 'UPSTREAM_ERROR',
                    message: body?.error?.message || `Generation service returned ${upstream.status}`,
                });
            }
        } catch {
            sendError(res, upstream.status, { code: 'UPSTREAM_ERROR', message: `Generation service returned ${upstream.status}` });
        }
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
        }
    } catch {
        res.end();
        return;
    }

    res.end();
}