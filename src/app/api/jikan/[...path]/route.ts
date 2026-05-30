import { NextRequest, NextResponse } from 'next/server';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const jikanPath = path.join('/');
    const url = new URL(`${JIKAN_BASE_URL}/${jikanPath}`);
    
    // Forward all query params
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 600 }, // Cache for 10 minutes
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jikan API Error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Jikan API returned ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Jikan Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Jikan' },
      { status: 500 }
    );
  }
}
