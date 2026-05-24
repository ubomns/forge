import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

type ApiError = {
    code: 'UPSTREAM_ERROR' | 'INVALID_REQUEST';
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

    const targetUrl = `${FASTAPI_URL}/api/export`;

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
            sendError(res, 504, { code: 'UPSTREAM_ERROR', message: 'Export service request timed out' });
            return;
        }
        sendError(res, 502, { code: 'UPSTREAM_ERROR', message: 'Could not connect to the export service. Is it running?' });
        return;
    }

    if (!upstream.ok) {
        try {
            const body = await upstream.json();
            sendError(res, upstream.status, {
                code: 'UPSTREAM_ERROR',
                message: body?.error?.message || `Export service returned ${upstream.status}`,
            });
        } catch {
            sendError(res, upstream.status, { code: 'UPSTREAM_ERROR', message: `Export service returned ${upstream.status}` });
        }
        return;
    }

    const contentDisposition = upstream.headers.get('content-disposition') || 'attachment; filename="forge-business-plan.docx"';
    const contentType = upstream.headers.get('content-type') || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);

    if (upstream.body) {
        try {
            await pipeline(
                Readable.fromWeb(upstream.body as unknown as Parameters<typeof Readable.fromWeb>[0]),
                res
            );
        } catch {
            if (!res.headersSent) {
                sendError(res, 500, { code: 'UPSTREAM_ERROR', message: 'Failed to stream document' });
            }
        }
    } else {
        sendError(res, 502, { code: 'UPSTREAM_ERROR', message: 'Invalid response from export service' });
    }
}