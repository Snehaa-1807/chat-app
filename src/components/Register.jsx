import React, { useState } from "react";
import { FaUserPlus } from "react-icons/fa";
import {
  createUserWithEmailAndPassword
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const Register = ({ isLogin, setIsLogin }) => {
  const [userData, setUserdata] = useState({
    fullName: "",
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChangeUserData = (e) => {
    const { name, value } = e.target;
    setUserdata((prevState) => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleAuth = async () => {
    const { fullName, email, password } = userData;

    if (!fullName || !email || !password) {
      alert("All fields are required.");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        username: user.email.split("@")[0],
        fullName,
        image: "",
        status: "online",
        lastSeen: serverTimestamp()
      });

      alert("Registration successful!");

    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="flex flex-col justify-center items-center h-[100vh] background-image">
      <div className="bg-white shadow-lg p-5 rounded-xl h-[27rem] w-[20rem] flex flex-col justify-center items-center">
        <div className="mb-10">
          <h1 className="text-center text-[28px] font-bold">Sign Up</h1>
          <p className="text-center text-sm text-gray-400">
            Welcome, create an account to continue
          </p>
        </div>

        <div className="w-full">
          <input
            type="text"
            className="border border-blue-400 w-full p-2 rounded-md bg-[#60a5fa1a] text-[#1e3a8a] mb-3 font-medium outline-none placeholder:text-[#1e3a8a99]"
            placeholder="Full Name"
            name="fullName"
            value={userData.fullName}
            onChange={handleChangeUserData}
          />
          <input
            type="email"
            className="border border-blue-400 w-full p-2 rounded-md bg-[#60a5fa1a] text-[#1e3a8a] mb-3 font-medium outline-none placeholder:text-[#1e3a8a99]"
            placeholder="Email"
            name="email"
            value={userData.email}
            onChange={handleChangeUserData}
          />
          <input
            type="password"
            className="border border-blue-400 w-full p-2 rounded-md bg-[#60a5fa1a] text-[#1e3a8a] mb-3 font-medium outline-none placeholder:text-[#1e3a8a99]"
            placeholder="Password"
            name="password"
            value={userData.password}
            onChange={handleChangeUserData}
          />
        </div>

        <div className="w-full">
          <button
            className="bg-blue-400 hover:bg-blue-500 transition-colors duration-200 text-white font-bold w-full p-2 rounded-md flex items-center gap-2 justify-center"
            onClick={handleAuth}
          >
            {isLoading ? (
              <>Processing...</>
            ) : (
              <>
                Register <FaUserPlus />
              </>
            )}
          </button>
        </div>

        <div className="mt-5 text-center text-gray-400 text-sm">
          <button onClick={() => setIsLogin(!isLogin)}>
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </section>
  );
};

export default Register;
