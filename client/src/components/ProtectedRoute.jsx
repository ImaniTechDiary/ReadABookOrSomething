import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading session...</p>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
