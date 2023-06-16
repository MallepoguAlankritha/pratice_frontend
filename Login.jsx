import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Login.css";
import Google from "../SingGoogle/Google.jsx";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [Otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Set loading state to true while making the request

    try {
      const response = await fetch(
        "https://hotel-backend-tge7.onrender.com/signin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const { userId } = data;

        localStorage.setItem("isSignedIn", "true");
        localStorage.setItem("userId", userId);
        navigate("/profile")
      } else {
        console.log("Sign in failed");
      }
    } catch (error) {
      console.log("Error:", error);
    } finally {
      setIsLoading(false); // Set loading state to false after the request is complete
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  const toggleOtpVisibility = () => {
    setShowOtp(!showOtp);
  };
  const handleSignUp = () => {
    navigate("/register"); // Redirect to the signup page
  };

  if (location.pathname !== "/signin") {
    return null;
  }

  return (
    <div className="card-signin">
      {isLoading && (
        <img
          src="https://i.pinimg.com/originals/65/ba/48/65ba488626025cff82f091336fbf94bb.gif"
          alt="Loading"
          className="loading-image"
        />
      )}

      <form onSubmit={handleSignIn}>
        <div className="form-group-signin">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter Your Username"
            className="input-signin"
          />
        </div>
        <div className="form-group-signin">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter Your Password"
            className="input-signin"
          />
          <div className="form-group-signin">
            <input
              type={showOtp ? "text" : "OTP"}
              value={Otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              placeholder="Enter OTP"
              className="input-signin"
            />
          </div><button
            type="button"
            className="show-otp-button-signin"
            onClick={toggleOtpVisibility}
          >
            {showOtp ? "Hide" : "Show"}
          </button>

          <button
            type="button"
            className="show-password-button-signin"
            onClick={togglePasswordVisibility}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <button type="submit-login" disabled={isLoading}>
          Sign In
        </button>
        <Google />
        <br />

        <div className="dhac">
          Don't have an account?
          <button
            type="button"
            onClick={handleSignUp}
            className="signup-button"
          >
            Click Here
          </button>
        </div>
      </form>
      <br />
    </div>
  );
};

export default Login;
