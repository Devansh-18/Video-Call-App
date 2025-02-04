const express = require("express");
const app = express();
const {Server} = require("socket.io");
const cors = require("cors");
// const roomHandler = require("./sockets/roomHandler");
const bodyParser = require("body-parser");
require("dotenv").config();
const PORT = process.env.PORT;
// const IOPORT = process.env.IOPORT;

const io = new Server({
  cors: {
    origin: "http://localhost:5173/",
    methods: ["GET", "POST"]
  }
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
const usersStore = {};

io.on('connection',(socket)=>{

      console.log(`User connected with id ${socket.id}`);

      socket.on("join-room", ({ roomId,username }) => {
        const userId = socket.id;
        //join room 
        const room = io.sockets.adapter.rooms.get(roomId);
        if (room && room.has(socket.id)) {
          console.log(`User with socket ID ${socket.id} is already in room ${roomId}`);
          return; // Exit early
        }
        socket.join(roomId); 
        console.log(`user ${socket.id} join room ${roomId}`);

        //update room chat object
        if(!roomChats[roomId]){
          roomChats[roomId] = [];
        }

        // update users object
        if(!usersStore[roomId]){
          usersStore[roomId] = [];
        }
        usersStore[roomId].push({userId,username});

        const users = usersStore[roomId];
        console.log(users);
        // Emit the userId to the client
        socket.emit("user-id", {id:userId,users});
        socket.emit("chat-history",roomChats[roomId]);
        
        // Broadcast to other users in the room that a new user has joined
        console.log(`emit user-joined to other user... from ${userId}`);
        socket.to(roomId).emit("user-joined", {userId,users});
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

      socket.on("leave-room", ({ roomId }) => {
        const userIndex = usersStore[roomId].findIndex((user) => user.userId === socket.id);
        if (userIndex !== -1) {
          // Remove the user from the room
          usersStore[roomId].splice(userIndex, 1);
          // Notify other users in the room about the user leaving
          io.to(roomId).emit("leave-room", { id: socket.id, users: usersStore[roomId] });
      
          // Leave the room
          socket.leave(roomId);
      
          // Cleanup if the room is empty
          if (usersStore[roomId].length === 0) {
            delete usersStore[roomId];
            delete roomChats[roomId];
          }
      
          console.log(`User ${socket.id} left room ${roomId}`);
        }
      });     

      //toogle media
      socket.on("toggle",({roomId,isMicOn,isVideoOn})=>{
        console.log(isVideoOn);
        socket.to(roomId).emit("toggle",{audioState:isMicOn,videoState:isVideoOn,remoteId:socket.id});
      })

      // Handle incoming messages
      socket.on('message', ({ sender, msg, roomId }) => {
        const chatMessage = { userId: sender, message:msg, timestamp: new Date() };
        roomChats[roomId].push(chatMessage); // Store message in the room's chat history
        io.to(roomId).emit('newMessage', chatMessage); // Broadcast the message to the room
      });
    
      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`User ${socket.id} disconnected`);

        // Find and remove the user from all rooms they were part of
        for (const roomId in usersStore) {
          const userIndex = usersStore[roomId].findIndex((user) => user.userId === socket.id);
          if (userIndex !== -1) {
            // Remove the user from the room
            usersStore[roomId].splice(userIndex, 1);

            // Notify other users in the room
            socket.to(roomId).emit("leave-room", { id: socket.id, users: usersStore[roomId] });

            // Cleanup if the room is empty
            if (usersStore[roomId].length === 0) {
              delete usersStore[roomId];
              delete roomChats[roomId];
              console.log(`Room ${roomId} is empty and deleted`);
            }
          }
        }
      });
})

app.listen(PORT,()=>{
    console.log(`App is listening at ${PORT}`);
});
io.listen(PORT);