"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminFrame } from "../AdminFrame";
import { panelClass } from "@/components/admin/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { controlClass, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { formatDateTime, roleLabel } from "@/lib/format";

type Role = "USER" | "ADMIN" | "INSTALLER";

type StaffUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: Role;
  createdAt: string;
};

const emptyForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  role: "USER" as Role,
};

export default function UsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchUsers() {
    const response = await fetch("/api/users");
    const data = (await response.json()) as { users: StaffUser[] };
    return data.users;
  }

  useEffect(() => {
    async function loadUsers() {
      try {
        setUsers(await fetchUsers());
      } catch {
        setMessage("Could not load users.");
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("Saving user...");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <AdminFrame kicker="People who can sign in" title="Users">
      {message ? <Notice>{message}</Notice> : null}
      <section className="grid gap-4 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
        <form className={`${panelClass} grid h-fit gap-4 p-5`} onSubmit={createUser}>
          <h2 className="text-sm font-semibold">New login</h2>
          <div className="grid gap-2">
            <Label htmlFor="staff-name">Full name</Label>
            <Input id="staff-name" onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="staff-username">Username</Label>
            <Input
              id="staff-username"
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
              value={form.username}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              onChange={(event) => setForm({ ...form, email: event.target.value })}
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

        <section className={panelClass}>
          <div className="px-5 pt-4">
            <h2 className="text-sm font-semibold">Current users</h2>
            <p className="text-xs text-slate-500">{loading ? "Loading..." : `${users.length} people`}</p>
          </div>
          <div className="overflow-x-auto px-2 pt-2 pb-3">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-500">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Username</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr className="border-t border-slate-100" key={user.id}>
                    <td className="px-3 py-3 font-medium">{user.name}</td>
                    <td className="px-3 py-3 text-slate-600">@{user.username}</td>
                    <td className="px-3 py-3 text-slate-600">{user.email || "—"}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline">{roleLabel(user.role)}</Badge>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDateTime(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && users.length === 0 ? <p className="px-3 py-6 text-sm text-slate-500">No users created yet.</p> : null}
          </div>
        </section>
      </section>
    </AdminFrame>
  );
}
