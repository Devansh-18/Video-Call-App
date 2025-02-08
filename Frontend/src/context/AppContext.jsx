import React, { createContext, useState } from "react";

const AppContext = createContext();

export default function AppContextProvider({children}){

    const [loading,setLoading] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [isMicOn, setIsMicOn] = useState(false);
    const [username,setUsername] = useState('');
    const [roomId,setRoomId] = useState('');
    const [userID,setUserID] = useState('');
    const [isChatVisible,setIsChatVisible] = useState(false);

    const value = {
        loading,isMicOn,setIsMicOn,setLoading,remoteUsers,setRemoteUsers,username,roomId,setUsername,setRoomId,userID,setUserID,isChatVisible,setIsChatVisible,
    };

    return <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>

}
export const useApp = () => React.useContext(AppContext);

