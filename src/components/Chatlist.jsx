import { useEffect, useMemo, useState } from "react";
import { RiMore2Fill } from "react-icons/ri";
import { auth, db, listenForChats } from "../firebase/firebase";
import defaultAvatar from "/assets/default.jpg";
import SearchModal from "./SearchModal";
import { formatTimestamp } from "../utils/formatTimestamp";
import { onSnapshot, doc } from "firebase/firestore";

const ChatList = ({ setSelectedUser }) => {
  const [chats, setChats] = useState([]);
  const [user, setUser] = useState(null);

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

  const sortedChats = useMemo(() => {
    return [...chats].sort(
      (a, b) => (b.lastMessageTimestamp?.seconds || 0) - (a.lastMessageTimestamp?.seconds || 0)
    );
  }, [chats]);

  const startChat = (user) => {
    setSelectedUser(user);
  };

  return (
    <section className="relative hidden lg:flex flex-col items-start justify-start bg-white h-[100vh] w-full md:w-[600px]">
      <header className="flex items-center justify-between w-full border-b border-blue-200 p-4">
        <main className="flex items-center gap-3">
          <img
            className="h-[44px] w-[44px] object-cover rounded-full"
            src={user?.image || defaultAvatar}
            alt="User avatar"
          />
          <span>
            <h3 className="font-semibold text-blue-900 md:text-[17px]">
              {user?.fullName || "Chatly user"}
            </h3>
            <p className="font-light text-blue-900 text-[15px]">@{user?.username || "chatly"}</p>
          </span>
        </main>
        <button className="bg-blue-100 hover:bg-blue-200 w-[35px] h-[35px] p-2 flex items-center justify-center rounded-lg">
          <RiMore2Fill color="#1e3a8a" className="w-[28px] h-[28px]" />
        </button>
      </header>

      <div className="w-full mt-2 px-5">
        <header className="flex items-center justify-between">
          <h3 className="text-[16px] text-blue-900 font-medium">
            Messages ({chats?.length || 0})
          </h3>
          <SearchModal startChat={startChat} />
        </header>
      </div>

      <main className="flex flex-col items-start gap-6 w-full mt-6 pb-3 custom-scrollbar overflow-y-auto">
        {sortedChats.map((chat) => {
          const otherUsers = chat?.users?.filter(
            (u) => u?.email !== auth.currentUser?.email
          );

          return otherUsers.map((user) => (
            <a
              key={user.email}
              className="item flex items-start justify-between w-full border-b border-blue-100 px-5 pb-2 hover:bg-blue-50"
              onClick={() => startChat(user)}
            >
              <div className="flex items-start gap-3">
                <img
                  src={user?.image || defaultAvatar}
                  alt={user?.fullName}
                  className="h-[40px] w-[40px] rounded-full object-cover"
                />
                <div className="flex flex-col w-full">
                  <h2 className="font-semibold text-blue-900 text-[17px]">{user?.fullName}</h2>
                  <p className="font-light text-blue-800 text-[14px] truncate">
                    {chat?.lastMessage?.slice(0, 35) || "No messages yet"}
                  </p>
                </div>
                <p className="text-blue-400 text-[11px] whitespace-nowrap">
                  {formatTimestamp(chat?.lastMessageTimestamp)}
                </p>
              </div>
            </a>
          ));
        })}
      </main>
    </section>
  );
};

export default ChatList;
