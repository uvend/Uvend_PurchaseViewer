"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AdminLogoutButton } from "../AdminLogoutButton";

type Role = "USER" | "ADMIN" | "INSTALLER";

type StaffUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: Role;
  createdAt: string;
};

type UsersResponse = {
  users: StaffUser[];
};

const emptyForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  role: "USER" as Role,
};

export default function ConfigurePage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchUsers() {
    const response = await fetch("/api/users");
    const data = (await response.json()) as UsersResponse;
    return data.users;
  }

  useEffect(() => {
    async function loadUsers() {
      try {
        const users = await fetchUsers();
        setUsers(users);
      } catch {
        setMessage("Could not load users.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("Saving user...");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Could not create user");
      }

      setForm(emptyForm);
      setUsers(await fetchUsers());
      setMessage("User created.");
    } catch {
      setMessage("Could not create user. Check username/email is unique.");
    } finally {
      setSaving(false);
    }
  }

  return (
      <main className="admin-shell">
      <header className="admin-hero">
        <div>
          <p className="eyebrow">Configure</p>
          <h1>Users and roles</h1>
          <p>Create internal staff users for purchase capture and admin access.</p>
        </div>
        <div className="admin-link-row">
          <Link className="admin-link" href="/admin">
            Dashboard
          </Link>
          <Link className="admin-link" href="/purchase">
            Capture app
          </Link>
          <AdminLogoutButton />
        </div>
      </header>

      {message && <p className="submit-message configure-message">{message}</p>}

      <section className="configure-grid">
        <form className="configure-card" onSubmit={createUser}>
          <p className="screen-kicker">New user</p>
          <h2>Create staff login</h2>

          <label className="field">
            Full name
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Example: Raymond Adams"
            />
          </label>

          <label className="field">
            Username
            <input
              required
              value={form.username}
              onChange={(event) =>
                setForm({ ...form, username: event.target.value })
              }
              placeholder="example: raymond"
            />
          </label>

          <label className="field">
            Email optional
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="name@company.co.za"
            />
          </label>

          <label className="field">
            Password
            <input
              required
              minLength={6}
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              placeholder="Minimum 6 characters"
            />
          </label>

          <label className="field">
            Role
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Saving..." : "Create user"}
          </button>
        </form>

        <section className="configure-card">
          <div className="panel-heading">
            <div>
              <p className="screen-kicker">Staff</p>
              <h2>Current users</h2>
            </div>
            {loading && <span>Loading...</span>}
          </div>

          <div className="user-list">
            {users.map((user) => (
              <article className="user-row" key={user.id}>
                <div>
                  <strong>{user.name}</strong>
                  <span>@{user.username}</span>
                </div>
                <span>{user.email || "No email"}</span>
                <strong>{getRoleLabel(user.role)}</strong>
              </article>
            ))}

            {!loading && users.length === 0 && (
              <p className="empty-list">No users created yet.</p>
            )}
          </div>
        </section>
      </section>

      <LoginTracePanel />
      </main>
  );
}

function getRoleLabel(role: Role) {
  return role === "ADMIN" ? "Admin" : "User";
}

type LoginEvent = {
  id: string;
  username: string;
  role: Role | null;
  success: boolean;
  source: string;
  createdAt: string;
  user: {
    name: string | null;
  } | null;
};

function LoginTracePanel() {
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const response = await fetch("/api/login-events");
        const data = (await response.json()) as { events: LoginEvent[] };
        setEvents(data.events ?? []);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  return (
    <section className="configure-card login-trace-card">
      <div className="panel-heading">
        <div>
          <p className="screen-kicker">Trace</p>
          <h2>User logins</h2>
        </div>
        {loading && <span>Loading...</span>}
      </div>

      <div className="user-list">
        {events.map((event) => (
          <article className="user-row" key={event.id}>
            <div>
              <strong>
                {event.user?.name || event.username} @{event.username}
              </strong>
              <span>
                {event.source} {event.success ? "success" : "failed"}
              </span>
            </div>
            <span>{event.role ? getRoleLabel(event.role) : "Unknown"}</span>
            <strong>
              {new Intl.DateTimeFormat("en-ZA", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(event.createdAt))}
            </strong>
          </article>
        ))}

        {!loading && events.length === 0 && (
          <p className="empty-list">No login events recorded yet.</p>
        )}
      </div>
    </section>
  );
}
