import React, { useState, useEffect } from "react";
import { RiSearchLine } from "react-icons/ri";
import { FaSearch } from "react-icons/fa";
import defaultAvatar from "/assets/default.jpg";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc 
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { sendFriendRequest, checkFriendStatus } from "../services/FriendService";

const SearchModal = ({ startChat }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [friendStatusMap, setFriendStatusMap] = useState({});

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    console.log("friendStatusMap updated:", friendStatusMap);
  }, [friendStatusMap]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert("Please enter a search term.");
      return;
    }

    try {
      const normalized = searchTerm.toLowerCase();
      const q = query(
        collection(db, "users"),
        where("username", ">=", normalized),
        where("username", "<=", normalized + "\uf8ff")
      );
      const snapshot = await getDocs(q);
      const foundUsers = [];
      const statusMap = {};

      for (const doc of snapshot.docs) {
        const user = { uid: doc.id, ...doc.data() };
        if (user.uid !== auth.currentUser.uid) {
          const status = await checkFriendStatus(auth.currentUser.uid, user.uid);
          statusMap[user.uid] = status;
          foundUsers.push(user);
        }
      }

      setUsers(foundUsers);
      setFriendStatusMap(statusMap);

      if (foundUsers.length === 0) {
        alert("No users found.");
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleSendRequest = async (toUserId) => {
    try {
      await sendFriendRequest(auth.currentUser.uid, toUserId);
      setFriendStatusMap((prev) => ({ ...prev, [toUserId]: "requested" }));
      alert("Friend request sent!");
    } catch (error) {
      alert(error.message);
    }
  };

  // Function to create a new chat between two users
  const createChat = async (currentUser, otherUser) => {
    try {
      // Check if chat already exists
      const chatsRef = collection(db, "chats");
      const existingChatQuery = query(
        chatsRef,
        where("userIds", "array-contains", currentUser.uid)
      );
      
      const existingChats = await getDocs(existingChatQuery);
      
      // Check if there's already a chat between these two users
      const existingChat = existingChats.docs.find(doc => {
        const chatData = doc.data();
        return chatData.userIds.includes(otherUser.uid);
      });

      if (existingChat) {
        return existingChat.id;
      }

      // Create new chat if it doesn't exist
      const newChatRef = await addDoc(chatsRef, {
        userIds: [currentUser.uid, otherUser.uid],
        users: [
          {
            uid: currentUser.uid,
            email: currentUser.email,
            fullName: currentUser.fullName,
            username: currentUser.username,
            image: currentUser.image || null
          },
          {
            uid: otherUser.uid,
            email: otherUser.email,
            fullName: otherUser.fullName,
            username: otherUser.username,
            image: otherUser.image || null
          }
        ],
        createdAt: serverTimestamp(),
        lastMessage: "Start chatting!",
        lastMessageTimestamp: serverTimestamp()
      });

      return newChatRef.id;
    } catch (error) {
      console.error("Error creating chat:", error);
      throw error;
    }
  };

  const handleStartChat = async (user) => {
    const status = friendStatusMap[user.uid];
    if (status === "accepted") {
      try {
        // Get current user data
        const currentUserDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const currentUserData = { uid: auth.currentUser.uid, ...currentUserDoc.data() };

        // Create chat if it doesn't exist
        await createChat(currentUserData, user);
        
        // Start the chat
        startChat(user);
        closeModal();
      } catch (error) {
        console.error("Error starting chat:", error);
        alert("Failed to start chat. Please try again.");
      }
    } else {
      alert("You can chat after the friend request is accepted.");
    }
  };

  return (
    <div>
      <button
        onClick={openModal}
        className="bg-blue-100 hover:bg-blue-200 w-[35px] h-[35px] p-2 flex items-center justify-center rounded-lg transition-all duration-200"
        type="button"
      >
        <RiSearchLine color="#60a5fa" className="w-[18px] h-[18px]" />
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex justify-center items-center bg-[#1e3a8acc]"
          onClick={closeModal}
        >
          <div
            className="relative p-4 w-full max-w-md max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-blue-500 w-full rounded-md shadow-md">
              <div className="flex items-center justify-between p-4 border-b border-blue-100 rounded-t">
                <h3 className="text-xl font-semibold text-white">Search Chat</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white bg-transparent hover:bg-blue-100 hover:text-blue-900 rounded-lg text-sm w-8 h-8 flex justify-center items-center"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 14 14"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border border-blue-300 text-blue-900 text-sm rounded-lg block w-full p-2.5"
                    placeholder="Search..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    className="bg-blue-900 text-white px-3 py-2 rounded-lg hover:bg-blue-800"
                    onClick={handleSearch}
                  >
                    <FaSearch />
                  </button>
                </div>

                <div className="mt-6">
                  {users.map((user) => (
                    <div
                      key={user.uid}
                      className="flex items-start gap-3 bg-blue-400/30 p-2 rounded-lg border border-white/10 hover:bg-blue-400/50 transition-all mb-2"
                    >
                      <img
                        src={user?.image || defaultAvatar}
                        alt="avatar"
                        className="h-[40px] w-[40px] rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h2 className="font-semibold text-white text-[18px]">
                          {user?.fullName}
                        </h2>
                        <p className="text-[13px] text-white">@{user?.username}</p>
                        <div className="flex gap-2 mt-1">
                          <button
                            className={`text-white text-xs px-2 py-1 rounded transition-colors ${
                              friendStatusMap[user.uid] === "accepted"
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-gray-500 cursor-not-allowed"
                            }`}
                            onClick={() => handleStartChat(user)}
                            disabled={friendStatusMap[user.uid] !== "accepted"}
                          >
                            {friendStatusMap[user.uid] === "accepted"
                              ? "Start Chat"
                              : "Chat (Locked)"}
                          </button>
                          <button
                            className={`text-white text-xs px-2 py-1 rounded transition-colors ${
                              friendStatusMap[user.uid] === "none"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : friendStatusMap[user.uid] === "requested"
                                ? "bg-yellow-600 cursor-not-allowed"
                                : "bg-gray-600 cursor-not-allowed"
                            }`}
                            onClick={() => handleSendRequest(user.uid)}
                            disabled={friendStatusMap[user.uid] !== "none"}
                          >
                            {friendStatusMap[user.uid] === "accepted"
                              ? "Friend"
                              : friendStatusMap[user.uid] === "requested"
                              ? "Requested"
                              : "Add Friend"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchModal;