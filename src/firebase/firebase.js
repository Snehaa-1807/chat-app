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
  query,
  where,
  getDocs,
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

///////////////////////////////////////////////////////////
// ✅ Helper: Check if two users are friends
export const areFriends = async (uid1, uid2) => {
  const q1 = query(
    collection(db, "friendRequests"),
    where("from", "==", uid1),
    where("to", "==", uid2),
    where("status", "==", "accepted")
  );
  const q2 = query(
    collection(db, "friendRequests"),
    where("from", "==", uid2),
    where("to", "==", uid1),
    where("status", "==", "accepted")
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  return !snap1.empty || !snap2.empty;
};

///////////////////////////////////////////////////////////
// ✅ Real-time listener for chats (filtering by friends)
export const listenForChats = (setChats) => {
  const chatsRef = collection(db, "chats");

  const unsubscribe = onSnapshot(chatsRef, async (snapshot) => {
    const currentUid = auth.currentUser?.uid;
    const currentEmail = auth.currentUser?.email;
    const chatList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const filteredChats = [];

    for (const chat of chatList) {
      const otherUser = chat.users.find((user) => user.email !== currentEmail);
      if (!otherUser) continue;

      const isFriend = await areFriends(currentUid, otherUser.uid);
      if (isFriend) {
        filteredChats.push(chat);
      }
    }

    setChats(filteredChats);
  });

  return unsubscribe;
};

///////////////////////////////////////////////////////////
// ✅ Send a message (text, image, or document)
export const sendMessage = async (messageText, chatId, uid1, uid2, fileData = null) => {
  const isFriend = await areFriends(uid1, uid2);
  if (!isFriend) {
    alert("You can only chat with friends after they accept your request.");
    return;
  }

  const chatRef = doc(db, "chats", chatId);
  const user1Snap = await getDoc(doc(db, "users", uid1));
  const user2Snap = await getDoc(doc(db, "users", uid2));

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

  // ✅ Format the lastMessage string for preview
  const lastMessage = fileData
    ? fileData.fileType === "image"
      ? "📷 Photo"
      : "📄 Document"
    : messageText;

  // ✅ Create or update chat document
  const chatDoc = await getDoc(chatRef);
  if (!chatDoc.exists()) {
    await setDoc(chatRef, {
      users: [user1Data, user2Data],
      userIds: [uid1, uid2],
      lastMessage,
      lastMessageTimestamp: serverTimestamp(),
    });
  } else {
    await updateDoc(chatRef, {
      lastMessage,
      lastMessageTimestamp: serverTimestamp(),
    });
  }

  // ✅ Prepare message object
  const message = {
    sender: auth.currentUser.email,
    senderId: auth.currentUser.uid,
    timestamp: serverTimestamp(),
    readBy: [auth.currentUser.uid],
  };

  if (fileData) {
    message.fileUrl = fileData.fileUrl;
    message.fileType = fileData.fileType;
  } else {
    message.text = messageText;
  }

  // ✅ Add message to subcollection
  const messageRef = collection(db, "chats", chatId, "messages");
  await addDoc(messageRef, message);
};
