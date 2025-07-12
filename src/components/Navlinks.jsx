import React, { useEffect, useState } from "react";
import {
  RiFolderUserLine,
  RiNotification4Line,
  RiFile4Line,
  RiBardLine,
  RiArrowDownSFill,
  RiShutDownLine,
  RiUser2Line,
} from "react-icons/ri";
import logo from "/assets/logo.png";
import { auth, db } from "../firebase/firebase";
import { signOut } from "firebase/auth";
import {
  handleFriendRequest,
  listenToFriendRequests,
} from "../services/FriendService";
import { collection, onSnapshot, query, where } from "firebase/firestore";

const NavLinks = () => {
  const [showRequests, setShowRequests] = useState(false);
  const [requests, setRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFiles, setShowFiles] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      const unsubscribeReq = listenToFriendRequests(
        auth.currentUser.uid,
        setRequests
      );

      const notifQuery = query(
        collection(db, "notifications"),
        where("to", "==", auth.currentUser.uid)
      );

      const unsubscribeNotif = onSnapshot(notifQuery, (snapshot) => {
        const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setNotifications(notes);

        // ✅ Count only unread notifications
        const unread = notes.filter(note => note.read === false).length;
        setUnreadCount(unread);
      });

      return () => {
        unsubscribeReq();
        unsubscribeNotif();
      };
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert(error.message);
    }
  };

  const acceptRequest = async (id) => {
    await handleFriendRequest(id, "accepted");
  };

  const rejectRequest = async (id) => {
    await handleFriendRequest(id, "rejected");
  };

  return (
    <section className="relative sticky lg:static flex items-center lg:items-start lg:justify-start bg-[#60a5fa] h-[7vh] lg:h-[100vh] w-full lg:w-[150px] py-8 lg:py-0">
      <main className="flex lg:flex-col items-center lg:gap-10 justify-between lg:px-0 w-full relative">
        <div className="flex items-start justify-center lg:border-b border-b-1 border-[#ffffff42] lg:w-full p-4">
          <span className="flex items-center justify-center bg-white w-[57px] h-[48px] rounded-lg p-2">
            <img src={logo} className="w-[56px] h-[52px] object-contain" />
          </span>
        </div>

        <ul className="flex lg:flex-col flex-row items-center justify-start h-[30px] gap-7 md:gap-10 px-2 md:px-0 relative">
          {/* Friend Requests */}
          <li className="relative">
            <button onClick={() => setShowRequests(!showRequests)} className="lg:text-[28px] text-[22px]">
              <RiUser2Line color="#fff" />
            </button>
            {showRequests && (
              <div className="absolute top-10 left-10 lg:left-[60px] bg-white text-black shadow-lg p-4 w-72 rounded-lg z-50">
                <h4 className="font-bold mb-2">Friend Requests</h4>
                {requests.length === 0 ? (
                  <p className="text-sm text-gray-500">No pending requests</p>
                ) : (
                  requests.map((req) => (
                    <div key={req.id} className="mb-2 border-b pb-2">
                      <p className="text-sm">From: {req.fromName || req.from}</p>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => acceptRequest(req.id)} className="bg-green-500 text-white text-xs px-2 py-1 rounded">Accept</button>
                        <button onClick={() => rejectRequest(req.id)} className="bg-red-500 text-white text-xs px-2 py-1 rounded">Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </li>

          {/* Contacts Box */}
          <li className="relative">
            <button onClick={() => setShowContacts(!showContacts)} className="lg:text-[28px] text-[22px]">
              <RiFolderUserLine color="#fff" />
            </button>
            {showContacts && (
              <div className="absolute top-10 left-10 lg:left-[60px] bg-white text-black shadow-lg p-4 w-60 rounded-lg z-50">
                <h4 className="font-semibold">Contacts (Coming Soon)</h4>
              </div>
            )}
          </li>

          {/* Notifications */}
          <li className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="lg:text-[28px] text-[22px] relative">
              <RiNotification4Line color="#fff" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute top-10 left-10 lg:left-[60px] bg-white text-black shadow-lg p-4 w-72 rounded-lg z-50">
                <h4 className="font-bold mb-2">Notifications</h4>
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500">No notifications</p>
                ) : (
                  notifications.map((note) => (
                    <p key={note.id} className="text-sm border-b py-1">
                      {note.message}
                    </p>
                  ))
                )}
              </div>
            )}
          </li>

          {/* Files */}
          <li className="relative">
            <button onClick={() => setShowFiles(!showFiles)} className="lg:text-[28px] text-[22px]">
              <RiFile4Line color="#fff" />
            </button>
            {showFiles && (
              <div className="absolute top-10 left-10 lg:left-[60px] bg-white text-black shadow-lg p-4 w-60 rounded-lg z-50">
                <h4 className="font-semibold">Shared Files (Coming Soon)</h4>
              </div>
            )}
          </li>

          {/* Bard Placeholder */}
          <li>
            <button className="lg:text-[28px] text-[22px]">
              <RiBardLine color="#fff" />
            </button>
          </li>

          {/* Logout */}
          <li>
            <button onClick={handleLogout} className="lg:text-[28px] text-[22px]">
              <RiShutDownLine color="#fff" />
            </button>
          </li>
        </ul>

        <button className="lg:text-[28px] text-[22px]">
          <RiArrowDownSFill color="#fff" />
        </button>
      </main>
    </section>
  );
};

export default NavLinks;
