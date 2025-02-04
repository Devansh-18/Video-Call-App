import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

const HomeCompo = () => {
  const {roomID} = useParams();
  const {socket} = useSocket();
  const {username,setUsername,roomId,setRoomId} = useApp();
  const navigate = useNavigate();

  useEffect(()=>{
    if(roomID){
      setRoomId(roomID);
    }
  },[]);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (username && roomId) {
      console.log("username",username,roomId);
      navigate(`/room`);
      console.log(username,roomId);
      console.log(socket.id);
    } 
    else {
      toast.error("Please enter both name and room ID");
    }
  };

  const handleCopyLink = (e) => {
    e.preventDefault();
    if (roomId) {
      const roomLink = `${window.location.origin}/${roomId}`;
      navigator.clipboard.writeText(roomLink);
      toast.success("Link Copied");
    }
    else {
      toast.error("Please enter a Room ID first");
    }
  };

  return (
    <div className="min-h-screen min-w-screen bgcontainer flex items-center justify-center selection:bg-gray-500">
      <form className="max-w-[90%] w-fit h-fit flex flex-col gap-4 rounded-lg justify-around items-center bg-gradient-to-b from-[#424242] to-[#212121]">
        <h1 className="text-[#b3e5f5] my-4 text-3xl font-bold">
          Join Room
        </h1>

          <input
            type="text"
            placeholder="Enter your Name"
            className="w-[80%] bg-inherit text-[#d6fbfd] px-3 py-2 border-b-[1px] border-[#b3f0f5] transition-all duration-500 hover:bg-[#424242] hover:border-none rounded-lg outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter Room ID"
            className="w-[80%] bg-inherit text-[#f5deb3] px-3 py-2 border-b-[1px] border-[#f5deb3] transition-all duration-500 hover:bg-[#424242] hover:border-none rounded-lg outline-none"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <button
            onClick={handleJoinRoom}
            className="btn border-[1px] border-[#404c5d] w-[80%] text-xl font-semibold text-gray-700 px-3 py-2"
          >
            Join Room
          </button>

          <div className="flex mt-2 items-center justify-between">
            <button
              onClick={handleCopyLink}
              className="buttonStyle text-gray-200 font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              Copy Room Link
            </button>
          </div>
        <p className="text-center text-sm text-gray-500 m-4">
          Share the room link with others to join the same room.
        </p>
      </form>
    </div>
  );
};

export default HomeCompo;
