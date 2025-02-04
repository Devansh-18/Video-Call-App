import React, { useEffect, useRef, useState } from "react";
import {toast} from "react-hot-toast";
import { MdGroups2, MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import { MdCallEnd } from "react-icons/md";
import { useSocket } from "../../context/SocketContext";
import { useRTC } from "../../context/RTCContext";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useApp } from "../../context/AppContext";
import ChatCompo from "../ChatCompo";
import { RxCross1 } from "react-icons/rx";

const VideoCall = () => {
  const {socket} = useSocket();
  const {username,isMicOn, setIsMicOn,roomId,userID,setUserID,isChatVisible,remoteUsers,setRemoteUsers} = useApp();
  const {peerConnections, getPeerConnection, addTracksToConnection, remoteStreams,setRemoteStreams} = useRTC();  // RTC functions from RTCContext
  const [localStream, setLocalStream] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const screenSharingRef = useRef(null);
  const popUpRef = useRef(null);
  const buttonRef = useRef(null);
  const [isScreenSharing,setIsScreenSharing] = useState(false);
  const [isUserListVisible,setIsUserListVisible] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Ignore click if it's on the button or inside the popup
      if (popUpRef.current && popUpRef.current.contains(event.target)) {
        return;
      }
      setIsUserListVisible(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
      
  }, []);
  

  useEffect(() => {
    // Request access to the user's media (video and audio)
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        console.log(stream);
        // const audioTrack = stream.getTracks().find(track=>track.kind === 'audio');
        // if(audioTrack){
        //   audioTrack.enabled = false;
        // }
        setLocalStream(stream);
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
        toast.error("Error while accessing Media");
        navigate("/");
      });
  }, []);

  useEffect(()=>{
    if(localStream){
      if(localVideoRef.current){
        localVideoRef.current.srcObject = localStream;
      }
      const audioTrack = localStream.getTracks().find(track=>track.kind === 'audio');
      if(audioTrack){
        audioTrack.enabled = isMicOn;
      }
      socket.emit("join-room", { roomId,username });
    }
  },[localStream]);

  useEffect(() => {
    if (!socket ) return;

    // Listen for the "user-id" event and set the userId state with the received ID
    socket.on("user-id", ({id,users}) => {
      setUserID(id);
      const filteredUsers = users.filter(user => user.userId !== id);
      setRemoteUsers(filteredUsers);
    });

    // Listen for the "user-joined" event
    socket.on("user-joined", ({userId,users}) => {
      console.log("userid",userID);
      const filteredUsers = users.filter(user => user.userId !== userID);
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
        const remoteStreamData = prevStreams[remoteId];
        if (remoteStreamData) {
          const stream = remoteStreamData?.stream;
          const remoteAudioTrack = stream.getAudioTracks()[0];
          const remoteVideoTrack = stream.getVideoTracks()[0];
    
          if (remoteAudioTrack) remoteAudioTrack.enabled = audioState;
          if (remoteVideoTrack) remoteVideoTrack.enabled = videoState;

          return {
            ...prevStreams,
            [remoteId]: {
              ...remoteStreamData,
              audioState: remoteAudioTrack?.enabled,
              videoState: remoteVideoTrack?.enabled,
            },
          };
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

  //Toggle users list
  const toggleUserList = ()=>{
    setIsUserListVisible(!isUserListVisible);
  }

  // Toggle mute/unmute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getTracks().find(track=>track.kind === 'audio');
      if(audioTrack.enabled){
        audioTrack.enabled = false;
        setIsMicOn(false);
      }
      else{
        audioTrack.enabled = true;
        setIsMicOn(true);
      }
      socket.emit("toggle",{roomId,isMicOn:audioTrack.enabled,isVideoOn});
    }
  };

  // Toggle video on/off
  const toggleVideo = () => {
    if(localStream){
      const videoTrack = localStream.getTracks().find(track=>track.kind === 'video');
      if(videoTrack.enabled){
        videoTrack.enabled = false;
        setIsVideoOn(false);
      }
      else{
        videoTrack.enabled = true;
        setIsVideoOn(true);
      }
      socket.emit("toggle",{roomId,isMicOn,isVideoOn:videoTrack.enabled});
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
          if(screenSharingRef.current){
            screenSharingRef.current.stop();
            screenSharingRef.current.onended();
            setIsScreenSharing(false);
          }
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
    <div className={` ${isChatVisible ? "md:w-2/3" : "w-screen"} flex flex-col gap-3 p-4 min-h-screen justify-center items-center overflow-y-auto overflow-x-hidden bg-gradient-to-tl from-black to-neutral-900 text-white`}> 
      <div className={`relative  gap-0  md:row-gap-4 col-gap-4 ml-0 max-h-full max-w-full h-fit w-fit items-center justify-center`}style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))"}}>
        {/* Local Video Stream */}
          {localStream ? (
            <div className="relative rounded-lg card mx-auto max-w-[90%] max-h-[90%] w-fit flex justify-center items-center aspect-[4/3]" >
              <video
                ref={localVideoRef}
                className="object-cover rounded-lg"
                autoPlay
                muted
              />
              {!isVideoOn && (
                  <img className="absolute -top-16 left-0 overflow-hidden object-none w-fit h-fit" src={`https://api.dicebear.com/5.x/initials/svg?seed=${username}`}/>
              )}
              {!isMicOn && (
                  <div className="absolute bottom-5 font-normal text-white bg-black bg-opacity-50 py-1 px-2 md:px-4 rounded-lg md:ml-2 text-sm md:text-base mx-auto" style={{"textShadow":"0px 0px 6px #00ccff"}}>
                    You are muted
                  </div>
              )}
              <div className="absolute top-2 max-w-[70%] overflow-clip text-sm md:text-base left-2 z-10 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                {`${username} (Me)`}
              </div>
            </div>
          ) : (
            <div className="w-auto flex flex-col justify-center items-center mx-auto py-4 h-auto relative max-w-full max-h-full">
              <div className="loader">
                <div className="loader-bar bar-1"></div>
                <div className="loader-bar bar-2"></div>
                <div className="loader-bar bar-3"></div>
                <div className="loader-bar bar-4"></div>
              </div>
             <div className="px-3 my-6 py-4 text-2xl font-medium leading-none text-center text-yellow-400 rounded-full animate-pulse">Loading Local Stream...</div>
            </div>
          )}

        {/* Remote Video Streams */}
          {Object.entries(remoteStreams).length > 0 && (
            Object.entries(remoteStreams).map(([userId, { stream, audioState, videoState }]) => {
              const videoTrack = stream.getVideoTracks()[0];
              const remoteUsername = remoteUsers.find(user => user.userId === userId)?.username || "Unknown User";
              return (
                <div key={userId} className="relative rounded-lg card max-w-[90%] max-h-[90%] w-fit flex mx-auto justify-center items-center aspect-[4/3]">
                  {videoTrack && (
                    <video
                      ref={(video) => {
                        if (video && stream && video.srcObject !== stream) video.srcObject = stream;
                      }}
                      className="object-cover rounded-lg w-fit h-fit"
                      autoPlay
                    />
                  )}
                  {!videoState && (
                      <img className="absolute -top-16 left-0 overflow-hidden object-none w-fit h-fit " src={`https://api.dicebear.com/5.x/initials/svg?seed=${remoteUsername}`}/>
                  )}
                  {!audioState && (
                    <div className="absolute bottom-5 left-50 font-normal text-white bg-black bg-opacity-50 py-1 px-2 md:px-4 rounded-lg text-sm md:text-base" style={{"textShadow":"0px 0px 6px #00ccff"}}>
                      {remoteUsername} is muted
                    </div>
                  )}
                  <div className="absolute text-sm md:text-base top-2 left-2 z-10 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                    {remoteUsername}
                  </div>
                </div>
              )
            })
          )}
      </div>

      {/* Controls: Mute/Unmute, Video On/Off */}
      <div className={`fixed bottom-4 max-w-full z-40 md:static md:my-2 flex flex-wrap item-center justify-center space-x-1 md:space-x-4`}>
        <button
          onClick={toggleMute}
          className="buttonStyle text-blue-400 py-2 px-3 md:py-3 md:px-6 rounded-lg shadow-md text-sm md:text-lg font-semibold flex items-center justify-center"
        >
          {isMicOn ? <FaMicrophone className="text-sm md:text-2xl" /> : <FaMicrophoneSlash className="text-lg md:text-2xl" />}
        </button>

        <button
          onClick={toggleVideo}
          className="buttonStyle text-green-400 py-2 px-3 md:py-3 md:px-6 rounded-lg shadow-md text-sm md:text-lg font-semibold flex items-center justify-center"
        >
          {isVideoOn ? <FaVideo className="text-sm md:text-2xl" /> : <FaVideoSlash className="text-lg md:text-2xl" />}
        </button>
        <button
          onClick={toggleScreenSharing}
          className="buttonStyle text-blue-300 py-2 px-3 md:py-3 md:px-6 rounded-lg shadow-md text-sm md:text-lg font-semibold flex items-center justify-center"
        >
          {isScreenSharing ? <MdOutlineScreenShare className="text-sm md:text-2xl" /> : <MdOutlineStopScreenShare className="text-lg md:text-2xl" />}
        </button>
        <button
          onClick={toggleUserList}
          className="relative buttonStyle text-purple-300 py-2 px-3 md:py-3 md:px-6 rounded-lg shadow-md text-sm md:text-lg font-semibold flex items-center justify-center"
        >
          <MdGroups2 className="text-lg md:text-2xl" />
          <p className="absolute bottom-[24px] md:bottom-[35px] right-[-5px] rounded-full bg-red-500 text-white text-s font-semibold px-2">
            {remoteUsers.length}
          </p>
        </button>
        
        <button
          onClick={disconnectCall} 
          className="buttonStyle text-red-600 py-2 px-3 md:py-3 md:px-6 rounded-lg shadow-md text-sm md:text-lg font-semibold flex items-center justify-center"
        >
          <MdCallEnd className="text-sm md:text-2xl" />
        </button>
      </div>

      {/* Chat UI */}
      <ChatCompo/>

      {
        isUserListVisible && (
            <div className={`fixed left-0 top-0 h-screen ${isChatVisible?"md:w-2/3 w-screen":"w-screen"} z-50 bg-black inset-0 bg-opacity-10 backdrop-blur-lg flex flex-col items-center justify-center transition-transform transform duration-500 ease-in-out ${isUserListVisible ? "translate-x-0" : "translate-x-full"
            }`}>
              <div ref={popUpRef} className="h-fit left-[50%] top[50%] w-72 bg-gray-900 p-4 text-white flex flex-col items-start justify-start">
                <h1 className="text-xl font-semibold">Remote Users</h1>
                <button onClick={toggleUserList} className="absolute z-50 top-5 right-5 text-white rounded-lg p-2 font-bold">
                  <RxCross1 size={24}/>
                </button>
              <div className="my-1">
                <ul className="flex flex-wrap gap-2 items-start justify-start">
                  {remoteUsers.length === 0 ? (
                    <li className="text-gray-300">No users in the room</li>
                   ) : (
                    remoteUsers.map((user) => (
                      <li key={user.userId} className="px-2 py-1 hover:bg-slate-700 my-2 border w-full border-yellow-600 rounded-lg">{
                        user.username ? user.username : "Unknown User"
                      }</li>
                    ))
                  )}
                </ul>
              </div>
              </div>
            </div>
          )
      }
    </div>


  );
};

export default VideoCall