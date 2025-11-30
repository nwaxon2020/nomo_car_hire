"use client";

import { useEffect, useState } from "react";

interface Article {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  source: { name: string };
}

export default function TransportNewsPageUi() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_NEWSAPI_KEY;

        // Keywords for transport, tickets, flights, shipping, logistics, buses, rails, accidents
        const query = `
          transport OR road OR traffic OR bus OR train OR car OR rail OR accident 
          OR flight OR airline OR ticket OR airfare OR shipping OR logistics OR cargo
        `;

        const res = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=20&language=en&apiKey=${apiKey}`
        );

        const data = await res.json();
        if (!data.articles) throw new Error("Invalid response from news API");

        setArticles(data.articles);
      } catch (err: any) {
        console.error("News fetch error:", err);
        setError("Could not load news. Try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-xl font-semibold">Loading transport news…</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center mt-10">{error}</div>;
  }

  if (articles.length === 0) {
    return <div className="text-center mt-10">No transport news found at the moment.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-4 sm:px-4 space-y-6">

      <div className="grid grid-cols-1 gap-6">
        {articles.map((art, i) => (
          <a
            key={i}
            href={art.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg hover:shadow-2xl transition-shadow overflow-hidden border border-gray-200"
          >
            {art.urlToImage && (
              <div className="md:w-40 h-40 flex-shrink-0 relative">
                <img
                  src={art.urlToImage}
                  alt={art.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4 flex flex-col justify-between">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                  {art.title}
                </h2>
                {art.description && <p className="text-gray-700 text-sm md:text-base">{art.description}</p>}
              </div>
              <div className="mt-3 text-gray-500 text-xs md:text-sm flex justify-between items-center">
                <span>{new Date(art.publishedAt).toLocaleDateString()}</span>
                <span className="italic">{art.source.name}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
