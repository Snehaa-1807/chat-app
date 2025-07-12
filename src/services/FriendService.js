import {
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  doc,
  query,
  where,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

// ✅ Check if a friend request already exists or accepted
export const checkFriendStatus = async (user1, user2) => {
  try {
    const q1 = query(
      collection(db, "friendRequests"),
      where("from", "==", user1),
      where("to", "==", user2)
    );
    const q2 = query(
      collection(db, "friendRequests"),
      where("from", "==", user2),
      where("to", "==", user1)
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

    for (const snap of [snap1, snap2]) {
      for (const docSnap of snap.docs) {
        const status = docSnap.data().status;
        if (status === "accepted") return "accepted";
        if (status === "requested" || status === "pending") return "requested";
        if (status === "rejected") return "rejected";
      }
    }

    return "none";
  } catch (error) {
    console.error("Error checking friend status:", error);
    return "none";
  }
};

// ✅ Create chat between two users (improved error handling)
export const createChat = async (user1Data, user2Data) => {
  try {
    // Validate user data
    if (!user1Data?.uid || !user2Data?.uid) {
      throw new Error("Invalid user data provided");
    }

    // Check if chat already exists
    const chatsRef = collection(db, "chats");
    const existingChatQuery = query(
      chatsRef,
      where("userIds", "array-contains", user1Data.uid)
    );
    
    const existingChats = await getDocs(existingChatQuery);
    
    // Check if there's already a chat between these two users
    const existingChat = existingChats.docs.find(docSnap => {
      const chatData = docSnap.data();
      return chatData.userIds.includes(user2Data.uid);
    });

    if (existingChat) {
      console.log("Chat already exists:", existingChat.id);
      return existingChat.id;
    }

    // Create new chat if it doesn't exist
    const newChatRef = await addDoc(chatsRef, {
      userIds: [user1Data.uid, user2Data.uid],
      users: [
        {
          uid: user1Data.uid,
          email: user1Data.email || "",
          fullName: user1Data.fullName || "Unknown User",
          username: user1Data.username || "",
          image: user1Data.image || null
        },
        {
          uid: user2Data.uid,
          email: user2Data.email || "",
          fullName: user2Data.fullName || "Unknown User",
          username: user2Data.username || "",
          image: user2Data.image || null
        }
      ],
      createdAt: serverTimestamp(),
      lastMessage: "You are now connected! Start chatting.",
      lastMessageTimestamp: serverTimestamp(),
      unreadCount: {
        [user1Data.uid]: 0,
        [user2Data.uid]: 0
      }
    });

    console.log("New chat created:", newChatRef.id);
    return newChatRef.id;
  } catch (error) {
    console.error("Error creating chat:", error);
    throw new Error("Failed to create chat: " + error.message);
  }
};

// ✅ Send friend request with improved validation
export const sendFriendRequest = async (fromUid, toUid) => {
  try {
    // Validation
    if (!fromUid || !toUid) {
      throw new Error("Invalid user IDs provided");
    }
    
    if (fromUid === toUid) {
      throw new Error("Cannot send request to yourself");
    }

    // Check if users exist
    const fromUserDoc = await getDoc(doc(db, "users", fromUid));
    const toUserDoc = await getDoc(doc(db, "users", toUid));
    
    if (!fromUserDoc.exists()) {
      throw new Error("Your account not found");
    }
    
    if (!toUserDoc.exists()) {
      throw new Error("Target user not found");
    }

    const fromData = fromUserDoc.data();

    // Check if request already exists in either direction
    const status = await checkFriendStatus(fromUid, toUid);
    if (status === "accepted") {
      throw new Error("You are already friends with this user");
    }
    if (status === "requested" || status === "pending") {
      throw new Error("Friend request already sent or pending");
    }

    // Create the friend request
    const requestRef = await addDoc(collection(db, "friendRequests"), {
      from: fromUid,
      fromName: fromData.fullName || "Unknown User",
      fromUsername: fromData.username || "",
      fromImage: fromData.image || null,
      to: toUid,
      status: "pending",
      timestamp: serverTimestamp(),
    });

    // Create notification
    await addDoc(collection(db, "notifications"), {
      to: toUid,
      from: fromUid,
      message: `${fromData.fullName || "Someone"} sent you a friend request.`,
      timestamp: serverTimestamp(),
      read: false,
      type: "friend_request",
      requestId: requestRef.id
    });

    console.log("Friend request sent successfully");
    return requestRef.id;
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
};

// ✅ Cancel/unsend friend request
export const unsendFriendRequest = async (fromUid, toUid) => {
  try {
    const batch = writeBatch(db);

    // Delete friend request
    const q = query(
      collection(db, "friendRequests"),
      where("from", "==", fromUid),
      where("to", "==", toUid),
      where("status", "==", "pending")
    );
    
    const snap = await getDocs(q);
    
    snap.docs.forEach(docSnap => {
      batch.delete(doc(db, "friendRequests", docSnap.id));
    });

    // Delete related notifications
    const notifQuery = query(
      collection(db, "notifications"),
      where("from", "==", fromUid),
      where("to", "==", toUid),
      where("type", "==", "friend_request")
    );

    const notifSnap = await getDocs(notifQuery);
    notifSnap.docs.forEach(docSnap => {
      batch.delete(doc(db, "notifications", docSnap.id));
    });

    await batch.commit();
    console.log("Friend request cancelled successfully");
  } catch (error) {
    console.error("Error cancelling friend request:", error);
    throw error;
  }
};

// 🔥 IMPROVED: Handle friend request with better error handling and auto-cleanup
export const handleFriendRequest = async (requestId, action) => {
  try {
    if (!requestId || !action) {
      throw new Error("Invalid request ID or action");
    }

    const batch = writeBatch(db);
    const ref = doc(db, "friendRequests", requestId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      throw new Error("Friend request not found");
    }

    const { from, to, fromName } = snap.data();
    
    // Update the request status
    batch.update(ref, { 
      status: action,
      updatedAt: serverTimestamp()
    });

    // Get recipient's name for notification
    const toSnap = await getDoc(doc(db, "users", to));
    const toName = toSnap.exists() ? toSnap.data().fullName : "User";

    // Create notification for the sender
    const notificationMessage = action === "accepted"
      ? `${toName} accepted your friend request.`
      : `${toName} declined your friend request.`;

    const notificationRef = doc(collection(db, "notifications"));
    batch.set(notificationRef, {
      to: from,
      from: to,
      message: notificationMessage,
      timestamp: serverTimestamp(),
      read: false,
      type: action === "accepted" ? "friend_accepted" : "friend_rejected"
    });

    // Mark the original notification as read to prevent duplicates
    const originalNotifQuery = query(
      collection(db, "notifications"),
      where("to", "==", to),
      where("from", "==", from),
      where("type", "==", "friend_request"),
      where("requestId", "==", requestId)
    );

    const originalNotifSnap = await getDocs(originalNotifQuery);
    originalNotifSnap.docs.forEach(docSnap => {
      batch.update(doc(db, "notifications", docSnap.id), { read: true });
    });

    await batch.commit();

    console.log(`Friend request ${action} successfully`);
    
    // Return the updated request data for immediate UI update
    return {
      id: requestId,
      from,
      to,
      fromName,
      status: action,
      updatedAt: new Date()
    };
  } catch (error) {
    console.error("Error handling friend request:", error);
    throw error;
  }
};

// 🔥 IMPROVED: Listen for incoming friend requests with better error handling
export const listenToFriendRequests = (uid, callback) => {
  if (!uid) {
    console.error("Invalid UID provided to listenToFriendRequests");
    return () => {};
  }

  const q = query(
    collection(db, "friendRequests"),
    where("to", "==", uid),
    where("status", "==", "pending"),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(q, 
    (snapshot) => {
      const requests = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      callback(requests);
    },
    (error) => {
      console.error("Error listening to friend requests:", error);
      callback([]);
    }
  );
};

// 🔥 IMPROVED: Listen for all friend requests with better error handling
export const listenToAllFriendRequests = (uid, callback) => {
  if (!uid) {
    console.error("Invalid UID provided to listenToAllFriendRequests");
    return () => {};
  }

  const q1 = query(
    collection(db, "friendRequests"),
    where("to", "==", uid),
    orderBy("timestamp", "desc")
  );
  const q2 = query(
    collection(db, "friendRequests"),
    where("from", "==", uid),
    orderBy("timestamp", "desc")
  );

  let allRequests = [];
  let receivedRequests = [];
  let sentRequests = [];

  const updateCallback = () => {
    // Remove duplicates and merge
    const seenIds = new Set();
    allRequests = [...receivedRequests, ...sentRequests].filter(request => {
      if (seenIds.has(request.id)) {
        return false;
      }
      seenIds.add(request.id);
      return true;
    });
    callback(allRequests);
  };

  const unsubscribe1 = onSnapshot(q1, 
    (snapshot) => {
      receivedRequests = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        direction: 'received'
      }));
      updateCallback();
    },
    (error) => {
      console.error("Error listening to received requests:", error);
      receivedRequests = [];
      updateCallback();
    }
  );

  const unsubscribe2 = onSnapshot(q2, 
    (snapshot) => {
      sentRequests = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        direction: 'sent'
      }));
      updateCallback();
    },
    (error) => {
      console.error("Error listening to sent requests:", error);
      sentRequests = [];
      updateCallback();
    }
  );

  // Return combined unsubscribe function
  return () => {
    unsubscribe1();
    unsubscribe2();
  };
};

// 🔥 IMPROVED: Get user's friends list with better error handling
export const getFriends = async (uid) => {
  try {
    if (!uid) {
      throw new Error("Invalid UID provided");
    }

    const q1 = query(
      collection(db, "friendRequests"),
      where("from", "==", uid),
      where("status", "==", "accepted")
    );
    const q2 = query(
      collection(db, "friendRequests"),
      where("to", "==", uid),
      where("status", "==", "accepted")
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const friendIds = new Set();
    
    snap1.docs.forEach(docSnap => {
      const data = docSnap.data();
      friendIds.add(data.to);
    });
    
    snap2.docs.forEach(docSnap => {
      const data = docSnap.data();
      friendIds.add(data.from);
    });

    // Get friend details
    const friends = [];
    const friendPromises = Array.from(friendIds).map(async (friendId) => {
      try {
        const friendDoc = await getDoc(doc(db, "users", friendId));
        if (friendDoc.exists()) {
          return { uid: friendId, ...friendDoc.data() };
        }
        return null;
      } catch (error) {
        console.error(`Error getting friend ${friendId}:`, error);
        return null;
      }
    });

    const friendResults = await Promise.all(friendPromises);
    friendResults.forEach(friend => {
      if (friend) friends.push(friend);
    });

    return friends;
  } catch (error) {
    console.error("Error getting friends:", error);
    return [];
  }
};

// 🔥 IMPROVED: Listen for friends list changes in real-time
export const listenToFriends = (uid, callback) => {
  if (!uid) {
    console.error("Invalid UID provided to listenToFriends");
    return () => {};
  }

  const q1 = query(
    collection(db, "friendRequests"),
    where("from", "==", uid),
    where("status", "==", "accepted")
  );
  const q2 = query(
    collection(db, "friendRequests"),
    where("to", "==", uid),
    where("status", "==", "accepted")
  );

  let friendsFromSent = [];
  let friendsFromReceived = [];

  const updateFriendsList = async () => {
    try {
      const allFriendIds = new Set([...friendsFromSent, ...friendsFromReceived]);
      
      if (allFriendIds.size === 0) {
        callback([]);
        return;
      }

      const friendPromises = Array.from(allFriendIds).map(async (friendId) => {
        try {
          const friendDoc = await getDoc(doc(db, "users", friendId));
          if (friendDoc.exists()) {
            return { uid: friendId, ...friendDoc.data() };
          }
          return null;
        } catch (error) {
          console.error(`Error getting friend ${friendId}:`, error);
          return null;
        }
      });

      const friendResults = await Promise.all(friendPromises);
      const friends = friendResults.filter(friend => friend !== null);
      
      callback(friends);
    } catch (error) {
      console.error("Error updating friends list:", error);
      callback([]);
    }
  };

  const unsubscribe1 = onSnapshot(q1, 
    (snapshot) => {
      friendsFromSent = snapshot.docs.map(docSnap => docSnap.data().to);
      updateFriendsList();
    },
    (error) => {
      console.error("Error listening to sent friend requests:", error);
      friendsFromSent = [];
      updateFriendsList();
    }
  );

  const unsubscribe2 = onSnapshot(q2, 
    (snapshot) => {
      friendsFromReceived = snapshot.docs.map(docSnap => docSnap.data().from);
      updateFriendsList();
    },
    (error) => {
      console.error("Error listening to received friend requests:", error);
      friendsFromReceived = [];
      updateFriendsList();
    }
  );

  return () => {
    unsubscribe1();
    unsubscribe2();
  };
};

// 🔥 IMPROVED: Listen for chats in real-time
export const listenToChats = (uid, callback) => {
  if (!uid) {
    console.error("Invalid UID provided to listenToChats");
    return () => {};
  }

  const q = query(
    collection(db, "chats"),
    where("userIds", "array-contains", uid),
    orderBy("lastMessageTimestamp", "desc")
  );
  
  return onSnapshot(q, 
    (snapshot) => {
      const chats = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      callback(chats);
    },
    (error) => {
      console.error("Error listening to chats:", error);
      callback([]);
    }
  );
};

// ✅ IMPROVED: Listen for unread message count per chat
export const listenUnreadCounts = (uid, setCounts) => {
  if (!uid) {
    console.error("Invalid UID provided to listenUnreadCounts");
    return () => {};
  }

  const q = query(
    collection(db, "chats"),
    where("userIds", "array-contains", uid)
  );
  
  return onSnapshot(q, 
    async (snapshot) => {
      try {
        const unreadMap = {};
        
        const countPromises = snapshot.docs.map(async (docSnap) => {
          const chatId = docSnap.id;
          const messagesRef = collection(db, "chats", chatId, "messages");
          
          try {
            const msgSnap = await getDocs(messagesRef);
            let count = 0;
            
            msgSnap.forEach((msgDoc) => {
              const data = msgDoc.data();
              const readBy = data.readBy || [];
              
              // Count messages from other users that current user hasn't read
              if (data.senderId !== uid && !readBy.includes(uid)) {
                count++;
              }
            });

            return { chatId, count };
          } catch (error) {
            console.error(`Error counting messages for chat ${chatId}:`, error);
            return { chatId, count: 0 };
          }
        });

        const results = await Promise.all(countPromises);
        results.forEach(({ chatId, count }) => {
          unreadMap[chatId] = count;
        });

        setCounts(unreadMap);
      } catch (error) {
        console.error("Error updating unread counts:", error);
        setCounts({});
      }
    },
    (error) => {
      console.error("Error listening to unread counts:", error);
      setCounts({});
    }
  );
};

// ✅ IMPROVED: Remove friend with better error handling
export const removeFriend = async (currentUserId, friendId) => {
  try {
    if (!currentUserId || !friendId) {
      throw new Error("Invalid user IDs provided");
    }

    if (currentUserId === friendId) {
      throw new Error("Cannot remove yourself as a friend");
    }

    const batch = writeBatch(db);

    const q1 = query(
      collection(db, "friendRequests"),
      where("from", "==", currentUserId),
      where("to", "==", friendId),
      where("status", "==", "accepted")
    );
    const q2 = query(
      collection(db, "friendRequests"),
      where("from", "==", friendId),
      where("to", "==", currentUserId),
      where("status", "==", "accepted")
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    let deletionCount = 0;
    
    snap1.docs.forEach(docSnap => {
      batch.delete(doc(db, "friendRequests", docSnap.id));
      deletionCount++;
    });
    
    snap2.docs.forEach(docSnap => {
      batch.delete(doc(db, "friendRequests", docSnap.id));
      deletionCount++;
    });

    if (deletionCount === 0) {
      throw new Error("No friendship found to remove");
    }

    await batch.commit();
    
    console.log("Friend removed successfully");
    return true;
  } catch (error) {
    console.error("Error removing friend:", error);
    throw error;
  }
};

// 🔥 NEW: Block user functionality
export const blockUser = async (currentUserId, userToBlockId) => {
  try {
    if (!currentUserId || !userToBlockId) {
      throw new Error("Invalid user IDs provided");
    }

    if (currentUserId === userToBlockId) {
      throw new Error("Cannot block yourself");
    }

    const batch = writeBatch(db);

    // Remove any existing friendship first
    const q1 = query(
      collection(db, "friendRequests"),
      where("from", "==", currentUserId),
      where("to", "==", userToBlockId)
    );
    const q2 = query(
      collection(db, "friendRequests"),
      where("from", "==", userToBlockId),
      where("to", "==", currentUserId)
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    snap1.docs.forEach(docSnap => {
      batch.delete(doc(db, "friendRequests", docSnap.id));
    });
    
    snap2.docs.forEach(docSnap => {
      batch.delete(doc(db, "friendRequests", docSnap.id));
    });

    // Add to blocked users
    const blockedRef = doc(collection(db, "blockedUsers"));
    batch.set(blockedRef, {
      blockedBy: currentUserId,
      blockedUser: userToBlockId,
      timestamp: serverTimestamp()
    });

    await batch.commit();

    console.log("User blocked successfully");
    return true;
  } catch (error) {
    console.error("Error blocking user:", error);
    throw error;
  }
};

// 🔥 NEW: Get blocked users
export const getBlockedUsers = async (uid) => {
  try {
    if (!uid) {
      throw new Error("Invalid UID provided");
    }

    const q = query(
      collection(db, "blockedUsers"),
      where("blockedBy", "==", uid)
    );

    const snapshot = await getDocs(q);
    const blockedUserIds = snapshot.docs.map(doc => doc.data().blockedUser);

    return blockedUserIds;
  } catch (error) {
    console.error("Error getting blocked users:", error);
    return [];
  }
};

// 🔥 NEW: Check if user is blocked
export const isUserBlocked = async (currentUserId, targetUserId) => {
  try {
    if (!currentUserId || !targetUserId) {
      return false;
    }

    const q = query(
      collection(db, "blockedUsers"),
      where("blockedBy", "==", currentUserId),
      where("blockedUser", "==", targetUserId)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking if user is blocked:", error);
    return false;
  }
};

// 🔥 NEW: Mark notifications as read
export const markNotificationsAsRead = async (uid, notificationIds = []) => {
  try {
    if (!uid) {
      throw new Error("Invalid UID provided");
    }

    const batch = writeBatch(db);

    if (notificationIds.length > 0) {
      // Mark specific notifications as read
      notificationIds.forEach(notifId => {
        const notifRef = doc(db, "notifications", notifId);
        batch.update(notifRef, { read: true });
      });
    } else {
      // Mark all notifications as read for the user
      const q = query(
        collection(db, "notifications"),
        where("to", "==", uid),
        where("read", "==", false)
      );

      const snapshot = await getDocs(q);
      snapshot.docs.forEach(docSnap => {
        batch.update(doc(db, "notifications", docSnap.id), { read: true });
      });
    }

    await batch.commit();
    console.log("Notifications marked as read");
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    throw error;
  }
};