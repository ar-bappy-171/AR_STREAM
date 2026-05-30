import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'fd4ebbc695b3b73c2ed344aea65f0b6b';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const tmdbPath = path.join('/');
    const url = new URL(`${TMDB_BASE_URL}/${tmdbPath}`);
    
    url.searchParams.set('api_key', TMDB_API_KEY);
    
    searchParams.forEach((value, key) => {
      if (key !== 'api_key') {
        url.searchParams.set(key, value);
      }
    });
    
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TMDB API Error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `TMDB API returned ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('TMDB Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from TMDB' },
      { status: 500 }
    );
  }
}
