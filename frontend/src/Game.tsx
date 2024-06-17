import "./App.css";
import React, { useState } from "react";

type Props = {
  token: string;
};

const App: React.FC<Props> = ({ token }) => {
  const [event, setEvent] = useState<{ _id: string; state: string } | null>(
    null
  );
  const [gold, setGold] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<[]>([]);
  const [reward, setReward] = useState<string>("");
  const [showClaim, setShowClaim] = useState<boolean>(false);

  const handleGetEvent = async () => {
    const response = await fetch("http://localhost:3000/event", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setEvent(data);
    setGold(0);
    setShowClaim(false);
    setReward("");
    setLeaderboard([]);
  };

  const handleReportGold = async () => {
    if (!event?._id) {
      console.log("No event found");
      return;
    }

    const newGold = Math.floor(Math.random() * 10) + 1;
    const allGold = gold + newGold;
    setGold(allGold);

    const response = await fetch("http://localhost:3000/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event_id: event._id,
        gold: allGold,
        type: "whale",
      }),
    });
    const data = await response.json();

    if (data.message === "Event finished, claim your rewards") {
      setShowClaim(true);
      setGold(0);
    }
  };

  const handleGetLeaderboard = async () => {
    if (!event) {
      console.log("No event ID found");
      return;
    }

    const response = await fetch(
      `http://localhost:3000/leaderboard/?event_id=${event._id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    console.log(data);
    setLeaderboard(data);
  };

  const handleClaimReward = async () => {
    if (!event?._id) {
      console.log("No event ID found");
      return;
    }

    const response = await fetch("http://localhost:3000/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ event_id: event._id }),
    });
    const data = await response.json();
    setReward(data.reward);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Gold Rush Event</h1>
        <div className="actions">
          <button onClick={handleGetEvent}>Get event data</button>
          <button onClick={handleReportGold}>Report gold</button>
          <button onClick={handleGetLeaderboard}>Get leaderboard</button>
        </div>
        <p>Gold Collected: {gold}</p>
        {event?._id && <p>Event ID: {event._id}</p>}
        {event?.state && <p>Event State: {event.state}</p>}
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
        {showClaim && <button onClick={handleClaimReward}>Claim Reward</button>}
        {reward && <p>Reward: {reward}</p>}
      </header>
    </div>
  );
};

export default App;
