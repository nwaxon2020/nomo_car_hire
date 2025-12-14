
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";

export function useUnreadChats() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Set up real-time listener for user's unread count
    const userRef = doc(db, "users", auth.currentUser.uid);
    
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const unreadChats = data.unreadChats || [];
        setUnreadCount(unreadChats.length);
      }
    });

    // Alternatively, count unread messages from all chats
    const countUnreadMessages = async () => {
      try {
        const chatsRef = collection(db, "preChats");
        const q = query(chatsRef, where("participants", "array-contains", auth.currentUser!.uid));
        const snapshot = await getDocs(q);
        
        let totalUnread = 0;
        snapshot.forEach((docSnap) => {
          const chatData = docSnap.data();
          const messages = chatData.messages || [];
          
          const unread = messages.filter(
            (msg: any) => msg.senderId !== auth.currentUser!.uid && !msg.read
          ).length;
          
          totalUnread += unread;
        });
        
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error("Error counting unread messages:", error);
      }
    };
    
    // Initial count
    countUnreadMessages();

    return () => unsubscribe();
  }, []);

  return unreadCount;
}