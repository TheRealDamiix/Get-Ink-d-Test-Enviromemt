const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();

    if (!address || !address.trim()) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address.trim())}&format=json&limit=1`;

    const geoRes = await fetch(url, {
      headers: { 'User-Agent': 'InkSnap/1.0 (tattoo artist booking platform)' },
    });

    const data = await geoRes.json();

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No results found for this address' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
