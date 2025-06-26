import { useState } from "react";
import { FaSignInAlt } from "react-icons/fa";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";

const Login = ({ isLogin, setIsLogin }) => {
  const [userData, setUserdata] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleChangeUserData = (e) => {
    const { name, value } = e.target;
    setUserdata((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAuth = async () => {
    const { email, password } = userData;

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful!");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="flex flex-col justify-center items-center h-[100vh] background-image">
      <div className="bg-white shadow-lg p-5 rounded-xl h-[25rem] w-[20rem] flex flex-col justify-center items-center">
        <div className="mb-10">
          <h1 className="text-center text-[28px] font-bold">Sign In</h1>
          <p className="text-center text-sm text-gray-400">
            Welcome back, login to continue
          </p>
        </div>

        <div className="w-full">
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
            {isLoading ? "Processing..." : <>Login <FaSignInAlt /></>}
          </button>
        </div>

        <div className="mt-5 text-center text-gray-400 text-sm">
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin
              ? "Don't have an account yet? Sign Up"
              : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default Login;
