import React, { createContext, useRef, useState } from "react";
import { useSocket } from "./SocketContext";
import { useApp } from "./AppContext";

const RTCContext = createContext();

export default function RTCProvider ({ children }){
  const {socket} = useSocket();
  const {isMicOn} = useApp();
  const peerConnections = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});

  const createPeerConnection = (userId) => {
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
      {console.log(event)}
      {console.log(event.streams[0].getTracks().find(track=>track.kind === 'audio').enabled)}
      setRemoteStreams((prevStreams) => ({
        ...prevStreams,
        [userId]: {
          stream : event.streams[0],
          audioState: isMicOn,
          videoState: event.streams[0].getVideoTracks()[0]?.enabled || false,
        }
      }));
    };

    peerConnections.current[userId] = pc;
    return pc;
  };

  const getPeerConnection = (userId) => {
    if (!peerConnections.current[userId]) {
      peerConnections.current[userId] = createPeerConnection(userId);
    }
    return peerConnections.current[userId];
  };

  const addTracksToConnection = (userId, localStream) => {
    const pc = getPeerConnection(userId);
  
    // Check if tracks are already added
    const senders = pc.getSenders();
    const trackIds = senders.map((sender) => sender.track?.id);
  
    localStream && localStream.getTracks().forEach((track) => {
      if (!trackIds.includes(track.id)) {
        console.log(localStream.getTracks().find(track=>track.kind === 'audio').enabled);
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
