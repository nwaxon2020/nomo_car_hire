"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc, arrayRemove } from "firebase/firestore";

export function useUnreadChats() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatIds, setUnreadChatIds] = useState<string[]>([]);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUnreadCount(0);
        setUnreadChatIds([]);
        return;
      }

      const userRef = doc(db, "users", user.uid);

      const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          // Ensure we are getting the latest array from Firestore
          const unreadChats = userData.unreadChats || [];

          setUnreadChatIds(unreadChats);
          setUnreadCount(unreadChats.length);
        }
      }, (error) => {
        console.error("Error listening to unread chats:", error);
      });

      return () => unsubscribeSnapshot();
    });

    return () => authUnsub();
  }, []);

  // Call this when a chat is opened OR deleted
  const markChatAsRead = async (chatId: string) => {
    if (!auth.currentUser || !chatId) return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      // This physically removes the ID from the Firestore array
      await updateDoc(userRef, {
        unreadChats: arrayRemove(chatId)
      });
      console.log(`Chat ${chatId} removed from unread list.`);
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  };

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