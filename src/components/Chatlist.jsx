import { useEffect, useMemo, useState } from "react";
import { RiMore2Fill } from "react-icons/ri";
import { auth, db, listenForChats } from "../firebase/firebase";
import defaultAvatar from "/assets/default.jpg";
import SearchModal from "./SearchModal";
import { formatTimestamp } from "../utils/formatTimestamp";
import {
  onSnapshot,
  doc,
  collection,
  query,
  where,
  updateDoc,
  getDocs,
  arrayUnion,
} from "firebase/firestore";

const ChatList = ({ setSelectedUser }) => {
  const [chats, setChats] = useState([]);
  const [user, setUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    return onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUser(docSnap.data());
      }
    });
  }, []);

  useEffect(() => {
    const unsubscribe = listenForChats(setChats);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.currentUser?.uid || chats.length === 0) return;

    const unsubscribes = chats.map((chat) => {
      const messagesRef = collection(db, "chats", chat.id, "messages");
      
      // Listen to ALL messages in the chat (no where clause to catch new messages)
      return onSnapshot(messagesRef, (snapshot) => {
        let unreadCount = 0;
        
        snapshot.docs.forEach((doc) => {
          const messageData = doc.data();
          const readBy = messageData.readBy || [];
          
          // Count only messages from other users that current user hasn't read
          if (messageData.senderId !== auth.currentUser.uid && 
              !readBy.includes(auth.currentUser.uid)) {
            unreadCount++;
          }
        });

        setUnreadCounts((prev) => ({
          ...prev,
          [chat.id]: unreadCount,
        }));
      }, (error) => {
        console.error("Error listening to messages:", error);
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [chats]);

  const sortedChats = useMemo(() => {
    return [...chats].sort(
      (a, b) =>
        (b.lastMessageTimestamp?.seconds || 0) -
        (a.lastMessageTimestamp?.seconds || 0)
    );
  }, [chats]);

  const startChat = async (selectedUser) => {
    const chat = chats.find((chat) =>
      chat.users.some((u) => u.email === selectedUser.email)
    );

    if (chat?.id) {
      try {
        // Get all unread messages for this chat
        const msgRef = collection(db, "chats", chat.id, "messages");
        const unreadQuery = query(
          msgRef,
          where("senderId", "!=", auth.currentUser.uid)
        );
        
        const unreadSnapshot = await getDocs(unreadQuery);
        
        // Update readBy for all unread messages
        const updatePromises = unreadSnapshot.docs.map((msgDoc) => {
          const messageData = msgDoc.data();
          const readBy = messageData.readBy || [];
          
          // Only update if user hasn't read this message
          if (!readBy.includes(auth.currentUser.uid)) {
            return updateDoc(doc(db, "chats", chat.id, "messages", msgDoc.id), {
              readBy: arrayUnion(auth.currentUser.uid), // Use arrayUnion for better performance
            });
          }
          return Promise.resolve();
        });

        await Promise.all(updatePromises);
        
        // Immediately update local state to prevent UI lag
        setUnreadCounts((prev) => ({
          ...prev,
          [chat.id]: 0,
        }));
        
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    }

    setSelectedUser(selectedUser);
  };

  return (
    <section className="relative hidden lg:flex flex-col items-start bg-white h-[100vh] w-full md:w-[600px]">
      <header className="flex justify-between items-center w-full p-4 border-b border-blue-200">
        <div className="flex gap-3 items-center">
          <img
            src={user?.image || defaultAvatar}
            className="h-[44px] w-[44px] rounded-full"
          />
          <div>
            <h3 className="text-blue-900 font-semibold text-md">
              {user?.fullName || "Chatly User"}
            </h3>
            <p className="text-blue-900 text-sm">@{user?.username || "chatly"}</p>
          </div>
        </div>
        <button className="bg-blue-100 hover:bg-blue-200 w-[35px] h-[35px] p-2 rounded-lg">
          <RiMore2Fill className="text-blue-900" />
        </button>
      </header>

      <div className="w-full mt-2 px-5">
        <header className="flex justify-between items-center">
          <h3 className="text-blue-900 font-medium text-[16px]">
            Messages ({chats.length})
          </h3>
          <SearchModal startChat={startChat} />
        </header>
      </div>

      <main className="custom-scrollbar flex flex-col gap-6 w-full mt-6 pb-3 overflow-y-auto">
        {sortedChats.map((chat) => {
          const otherUser = chat.users.find(
            (u) => u.email !== auth.currentUser.email
          );
          return (
            <a
              key={chat.id}
              onClick={() => startChat(otherUser)}
              className={`item flex justify-between items-start w-full px-5 pb-2 border-b hover:bg-blue-50 cursor-pointer ${
                unreadCounts[chat.id] > 0 ? "bg-blue-100" : ""
              }`}
            >
              <div className="flex items-start gap-3 w-full">
                <img
                  src={otherUser?.image || defaultAvatar}
                  className="h-[40px] w-[40px] rounded-full object-cover"
                />
                <div className="flex flex-col w-full">
                  <h2 className="font-semibold text-blue-900 text-[17px]">
                    {otherUser?.fullName}
                  </h2>
                  <p className="font-light text-blue-800 text-[14px] truncate">
                    {chat?.lastMessage?.slice(0, 35) || "No messages yet"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-blue-400 text-[11px] whitespace-nowrap">
                    {formatTimestamp(chat?.lastMessageTimestamp)}
                  </p>
                  {unreadCounts[chat.id] > 0 && (
                    <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                      {unreadCounts[chat.id]}
                    </span>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </main>
    </section>
  );
};

export default ChatList;