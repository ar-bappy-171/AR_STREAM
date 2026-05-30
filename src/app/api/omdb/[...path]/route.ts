import { NextRequest, NextResponse } from 'next/server';

const OMDB_API_KEY = process.env.OMDB_API_KEY || '20ccc009';
const OMDB_BASE_URL = 'https://www.omdbapi.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const searchParams = request.nextUrl.searchParams;

    // OMDb uses query parameters for all requests (no path-based endpoints)
    // The path segments are ignored but kept for consistent route pattern
    // All meaningful params come via query string: ?i=tt3896198, ?s=batman, ?t=Inception, etc.
    const url = new URL(OMDB_BASE_URL);

    // Append API key
    url.searchParams.set('apikey', OMDB_API_KEY);

    // Forward all query parameters from the client request
    searchParams.forEach((value, key) => {
      if (key !== 'apikey') {
        url.searchParams.set(key, value);
      }
    });

    // If path segments contain useful info (like an IMDB ID), use the first segment
    // This allows usage like /api/omdb/tt3896198 which maps to ?i=tt3896198
    if (path.length > 0 && path[0] && !url.searchParams.has('i') && !url.searchParams.has('t') && !url.searchParams.has('s')) {
      const firstSegment = path[0];
      if (firstSegment.startsWith('tt')) {
        url.searchParams.set('i', firstSegment);
      }
    }

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }, // Cache for 1 hour since OMDb data doesn't change often
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OMDb API Error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `OMDb API returned ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // OMDb returns { Response: "False", Error: "..." } for not-found/error cases
    if (data.Response === 'False') {
      return NextResponse.json(
        { error: data.Error || 'OMDb API returned an error', Response: 'False' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('OMDb Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from OMDb' },
      { status: 500 }
    );
  }
}
