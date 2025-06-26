import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  addDoc,
} from "firebase/firestore";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBx3dhRrau5P_hOdC3c5_LWgfNI7TrMBTs",
  authDomain: "chat-app-9bc2a.firebaseapp.com",
  projectId: "chat-app-9bc2a",
  storageBucket: "chat-app-9bc2a.appspot.com",
  messagingSenderId: "587853524266",
  appId: "1:587853524266:web:1ae376c61a8938ac8ec253",
  measurementId: "G-ZFVN7BRJNV",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ LISTEN for real-time chat list
export const listenForChats = (setChats) => {
  const chatsRef = collection(db, "chats");
  const unsubscribe = onSnapshot(chatsRef, (snapshot) => {
    const chatList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const filteredChats = chatList.filter((chat) =>
      chat.users?.some((user) => user?.email === auth.currentUser?.email)
    );

    setChats(filteredChats);
  });
  return unsubscribe;
};

// ✅ SEND MESSAGE with minimal user data
export const sendMessage = async (messageText, chatId, user1, user2) => {
  const chatRef = doc(db, "chats", chatId);
  const user1Snap = await getDoc(doc(db, "users", user1));
  const user2Snap = await getDoc(doc(db, "users", user2));

  if (!user1Snap.exists() || !user2Snap.exists()) {
    console.error("One or both user documents not found.");
    return;
  }

  const u1 = user1Snap.data();
  const u2 = user2Snap.data();

  const user1Data = {
    uid: user1Snap.id,
    email: u1.email,
    fullName: u1.fullName,
    username: u1.username,
    image: u1.image || "",
  };

  const user2Data = {
    uid: user2Snap.id,
    email: u2.email,
    fullName: u2.fullName,
    username: u2.username,
    image: u2.image || "",
  };

  const chatDoc = await getDoc(chatRef);

  if (!chatDoc.exists()) {
    await setDoc(chatRef, {
      users: [user1Data, user2Data],
      lastMessage: messageText,
      lastMessageTimestamp: serverTimestamp(),
    });
  } else {
    await updateDoc(chatRef, {
      lastMessage: messageText,
      lastMessageTimestamp: serverTimestamp(),
    });
  }

  const messageRef = collection(db, "chats", chatId, "messages");
  await addDoc(messageRef, {
    text: messageText,
    sender: auth.currentUser.email,
    timestamp: serverTimestamp(),
  });
};
