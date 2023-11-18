import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import corsOptions from './src/config/cors';
require("dotenv").config()
import * as http from "http";
import { Socket } from 'socket.io';
import { Sendrr, SocketData } from './src/interfaces/socketInterface';
import Container from 'typedi';
import DeviceService from './src/services/DeviceService';


const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const port = String(process.env.PORT) || 3030;
      
// Set up your routes and middleware here
app.use(cors(corsOptions));
express.urlencoded({limit:"50mb", extended: false})
express.json({limit:"50mb"})
     
// Run MongoDB
mongoose.connect(process.env.MONGODB_URI || `mongodb://127.0.0.1:27017/sendrr-backend`)
const connection = mongoose.connection
connection.once('open', ()=>{console.log('Database running Successfully')});
      
//render the html file
app.get('/', (req, res) => {
res.sendFile(__dirname + '/public/index.html');
});

// Socket Controllers

const deviceServices = Container.get(DeviceService)

io.on("connection", (socket:  any)=>{
  console.log("A User is connected")

  socket.on("disconnect", ()=>{
    console.log("A User disconnected!")
  })

  const clientAddresses: SocketData[] = []

   // Custom logic to check if clients are on the same network
   socket.on('checkNetwork', (data: SocketData) => {
    const clientIp = data.ip; // Get IP address from the client
    clientAddresses.push(data);

    // Check if clients share the same network
    const connectedItems = checkIfOnSameNetwork(data, clientAddresses);

    for(let i=0; i <= connectedItems.length; i++){
        const device = connectedItems[i]
        deviceServices.save(device)
        socket.to(device.socketId).emit("networkStatus", {status: "Connected", devices: connectedItems})
    }

    // Respond to the client
    // socket.emit('networkStatus', { areOnSameNetwork });
  });

  socket.on("send", (content: Sendrr)=> {
    let sendrrContent = content.content;
    let socketId = content.socketId
    // let device = 

    socket.to(socketId).emit("receive", {content: sendrrContent, from: getDeviceBySocketId(socket.id, clientAddresses)?.deviceName, time: new Date()})

  })
})
      
const checkIfOnSameNetwork= (data: SocketData, clientAddresses: SocketData[])=> {
  return clientAddresses.filter((i)=> i.ip === data.ip)
}

const getDevice = (username: string, connectedItems: SocketData[])=> {
  return connectedItems.find((i)=> i.username === username)
}

const getDeviceBySocketId = (socketId: string, connectedItems: SocketData[])=> {
  return connectedItems.find((i)=> i.socketId === socketId)
}

// Run Server
server.listen(port, () => {
console.log(`Server running on port ${port}`);
      
  });
        