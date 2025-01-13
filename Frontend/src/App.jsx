import React from "react";
import SocketProvider from "./context/SocketContext";
import RTCProvider from "./context/RTCContext";
import VideoCall from "./components/VideoCall/VideoCall";
import { Route, Routes } from "react-router-dom";
import HomePage from "./components/Home";

const App = () => {
  return (
    <SocketProvider>
      <RTCProvider>
        <Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path="/video-call" element={<VideoCall/>} />
        </Routes>
      </RTCProvider>
    </SocketProvider>
  );
};

export default App;
