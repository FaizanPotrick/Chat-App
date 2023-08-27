const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    credentials: true,
  },
});
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

let rooms = {};

io.on("connection", (socket) => {
  socket.on("create-room", (room_name, owner_name) => {
    if (rooms[room_name]) return socket.emit("room-exists", room_name);
    rooms[room_name] = { owner_name, users: {} };
    socket.emit("room-created", room_name);
  });
  socket.on("new-room", (room, user) => {
    socket.join(room);
    rooms[room] = rooms[room] || { users: {} };
    rooms[room].users[socket.id] = user;
    socket.to(room).emit("room", user);
  });
  socket.on("send", (room, message) => {
    socket.to(room).emit("receive", {
      message: message,
      name: rooms[room].users[socket.id],
    });
  });
  socket.on("disconnect", () => {
    getUserRooms(socket).forEach((room) => {
      socket.to(room).emit("left", rooms[room].users[socket.id]);
      delete rooms[room].users[socket.id];
    });
  });
});
const getUserRooms = (socket) => {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name);
    return names;
  }, []);
};

http.listen(port, () => {
  console.log(`listening on *:${port}`);
});
