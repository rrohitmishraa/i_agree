import React from "react";
import { Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import FormPage from "./FormPage";
import ThankYouPage from "./ThankYouPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<FormPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />
    </Routes>
  );
};

export default App;
