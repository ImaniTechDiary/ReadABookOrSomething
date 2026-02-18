import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const initialRegister = {
  name: "",
  email: "",
  password: "",
  confirmPassword: ""
};

const initialLogin = {
  email: "",
  password: ""
};

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const onRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const onLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const onRegister = async (event) => {
    event.preventDefault();
    setMessage("");

    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (registerForm.password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    try {
      await register({
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password
      });
      setMessage("Registered and logged in.");
      navigate("/profile");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const onLogin = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await login({
        email: loginForm.email,
        password: loginForm.password
      });
      setMessage("Logged in.");
      navigate("/profile");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="auth-page-center">
      <section className="card auth-card">
        <h1>Account</h1>

      <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => {
            setMode("login");
            setMessage("");
          }}
        >
          Login
        </button>
        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => {
            setMode("register");
            setMessage("");
          }}
        >
          Register
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={onLogin} className="auth-form">
          <input
            name="email"
            value={loginForm.email}
            onChange={onLoginChange}
            placeholder="Email"
            type="email"
            required
          />
          <div className="password-field">
            <input
              name="password"
              value={loginForm.password}
              onChange={onLoginChange}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              required
            />
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit">Login</button>
        </form>
      ) : (
        <form onSubmit={onRegister} className="auth-form">
          <input
            name="name"
            value={registerForm.name}
            onChange={onRegisterChange}
            placeholder="Name"
            required
          />
          <input
            name="email"
            value={registerForm.email}
            onChange={onRegisterChange}
            placeholder="Email"
            type="email"
            required
          />
          <div className="password-field">
            <input
              name="password"
              value={registerForm.password}
              onChange={onRegisterChange}
              placeholder="Password (min 8 chars)"
              type={showPassword ? "text" : "password"}
              required
            />
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <div className="password-field">
            <input
              name="confirmPassword"
              value={registerForm.confirmPassword}
              onChange={onRegisterChange}
              placeholder="Retype password"
              type={showConfirmPassword ? "text" : "password"}
              required
            />
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit">Register</button>
        </form>
      )}

        {message ? <p className="message">{message}</p> : null}
      </section>
    </div>
  );
}
