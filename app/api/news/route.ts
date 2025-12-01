import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q') || '';
        
        // Use server-side environment variable
        const apiKey = process.env.NEWSAPI_KEY;
        
        if (!apiKey) {
        console.error('NEWSAPI_KEY is not configured on server');
        return NextResponse.json(
            { 
            status: 'error',
            message: 'Server configuration error',
            articles: [] 
            },
            { status: 500 }
        );
        }
        
        // Use the EXACT same query structure
        const encodedQuery = encodeURIComponent(query);
        const url = `https://newsapi.org/v2/everything?q=${encodedQuery}&sortBy=publishedAt&pageSize=20&language=en&apiKey=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        return NextResponse.json(data);
        
    } catch (error) {
        console.error('News API proxy error:', error);
        return NextResponse.json(
        { 
            status: 'error',
            message: 'Failed to fetch news from provider',
            articles: []
        },
        { status: 500 }
        );
    }
}