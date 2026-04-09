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
  writeBatch,
  arrayRemove
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      // 🚨 CRITICAL FIX: Prevent the bubble from flickering back 
      // by ignoring local changes that haven't been confirmed by the server yet.
      if (snapshot.metadata.hasPendingWrites) return;

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
          return null;
        }

        let otherParticipantName = "Unknown User";
        let isDriver = false;

        try {
          if (chatData.participantNames && chatData.participantNames[otherParticipantId]) {
            otherParticipantName = chatData.participantNames[otherParticipantId];
          }

          const userDoc = await getDoc(doc(db, "users", otherParticipantId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            otherParticipantName = userData.firstName || userData.fullName || otherParticipantName;
            isDriver = userData.isDriver || false;
          }
        } catch (error) {
          console.warn("Error fetching user data for participant:", otherParticipantId, error);
        }

        const carInfo = chatData.carInfo || {
          id: chatData.carId || 'general',
          title: chatData.carTitle || 'Car Rental Request'
        };

        const messages = chatData.messages || [];
        const lastMessage = messages[messages.length - 1];

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

      if (expiredChatIds.length > 0) {
        setExpiredChatsToDelete(prev => [...prev, ...expiredChatIds]);
      }

      const chatResults = await Promise.all(chatPromises);
      const validChats = chatResults.filter(chat => chat !== null) as ChatUser[];

      const sortedChats = validChats.sort((a, b) => {
        const timeA = a.lastMessageTime?.getTime() || 0;
        const timeB = b.lastMessageTime?.getTime() || 0;
        return timeB - timeA;
      });

      setChats(sortedChats);

      const totalUnread = sortedChats.reduce((sum, chat) => sum + chat.unreadCount, 0);
      setUnreadTotal(totalUnread);

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
    setDeleteConfirmId(chatId); // Open the custom modal instead of window.confirm
  };

  // Add this new function to actually do the work
  const confirmDelete = async () => {
    if (!deleteConfirmId || !currentUser) return;
    try {
      // 1. Delete the chat document
      await deleteDoc(doc(db, "preChats", deleteConfirmId));

      // 2. THE MISSING PIECE: Clean up the user's unread list
      await updateDoc(doc(db, "users", currentUser.uid), {
        unreadChats: arrayRemove(deleteConfirmId)
      });

      // 3. Update local UI state
      setChats(prevChats => prevChats.filter(chat => chat.chatId !== deleteConfirmId));
      if (selectedChat?.chatId === deleteConfirmId) {
        setSelectedChat(null);
      }
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting chat:", error);
      setDeleteConfirmId(null);
    }
  };

  // Handle selecting a chat - FIXED: Now properly marks messages as read in Firestore
  const handleSelectChat = async (chat: ChatUser) => {
    if (loadingChat === chat.chatId || authChecking || !currentUser) return;

    setLoadingChat(chat.chatId);

    try {
      let driverPhone = "";

      // 1. Fetch the driver/other participant's phone number
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

      // 2. Clear notifications if there are unread messages
      if (chat.unreadCount > 0 && currentUser) {
        try {
          const chatRef = doc(db, "preChats", chat.chatId);
          const userRef = doc(db, "users", currentUser.uid);

          // Mark individual messages as read in the chat document
          const chatSnap = await getDoc(chatRef);
          if (chatSnap.exists()) {
            const messages = chatSnap.data().messages || [];
            const updatedMessages = messages.map((msg: any) => ({
              ...msg,
              // Mark as read if the message was sent by the other person
              read: msg.senderId !== currentUser.uid ? true : msg.read
            }));

            await updateDoc(chatRef, {
              messages: updatedMessages,
              lastActivity: Timestamp.now()
            });
          }

          // REMOVE FROM SIDEBAR/NAVBAR: Remove this chatId from the user's unread list
          await updateDoc(userRef, {
            unreadChats: arrayRemove(chat.chatId)
          });

          console.log("Notifications cleared for chat:", chat.chatId);
        } catch (error) {
          console.error("Error clearing notifications:", error);
        }
      }

      // 3. Set the selected chat for the UI
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

      // 4. Update local state immediately to hide the bubble
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
    <div className="bg-gradient-to-b from-gray-900 via-gray-950 to-black min-h-screen text-gray-100">
      <div className="container mx-auto px-0 md:px-4 py-0 md:py-6 max-w-7xl">
        <div className="bg-gray-900/80 backdrop-blur-xl md:rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
          <div className="h-[100vh] flex flex-col lg:flex-row md:h-[90vh]">

            {/* LEFT SIDEBAR: CHAT LIST */}
            <div className={`lg:w-96 border-r border-gray-800 flex flex-col bg-gray-900/50 ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>

              {/* Header Section */}
              <div className="p-5 border-b border-gray-800 bg-gray-900/80">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold tracking-tight">Messages</h1>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${unreadTotal > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                        <span className="text-xs text-gray-400 font-medium">
                          {unreadTotal > 0 ? `${unreadTotal} New` : 'Up to date'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {userData && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-full border border-gray-700">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                          {userData.isDriver ? "Driver" : "Customer"}
                        </p>
                      </div>
                      <div className="h-6 w-6 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-gray-300" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search name or car model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm transition-all placeholder:text-gray-600"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex p-1 bg-gray-950 rounded-lg mt-4 border border-gray-800">
                  {(['all', 'unread', 'recent'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${activeFilter === filter
                        ? 'bg-gray-800 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* List Section */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 opacity-50">
                    <MessageCircle className="h-10 w-10 mb-2" />
                    <p className="text-sm">No conversations found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800/30">
                    {filteredChats.map((chat) => {
                      const isExpired = getTimeUntilExpiry(chat.lastMessageTime) === "Expired";
                      const isActive = selectedChat?.chatId === chat.chatId;

                      return (
                        <div
                          key={chat.chatId}
                          onClick={() => handleChatClick(chat)}
                          className={`group p-4 cursor-pointer transition-all relative border-l-4 ${isActive
                            ? 'bg-blue-600/5 border-blue-500'
                            : 'border-transparent hover:bg-gray-800/40'
                            } ${isExpired ? 'grayscale opacity-60' : ''}`}
                        >
                          <div className="flex gap-3">
                            {/* Avatar Logic */}
                            <div className="relative flex-shrink-0">
                              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border-2 ${chat.isDriver
                                ? 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                                : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                }`}>
                                {chat.isDriver ? <span className="font-black">D</span> : <User className="h-5 w-5" />}
                              </div>
                              {chat.unreadCount > 0 && !isExpired && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 text-[10px] font-bold text-white items-center justify-center">
                                    {chat.unreadCount}
                                  </span>
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-0.5">
                                <h4 className={`font-bold text-sm truncate ${isActive ? 'text-blue-400' : 'text-white'}`}>
                                  {chat.name}
                                </h4>
                                <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                  {formatTime(chat.lastMessageTime)}
                                </span>
                              </div>

                              <p className="text-xs text-gray-400 truncate mb-2 group-hover:text-gray-300 transition-colors">
                                {chat.lastMessage}
                              </p>

                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${chat.isDriver ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                                  }`}>
                                  {chat.carInfo?.title || 'General'}
                                </span>
                                {isExpired && <span className="text-[10px] text-red-500 font-medium">Expired</span>}
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleDeleteChat(chat.chatId, e)}
                              className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all self-center"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-950/50 border-t border-gray-800">
                <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest font-bold">
                  7-Day Auto-Cleanup Enabled
                </p>
              </div>
            </div>

            {/* RIGHT SIDE: CONTENT AREA */}
            <div className={`flex-1 flex flex-col bg-gray-950/30 ${selectedChat ? 'flex' : 'hidden lg:flex'}`}>
              {selectedChat ? (
                <ChatWindow
                  chatId={selectedChat.chatId}
                  car={selectedChat.car}
                  driver={selectedChat.driver}
                  onClose={() => setSelectedChat(null)}
                  onReadUpdate={handleReadUpdate}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="relative mb-6">
                    <div className="h-24 w-24 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/20">
                      <MessageCircle className="h-10 w-10 text-blue-500" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-gray-800 rounded-full border-4 border-gray-900 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Your Inbox</h2>
                  <p className="text-gray-500 max-w-xs text-sm leading-relaxed">
                    Select a conversation to view ride details and coordinate your trip.
                    Remember to keep communications professional.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-[200] p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="h-12 w-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h4 className="text-xl font-bold text-white text-center mb-2">Delete Chat?</h4>
            <p className="text-gray-400 text-center text-sm mb-6">
              This will permanently remove all messages for this conversation.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
                Yes, Delete
              </button>
              <button onClick={() => setDeleteConfirmId(null)} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}