import { RxCross2 } from "react-icons/rx";
import { IoSendSharp } from "react-icons/io5";
import React, { useRef, useState, useEffect } from 'react'
import { useApp } from '../context/AppContext';
import { useSocket } from '../context/SocketContext';

const ChatCompo = () => {
    const {socket} = useSocket();
    const {isChatVisible,setIsChatVisible,roomId,username,remoteUsers,userID} = useApp();

    const chatEndRef = useRef(null);

    const [chat,setChat] = useState([]);
    const [msg,setMsg] = useState('');

    useEffect(() => {
        if (!socket) return;

        //History of chats
        socket.on("chat-history",(messages)=>{
            setChat(messages);
        });

        // Handle message receive 
        socket.on('newMessage', (chatMessage) => {
            setChat((prev) => [...prev, chatMessage]);
        });

        return () => {
            socket.off("chat-history");
            socket.off("newMessage");
        };
    }, [socket, roomId]);

    useEffect(() => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
      }
    }, [chat]);

  //sending message
  const sendMessage = () => {
    if (msg && roomId && userID) {
      socket.emit('message', { sender:userID, msg, roomId });
      setMsg('');
    }
  };
  return (
    isChatVisible ? (
      <div className={`bg-slate-900 shadow-lg w-1/3 h-screen`}>
        <div className="flex flex-col w-full h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between text-white p-4">
            <h2 className="text-lg font-bold">Chat</h2>
            <button
              onClick={()=>setIsChatVisible(!isChatVisible)}
              className="text-lg font-bold hover:text-gray-200"
            >
              <RxCross2/>
            </button>
          </div>
  
          {/* Chat Messages */}
          <div className={`flex-1 overflow-y-auto shadow-md bg-slate-700 p-4 space-y-2 no-arrows scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-900`}
          style={{ maxHeight: "80vh" }}
          ref={chatEndRef}>
            {chat.map((message, index) => (
              <div
                key={index}
                className={`text-gray-100 font-light flex flex-col p-2 rounded-lg shadow-sm max-w-xs ${message.userId===userID?"ml-auto bg-green-900":"mr-auto bg-gray-800"}`}
                style={{ wordWrap: "break-word" }}
              >
                <div className="text-xs font-thin text-white">
                  {message.userId===userID?
                  username
                  :
                  remoteUsers.find(user => user.userId === message.userId)?.username || "Unknown User"}
                </div>
                <div className="text-sm">
                  {message.message}
                </div>
                <div className="text-xs font-thin text-right">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                </div>
              </div>
            ))}
          </div>
  
          {/* Input Box */}
          <div className="p-4 text-black flex items-center space-x-2">
            <input
              type="text"
              value={msg}
              onChange={(e) => {
                setMsg(e.target.value);
              }}
              placeholder="Type a message..."
              className="flex-1 bg-gray-600 text-gray-300 overflow-y-auto p-2 rounded-2xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />
            <button
              onClick={sendMessage}
              className="flex justify-center items-center bg-blue-500 rounded-full text-white px-4 py-2 hover:bg-blue-600"
            >
              <IoSendSharp />
            </button>
          </div>
        </div>
      </div>
    ):(
      <button onClick={() => setIsChatVisible(!isChatVisible)}
          className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600">
          Show Chat
      </button>
    )
  )
}

export default ChatCompo
