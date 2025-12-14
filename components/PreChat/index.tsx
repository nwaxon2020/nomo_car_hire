"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    DocumentData,
} from "firebase/firestore";
import ChatWindow from "./chat-window";
import { sendNotification } from "@/lib/notifications";

// 🔹 Types for expected props
export interface CarType {
    id: string;
    title: string;
    [key: string]: any;
}

interface PreChatProps {
  car: {
    id: string;
    title: string;
    price?: number;
    description?: string;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
  };
  onClose?: () => void; // ✅ Add this
  chatId?: string; // If you already have chat history
}


export default function PreChat({ car, driver, onClose, chatId: propChatId }: PreChatProps) {
    const [chatId, setChatId] = useState<string | null>(propChatId || null);
    const [showChat, setShowChat] = useState<boolean>(!!propChatId);
    const [loading, setLoading] = useState<boolean>(false);

    /**
     * 🔍 Check if a pre-chat already exists between the passenger and driver
     */
    useEffect(() => {
        if (!auth.currentUser || !car?.id || propChatId) return;

        const chatsRef = collection(db, "preChats");
        const q = query(
        chatsRef,
        where("carId", "==", car.id),
        where("passengerId", "==", auth.currentUser.uid),
        where("status", "==", "active")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const chat = snapshot.docs[0];
            setChatId(chat.id);
        }
        });

        return () => unsubscribe();
    }, [car?.id, propChatId]);

    /**
     * 🟦 Start a new chat request
     */
    const startChat = async (): Promise<void> => {
        if (!auth.currentUser) {
        alert("Please login to chat with driver");
        return;
        }

        setLoading(true);

        try {
        // Create a new chat document
        const chatRef = await addDoc(collection(db, "preChats"), {
            carId: car.id,
            driverId: driver.id,
            passengerId: auth.currentUser.uid,
            carTitle: car.title,
            driverName: driver.name,
            passengerName: auth.currentUser.displayName,
            messages: [] as DocumentData[],
            status: "active",
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
        });

        setChatId(chatRef.id);
        setShowChat(true);

        // 🔔 Notify driver
        await sendNotification(
            driver.id,
            "New chat request",
            `${auth.currentUser.displayName} wants to chat about ${car.title}`
        );
        } catch (error) {
        console.error("Error starting chat:", error);
        } finally {
        setLoading(false);
        }
    };

    // If chat is open, show chat window
    if (showChat && chatId) {
        return (
        <ChatWindow
            chatId={chatId}
            car={car}
            driver={driver}
            onClose={() => {
                setShowChat(false);
                onClose?.(); // Call the onClose prop if provided
            }}
        />
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6">
            {/* Header with close button */}
            <div className="border-b border-gray-600 flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-100">
                Chat with <span className="text-[gold]">{driver.name}</span>
                </h2>
                {onClose && (
                <button
                    onClick={onClose}
                    className="text-gray-100 hover:text-gray-300"
                >
                    ✕
                </button>
                )}
            </div>
        
            {/* Chat info */}
            <div className="border border-gray-600 bg-gray-900 p-2 rounded-lg mb-6 space-y-3">
                <p className="text-center text-gray-50 text-sm ">
                    <span className="font-semibold">Car:</span> {car.title}
                </p>
                <p className="text-center text-gray-50 text-sm">
                    <span className="font-semibold">Driver:</span> {driver.name}
                </p>
                <p className="text-center text-sm text-gray-50">
                    Chat driver for discussions - pricing, dates, vehicle specifics, and booking arrangements.
                     WhatsApp is also available as an optional alternative if needed.
                </p>
            </div>
            
            <button
                onClick={startChat}
                disabled={loading}
                className="w-full bg-blue-700 text-blue-100 
                px-4 py-3 rounded-lg font-medium hover:bg-blue-600 
                transition-colors flex items-center justify-center gap-2"
            >
            {loading ? (
                <>
                <span className="animate-spin">⏳</span>
                Starting chat...
                </>
            ) : (
                <>💬 Chat with Driver Within 24hrs</>
            )}
            </button>
        </div>
        
    );
}