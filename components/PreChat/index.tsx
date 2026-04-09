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
    doc,
    getDoc,
} from "firebase/firestore";
import ChatWindow from "./chat-window";
import { MessageCircle, Clock, Shield, Car, X, CheckCircle } from "lucide-react";

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
        [key: string]: any;
    };
    driver: {
        id: string;
        name: string;
        phone: string;
        [key: string]: any;
    };
    onClose?: () => void;
    chatId?: string;
}

export default function PreChat({ car, driver, onClose, chatId: propChatId }: PreChatProps) {
    const [chatId, setChatId] = useState<string | null>(propChatId || null);
    const [showChat, setShowChat] = useState<boolean>(!!propChatId);
    const [loading, setLoading] = useState<boolean>(false);
    const [currentUserData, setCurrentUserData] = useState<any>(null);
    const [existingChatId, setExistingChatId] = useState<string | null>(null);
    const [existingChatData, setExistingChatData] = useState<any>(null);

    // Get current user data
    useEffect(() => {
        const fetchUserData = async () => {
            if (!auth.currentUser) return;

            try {
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    setCurrentUserData(userDoc.data());
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        fetchUserData();
    }, []);

    /**
     * 🔍 Check if a pre-chat already exists between the passenger and driver
     */
    useEffect(() => {
        if (!auth.currentUser || !car?.id || propChatId) return;

        const chatsRef = collection(db, "preChats");
        const q = query(
            chatsRef,
            where("participants", "array-contains", auth.currentUser.uid),
            where("carId", "==", car.id),
            where("driverId", "==", driver.id),
            where("status", "==", "active")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const chat = snapshot.docs[0];
                const chatData = chat.data();
                setExistingChatId(chat.id);
                setExistingChatData(chatData);
            } else {
                setExistingChatId(null);
                setExistingChatData(null);
            }
        });

        return () => unsubscribe();
    }, [car?.id, driver.id, propChatId]);

    /**
     * 🟦 Start a new chat request
     */
    const startChat = async (): Promise<void> => {
        if (!auth.currentUser) {
            alert("Please login to chat with driver");
            return;
        }

        if (existingChatId) {
            setChatId(existingChatId);
            setShowChat(true);
            return;
        }

        if (!currentUserData) {
            alert("Loading user data... Please try again.");
            return;
        }

        setLoading(true);

        try {
            const passengerName = currentUserData.firstName ||
                currentUserData.fullName ||
                auth.currentUser.displayName ||
                "User";

            let driverFullData = driver;
            try {
                const driverDoc = await getDoc(doc(db, "users", driver.id));
                if (driverDoc.exists()) {
                    const driverData = driverDoc.data();
                    driverFullData = {
                        id: driver.id,
                        name: driver.name,
                        phone: driverData.phone || driverData.phoneNumber || driver.phone || "",
                        isDriver: driverData.isDriver || false,
                        ...driverData
                    };
                }
            } catch (error) {
                console.warn("Could not fetch additional driver data:", error);
            }

            const participants = [auth.currentUser.uid, driver.id];

            const participantNames = {
                [auth.currentUser.uid]: passengerName,
                [driver.id]: driver.name
            };

            const { id: carId, title, price, description, ...carRest } = car;
            const carInfo = {
                id: car.id,
                title: car.title,
                price: car.price,
                description: car.description,
                ...carRest
            };

            const now = new Date();
            const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const chatRef = await addDoc(collection(db, "preChats"), {
                carId: car.id,
                driverId: driver.id,
                passengerId: auth.currentUser.uid,
                participants,
                driverName: driver.name,
                passengerName: passengerName,
                participantNames,
                carTitle: car.title,
                carInfo,
                messages: [] as DocumentData[],
                status: "active",
                createdAt: serverTimestamp(),
                lastActivity: serverTimestamp(),
                expiresAt: expiresAt,
                isDriver: driverFullData?.isDriver || false,
                carPrice: car.price,
                lastMessage: null,
                unreadCount: 0,
                participantTypes: {
                    [auth.currentUser.uid]: currentUserData.isDriver ? "driver" : "passenger",
                    [driver.id]: "driver"
                }
            });

            setChatId(chatRef.id);
            setShowChat(true);

        } catch (error) {
            console.error("Error starting chat:", error);
            alert("Failed to start chat. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleStartOrOpenChat = () => {
        if (existingChatId) {
            setChatId(existingChatId);
            setShowChat(true);
        } else {
            startChat();
        }
    };

    const getExistingChatMessageCount = () => {
        if (!existingChatData) return 0;
        return existingChatData.messages?.length || 0;
    };

    const getExistingChatInfo = () => {
        if (!existingChatData) return null;
        const messages = existingChatData.messages || [];
        if (messages.length === 0) return null;
        const lastMessage = messages[messages.length - 1];
        return {
            lastMessage: lastMessage.text,
            messageCount: messages.length,
            lastActivity: existingChatData.lastActivity
        };
    };

    const formatLastActivity = (timestamp: any) => {
        if (!timestamp) return "Recently";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffHours < 1) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return `${diffMinutes}m ago`;
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else {
                const diffDays = Math.floor(diffHours / 24);
                return diffDays < 7 ? `${diffDays}d ago` : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        } catch (error) {
            return "Recently";
        }
    };

    if (showChat && chatId) {
        const { id: driverId, name, phone, ...driverRest } = driver;
        return (
            <ChatWindow
                chatId={chatId}
                car={car}
                driver={{
                    id: driver.id,
                    name: driver.name,
                    phone: driver.phone,
                    ...driverRest
                }}
                onClose={() => {
                    setShowChat(false);
                    setChatId(null);
                    onClose?.();
                }}
            />
        );
    }

    const existingChatInfo = getExistingChatInfo();
    const messageCount = getExistingChatMessageCount();
    const lastActivityTime = existingChatData?.lastActivity ?
        formatLastActivity(existingChatData.lastActivity) : "Recently";

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-2 md:p-6 border border-gray-700 shadow-2xl max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Chat with Driver</h2>
                        <p className="text-sm text-gray-400 mt-1">Discuss rental details</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
                        aria-label="Close chat"
                    >
                        <X className="h-5 w-5 text-gray-300" />
                    </button>
                )}
            </div>

            <div className="border border-gray-700 bg-gray-900/50 p-4 rounded-lg mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Vehicle</p>
                        <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-blue-400" />
                            <p className="font-medium text-gray-100 truncate">{car.title}</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Driver</p>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            </div>
                            <p className="font-medium text-gray-100 truncate">{driver.name}</p>
                        </div>
                    </div>
                </div>

                {car.price && (
                    <div className="pt-3 border-t border-gray-800">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Daily Rate</p>
                        <p className="text-lg font-bold text-green-400">${car.price}/day</p>
                    </div>
                )}

                <div className="pt-3 border-t border-gray-800">
                    <p className="text-sm text-gray-300">
                        Discuss pricing, availability, pickup locations, and booking arrangements.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                    <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <MessageCircle className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="text-xs text-gray-300">Real-time Chat</p>
                </div>
                <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                    <div className="h-10 w-10 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Shield className="h-5 w-5 text-green-400" />
                    </div>
                    <p className="text-xs text-gray-300">Secure</p>
                </div>
                <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                    <div className="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="h-5 w-5 text-amber-400" />
                    </div>
                    <p className="text-xs text-gray-300">7 Days</p>
                </div>
            </div>

            {existingChatId && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                            <p className="text-sm text-blue-300 font-medium">Active Conversation</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                                {messageCount} message{messageCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-300/70">
                        <CheckCircle className="h-3 w-3" />
                        <span>Tap button below to continue conversation</span>
                    </div>
                </div>
            )}

            <button
                onClick={handleStartOrOpenChat}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-3 ${loading
                    ? 'bg-blue-800/50 text-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                    }`}
            >
                {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <>
                        <MessageCircle className="h-5 w-5" />
                        {existingChatId ? `Continue Chat (${messageCount})` : 'Start New Chat'}
                    </>
                )}
            </button>
        </div>
    );
}