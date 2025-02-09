import React, { createContext, useState } from "react";
import toast from "react-hot-toast";

const AppContext = createContext();

export default function AppContextProvider({children}){

    const [loading,setLoading] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(false);
    const [username,setUsername] = useState('');
    const [roomId,setRoomId] = useState('');
    const [userID,setUserID] = useState('');
    const [isChatVisible,setIsChatVisible] = useState(false);

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

    const value = {
        loading,isMicOn,setIsMicOn,setLoading,remoteUsers,setRemoteUsers,username,roomId,setUsername,setRoomId,userID,setUserID,isChatVisible,setIsChatVisible,handleCopyLink
    };

    return <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>

}
export const useApp = () => React.useContext(AppContext);

