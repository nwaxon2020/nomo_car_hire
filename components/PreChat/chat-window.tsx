"use client";

import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import {
    doc,
    updateDoc,
    arrayUnion,
    onSnapshot,
    deleteDoc,
    DocumentData,
} from "firebase/firestore";
import EnhancedWhatsApp from "../EnhancedWhatsApp";
import { 
    Send, 
    X, 
    AlertCircle, 
    Check, 
    CheckCheck, 
    User, 
    Car, 
    Trash2,
    MoreVertical,
    Phone,
    Shield,
    Calendar,
    Clock,
    DollarSign,
    MapPin,
    Fuel,
    CreditCard
} from "lucide-react";

// 🔹 Types
interface MessageType {
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string;
    read: boolean;
}

interface CarType {
    id: string;
    title: string;
    price?: number;
    [key: string]: any;
}

interface DriverType {
    id: string;
    name: string;
    phone?: string;
    [key: string]: any;
}

interface ChatWindowProps {
    chatId: string;
    car: CarType;
    driver: DriverType;
    onClose: () => void;
    onReadUpdate?: (chatId: string) => void; // Add this
}

export default function ChatWindow({
    chatId,
    car,
    driver,
    onClose,
    onReadUpdate, // Make sure to destructure it here
}: ChatWindowProps) {
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [newMessage, setNewMessage] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [showWhatsApp, setShowWhatsApp] = useState<boolean>(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [showMenu, setShowMenu] = useState<boolean>(false);
    const [sendingMessage, setSendingMessage] = useState<boolean>(false);
    const [receivingMessage, setReceivingMessage] = useState<boolean>(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Mark messages as read function
    const markMessagesAsRead = async () => {
        try {
            const chatRef = doc(db, "preChats", chatId);
            const updatedMessages = messages.map(msg => ({
                ...msg,
                read: msg.senderId !== auth.currentUser?.uid ? true : msg.read
            }));
            
            await updateDoc(chatRef, {
                messages: updatedMessages
            });

            // Update global unread count
            if (onReadUpdate) {
                onReadUpdate(chatId);
            }
        } catch (error) {
            console.error("Error marking messages as read:", error);
        }
    };

    // 🔄 Real-time Firestore updates
    useEffect(() => {
        if (!chatId) return;

        const chatRef = doc(db, "preChats", chatId);

        const unsubscribe = onSnapshot(chatRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const newMessages = data.messages || [];
                
                // Check if new message received
                if (newMessages.length > messages.length) {
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.senderId !== auth.currentUser?.uid) {
                        setReceivingMessage(true);
                        setTimeout(() => setReceivingMessage(false), 1000);
                    }
                }
                
                setMessages(newMessages as MessageType[]);
                setLoading(false);

                // Auto scroll to bottom
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
            }
        });

        return () => unsubscribe();
    }, [chatId, messages.length]);

    // Mark messages as read when component mounts or messages change
    useEffect(() => {
        if (chatId && messages.length > 0) {
            markMessagesAsRead();
        }
    }, [chatId, messages.length]);

    // ✉️ Send message with sending animation
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !auth.currentUser) return;

        setSendingMessage(true);
        
        const message: MessageType = {
            senderId: auth.currentUser.uid,
            senderName: auth.currentUser.displayName || "User",
            text: newMessage.trim(),
            timestamp: new Date().toISOString(),
            read: false,
        };

        try {
            const chatRef = doc(db, "preChats", chatId);
            await updateDoc(chatRef, {
                messages: arrayUnion(message),
                lastActivity: new Date().toISOString(),
            });

            setNewMessage("");
            
            // Mark as unread for recipient
            const recipientId =
                auth.currentUser.uid === driver.id
                    ? messages[0]?.senderId
                    : driver.id;

            await updateDoc(doc(db, "users", recipientId), {
                unreadChats: arrayUnion(chatId),
            });
            
            // Simulate sending delay
            setTimeout(() => setSendingMessage(false), 500);
            
        } catch (error) {
            console.error("Error sending message:", error);
            setSendingMessage(false);
        }
    };

    // 👁️ Mark incoming messages as read when input is focused
    const markAsRead = async () => {
        const updatedMessages = messages.map((msg) => ({
            ...msg,
            read: msg.senderId !== auth.currentUser?.uid ? true : msg.read,
        }));

        await updateDoc(doc(db, "preChats", chatId), {
            messages: updatedMessages as DocumentData[],
        });
        
        // Also call onReadUpdate if provided
        if (onReadUpdate) {
            onReadUpdate(chatId);
        }
    };

    // 🗑️ Delete chat
    const deleteChat = async () => {
        try {
            const chatRef = doc(db, "preChats", chatId);
            await deleteDoc(chatRef);
            setShowDeleteConfirm(false);
            onClose();
        } catch (error) {
            console.error("Error deleting chat:", error);
        }
    };

    // Car rental specific quick replies
    const quickReplies = [
        {
            text: "Is this car available at the moment ?",
            icon: Calendar
        },
        {
            text: "What are your daily/weekly rental rates ?",
            icon: DollarSign
        },
        {
            text: "What's the minimum rental duration ?",
            icon: Clock
        },
        {
            text: "Where is the pickup/dropoff location ?",
            icon: MapPin
        },
        {
            text: "What additional documents do I need for rental ?",
            icon: CreditCard
        },
        {
            text: "Do you offer delivery service ?",
            icon: Car
        }
    ];

    // 🕓 Loading UI
    if (loading) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black/95 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-gray-700 rounded-full animate-pulse"></div>
                            <div>
                                <div className="h-4 w-32 bg-gray-700 rounded mb-2"></div>
                                <div className="h-3 w-24 bg-gray-700 rounded"></div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            {/* Main Chat Window - Responsive sizing */}
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-[85vh] max-h-[650px] border border-gray-700">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-xl">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center relative">
                                <User className="h-5 w-5 text-white" />
                                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">{driver.name}</h3>
                                <div className="flex items-center space-x-2 text-sm text-gray-300">
                                    <Car className="h-3 w-3" />
                                    <span className="truncate max-w-[150px]">{car.title}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="h-8 w-8 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
                                >
                                    <MoreVertical className="h-5 w-5 text-gray-300" />
                                </button>
                                
                                {/* Dropdown Menu */}
                                {showMenu && (
                                    <div className="z-60 absolute right-0 top-10 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10">
                                        <button
                                            onClick={() => {
                                                setShowDeleteConfirm(true);
                                                setShowMenu(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-red-900/30 text-red-400 hover:text-red-300 flex items-center space-x-2 rounded-t-lg"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span>Delete Chat</span>
                                        </button>
                                        <button
                                            onClick={() => setShowWhatsApp(true)}
                                            className="w-full px-4 py-3 text-left hover:bg-green-900/30 text-green-400 hover:text-green-300 flex items-center space-x-2"
                                        >
                                            <Phone className="h-4 w-4" />
                                            <span>Continue on WhatsApp</span>
                                        </button>
                                        <div className="border-t border-gray-700 px-4 py-2 text-xs text-gray-400 flex items-center space-x-1">
                                            <Shield className="h-3 w-3" />
                                            <span>End-to-end encrypted</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="h-8 w-8 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-300" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Safety Notice */}
                <div className="px-4 py-2 bg-amber-900/20 border-y border-amber-800/30 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-300">
                        ⚠️ Chat expires in 48 hours
                    </p>
                </div>

                {/* Messages Container */}
                <div 
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-900 to-gray-950"
                >
                    {messages.length === 0 ? (
                        <div className="h-[45rem] md:h-[30rem] flex flex-col items-center justify-center text-center p-4">
                            <div className="mb-6">
                                <div className="h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                                    <Car className="h-10 w-10 text-blue-400" />
                                </div>
                                <h4 className="text-xl font-semibold text-white mb-2">
                                    Start Rental Conversation
                                </h4>
                                <p className="text-gray-400 mb-6">
                                    Ask about availability, pricing, pickup locations, or rental terms
                                </p>
                            </div>
                            
                            {/* Quick Replies for Car Rental */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                                {quickReplies.map((reply, idx) => {
                                    const Icon = reply.icon;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setNewMessage(reply.text)}
                                            className="text-left p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-blue-500 hover:bg-gray-700 transition-all duration-200 group"
                                        >
                                            <div className="flex items-start space-x-2">
                                                <div className="h-8 w-8 bg-gray-900 rounded-full flex items-center justify-center group-hover:bg-blue-900/30 transition-colors">
                                                    <Icon className="h-4 w-4 text-blue-400" />
                                                </div>
                                                <p className="text-sm text-gray-200 flex-1">{reply.text}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg, idx) => {
                                const isCurrentUser = msg.senderId === auth.currentUser?.uid;
                                return (
                                    <div
                                        key={idx}
                                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-messageSlide`}
                                    >
                                        <div className={`max-w-[85%] ${isCurrentUser ? 'ml-auto' : ''}`}>
                                            {!isCurrentUser && (
                                                <p className="text-xs font-medium text-gray-400 mb-1 ml-1">
                                                    {msg.senderName}
                                                </p>
                                            )}
                                            <div
                                                className={`p-3 rounded-2xl relative overflow-hidden ${isCurrentUser
                                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-md shadow-lg'
                                                    : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-bl-md shadow'
                                                    }`}
                                            >
                                                {/* Message bubble tail */}
                                                <div className={`absolute bottom-0 ${isCurrentUser ? 'right-0 translate-x-1' : 'left-0 -translate-x-1'}`}>
                                                    <div className={`h-4 w-4 ${isCurrentUser ? 'bg-blue-600' : 'bg-gray-800'} transform rotate-45`}></div>
                                                </div>
                                                
                                                <p className="break-words relative z-10">{msg.text}</p>
                                            </div>
                                            <div className={`flex items-center space-x-1 mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                                {isCurrentUser && (
                                                    <span className="text-xs">
                                                        {msg.read ? (
                                                            <CheckCheck className="h-3 w-3 text-blue-400" />
                                                        ) : (
                                                            <Check className="h-3 w-3 text-gray-500" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Sending Animation */}
                            {sendingMessage && (
                                <div className="flex justify-end animate-messageSlide">
                                    <div className="max-w-[85%] ml-auto">
                                        <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600/50 to-blue-500/50 text-gray-300 rounded-br-md relative overflow-hidden">
                                            <div className="flex space-x-1">
                                                <div className="h-2 w-2 bg-white/30 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                                                <div className="h-2 w-2 bg-white/30 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                                                <div className="h-2 w-2 bg-white/30 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
                                            </div>
                                            <div className="absolute bottom-0 right-0 translate-x-1">
                                                <div className="h-4 w-4 bg-blue-600/50 transform rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Receiving Animation */}
                            {receivingMessage && (
                                <div className="flex justify-start animate-messageSlide">
                                    <div className="max-w-[85%]">
                                        <p className="text-xs font-medium text-gray-400 mb-1 ml-1">
                                            {driver.name}
                                        </p>
                                        <div className="p-3 rounded-2xl bg-gray-800/50 border border-gray-700/50 text-gray-400 rounded-bl-md relative overflow-hidden">
                                            <div className="flex space-x-1">
                                                <div className="h-2 w-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                                                <div className="h-2 w-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '200ms'}}></div>
                                                <div className="h-2 w-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '400ms'}}></div>
                                            </div>
                                            <div className="absolute bottom-0 left-0 -translate-x-1">
                                                <div className="h-4 w-4 bg-gray-800/50 transform rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={sendMessage} className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-xl">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onFocus={markAsRead}
                            placeholder="Ask about rental dates, pricing, or terms..."
                            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-100 placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sendingMessage}
                            className={`px-5 rounded-xl flex items-center justify-center transition-all duration-300 ${newMessage.trim() && !sendingMessage
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg hover:shadow-blue-500/25'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {sendingMessage ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        Press Enter to send • Messages are encrypted
                    </p>
                </form>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 animate-modalSlide">
                        <div className="text-center">
                            <div className="h-12 w-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-6 w-6 text-red-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Delete Chat?</h3>
                            <p className="text-gray-400 mb-6">
                                This will permanently delete all messages. This action cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={deleteChat}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg transition-all duration-300"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Modal */}
            {showWhatsApp && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[50] backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 animate-modalSlide">
                        <EnhancedWhatsApp
                            car={car}
                            driver={driver}
                            chatHistory={messages}
                            onClose={() => setShowWhatsApp(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}