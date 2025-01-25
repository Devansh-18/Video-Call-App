import React, { createContext, useRef, useState } from "react";
import { useSocket } from "./SocketContext";

const RTCContext = createContext();

export default function RTCProvider ({ children }){
  const {socket} = useSocket();
  const peerConnections = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});

  const createPeerConnection = (userId) => {
    console.log(`Creating PeerConnection for userId: ${userId}`);
    const pc = new RTCPeerConnection();

    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if(socket){
          socket.emit("signal", { target: userId, offer });
        }
      } catch (error) {
        console.error("Error during negotiation:", error);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if(socket){
          socket.emit("signal", { target: userId, candidate: event.candidate });
        }
      }
    };

    pc.ontrack = (event) => {
      console.log(`Track received from userId: ${userId}`);
      setRemoteStreams((prevStreams) => ({
        ...prevStreams,
        [userId]: event.streams[0],
      }));
    };

    peerConnections.current[userId] = pc;
    return pc;
  };

  const getPeerConnection = (userId) => {
    if (!peerConnections.current[userId]) {
      console.log(`Creating new PeerConnection for userId: ${userId}`);
      peerConnections.current[userId] = createPeerConnection(userId);
    }
    return peerConnections.current[userId];
  };

  const addTracksToConnection = (userId, localStream) => {
    const pc = getPeerConnection(userId);
    console.log(`adding tracks to pc -> ${pc} and user id -> ${userId}`);
  
    // Check if tracks are already added
    const senders = pc.getSenders();
    const trackIds = senders.map((sender) => sender.track?.id);
  
    localStream && localStream.getTracks().forEach((track) => {
      if (!trackIds.includes(track.id)) {
        pc.addTrack(track, localStream);
      }
    });
  };
  

  return (
    <RTCContext.Provider
      value={{peerConnections, getPeerConnection, addTracksToConnection, remoteStreams , setRemoteStreams }}
    >
      {children}
    </RTCContext.Provider>
  );
};

export const useRTC = () => React.useContext(RTCContext);
