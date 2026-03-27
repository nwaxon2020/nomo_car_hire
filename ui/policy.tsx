"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function PolicyPageUi() {
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const lastUpdated = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    // FETCH DYNAMIC DATA FROM FIREBASE
    useEffect(() => {
        const q = query(collection(db, "site_policies"), orderBy("order", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            setSections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-2 sm:px-6 flex justify-center">
            <div className="w-full max-w-4xl bg-white shadow-lg p-8 px-4 sm:px-8 border border-gray-200 animate-fadeIn">
                
                {/* HEADER */}
                <h1 className="text-4xl font-extrabold text-gray-800 mb-3 text-center">
                    Privacy & Policy
                </h1>
                <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
                    Your privacy and safety are extremely important to us. Please read this policy to understand how we handle and protect your information, and ensure a secure platform for all users.
                </p>

                {/* DYNAMIC SECTIONS FROM DATABASE */}
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-gray-100 rounded-md w-full"></div>
                        ))}
                    </div>
                ) : (
                    sections.map((sec) => (
                        <Section
                            key={sec.id}
                            title={sec.title}
                            content={
                                sec.isList ? (
                                    <ul className="list-disc pl-5 mt-2 space-y-1">
                                        {sec.content.split(',').map((item: string, i: number) => (
                                            <li key={i}>{item.trim()}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="whitespace-pre-line">{sec.content}</div>
                                )
                            }
                        />
                    ))
                )}

                {/* FOOTER */}
                <div className="mt-10 pt-6 border-t border-gray-300 text-center">
                    <p className="text-sm text-gray-500">
                        Last Updated: {lastUpdated}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        &copy; {new Date().getFullYear()} <span className="font-semibold">NOMO CAR</span>.  
                        Your trust and safety remain our top priority.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* REUSABLE SECTION COMPONENT */
function Section({ title, content }: { title: string; content: any }) {
    return (
        <section className="mb-8 p-6 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 transition">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">{title}</h2>
            <div className="text-gray-700 leading-relaxed">
                {content}
            </div>
        </section>
    );
}