import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          ReadABookOrSomething
        </Link>

        <nav className="nav-links">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/books">Books</NavLink>
          <NavLink to="/library">Library</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>

        <div className="auth-chip">
          {user ? (
            <>
              <span>{user.name}</span>
              <button type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/auth">Login</Link>
          )}
        </div>
      </header>

      <main className="page">{children}</main>
    </div>
  );
}
