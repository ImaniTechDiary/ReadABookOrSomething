import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const initial = { name: "", email: "", password: "" };

export default function AuthPage() {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const { login, register, refresh } = useAuth();
  const navigate = useNavigate();

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onRegister = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await register(form);
      setMessage("Registered and logged in.");
      navigate("/profile");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const onLogin = async () => {
    setMessage("");
    try {
      await login({ email: form.email, password: form.password });
      setMessage("Logged in.");
      navigate("/profile");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const onRefresh = async () => {
    setMessage("");
    try {
      await refresh();
      setMessage("Tokens refreshed.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="card">
      <h1>Auth</h1>
      <form onSubmit={onRegister}>
        <input
          name="name"
          value={form.name}
          onChange={onChange}
          placeholder="Name"
          required
        />
        <input
          name="email"
          value={form.email}
          onChange={onChange}
          placeholder="Email"
          type="email"
          required
        />
        <input
          name="password"
          value={form.password}
          onChange={onChange}
          placeholder="Password (min 8 chars)"
          type="password"
          required
        />
        <div className="row">
          <button type="submit">Register</button>
          <button type="button" onClick={onLogin}>
            Login
          </button>
          <button type="button" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </form>
      {message ? <p className="message">{message}</p> : null}
    </section>
  );
}
