import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet"; // Import Leaflet for custom icons
import "leaflet/dist/leaflet.css";

const BACKEND_URL = "https://robot-monitoring-backend-2.onrender.com"; // Replace with Render URL

const App = () => {
  const [robots, setRobots] = useState([]);
  const [filter, setFilter] = useState("all");

  // Fetch initial robot data
  useEffect(() => {
    const fetchRobots = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/robots`);
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        const data = await response.json();
        setRobots(data);
      } catch (error) {
        console.error("Error fetching robots:", error);
        alert("Failed to fetch robot data. Please check if the backend is running.");
      }
    };
    fetchRobots();
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    let socket;

    const connectWebSocket = () => {
      socket = new WebSocket(`${BACKEND_URL.replace("http", "ws")}/updates`);

      socket.onmessage = (event) => {
        const updatedRobots = JSON.parse(event.data);
        setRobots(updatedRobots);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        alert("WebSocket connection failed. Retrying in 5 seconds...");
        setTimeout(connectWebSocket, 5000);
      };

      socket.onclose = () => {
        console.log("WebSocket closed. Reconnecting in 5 seconds...");
        setTimeout(connectWebSocket, 5000);
      };
    };

    connectWebSocket();

    return () => {
      if (socket) socket.close();
    };
  }, []);

  // Apply filters
  const filteredRobots = robots.filter((robot) => {
    if (filter === "all") return true;
    if (filter === "online") return robot.status === "Online";
    if (filter === "offline") return robot.status === "Offline";
    if (filter === "low-battery") return robot.battery < 20;
   
    return true;
  });

  // Function to get color for markers based on robot status and battery
  const getStatusColor = (status, battery) => {
    if (status === "Offline") return "red";
    if (battery < 20) return "orange";
    return "green";
  };

  // Function to create a custom Leaflet icon
  const createCustomIcon = (color) =>
    L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color:${color}; width:15px; height:15px; border-radius:50%; border:2px solid black;"></div>`,
      iconSize: [15, 15],
      iconAnchor: [7.5, 7.5],
    });

  return (
    <div>
      <h1>Robot Monitoring Dashboard</h1>

      {/* Filters */}
      <div>
        <button onClick={() => setFilter("all")}>All Robots</button>
        <button onClick={() => setFilter("online")}>Online</button>
        <button onClick={() => setFilter("offline")}>Offline</button>
        <button onClick={() => setFilter("low-battery")}>Low Battery</button>
      </div>

      {/* Map View */}
      <MapContainer center={[0, 0]} zoom={2} style={{ height: "400px", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {filteredRobots.map((robot) => {
          if (
            Array.isArray(robot.location) &&
            robot.location.length === 2 &&
            typeof robot.location[0] === "number" &&
            typeof robot.location[1] === "number"
          ) {
            const color = getStatusColor(robot.status, robot.battery);
            return (
              <Marker
                key={robot.id}
                position={robot.location}
                icon={createCustomIcon(color)} // Use the custom icon
              >
                <Popup>
                  <strong>{robot.id}</strong>
                  <br />
                  Status: {robot.status}
                  <br />
                  Battery: {robot.battery}%
                  <br />
                  CPU: {robot.cpu}%
                  <br />
                  RAM: {robot.ram} MB
                </Popup>
              </Marker>
            );
          }
          return null;
        })}
      </MapContainer>

      {/* Table View */}
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Robot ID</th>
            <th>Battery (%)</th>
            <th>CPU Usage (%)</th>
            <th>RAM Consumption (MB)</th>
            <th>Last Updated</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {filteredRobots.map((robot) => (
            <tr
              key={robot.id}
              style={{
                backgroundColor: getStatusColor(robot.status, robot.battery),
                color: "white",
              }}
            >
              <td>
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    backgroundColor: getStatusColor(robot.status, robot.battery),
                    borderRadius: "50%",
                  }}
                ></span>
              </td>
              <td>{robot.id}</td>
              <td>{robot.battery}%</td>
              <td>{robot.cpu}%</td>
              <td>{robot.ram}</td>
              <td>{new Date(robot.last_updated).toLocaleString()}</td>
              <td>
                {robot.location[0].toFixed(2)}, {robot.location[1].toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
