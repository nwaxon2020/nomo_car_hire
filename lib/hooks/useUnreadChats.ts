"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, onSnapshot, getDoc, updateDoc, arrayRemove } from "firebase/firestore";

export function useUnreadChats() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatIds, setUnreadChatIds] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.currentUser) {
      setUnreadCount(0);
      setUnreadChatIds([]);
      return;
    }

    const userRef = doc(db, "users", auth.currentUser.uid);
    
    // Listen for real-time updates to user's unreadChats
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const unreadChats = userData.unreadChats || [];
        
        setUnreadChatIds(unreadChats);
        setUnreadCount(unreadChats.length);
      }
    }, (error) => {
      console.error("Error listening to unread chats:", error);
    });

    return () => unsubscribe();
  }, []);

  // Function to mark a chat as read
  const markChatAsRead = async (chatId: string) => {
    if (!auth.currentUser) return;
    
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        unreadChats: arrayRemove(chatId)
      });
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  };

  // Function to check if a specific chat is unread
  const isChatUnread = (chatId: string) => {
    return unreadChatIds.includes(chatId);
  };

  return {
    unreadCount,
    unreadChatIds,
    markChatAsRead,
    isChatUnread
  };
}