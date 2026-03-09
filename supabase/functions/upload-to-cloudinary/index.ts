// Supabase Edge Function — upload-to-cloudinary
// Receives a multipart/form-data request with a file and metadata,
// signs the upload, calls the Cloudinary API, and returns the secure_url + public_id.
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
  // Handle CORS preflight
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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'inksnap';
    const caption = (formData.get('caption') as string) || '';

    if (!file) {
      throw new Error('No file provided in the request.');
    }

    // Build Cloudinary signed upload
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

    // SHA-1 signature using Web Crypto
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign + apiSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Forward to Cloudinary
    const cloudinaryForm = new FormData();
    cloudinaryForm.append('file', file);
    cloudinaryForm.append('folder', folder);
    cloudinaryForm.append('timestamp', timestamp.toString());
    cloudinaryForm.append('api_key', apiKey);
    cloudinaryForm.append('signature', signature);
    if (caption) cloudinaryForm.append('context', `caption=${caption}`);

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: cloudinaryForm },
    );

    const result = await cloudinaryRes.json();

    if (!cloudinaryRes.ok) {
      throw new Error(result?.error?.message || 'Cloudinary upload failed.');
    }

    return new Response(
      JSON.stringify({ secure_url: result.secure_url, public_id: result.public_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[upload-to-cloudinary]', message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
