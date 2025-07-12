import React, { useState, useEffect, useMemo, useRef } from "react";
import { RiSendPlaneFill } from "react-icons/ri";
import { FaCheck, FaCheckDouble } from "react-icons/fa";
import logo from "/assets/logo.png";
import defaultAvatar from "/assets/default.jpg";
import { formatTimestamp } from "../utils/formatTimestamp";
import { auth, sendMessage, db } from "../firebase/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  addDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ChatBox = ({ selectedUser, clearUnreadBadge }) => {
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const chatId =
    auth?.currentUser?.uid < selectedUser?.uid
      ? `${auth.currentUser?.uid}-${selectedUser?.uid}`
      : `${selectedUser?.uid}-${auth?.currentUser?.uid}`;
  const user1 = auth?.currentUser;
  const user2 = selectedUser;
  const senderEmail = auth?.currentUser?.email;

  // 📩 Load messages and mark unread ones as read
  useEffect(() => {
    if (!chatId) return;

    const messageRef = collection(db, "chats", chatId, "messages");
    const unsubscribe = onSnapshot(messageRef, async (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      let newRead = false;
      for (const docSnap of snapshot.docs) {
        const message = docSnap.data();
        if (
          !message.readBy?.includes(auth.currentUser.uid) &&
          message.sender !== auth.currentUser.email
        ) {
          const msgRef = doc(db, "chats", chatId, "messages", docSnap.id);
          await updateDoc(msgRef, {
            readBy: arrayUnion(auth.currentUser.uid),
          });
          newRead = true;
        }
      }

      if (newRead && clearUnreadBadge) clearUnreadBadge(chatId);
    });

    return () => unsubscribe();
  }, [chatId, clearUnreadBadge]);

  // 🧹 Scroll to bottom on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.lastElementChild?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = a?.timestamp?.seconds + a?.timestamp?.nanoseconds / 1e9;
      const bTime = b?.timestamp?.seconds + b?.timestamp?.nanoseconds / 1e9;
      return aTime - bTime;
    });
  }, [messages]);

  // ✉️ Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed) return;

    setMessageText("");
    await sendMessage(trimmed, chatId, user1?.uid, user2?.uid);
  };

  // 📎 Upload and send file
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const storage = getStorage();
    const fileRef = ref(storage, `chatFiles/${chatId}/${file.name}`);
    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);
    const fileType = file.type.startsWith("image") ? "image" : "document";

    await addDoc(collection(db, "chats", chatId, "messages"), {
      sender: senderEmail,
      fileUrl,
      fileType,
      timestamp: {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
      },
      readBy: [auth.currentUser.uid],
    });
  };

  const getStatusIcon = (msg) => {
    if (!msg?.readBy) return <FaCheck className="text-gray-400 text-xs ml-1" />;
    const delivered = msg.readBy.length > 0;
    const read = msg.readBy.includes(user2?.uid);
    if (read) return <FaCheckDouble className="text-blue-500 text-xs ml-1" />;
    if (delivered) return <FaCheckDouble className="text-gray-400 text-xs ml-1" />;
    return <FaCheck className="text-gray-400 text-xs ml-1" />;
  };

  return selectedUser ? (
    <section className="flex flex-col items-start justify-start h-screen w-full bg-[#e0f2fe]">
      {/* Header */}
      <header className="border-b border-blue-200 w-full h-[70px] md:h-fit p-4 bg-white">
        <main className="flex items-center gap-3">
          <img
            className="h-11 w-11 object-cover rounded-full"
            src={selectedUser?.image || defaultAvatar}
            alt="User"
          />
          <span>
            <h3 className="font-semibold text-blue-900 text-lg">
              {selectedUser?.fullName || "Chatly User"}
            </h3>
            <p className="text-sm text-blue-900">@{selectedUser?.username || "chatly"}</p>
          </span>
        </main>
      </header>

      {/* Messages */}
      <main className="custom-scrollbar relative h-full w-full flex flex-col justify-between">
        <section className="px-3 pt-5 pb-20 lg:pb-10">
          <div ref={scrollRef} className="overflow-auto h-[80vh] custom-scrollbar">
            {sortedMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === senderEmail
                    ? "flex-col items-end"
                    : "flex-col items-start"
                } w-full gap-5 mb-7`}
              >
                <div className={`flex gap-3 ${msg.sender === senderEmail ? "me-10" : "ms-10"}`}>
                  {msg.sender !== senderEmail && (
                    <img
                      className="h-11 w-11 object-cover rounded-full"
                      src={selectedUser?.image || defaultAvatar}
                      alt="User"
                    />
                  )}
                  <div>
                    <div className="flex items-center justify-center rounded-lg bg-white p-4 w-full shadow-sm max-w-xs">
                      {msg.fileUrl ? (
                        msg.fileType === "image" ? (
                          <img src={msg.fileUrl} alt="sent img" className="max-w-[200px] rounded" />
                        ) : (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline"
                          >
                            📄 View Document
                          </a>
                        )
                      ) : (
                        <h4 className="font-medium text-[17px] text-blue-900 break-words">
                          {msg.text}
                        </h4>
                      )}
                    </div>
                    <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
                      {formatTimestamp(msg?.timestamp)}
                      {msg.sender === senderEmail && getStatusIcon(msg)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Input */}
        <div className="sticky lg:bottom-0 bottom-[60px] p-3 w-full">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center bg-white h-[45px] w-full px-3 rounded-lg relative shadow-md"
          >
            {/* 📎 Pin icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-blue-100 rounded-full"
              title="Attach"
            >
              📎
            </button>

            {/* Text input */}
            <input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="pl-10 pr-12 py-2 text-blue-900 outline-none text-[16px] w-full rounded-lg"
              type="text"
              placeholder="Write your message..."
            />

            {/* Send button */}
            <button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition-all"
              aria-label="Send message"
            >
              <RiSendPlaneFill color="#60a5fa" className="w-[18px] h-[18px]" />
            </button>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />
          </form>
        </div>
      </main>
    </section>
  ) : (
    <section className="h-screen w-full bg-[#e5f6f3]80 backdrop-blur-sm">
      <div className="flex flex-col justify-center items-center h-full">
        <img src={logo} alt="Chatly Logo" width={100} />
        <h1 className="text-[30px] font-bold text-blue-700 mt-1">Welcome to Chatly</h1>
        <p>Connect and chat with friends easily, securely, fast and free.</p>
      </div>
    </section>
  );
};

export default ChatBox;
