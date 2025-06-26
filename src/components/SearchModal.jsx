import React, { useState } from "react";
import { RiSearchLine } from "react-icons/ri";
import { FaSearch } from "react-icons/fa";
import defaultAvatar from "/assets/default.jpg";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

const SearchModal = ({ startChat }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert("Please enter a search term.");
      return;
    }

    try {
      const normalizedSearchTerm = searchTerm.toLowerCase();
      const q = query(
        collection(db, "users"),
        where("username", ">=", normalizedSearchTerm),
        where("username", "<=", normalizedSearchTerm + "\uf8ff")
      );
      const querySnapshot = await getDocs(q);
      const foundUsers = [];
      querySnapshot.forEach((doc) => {
        foundUsers.push(doc.data());
      });
      setUsers(foundUsers);
      if (foundUsers.length === 0) {
        alert("No users found.");
      }
    } catch (error) {
      console.error("Error searching for users:", error);
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
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
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
                  <span className="sr-only">Close modal</span>
                </button>
              </div>

              <div className="p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border border-blue-300 text-blue-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
                    placeholder="Search..."
                    required
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
                      className="flex items-start gap-3 bg-blue-400/30 p-2 rounded-lg cursor-pointer border border-white/10 hover:bg-blue-400/50 transition-all"
                      onClick={() => {
                        startChat(user);
                        console.log(user);
                        closeModal();
                      }}
                    >
                      <img
                        src={user?.image || defaultAvatar}
                        alt="avatar"
                        className="h-[40px] w-[40px] rounded-full object-cover"
                      />
                      <span>
                        <h2 className="font-semibold text-white text-[18px]">
                          {user?.fullName}
                        </h2>
                        <p className="text-[13px] text-white">@{user?.username}</p>
                      </span>
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
