export default function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST" className="logout-control">
      <button className="sidebar-logout" type="submit">
        ↪　Log out
      </button>
    </form>
  );
}
