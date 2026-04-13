import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchRetry } from '@/lib/fetchRetry';

const BASE = 'https://edgenai-api.azure-api.net/api/v2';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const submissionId = request.nextUrl.searchParams.get('submission_id');
  if (!submissionId) return NextResponse.json({ error: 'Missing submission_id' }, { status: 400 });

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = `${BASE}/ag/paper/${submissionId}/ag_api_status?stream=true&token=${encodeURIComponent(token)}`;

  const externalRes = await fetchRetry(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.EDAI_API_KEY ?? '',
      Accept: 'text/event-stream',
    },
  }).catch(() => null as unknown as Response);

  if (!externalRes?.ok || !externalRes.body) {
    return NextResponse.json({ error: 'Stream unavailable' }, { status: 502 });
  }

  return new Response(externalRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
