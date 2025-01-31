import React, { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AppContext = createContext();

export default function AppContextProvider({children}){

    const [loading,setLoading] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [username,setUsername] = useState('');
    const [roomId,setRoomId] = useState('');
    const [userID,setUserID] = useState(null);
    const [isChatVisible,setIsChatVisible] = useState(false);

    const value = {
        loading,setLoading,remoteUsers,setRemoteUsers,username,roomId,setUsername,setRoomId,userID,setUserID,isChatVisible,setIsChatVisible,
    };

    return <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>

}
export const useApp = () => React.useContext(AppContext);

