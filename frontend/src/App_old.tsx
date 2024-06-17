import React, { useEffect, useState } from "react";
import io from "socket.io-client";
// import jwt from "jsonwebtoken";

// Configuration
const SERVER_URL = "http://localhost:3000"; // Your server URL
// const PLAYER_ID = "player1"; // Change as needed
const PLAYER_TYPE = "fish"; // Change as needed ('fish', 'dolphin', 'whale')
// const SECRET_KEY = "your_secret_key"; // The same secret key used for signing JWTs on the server

const socket = io(SERVER_URL, {
  query: { token: "token" },
});

const App: React.FC = () => {
  const [gold, setGold] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<[]>([]);

  useEffect(() => {
    // Generate JWT token
    // const token = jwt.sign({ id: PLAYER_ID }, SECRET_KEY);

    socket.on("connect", () => {
      console.log("Connected to server");

      socket.emit("playerEnter", { token: 2, player_type: PLAYER_TYPE });
    });

    socket.on("connect_error", (err) => {
      // the reason of the error, for example "xhr poll error"
      console.log(err.context);
    
      // some additional description, for example the status code of the initial HTTP response
      // console.log(err.description);
    
      // some additional context, for example the XMLHttpRequest object
      // console.log(err.context);
    });

    socket.on("playerEntered", (data) => {
      console.log("Player entered:", data);
      const intervalId = setInterval(() => {
        const goldCollected = Math.floor(Math.random() * 10) + 1; // Simulate gold collection
        setGold((prevGold) => {
          const allCollected = prevGold + goldCollected;

          console.log(`Reporting gold: ${goldCollected}`);
          socket.emit("report", {
            gold: allCollected,
            player_id: data.player_id,
          });

          return allCollected;
        });
      }, 5000);

      return () => clearInterval(intervalId);
    });

    socket.on("leaderboard", (data: []) => {
      console.log("Leaderboard update:", data);
      setLeaderboard(data);
    });

    socket.on("error", (err: Error) => {
      console.error("Socket error:", err);
    });

    return () => {
      socket.off("connect");
      socket.off("leaderboard");
      socket.off("error");
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Gold Rush Event</h1>
        <p>Gold Collected: {gold}</p>
        <h2>Leaderboard</h2>
        <ul>
          {leaderboard.map(
            (item: { _id: string; player_id: string; gold: number }) => (
              <li key={item._id}>
                {item.player_id}: {item.gold}
              </li>
            )
          )}
        </ul>
      </header>
    </div>
  );
};

export default App;
