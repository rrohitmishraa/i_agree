import React from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "./firebase-config";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const navigate = useNavigate();
  const provider = new GoogleAuthProvider();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate("/form");
    } catch (error) {
      console.error("Error during login", error);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="text-center space-y-6 relative z-10">
        <h1 className="text-3xl font-bold text-gray-800">Welcome to I-Agree</h1>
        <button
          onClick={handleLogin}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow transition-all duration-300"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
