import React, { useEffect, useRef, useState } from "react";
import {toast} from "react-hot-toast";
import { MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";
import { FaMicrophone, FaMicrophoneSlash, FaPhone, FaPhoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import { MdCallEnd } from "react-icons/md";
import { useSocket } from "../../context/SocketContext";
import { useRTC } from "../../context/RTCContext";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useApp } from "../../context/AppContext";
import ChatCompo from "../ChatCompo";

const VideoCall = () => {
  const {socket} = useSocket();
  const {username,roomId,userID,setUserID,isChatVisible,remoteUsers,setRemoteUsers} = useApp();
  const {peerConnections, getPeerConnection, addTracksToConnection, remoteStreams,setRemoteStreams} = useRTC();  // RTC functions from RTCContext
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const screenSharingRef = useRef(null);
  const [isScreenSharing,setIsScreenSharing] = useState(false);

  useEffect(() => {
    // Request access to the user's media (video and audio)
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if(localVideoRef.current){
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
        console.log("stream",stream);
        socket.emit("join-room", { roomId,username });
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
        toast.error("Error while accessing Media");
        navigate("/");
      });
  }, []);

  useEffect(() => {
    if (!socket ) return;


    // Listen for the "user-id" event and set the userId state with the received ID
    socket.on("user-id", ({id,users}) => {
      console.log("user-id",id);
      setUserID(id);
      const filteredUsers = users.filter(user => user.userId !== id);
      console.log("remoteUsers",filteredUsers);
      setRemoteUsers(filteredUsers);
    });

    // Listen for the "user-joined" event
    socket.on("user-joined", ({userId,users}) => {
      console.log("userID -> ",userID);
      const filteredUsers = users.filter(user => user.userId !== userID);
      console.log("filtered users",filteredUsers);
      setRemoteUsers(filteredUsers);
      if (localStream) {
        // When another user joins, add tracks to the peer connection for this user
        addTracksToConnection(userId, localStream);
      }   
    })

    // Handle the signaling process for WebRTC (offer, answer, ice candidates)
    socket.on("signal", async ({ sender, offer, answer, candidate}) => {
      const pc = getPeerConnection(sender);
      addTracksToConnection(sender,localStream);

      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(new RTCSessionDescription(answer));
        socket.emit("signal", { target: sender, answer });
      }

      if (answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }

      if (candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    //toggling media
    socket.on("toggle", ({ audioState, videoState, remoteId }) => {
      setRemoteStreams((prevStreams) => {
        const updatedStream = prevStreams[remoteId]?.stream;
    
        if (updatedStream) {
          const remoteAudioTrack = updatedStream.getAudioTracks()[0];
          const remoteVideoTrack = updatedStream.getVideoTracks()[0];
    
          if (remoteAudioTrack) remoteAudioTrack.enabled = audioState;
          if (remoteVideoTrack) remoteVideoTrack.enabled = videoState;
        }
    
        return prevStreams; // No need to store audioState and videoState, we only modify the stream
      });
    });
    

    //Socket for Leaving Room
    socket.on("leave-room", ({id,users})=>{
      // Retrieve and close the peer connection for the user
      const pc = getPeerConnection(id);
      if (pc) {
        pc.close(); // Close the peer connection
        console.log(`Peer connection closed for user: ${id}`);
      }

      // Remove the user's video/audio stream from the UI
      setRemoteStreams((prevStreams) => {
        const updatedStreams = { ...prevStreams };
        delete updatedStreams[id];
        return updatedStreams;
      });
      const filteredUsers = users.filter(user => (user.userId !== id && user.userId !== userID));
      setRemoteUsers(filteredUsers);
    });

    return () => {
      socket.off("user-id");
      socket.off("user-joined");
      socket.off("signal");
      socket.off("toggle");
      socket.off("leave-room");
    };
  }, [socket,localStream, roomId]);

  // Function to handle disconnecting the call
  const disconnectCall = () => {
    if (socket) {
      socket.emit("leave-room", { roomId });
    }
    navigate("/");
    window.location.reload();
  };

  // Toggle mute/unmute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getTracks().find(track=>track.kind === 'audio');
      console.log(audioTrack.enabled);
      if(audioTrack.enabled){
        audioTrack.enabled = false;
        setIsMuted(true);
      }
      else{
        audioTrack.enabled = true;
        setIsMuted(false);
      }
      socket.emit("toggle",{roomId,isMuted,isVideoOn});
    }
  };

  // Toggle video on/off
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getTracks().find(track=>track.kind === 'video');
      if(videoTrack.enabled){
        videoTrack.enabled = false;
        setIsVideoOn(false);
      }
      else{
        videoTrack.enabled = true;
        setIsVideoOn(true);
      }
      socket.emit("toggle",{roomId,isMuted,isVideoOn});
    }
  };

  const toggleScreenSharing = () => {
    if (!isVideoOn) {
      toast.error("Open Video First");
      return;
    }
  
    if (!isScreenSharing) {
      // Start screen sharing
      navigator.mediaDevices
        .getDisplayMedia({ video: true, cursor: "always" })
        .then((screenStream) => {
          const screenTrack = screenStream.getTracks()[0];
          const videoTrack = localStream.getTracks().find((track) => track.kind === "video");
  
          if (!videoTrack) {
            toast.error("No video track found in the local stream");
            return;
          }
  
          // Replace video track with screen track for all peer connections
          Object.keys(peerConnections.current || {}).forEach((userId) => {
            const connection = peerConnections.current[userId];
  
            if (connection instanceof RTCPeerConnection) {
              const sender = connection.getSenders().find((s) => s.track === videoTrack);
              if (sender) {
                sender.replaceTrack(screenTrack).catch((err) => {
                  console.error(`Error replacing track for userId ${userId}:`, err);
                });
              } else {
                console.warn(`No sender found for userId ${userId} with the video track`);
              }
            } else {
              console.warn(`Invalid peer connection for userId ${userId}`);
            }
          });
  
          // Handle the end of screen sharing
          screenTrack.onended = () => {
            Object.keys(peerConnections.current || {}).forEach((userId) => {
              const connection = peerConnections.current[userId];
  
              if (connection instanceof RTCPeerConnection) {
                const sender = connection.getSenders().find((s) => s.track === screenTrack);
                if (sender) {
                  sender.replaceTrack(videoTrack).catch((err) => {
                    console.error(`Error restoring video track for userId ${userId}:`, err);
                  });
                } else {
                  console.warn(`No sender found for userId ${userId} with the screen track`);
                }
              }
            });
  
            // Reset local video to the camera stream
            localVideoRef.current.srcObject = localStream;
            setIsScreenSharing(false);
          };
  
          // Set screen sharing for the local video and update state
          localVideoRef.current.srcObject = screenStream;
          screenSharingRef.current = screenTrack;
          setIsScreenSharing(true);
        })
        .catch((error) => {
          console.error("Error in starting screen sharing: ", error);
          toast.error("Failed to start screen sharing");
        });
    } else {
      // Stop screen sharing
      if (screenSharingRef.current) {
        screenSharingRef.current.stop();
        screenSharingRef.current.onended(); // Trigger the onended event to handle cleanup
      } else {
        console.error("Screen sharing reference is not set");
      }
    }
  };

  // Dynamically calculate grid style for any number of streams
  const calculateGridStyle = (count) => {
    console.log(count);
    if (count === 0) return "grid-cols-1 grid-rows-1"; // No streams
    const columns = Math.ceil(Math.sqrt(count)); // Number of columns
    const rows = Math.ceil(count / columns); // Number of rows
    console.log("columns ",columns,"rows ",rows);
    return `repeat(${columns},1fr)`;
  };
  const gridStyle = useMemo(() => {
    const count = remoteUsers.length + 1; // Add 1 for local stream
    return calculateGridStyle(count);
  }, [remoteUsers.length]);

  
  return (
    <div className="relative flex p-4 items-center justify-center overflow-hidden w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-700 text-white">
      <div className={`relative gap-4 ${isChatVisible?"md:w-2/3":"w-full"} h-[90%] items-center justify-center`}
      style={{ display: 'grid', gridTemplateColumns: `${gridStyle}` }}>
      {console.log(gridStyle)}
        {/* Local Video Stream */}
        <div className="relative rounded-lg border-4 w-auto overflow-hidden flex justify-center items-center border-blue-500 shadow-stream-glow">
          {localStream ? (
            <video
              ref={localVideoRef}
              className="w-auto h-auto max-w-full max-h-full object-cover"
              autoPlay
              muted
            />
          ) : (
            <div className="w-auto h-auto min-w-full">
              Loading local stream...
            </div>
          )}
          <div className="absolute top-2 left-2 z-50 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
            {username} Me
          </div>
        </div>

        {/* Remote Video Streams */}
          {Object.entries(remoteStreams).length > 0 && (
            Object.entries(remoteStreams).map(([userId, stream]) => {
              // Get the audio and video tracks of the stream
              const audioTrack = stream.getAudioTracks()[0];
              const videoTrack = stream.getVideoTracks()[0];
              const remoteUsername = remoteUsers.find(user => user.userId === userId)?.username || "Unknown User";
              return (
                <div key={userId} className="relative w-auto overflow-hidden flex items-center justify-center rounded-lg border-4 order-white shadow-stream-glow">
                  {videoTrack && videoTrack.enabled ? (
                    <video
                      ref={(video) => {
                        if (video && stream && video.srcObject !== stream) video.srcObject = stream;
                      }}
                      className="max-w-full max-h-full h-auto w-auto object-cover"
                      autoPlay
                    />
                  ):
                  (
                    <div className="overflow-hidden max-w-full max-h-full w-auto h-auto object-cover bg-slate-500 blur-lg">
                      <image src={`https://api.dicebar.com/5.x/initials/svg?seed=${remoteUsername}`}/>
                    </div>
                  )}
                    {audioTrack && !audioTrack.enabled && (
                      <div className="absolute top-[50%] left-0 bg-slate-300 blur-md bg-blend-screen p-2 text-white rounded-full">
                        {remoteUsername} is muted
                      </div>
                    )}
                  
                  <div className="absolute top-2 left-2 z-50 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                    {remoteUsername}
                  </div>

                </div>
              )
            })
          )}
      </div>

      {/* Controls: Mute/Unmute, Video On/Off */}
      <div className={`absolute left-0 bottom-8 ${isChatVisible?"w-2/3":"w-full"} flex item-center justify-center space-x-4`}>
        <button
          onClick={toggleMute}
          className="bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-lg shadow-md text-lg font-semibold flex items-center justify-center"
        >
          {isMuted ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} />}
        </button>

        <button
          onClick={toggleVideo}
          className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg shadow-md text-lg font-semibold flex items-center justify-center"
        >
          {isVideoOn ? <FaVideo size={24} /> : <FaVideoSlash size={24} />}
        </button>
        <button
          onClick={toggleScreenSharing}
          className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg shadow-md text-lg font-semibold flex items-center justify-center"
        >
          {isScreenSharing ? <MdOutlineScreenShare size={24} /> : <MdOutlineStopScreenShare size={24} />}
        </button>
        
        <button
          onClick={disconnectCall} // Call the disconnect function
          className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg shadow-md text-lg font-semibold flex items-center justify-center gap-2"
        >
          <MdCallEnd size={24} /> {/* Icon added here */}
        </button>
      </div>

      {/* Chat UI */}
      <ChatCompo/>

      <div className="absolute bg-slate-900 top-0 left-0 text-white flex flex-col items-start justify-start">
        <h1>Remote Users</h1>
        <ul className="flex flex-col items-start justify-start">
          {remoteUsers.map(({userId, username}) => (
            <li className="p-2" key={userId}>
              {userId}: {username}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default VideoCall