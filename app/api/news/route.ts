import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q') || 'general';
        const apiKey = process.env.NEWSAPI_KEY;

        if (!apiKey) {
            return NextResponse.json({ status: 'error', message: 'Server configuration error' }, { status: 500 });
        }

        // Check if the current query is the transportation one
        const isTransport = query.includes('transport') || query.includes('traffic');

        if (isTransport) {
            // 1. Define specific queries
            const nigeriaQuery = encodeURIComponent(`(Nigeria) AND (${query})`);
            const globalQuery = encodeURIComponent(query);

            // 2. Fetch both simultaneously
            const [ngRes, globalRes] = await Promise.all([
                fetch(`https://newsapi.org/v2/everything?q=${nigeriaQuery}&sortBy=publishedAt&pageSize=8&language=en&apiKey=${apiKey}`),
                fetch(`https://newsapi.org/v2/everything?q=${globalQuery}&sortBy=publishedAt&pageSize=8&language=en&apiKey=${apiKey}`)
            ]);

            const ngData = await ngRes.json();
            const globalData = await globalRes.json();

            const ngArticles = ngData.articles || [];
            const globalArticles = globalData.articles || [];

            // 3. Merge them: Nigeria first, then fill the rest with Global
            // We use a Map to prevent duplicates if a story appears in both results
            const combinedMap = new Map();
            
            ngArticles.forEach((art: any) => combinedMap.set(art.url, art));
            globalArticles.forEach((art: any) => {
                if (!combinedMap.has(art.url)) {
                    combinedMap.set(art.url, art);
                }
            });

            const finalArticles = Array.from(combinedMap.values()).slice(0, 12);

            return NextResponse.json({ status: 'ok', articles: finalArticles });
            
        } else {
            // Standard behavior for other categories (Sports, Govt, etc.)
            const encodedQuery = encodeURIComponent(query);
            const url = `https://newsapi.org/v2/everything?q=${encodedQuery}&sortBy=publishedAt&pageSize=12&language=en&apiKey=${apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();
            return NextResponse.json(data);
        }

    } catch (error) {
        console.error('News API Proxy Error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to fetch news' }, { status: 500 });
    }
}