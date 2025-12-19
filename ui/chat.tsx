"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc,
  Timestamp,
  deleteDoc
} from "firebase/firestore";
import ChatWindow from "@/components/PreChat/chat-window";
import { 
  MessageCircle, 
  Search, 
  User, 
  Clock, 
  Trash2,
  ChevronRight,
  CheckCircle,
  Users
} from "lucide-react";

interface ChatUser {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  chatId: string;
  carInfo?: {
    title: string;
    id: string;
  };
  userId: string;
  isDriver: boolean;
}

export default function ChatPageUi() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<{
    chatId: string;
    car: any;
    driver: any;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "recent">("all");
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [userData, setUserData] = useState<any>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        router.push("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [router]);

  // Fetch chats and set up real-time updates
  useEffect(() => {
    if (!auth.currentUser) return;

    setLoading(true);
    
    const chatsRef = collection(db, "preChats");
    const q = query(chatsRef, where("participants", "array-contains", auth.currentUser.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        
        // Check if chat is older than 48 hours
        const createdAt = chatData.createdAt?.toDate?.();
        const now = new Date();
        const hoursDiff = createdAt ? (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60) : 0;
        
        if (hoursDiff > 48) {
          // Delete expired chat
          await deleteDoc(doc(db, "preChats", chatId));
          return null;
        }

        // Find other participant
        const otherParticipantId = chatData.participants.find(
          (id: string) => id !== auth.currentUser!.uid
        );

        // Get participant names
        const participantNames = chatData.participantNames || {};
        const otherParticipantName = participantNames[otherParticipantId] || "Unknown User";

        // Get car info
        const carInfo = chatData.carInfo || { id: 'general', title: 'Car Rental Request' };

        // Get last message
        const messages = chatData.messages || [];
        const lastMessage = messages[messages.length - 1];
        
        // Count unread messages
        const unreadCount = messages.filter(
          (msg: any) => msg.senderId !== auth.currentUser!.uid && !msg.read
        ).length;

        // Get user data for other participant
        let isDriver = false;
        try {
          const userDoc = await getDoc(doc(db, "users", otherParticipantId));
          if (userDoc.exists()) {
            isDriver = userDoc.data().isDriver || false;
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }

        return {
          id: otherParticipantId,
          name: otherParticipantName,
          lastMessage: lastMessage?.text || "No messages yet",
          lastMessageTime: lastMessage?.timestamp ? new Date(lastMessage.timestamp) : new Date(chatData.createdAt?.toDate?.()),
          unreadCount,
          chatId,
          carInfo,
          userId: otherParticipantId,
          isDriver
        };
      });

      const chatResults = await Promise.all(chatPromises);
      const validChats = chatResults.filter(chat => chat !== null) as ChatUser[];
      
      // Sort by last message time
      const sortedChats = validChats.sort((a, b) => {
        const timeA = a.lastMessageTime?.getTime() || 0;
        const timeB = b.lastMessageTime?.getTime() || 0;
        return timeB - timeA;
      });

      setChats(sortedChats);
      
      // Calculate total unread
      const totalUnread = sortedChats.reduce((sum, chat) => sum + chat.unreadCount, 0);
      setUnreadTotal(totalUnread);
      
      // Update user's unread count (set to zero since we're viewing)
      if (auth.currentUser) {
        try {
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            unreadChats: [],
            lastChatView: Timestamp.now()
          });
        } catch (error) {
          console.error("Error updating unread count:", error);
        }
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Filter chats based on search and filter
  const filteredChats = chats.filter(chat => {
    // Apply search filter
    const matchesSearch = chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.carInfo?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply type filter
    if (activeFilter === "unread") {
      return matchesSearch && chat.unreadCount > 0;
    }
    if (activeFilter === "recent") {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      return matchesSearch && chat.lastMessageTime && chat.lastMessageTime > oneDayAgo;
    }
    
    return matchesSearch;
  });

  const handleSelectChat = (chat: ChatUser) => {
    setSelectedChat({
      chatId: chat.chatId,
      car: chat.carInfo,
      driver: {
        id: chat.userId,
        name: chat.name
      }
    });
    
    // Mark all messages as read when opening chat
    if (chat.unreadCount > 0) {
      setChats(prevChats => 
        prevChats.map(c => 
          c.chatId === chat.chatId ? { ...c, unreadCount: 0 } : c
        )
      );
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your chats...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 to-black">
      {/* Main Layout */}
      <div className="container mx-auto px-1 md:px-4 py-3 max-w-7xl">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
            <div className="flex flex-col lg:flex-row h-[100vh]">
                
                {/* Sidebar - Left */}
                <div className={`lg:w-96 border-r border-gray-700 flex flex-col ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <MessageCircle className="h-6 w-6 text-white" />
                            </div>
                            <div>
                            <h1 className="text-xl font-bold text-white">Messages</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={`h-2 w-2 rounded-full ${unreadTotal > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                <p className="text-sm text-gray-400">
                                {unreadTotal > 0 ? `${unreadTotal} unread message${unreadTotal !== 1 ? 's' : ''}` : 'No unread messages'}
                                </p>
                            </div>
                            </div>
                        </div>
                        
                        {userData && (
                            <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-white">{userData.firstName || "User"}</p>
                                <p className="text-xs text-gray-400">{userData.isDriver ? "🚗 Driver" : "👤 Customer"}</p>
                            </div>
                            <div className="h-10 w-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center border border-gray-600">
                                <User className="h-5 w-5 text-gray-300" />
                            </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white placeholder-gray-500"
                        />
                    </div>
                    
                    {/* Filter Tabs */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setActiveFilter("all")}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeFilter === "all"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setActiveFilter("unread")}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                            activeFilter === "unread"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                            }`}
                        >
                            Unread
                            {unreadTotal > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                                {unreadTotal > 9 ? "9+" : unreadTotal}
                            </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveFilter("recent")}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeFilter === "recent"
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                            }`}
                        >
                            Recent
                        </button>
                    </div>
                </div>
                
                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="h-20 w-20 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                        <MessageCircle className="h-10 w-10 text-gray-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">No chats yet</h3>
                        <p className="text-gray-500 text-sm">
                        {searchTerm 
                            ? "No chats match your search"
                            : activeFilter === "unread"
                            ? "No unread messages"
                            : "Start a chat from a booking request"}
                        </p>
                    </div>
                    ) : (
                    <div className="divide-y divide-gray-700/50">
                        {filteredChats.map((chat) => (
                        <div
                            key={chat.chatId}
                            onClick={() => handleSelectChat(chat)}
                            className={`p-4 hover:bg-gray-800/50 cursor-pointer transition-colors relative group ${
                            selectedChat?.chatId === chat.chatId ? 'bg-gray-800' : ''
                            }`}
                        >
                            <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="relative">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                                chat.isDriver 
                                    ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30'
                                    : 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30'
                                }`}>
                                {chat.isDriver ? (
                                    <span className="text-orange-400 font-bold text-lg">D</span>
                                ) : (
                                    <span className="text-blue-400 font-bold text-lg">C</span>
                                )}
                                </div>
                                {chat.unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                                    {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                                </div>
                                )}
                            </div>
                            
                            {/* Chat Info */}
                            <div className="flex-1 w-full">
                                <div className="flex items-center justify-between mb-1">
                                <h4 className="font-semibold text-white md:truncate">
                                    {chat.name}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                    {formatTime(chat.lastMessageTime)}
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-gray-400" />
                                </div>
                                </div>
                                
                                <p className="text-sm text-gray-400 md:truncate mb-1">
                                {chat.lastMessage}
                                </p>
                                
                                <div className="flex items-center gap-2">
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                    chat.isDriver 
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                    {chat.isDriver ? "Driver" : "Customer"}
                                </div>
                                <span className="text-xs text-gray-500 md:truncate">
                                    {chat.carInfo?.title}
                                </span>
                                </div>
                            </div>
                            
                            {/* Delete Button (on hover) */}
                            <button
                                onClick={(e) => {
                                e.stopPropagation();
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded-lg"
                            >
                                <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-400" />
                            </button>
                            </div>
                            
                            {/* 48h Expiry Indicator */}
                            {chat.lastMessageTime && (
                            <div className="mt-2 flex items-center gap-1 text-xs">
                                <Clock className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-500">
                                Expires in {Math.max(0, 48 - Math.floor((new Date().getTime() - chat.lastMessageTime.getTime()) / (1000 * 60 * 60)))}h
                                </span>
                            </div>
                            )}
                        </div>
                        ))}
                    </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-gray-700">
                    <div className="text-sm text-gray-500 text-center">
                    <span>Chats auto-delete after 48h</span>
                    </div>
                </div>
                </div>
                
                {/* Chat Window - Right */}
                <div className={`flex-1 flex flex-col ${selectedChat ? 'flex' : 'hidden lg:flex'}`}>
                {selectedChat ? (
                    <>
                    
                    {/* Chat Window */}
                    <div className="flex-1">
                        <ChatWindow
                        chatId={selectedChat.chatId}
                        car={selectedChat.car}
                        driver={selectedChat.driver}
                        onClose={() => setSelectedChat(null)}
                        />
                    </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="max-w-md text-center">
                        <div className="h-32 w-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700">
                        <MessageCircle className="h-16 w-16 text-gray-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Select a chat</h2>
                        <p className="text-gray-400 mb-6">
                        To continue longer chat time, please use WhatsApp.
                        Chats automatically expire after 48 hours.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                            <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
                            <Users className="h-5 w-5 text-blue-400" />
                            </div>
                            <p className="text-sm text-gray-300">Chat with drivers or customers</p>
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                            <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            </div>
                            <p className="text-sm text-gray-300">Real-time messaging</p>
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                            <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
                            <Clock className="h-5 w-5 text-purple-400" />
                            </div>
                            <p className="text-sm text-gray-300">48-hour chat history</p>
                        </div>
                        </div>
                    </div>
                    </div>
                )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}