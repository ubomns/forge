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

    const targetUrl = `${FASTAPI_URL}/api/critique`;

    let upstream: Response;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
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
            sendError(res, 504, { code: 'UPSTREAM_ERROR', message: 'Critique service request timed out' });
            return;
        }
        sendError(res, 502, { code: 'UPSTREAM_ERROR', message: 'Could not connect to the critique service. Is it running?' });
        return;
    }

    if (!upstream.ok) {
        try {
            const body = await upstream.json();
            sendError(res, upstream.status, {
                code: 'UPSTREAM_ERROR',
                message: body?.error?.message || `Critique service returned ${upstream.status}`,
            });
        } catch {
            sendError(res, upstream.status, { code: 'UPSTREAM_ERROR', message: `Critique service returned ${upstream.status}` });
        }
        return;
    }

    const data = await upstream.json();
    res.status(200).json(data);
}