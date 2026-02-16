import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function HomePage() {
  const [health, setHealth] = useState("checking...");

  useEffect(() => {
    const run = async () => {
      try {
        const data = await api("/health", { method: "GET" });
        setHealth(data.ok ? "ok" : "unhealthy");
      } catch {
        setHealth("unreachable");
      }
    };

    run();
  }, []);

  return (
    <section className="card">
      <h1>Home</h1>
      <p>API health: {health}</p>
      <p>Use the Books page to search across free full-text sources.</p>
    </section>
  );
}
