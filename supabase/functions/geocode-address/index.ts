import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const address: string = body?.address;

    if (!address || address.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encodedAddress = encodeURIComponent(address.trim());
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;

    const geoResponse = await fetch(nominatimUrl, {
      headers: {
        // Nominatim requires a descriptive User-Agent
        'User-Agent': 'InkSnap/1.0 (tattoo artist booking platform)',
        'Accept': 'application/json',
      },
    });

    if (!geoResponse.ok) {
      throw new Error(`Nominatim API error: ${geoResponse.status}`);
    }

    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No results found for this address' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = geoData[0];
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    return new Response(
      JSON.stringify({ latitude, longitude, display_name: result.display_name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
