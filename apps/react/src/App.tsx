import React from "react";
import { Route, Routes } from "react-router-dom";
import { HelloWorld } from "./views";
import ScheduleDashboard from "./components/ScheduleDashboard";
import CreateEventPage from "./components/CreateEventPage";
import EventDashboard from "./components/EventDashboard";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CreateEventPage />} />
      <Route path="/event/:eventId" element={<EventDashboard />} />
      <Route path="/hello" element={<HelloWorld />} />
    </Routes>
  );
};

export default App;
