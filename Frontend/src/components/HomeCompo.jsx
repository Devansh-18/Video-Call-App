import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

const HomeCompo = () => {
  const {socket} = useSocket();
  const {username,setUsername,roomId,setRoomId} = useApp();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleJoinRoom = () => {
    if (username && roomId) {
      // Redirect or render the video call component
      navigate(`/room`);
      console.log(socket.id);
    } 
    else {
      toast.error("Please enter both name and room ID");
    }
  };

  const handleCopyLink = () => {
    if (roomId) {
      const roomLink = `${window.location.origin}/room/${roomId}`;
      navigator.clipboard.writeText(roomLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert("Please enter a Room ID first");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 px-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
          Join a Video Call Room
        </h1>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter Room ID"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <button
            onClick={handleJoinRoom}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Join Room
          </button>

          <div className="flex items-center justify-between">
            <button
              onClick={handleCopyLink}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              Copy Room Link
            </button>
            {copied && <span className="text-green-500 text-sm">Link Copied!</span>}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Share the room link with others to join the same room.
        </p>
      </div>
    </div>
  );
};

export default HomeCompo;
