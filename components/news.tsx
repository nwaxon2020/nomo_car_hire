"use client";

import { useEffect, useState, useCallback } from "react";

interface Article {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  source: { name: string };
}

const CATEGORIES = [
  { id: 'transport', label: 'Transportation', query: 'transport OR road OR traffic OR flight OR rail' },
  { id: 'nigeria', label: 'Nigeria Govt', query: 'Nigeria AND (government OR politics OR "Bola Tinubu")' },
  { id: 'sports', label: 'Sports', query: 'sports OR football OR basketball OR olympics' },
  { id: 'world', label: 'Worldwide', query: 'world news OR international OR breaking news' },
];

export default function NewsPageUi() {
  const [articles, setArticles] = useState<Article[]>([]);
  
  // 1. Initialize state from localStorage if it exists
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedNewsCategory');
      return saved || CATEGORIES[0].id;
    }
    return CATEGORIES[0].id;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Update localStorage whenever activeTab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedNewsCategory', activeTab);
    }
  }, [activeTab]);

  const fetchNews = useCallback(async (categoryId: string) => {
    setLoading(true);
    setError(null);
    try {
      const category = CATEGORIES.find(c => c.id === categoryId);
      const res = await fetch(`/api/news?q=${encodeURIComponent(category?.query || '')}`);
      
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();

      if (data.status === "ok" && Array.isArray(data.articles)) {
        const uniqueArticles = data.articles
          .filter((v: Article, i: number, a: Article[]) => 
            a.findIndex(t => t.title === v.title) === i
          )
          .slice(0, 8);

        setArticles(uniqueArticles);
      } else {
        setError("Could not load news.");
      }
    } catch (err) {
      setError("Failed to connect to news service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(activeTab);
  }, [activeTab, fetchNews]);

  return (
    <div className="max-w-7xl mx-auto pt-28 pb-8 px-2 md:px-4">
      {/* Category Toggle Buttons */}
      <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`text-xs px-6 py-2 rounded-full font-black transition-all ${
              activeTab === cat.id 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-50 text-xl font-semibold animate-pulse">
          Loading {activeTab} news...
        </div>
      ) : error ? (
        <div className="text-center p-10 bg-red-50 text-red-600 rounded-xl border border-red-100">
          <p>{error}</p>
          <button onClick={() => fetchNews(activeTab)} className="mt-4 underline">Try Again</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {articles.map((art, i) => (
            <a
              key={`${activeTab}-${i}`}
              href={art.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              <div className="h-48 overflow-hidden bg-gray-200">
                {art.urlToImage ? (
                  <img
                    src={art.urlToImage}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                )}
              </div>
              
              <div className="p-4 flex flex-col flex-grow">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
                  {art.source.name}
                </span>
                <h2 className="text-sm font-bold text-gray-900 leading-tight mb-2 line-clamp-3 group-hover:text-blue-600">
                  {art.title}
                </h2>
                <p className="text-gray-600 text-xs line-clamp-2 mb-4">
                  {art.description}
                </p>
                <div className="mt-auto pt-3 border-t border-gray-50 text-xs text-gray-400">
                  {new Date(art.publishedAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}