const express = require("express");
const app = express();
const {Server} = require("socket.io");
const cors = require("cors");
// const roomHandler = require("./sockets/roomHandler");
const bodyParser = require("body-parser");
require("dotenv").config();
const PORT = process.env.PORT;
const IOPORT = process.env.IOPORT;

const io = new Server({
    cors:true,
});
app.use(bodyParser.json());
app.use(express.json());
app.use(
    cors({
        origin:"http://localhost:5173",
        credentials:true,
    })
);

app.get("/",(req,res)=>{
    return res.json({
        success:true,
        message:'Your server is up and running',
    })
});

const roomChats = {};

io.on('connection',(socket)=>{
    console.log(`User connected with id ${socket.id}`);
    // roomHandler(io,socket);
    socket.on("join-room", ({ roomId }) => {
        const userId = socket.id;  // This is the unique ID for the user (Bob, Alice, etc.)
        socket.join(roomId);  // Join the room
        console.log(`user ${socket.id} join room ${roomId}`);
        if(!roomChats[roomId]){
          roomChats[roomId] = [];
        }
        
        // Emit the userId to the client
        socket.emit("user-id", userId);  // Send userId to the client (Alice or Bob)
        socket.emit("chat-history",roomChats[roomId]);
        
        // Broadcast to other users in the room that a new user has joined
        console.log(`emit user-joined to other user... from ${userId}`);
        socket.to(roomId).emit("user-joined", userId);
      });
      // Handle signaling messages (offer, answer, ice candidates)
      socket.on("signal", (data) => {
        console.log(`Signal from ${data.target}`);
        io.to(data.target).emit("signal", {
          sender: socket.id,  // sender is the socket ID of the user who sends the signal
          ...data,
        });
        console.log(`Signal emitted to other user... from ${socket.id}`);
      });

      socket.on("leave-room",({roomId})=>{
        socket.leave(roomId);
        socket.to(roomId).emit("leave-room",socket.id);
        console.log(`${socket.id} leave`);
      });

      //toogle media
      socket.on("toogle",({roomId,isMuted,isVideoOn})=>{
        socket.to(roomId).emit("toogle",{audioState:isMuted,videoState:isVideoOn});
      })

      // Handle incoming messages
      socket.on('message', ({ sender, message, roomId }) => {
        const chatMessage = { userId: sender, message, timestamp: new Date() };
        roomChats[roomId].push(chatMessage); // Store message in the room's chat history
        io.to(roomId).emit('newMessage', chatMessage); // Broadcast the message to the room
      });
    
      // Handle disconnection
      socket.on("disconnect", ({roomId}) => {
        socket.to(roomId).emit("leave-room",socket.id);
        console.log("User disconnected");
      });
})

app.listen(PORT,()=>{
    console.log(`App is listening at ${PORT}`);
});
io.listen(IOPORT);