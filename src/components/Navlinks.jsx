import React from "react";
import { RiFolderUserLine, RiNotification4Line, RiFile4Line, RiBardLine, RiArrowDownSFill, RiShutDownLine, RiUser2Line } from "react-icons/ri";
import logo from "/assets/logo.png";
import { auth } from "../firebase/firebase";
import { signOut } from "firebase/auth";

const NavLinks = () => {
    const handleLogout = async () => {
        try {
        await signOut(auth);
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <section className="sticky lg:static flex items-center lg:items-start lg:justify-start bg-[#60a5fa] h-[7vh] lg:h-[100vh] w-[100%] lg:w-[150px] py-8 lg:py-0">
            <main className="flex lg:flex-col items-center lg:gap-10 justify-between lg:px-0 w-[100%]">
                <div className="flex items-start justify-center lg:border-b border-b-1 border-[#ffffff42] lg:w-[100%] p-4">
                    <span className="flex items-center justify-center bg-[#fff] w-[57px] h-[48px] rounded-lg p-2">
                        <img src={logo} className="w-[56px] h-[52px] object-contain" />
                    </span>
                </div>

                <ul className="flex lg:flex-col flex-row items-center justify-start h-[30px] gap-7 md:gap-10 px-2 md:px-0">
                    <li>
                        <button className=" lg:text-[28px] text-[22px]">
                            <RiUser2Line color="#fff" />
                        </button>
                    </li>

                    <li>
                        <button className=" lg:text-[28px] text-[22px]">
                            <RiFolderUserLine color="#fff" />
                        </button>
                    </li>

                    <li>
                        <button className=" lg:text-[28px] text-[22px]">
                            <RiNotification4Line color="#fff" />
                        </button>
                    </li>

                    <li>
                        <button className=" lg:text-[28px] text-[22px]">
                            <RiFile4Line color="#fff" />
                        </button>
                    </li>

                    <li>
                        <button className=" lg:text-[28px] text-[22px]">
                            <RiBardLine color="#fff" />
                        </button>
                    </li>

                    <li>
                        <button onClick={handleLogout} className=" lg:text-[28px] text-[22px]">
                            <RiShutDownLine color="#fff" />
                        </button>
                    </li>
                </ul>
    <button onClick={handleLogout} className=" lg:text-[28px] text-[22px]">
                    <RiArrowDownSFill color="#fff" />
                </button>
            </main>
        </section>
    );
};

export default NavLinks;