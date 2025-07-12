import React, { useEffect, useState } from 'react';
import NavLinks from './components/Navlinks';
import ChatBox from './components/Chatbox';
import ChatList from './components/Chatlist';
import Login from './components/Login';
import Register from './components/Register';
import { auth } from './firebase/firebase';

const App = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // 🔁 Unread messages tracking (chatId → count)
  const [unreadCounts, setUnreadCounts] = useState({});

  // ✅ Clear unread bubble from ChatList
  const clearUnreadBadge = (chatId) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [chatId]: 0,
    }));
  };

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      {user ? (
        <div className="flex lg:flex-row flex-col items-start w-[100%]">
          <NavLinks />
          <ChatList
            setSelectedUser={setSelectedUser}
            unreadCounts={unreadCounts}
            setUnreadCounts={setUnreadCounts}
          />
          <ChatBox
            selectedUser={selectedUser}
            clearUnreadBadge={clearUnreadBadge}
          />
        </div>
      ) : (
        <>
          {isLogin ? (
            <Login isLogin={isLogin} setIsLogin={setIsLogin} />
          ) : (
            <Register isLogin={isLogin} setIsLogin={setIsLogin} />
          )}
        </>
      )}
    </div>
  );
};

export default App;
