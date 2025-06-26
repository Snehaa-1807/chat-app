import React, { useEffect, useState } from 'react';
import NavLinks from './components/Navlinks';
import ChatBox from './components/Chatbox';
import ChatList from './components/Chatlist';
import Login from './components/Login'
import Register from './components/Register'
import {auth} from "./firebase/firebase"
const App = () => {
  			const [isLogin, setIsLogin] = useState(true);
			const [user, setUser] = useState(null);
			const [selectedUser, setSelectedUser] = useState(null);
      useEffect(() => {
			    // Get the currently authenticated user (if any) from Firebase
			    const currentUser = auth.currentUser;
			
			    // If a user is already logged in when the component loads, update the `user` state
			    if (currentUser) {
			        setUser(currentUser);
			    }
			
			    // Listen for authentication state changes (login, logout, or user switching)
			    // Firebase provides a real-time listener that triggers whenever the user's auth state changes
			    const unsubscribe = auth.onAuthStateChanged((user) => {
			        // Update the `user` state with the new authentication status
			        setUser(user);
			    });
			
			    // Cleanup function to unsubscribe from the auth listener when the component unmounts
			    return () => unsubscribe();
			}, []);

  return (
    <div>
    {/* Check if a user is logged in */}
    {user ? (
        <>
            {/* If the user is logged in, show the main chat layout */}
            <div className="flex lg:flex-row flex-col items-start w-[100%]">
                <NavLinks /> {/* Component for navigation links */}
                <ChatList setSelectedUser={setSelectedUser} /> 
                <ChatBox selectedUser={selectedUser} /> 
            </div>
        </>
    ) : (
        <>
            {/* If the user is NOT logged in, show either the login or registration form */}
            {isLogin ? (
                <Login isLogin={isLogin} setIsLogin={setIsLogin} /> 
            ) : (
                <Register isLogin={isLogin} setIsLogin={setIsLogin} /> 
            )}
        </>
    )}
</div>
  )
}

export default App