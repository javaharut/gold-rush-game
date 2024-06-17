import "./Login.css";
import React, { useState } from "react";

type Props = {
  onSetToken: (token: string) => void;
};

const Login: React.FC<Props> = ({ onSetToken }) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleRegister = async () => {
    const response = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    await response.json();
    setMessage("Regitered, you can login now using the same credentials");
  };

  const handleLogin = async () => {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    console.log(data);
    setMessage(data.message);
    onSetToken(data.token);
  };

  console.log(email, password);

  return (
    <div className="Login">
      <form>
        <div>
          <input
            type="text"
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="Email"
          />
        </div>
        <div>
          <input
            type="password"
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="Password"
          />
        </div>
        <div>{message && <p>{message}</p>}</div>
        <button type="button" onClick={handleLogin}>
          Login
        </button>
        <button type="button" onClick={handleRegister}>
          Register
        </button>
      </form>
    </div>
  );
};

export default Login;
