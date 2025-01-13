import React, { useEffect, useRef, useState } from "react";
import {toast} from "react-hot-toast";
import { FaMicrophone, FaMicrophoneSlash, FaPhone, FaPhoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import { MdCallEnd } from "react-icons/md";
import { useSocket } from "../../context/SocketContext";
import { useRTC } from "../../context/RTCContext";
import { useLocation, useNavigate } from "react-router-dom";

const VideoCall = () => {
  const location = useLocation();
  const { username, roomId } = location.state || {};
  const {socket} = useSocket();
  const {peerConnections, getPeerConnection, addTracksToConnection, remoteStreams,setRemoteStreams } = useRTC();  // RTC functions from RTCContext
  const [localStream, setLocalStream] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [remoteAudioState,setRemoteAudioState] = useState(true);
  const [remoteVideoState,setRemoteVideoState] = useState(true);
  const navigate = useNavigate();
  const localVideoRef = useRef();
  const screenSharingRef = useRef();
  const [isScreenSharing,setIsScreenSharing] = useState(false);
  const [chat,setChat] = useState([]);
  const [message,setMessage] = useState('');
  const [isChatVisible,setIsChatVisible] = useState(false);

  useEffect(() => {
    // Request access to the user's media (video and audio)
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if(localVideoRef.current){
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
        toast.error("Error while accessing Media");
        navigate("/");
      });
  }, []);

  useEffect(() => {
    if (!socket || !localStream) return;

    socket.emit("join-room", { roomId,username });

    // Listen for the "user-id" event and set the userId state with the received ID
    socket.on("user-id", (id) => {
      setUserId(id);
    });

    //Current Chat History for the room
    socket.on("chat-history",(messages)=>{
      setChat(messages);
    });

    // Listen for the "user-joined" event
    socket.on("user-joined", (userId) => {
      if (localStream) {
        // When another user joins, add tracks to the peer connection for this user
        addTracksToConnection(userId, localStream);
      }
    })

    // Handle the signaling process for WebRTC (offer, answer, ice candidates)
    socket.on("signal", async ({ sender, offer, answer, candidate }) => {
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
    socket.on("toogle",({audioState,videoState})=>{
      setRemoteAudioState(audioState);
      setRemoteVideoState(videoState);
    })

    //Socket for Leaving Room
    socket.on("leave-room", (userId)=>{
      // Retrieve and close the peer connection for the user
      const pc = getPeerConnection(userId);
      if (pc) {
        pc.close(); // Close the peer connection
        console.log(`Peer connection closed for user: ${userId}`);
      }

      // Remove the user's video/audio stream from the UI
      setRemoteStreams((prevStreams) => {
        const updatedStreams = { ...prevStreams };
        delete updatedStreams[userId];
        return updatedStreams;
      });
    });

    // Handle message receive 
    socket.on('newMessage', (message) => {
      console.log('newMessage->',message);
      setChat((prev) => [...prev, message]);
    });

    return () => {
      socket.off("user-joined");
      socket.off("chat-history");
      socket.off("signal");
      socket.off("toogle");
      socket.off("leave-room");
      socket.off("newMessage");
    };
  }, [socket, localStream, roomId]);

  //sending message
  const sendMessage = () => {
    console.log("Sending message->",message);
    if (message && roomId) {
      socket.emit('message', { sender:userId, message, roomId });
      setMessage('');
    }
  };

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
      socket.emit("toogle",{roomId,isMuted,isVideoOn});
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
      socket.emit("toogle",{roomId,isMuted,isVideoOn});
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
  
  return (
    <div className="flex p-4 items-center justify-center overflow-hidden w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-700 text-white">
      <div className="relative flex gap-4 max-w-full max-h-full justify-center items-center flex-wrap">
        {/* Local Video Stream */}
        <div className="rounded-lg border-4 border-blue-500 shadow-stream-glow">
          {localStream ? (
            <video
              ref={localVideoRef}
              className="object-cover"
              autoPlay
              muted
            />
          ) : (
            <div className="object-cover">
              Loading local stream...
            </div>
          )}
        </div>

        {/* Remote Video Streams */}
          {Object.entries(remoteStreams).length > 0 ? (
            Object.entries(remoteStreams).map(([userId, stream]) => (
              <div key={userId} className="rounded-lg border-4 border-white shadow-stream-glow">
                  <video
                    ref={(video) => {
                      if (video && stream && video.srcObject !== stream) video.srcObject = stream;
                    }}
                    className="object-cover"
                    autoPlay
                  />
              </div>
            ))
          ) : (
            <div className="rounded-lg border-4 border-white shadow-stream-glow">
              No remote users connected
            </div>
          )}
      </div>

      {/* Controls: Mute/Unmute, Video On/Off */}
      <div className=" bottom-8 left-0 right-0 flex justify-center space-x-4">
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
          {isScreenSharing ? <FaPhone size={24} /> : <FaPhoneSlash size={24} />}
        </button>
        
        <button
          onClick={disconnectCall} // Call the disconnect function
          className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg shadow-md text-lg font-semibold flex items-center justify-center gap-2"
        >
          <MdCallEnd size={24} /> {/* Icon added here */}
        </button>
      </div>

      {/* Chat UI */}
      {isChatVisible && (
        <div className="w-1/3 bg-slate-700 h-full shadow-lg flex flex-col">
          <div className="flex-grow overflow-y-auto p-4">
            {chat.map((msg, index) => (
              <div key={index} className="mb-2">
                <strong className="text-blue-600">{msg.userId}:</strong> {msg.message}{' '}
                <em className="text-gray-500 text-sm">({new Date(msg.timestamp).toLocaleTimeString()})</em>
              </div>
            ))}
          </div>
    
          <div className="p-4 flex flex-col text-black border-gray-300">
            <input
              type="text"
              className="w-full border rounded-lg p-2 mb-2"
              placeholder="Enter your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              onClick={sendMessage}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700">
              Send
            </button>
          </div>
        </div>
      )}

      {/* Toggle Chat Button */}
      <button
        onClick={() => setIsChatVisible(!isChatVisible)}
        className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600">
        {isChatVisible ? 'Hide Chat' : 'Show Chat'}
      </button>
    </div>
  );
};

export default VideoCall;