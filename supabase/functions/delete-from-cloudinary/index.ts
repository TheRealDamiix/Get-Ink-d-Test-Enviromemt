// Supabase Edge Function — delete-from-cloudinary
// Accepts a JSON body: { public_ids: string[] }
// Calls the Cloudinary bulk delete API for each public_id.
//
// Required Supabase secrets (set via: supabase secrets set KEY=value):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary credentials are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET as Supabase secrets.',
      );
    }

    const body = await req.json();
    const publicIds: string[] = body?.public_ids ?? [];

    if (!publicIds.length) {
      return new Response(
        JSON.stringify({ result: 'ok', deleted: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const results: Record<string, string> = {};

    for (const publicId of publicIds) {
      const timestamp = Math.round(Date.now() / 1000);
      const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;

      // SHA-1 signature
      const encoder = new TextEncoder();
      const data = encoder.encode(paramsToSign + apiSecret);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const deleteForm = new FormData();
      deleteForm.append('public_id', publicId);
      deleteForm.append('timestamp', timestamp.toString());
      deleteForm.append('api_key', apiKey);
      deleteForm.append('signature', signature);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        { method: 'POST', body: deleteForm },
      );

      const json = await res.json();
      results[publicId] = json?.result ?? 'error';
    }

    return new Response(
      JSON.stringify({ result: 'ok', deleted: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[delete-from-cloudinary]', message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
