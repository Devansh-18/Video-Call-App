import { createContext, useContext, useMemo } from "react";
import {io} from "socket.io-client";

export const SocketContext = createContext();


export default function SocketContextProvider(props){
    
    const socket = useMemo(
        ()=>
            io("https://video-call-app-backend-1wsq.onrender.com"),[]
    );

    return <SocketContext.Provider value={{socket}}>
        {props.children}
    </SocketContext.Provider>
}

export const useSocket = ()=>{return useContext(SocketContext);}