"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminFrame } from "../AdminFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";

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
    <AdminFrame kicker="People" title="Staff">
      {message ? <Notice>{message}</Notice> : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <form className="grid h-fit gap-4 rounded-xl border bg-card p-5" onSubmit={createUser}>
          <h2 className="text-base font-semibold tracking-tight">New login</h2>
          <div className="grid gap-2">
            <Label htmlFor="staff-name">Full name</Label>
            <Input
              id="staff-name"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Raymond Adams"
              required
              value={form.name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="staff-username">Username</Label>
            <Input
              id="staff-username"
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              placeholder="raymond"
              required
              value={form.username}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="name@company.co.za"
              type="email"
              value={form.email}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="staff-password">Password</Label>
            <Input
              id="staff-password"
              minLength={6}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Minimum 6 characters"
              required
              type="password"
              value={form.password}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="staff-role">Role</Label>
            <select
              className={controlClass}
              id="staff-role"
              onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
              value={form.role}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button disabled={saving} type="submit">
            {saving ? "Saving..." : "Create user"}
          </Button>
        </form>

        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Current users</h2>
            {loading ? <span className="text-sm text-muted-foreground">Loading...</span> : null}
          </div>
          <div className="grid gap-2">
            {users.map((user) => (
              <article className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm" key={user.id}>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-muted-foreground">@{user.username}</p>
                  <p className="text-muted-foreground">{user.email || "No email"}</p>
                </div>
                <Badge variant="outline">{getRoleLabel(user.role)}</Badge>
              </article>
            ))}
            {!loading && users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users created yet.</p>
            ) : null}
          </div>
        </section>
      </section>

      <LoginTracePanel />
    </AdminFrame>
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
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Recent sign-ins</h2>
        {loading ? <span className="text-sm text-muted-foreground">Loading...</span> : null}
      </div>
      <div className="grid gap-2">
        {events.map((event) => (
          <article className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm" key={event.id}>
            <div>
              <p className="font-medium">
                {event.user?.name || event.username} @{event.username}
              </p>
              <p className="text-muted-foreground">
                {event.source} · {event.success ? "signed in" : "failed"}
                {event.role ? ` · ${getRoleLabel(event.role)}` : ""}
              </p>
            </div>
            <span className="text-muted-foreground">
              {new Intl.DateTimeFormat("en-ZA", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(event.createdAt))}
            </span>
          </article>
        ))}
        {!loading && events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sign-ins recorded yet.</p>
        ) : null}
      </div>
    </section>
  );
}
