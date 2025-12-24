"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc,
  Timestamp,
  deleteDoc,
  writeBatch
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
  Users,
  AlertCircle
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
  const [expiredChatsToDelete, setExpiredChatsToDelete] = useState<string[]>([]);
  const [loadingChat, setLoadingChat] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null); // Store user from auth listener

  // Check authentication state FIRST
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No user is signed in, redirect to login
        router.push("/login");
        return;
      }
      
      // Store the user object
      setCurrentUser(user);
      setAuthChecking(false);
      
      // Fetch user data immediately after auth is confirmed
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch chats and set up real-time updates - Only run AFTER auth is confirmed
  useEffect(() => {
    if (!currentUser || authChecking) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const chatsRef = collection(db, "preChats");
    const q = query(chatsRef, where("participants", "array-contains", currentUser.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const expiredChatIds: string[] = [];
      const chatPromises = snapshot.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;

        // Check if chat is older than 7 days
        const createdAt = chatData.createdAt?.toDate?.();
        const lastActivity = chatData.lastActivity ? new Date(chatData.lastActivity) : null;
        const referenceDate = lastActivity || createdAt;
        
        if (referenceDate) {
          const now = new Date();
          const daysDiff = (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff > 7) {
            expiredChatIds.push(chatId);
            return null;
          }
        }

        // Find other participant
        const otherParticipantId = chatData.participants?.find(
          (id: string) => id !== currentUser.uid
        );

        if (!otherParticipantId) {
          console.warn("No other participant found in chat:", chatId);
          return null;
        }

        // Get participant info - Handle missing data
        let otherParticipantName = "Unknown User";
        let isDriver = false;
        let userData = null;

        try {
          // Try to get from chat data first
          if (chatData.participantNames && chatData.participantNames[otherParticipantId]) {
            otherParticipantName = chatData.participantNames[otherParticipantId];
          }
          
          // Get user data for other participant
          const userDoc = await getDoc(doc(db, "users", otherParticipantId));
          if (userDoc.exists()) {
            userData = userDoc.data();
            otherParticipantName = userData.firstName || userData.fullName || otherParticipantName;
            isDriver = userData.isDriver || false;
          }
        } catch (error) {
          console.warn("Error fetching user data for participant:", otherParticipantId, error);
        }

        // Get car info
        const carInfo = chatData.carInfo || { 
          id: chatData.carId || 'general', 
          title: chatData.carTitle || 'Car Rental Request' 
        };

        // Get last message
        const messages = chatData.messages || [];
        const lastMessage = messages[messages.length - 1];
        
        // Count unread messages - Only count messages from other participant
        const unreadCount = messages.filter(
          (msg: any) => msg.senderId !== currentUser.uid && !msg.read
        ).length;

        return {
          id: otherParticipantId,
          name: otherParticipantName,
          lastMessage: lastMessage?.text || "No messages yet",
          lastMessageTime: lastMessage?.timestamp ? new Date(lastMessage.timestamp) : (referenceDate || new Date()),
          unreadCount,
          chatId,
          carInfo,
          userId: otherParticipantId,
          isDriver
        };
      });

      // Queue expired chats for deletion
      if (expiredChatIds.length > 0) {
        setExpiredChatsToDelete(prev => [...prev, ...expiredChatIds]);
      }

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
      
      // Update user's last chat view time
      if (currentUser) {
        try {
          await updateDoc(doc(db, "users", currentUser.uid), {
            lastChatView: Timestamp.now()
          });
        } catch (error) {
          console.error("Error updating last chat view:", error);
        }
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, authChecking]);

  // Handle chat read update
  const handleReadUpdate = useCallback((chatId: string) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.chatId === chatId 
          ? { ...chat, unreadCount: 0 }
          : chat
      )
    );
  }, []);

  // Delete expired chats
  useEffect(() => {
    const deleteExpiredChats = async () => {
      if (expiredChatsToDelete.length === 0 || authChecking || !currentUser) return;
      
      try {
        const batch = writeBatch(db);
        
        expiredChatsToDelete.forEach(chatId => {
          const chatRef = doc(db, "preChats", chatId);
          batch.delete(chatRef);
        });
        
        await batch.commit();
        console.log(`Deleted ${expiredChatsToDelete.length} expired chats`);
        setExpiredChatsToDelete([]);
      } catch (error) {
        console.error("Error deleting expired chats:", error);
      }
    };
    
    deleteExpiredChats();
  }, [expiredChatsToDelete, authChecking, currentUser]);

  // Delete a specific chat
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this chat? All messages will be lost.")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "preChats", chatId));
      
      setChats(prevChats => prevChats.filter(chat => chat.chatId !== chatId));
      
      if (selectedChat?.chatId === chatId) {
        setSelectedChat(null);
      }
      
      console.log("Chat deleted successfully");
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Failed to delete chat. Please try again.");
    }
  };

  // Handle selecting a chat - FIXED: Now properly marks messages as read in Firestore
  const handleSelectChat = async (chat: ChatUser) => {
    if (loadingChat === chat.chatId || authChecking || !currentUser) return;
    
    setLoadingChat(chat.chatId);
    
    try {
      let driverPhone = "";
      
      if (currentUser) {
        try {
          const driverDoc = await getDoc(doc(db, "users", chat.userId));
          if (driverDoc.exists()) {
            const driverData = driverDoc.data();
            driverPhone = driverData.phone || driverData.phoneNumber || "";
          }
        } catch (error) {
          console.warn("Could not fetch driver phone:", error);
        }
      }
      
      // CRITICAL FIX: Mark messages as read in Firestore when opening chat
      if (chat.unreadCount > 0 && currentUser) {
        try {
          const chatRef = doc(db, "preChats", chat.chatId);
          const chatSnap = await getDoc(chatRef);
          
          if (chatSnap.exists()) {
            const messages = chatSnap.data().messages || [];
            const updatedMessages = messages.map((msg: any) => ({
              ...msg,
              // Mark as read if message is from the other participant
              read: msg.senderId !== currentUser.uid ? true : msg.read
            }));
            
            await updateDoc(chatRef, {
              messages: updatedMessages,
              lastActivity: Timestamp.now()
            });
            
            console.log("Marked messages as read for chat:", chat.chatId);
          }
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      }
      
      const { id, userId, name, carInfo, chatId, unreadCount, lastMessage, lastMessageTime, isDriver, ...rest } = chat;
      
      setSelectedChat({
        chatId: chat.chatId,
        car: chat.carInfo || { id: 'unknown', title: 'Unknown Car' },
        driver: {
          id: chat.userId,
          name: chat.name,
          phone: driverPhone,
          isDriver: chat.isDriver,
          ...rest
        }
      });
      
      // Update local state
      if (chat.unreadCount > 0) {
        setChats(prevChats => 
          prevChats.map(c => 
            c.chatId === chat.chatId ? { ...c, unreadCount: 0 } : c
          )
        );
      }
    } catch (error) {
      console.error("Error selecting chat:", error);
    } finally {
      setLoadingChat(null);
    }
  };

  // Filter chats based on search and filter
  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.carInfo?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks}w ago`;
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    }
  };

  // Calculate time until expiry
  const getTimeUntilExpiry = (lastMessageTime?: Date) => {
    if (!lastMessageTime) return "7d";
    
    const now = new Date();
    const hoursDiff = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
    const daysLeft = Math.max(0, Math.floor((7 * 24) - hoursDiff));
    
    if (daysLeft <= 0) {
      return "Expired";
    } else if (daysLeft === 1) {
      return "1d";
    } else if (daysLeft < 7) {
      return `${daysLeft}d`;
    } else {
      const weeks = Math.floor(daysLeft / 7);
      const remainingDays = daysLeft % 7;
      if (remainingDays === 0) {
        return `${weeks}w`;
      } else {
        return `${weeks}w ${remainingDays}d`;
      }
    }
  };

  // Handle chat click
  const handleChatClick = async (chat: ChatUser) => {
    const timeUntilExpiry = getTimeUntilExpiry(chat.lastMessageTime);
    const isExpired = timeUntilExpiry === "Expired";
    
    if (!isExpired) {
      await handleSelectChat(chat);
    }
  };

  // Show loading while checking auth
  if (authChecking) {
    return (
      <div className="bg-gradient-to-b from-gray-900 to-black min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Checking authentication...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-gray-900 to-black min-h-screen">
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
    <div className="bg-gradient-to-b from-gray-900 to-black min-h-screen">
      <div className="container mx-auto px-1 md:px-4 py-3 max-w-7xl">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
            <div className="flex flex-col lg:flex-row h-[calc(100vh-2rem)]">
                
                <div className={`lg:w-96 border-r border-gray-700 flex flex-col ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>

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
                
                <div className="flex-1 overflow-y-auto">
                  {filteredChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <div className="h-20 w-20 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                        <MessageCircle className="h-10 w-10 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-300 mb-2">No chats yet</h3>
                      <p className="text-gray-500 text-sm">
                        {searchTerm 
                          ? "No chats match your search"
                          : activeFilter === "unread"
                          ? "No unread messages"
                          : "Start a chat from a booking request"
                        }
                      </p>
                    </div>
                    ) : (
                    <div className="divide-y divide-gray-700/50">
                      {filteredChats.map((chat) => {
                        const timeUntilExpiry = getTimeUntilExpiry(chat.lastMessageTime);
                        const isExpired = timeUntilExpiry === "Expired";
                        const isLoading = loadingChat === chat.chatId;
                        
                        return (
                        <div
                          key={chat.chatId}
                          onClick={() => handleChatClick(chat)}
                          className={`p-4 cursor-pointer transition-colors relative group ${
                            selectedChat?.chatId === chat.chatId ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                          } ${isExpired ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                                chat.isDriver 
                                    ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30'
                                    : 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30'
                                }`}>
                                {isLoading ? (
                                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : chat.isDriver ? (
                                  <span className="text-orange-400 font-bold text-lg">D</span>
                                ) : (
                                  <span className="text-blue-400 font-bold text-lg">C</span>
                                )}
                                </div>
                                {chat.unreadCount > 0 && !isExpired && (
                                <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                                    {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                                </div>
                                )}
                            </div>
                            
                            <div className="flex-1 w-full">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-semibold text-white md:truncate">
                                      {chat.name}
                                      {isExpired && (
                                        <span className="ml-2 text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded">Expired</span>
                                      )}
                                      {isLoading && (
                                        <span className="ml-2 text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">Opening...</span>
                                      )}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                      <span className={`text-xs ${isExpired ? 'text-red-400' : 'text-gray-500'}`}>
                                      {isExpired ? "Expired" : formatTime(chat.lastMessageTime)}
                                      </span>
                                      <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-gray-400" />
                                  </div>
                                </div>
                                
                                <p className={`text-sm md:truncate mb-1 ${isExpired ? 'text-gray-500' : 'text-gray-400'}`}>
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

                            <button
                                onClick={(e) => handleDeleteChat(chat.chatId, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded-lg"
                                disabled={isLoading}
                            >
                                <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-400" />
                            </button>
                          </div>

                          <div className="mt-2 flex items-center gap-1 text-xs">
                            <Clock className={`h-3 w-3 ${isExpired ? 'text-red-400' : 'text-gray-500'}`} />
                            <span className={isExpired ? 'text-red-400' : 'text-gray-500'}>
                              {isExpired ? "Chat expired - will be deleted soon" : `Expires in ${timeUntilExpiry}`}
                            </span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t border-gray-700">
                    <div className="text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Chats auto-delete after 7 days of inactivity</span>
                    </div>
                </div>
                </div>
                
                <div className={`flex-1 flex flex-col ${selectedChat ? 'flex' : 'hidden lg:flex'}`}>
                {selectedChat ? (
                  <>
                    <div className="flex-1">
                      <ChatWindow
                        chatId={selectedChat.chatId}
                        car={selectedChat.car}
                        driver={selectedChat.driver}
                        onClose={() => setSelectedChat(null)}
                        onReadUpdate={handleReadUpdate}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="max-w-md text-center">
                      <div className="h-32 w-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700">
                        <MessageCircle className="h-16 w-16 text-gray-500" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-3">Select a chat</h2>
                      <p className="text-gray-400 mb-6">
                        To continue longer chat time, please use WhatsApp.
                        Chats automatically expire after 7 days.
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
                          <p className="text-sm text-gray-300">7-day chat history</p>
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