import { createContext, useContext, useMemo } from "react";
import {io} from "socket.io-client";

export const SocketContext = createContext();


export default function SocketContextProvider(props){
    
    const socket = useMemo(
        ()=>
            io('http://localhost:8001'),[]
    );

    return <SocketContext.Provider value={{socket}}>
        {props.children}
    </SocketContext.Provider>
}

export const useSocket = ()=>{return useContext(SocketContext);}