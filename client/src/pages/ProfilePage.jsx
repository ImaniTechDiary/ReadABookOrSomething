import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <section className="card">
      <h1>Profile</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </section>
  );
}
