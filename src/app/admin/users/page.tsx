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
import type { UserRole } from "@/lib/roles";

type StaffUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
  createdAt: string;
};

type UserForm = {
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
};

const emptyForm: UserForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  role: "ROAD_USER",
};

const groups: { role: UserRole; title: string; detail: string }[] = [
  { role: "ADMIN", title: "Admin", detail: "Office access, including people" },
  { role: "OFFICE_USER", title: "Office user", detail: "Office dashboard, jobs, and reports" },
  { role: "ROAD_USER", title: "Road user", detail: "Field app only" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [selfId, setSelfId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchUsers() {
    const response = await fetch("/api/users");
    const data = (await response.json()) as { users?: StaffUser[]; error?: string };

    if (!response.ok) {
      throw new Error(data.error || "Could not load users");
    }

    return data.users ?? [];
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [people, meResponse] = await Promise.all([fetchUsers(), fetch("/api/auth/me")]);
        const me = meResponse.ok
          ? ((await meResponse.json()) as { user?: { userId?: string } })
          : { user: undefined };

        if (!cancelled) {
          setUsers(people);
          setSelfId(me.user?.userId ?? "");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Could not load users.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function editUser(user: StaffUser) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      username: user.username,
      email: user.email ?? "",
      password: "",
      role: user.role,
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditingId("");
    setForm(emptyForm);
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(editingId ? "Saving changes..." : "Saving user...");

    try {
      const response = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not save user");
      }

      setUsers(await fetchUsers());
      setMessage(editingId ? "User updated." : "User created.");
      cancelEdit();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save user.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    const person = users.find((user) => user.id === editingId);

    if (!person || !window.confirm(`Delete ${person.name}? This login will stop working.`)) {
      return;
    }

    setSaving(true);
    setMessage("Deleting user...");

    try {
      const response = await fetch(`/api/users/${editingId}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not delete user");
      }

      setUsers(await fetchUsers());
      setMessage("User deleted.");
      cancelEdit();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminFrame kicker="Admin, office, and road logins" title="People">
      {message ? <Notice>{message}</Notice> : null}
      <section className="grid gap-4 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
        <form className={`${panelClass} grid h-fit gap-4 p-5`} onSubmit={saveUser}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{editingId ? "Edit person" : "New login"}</h2>
            {editingId ? (
              <Button onClick={cancelEdit} size="sm" type="button" variant="ghost">
                Cancel
              </Button>
            ) : null}
          </div>
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
            <Label htmlFor="staff-password">{editingId ? "New password" : "Password"}</Label>
            <Input
              id="staff-password"
              minLength={editingId ? undefined : 6}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder={editingId ? "Leave blank to keep the current password" : "Minimum 6 characters"}
              required={!editingId}
              type="password"
              value={form.password}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="staff-role">Role</Label>
            <select
              className={controlClass}
              id="staff-role"
              onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
              value={form.role}
            >
              <option value="ADMIN">Admin</option>
              <option value="OFFICE_USER">Office user</option>
              <option value="ROAD_USER">Road user</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} type="submit">
              {saving ? "Saving..." : editingId ? "Save changes" : "Create user"}
            </Button>
            {editingId && editingId !== selfId ? (
              <Button disabled={saving} onClick={deleteUser} type="button" variant="outline">
                Delete
              </Button>
            ) : null}
          </div>
        </form>

        <div className="grid gap-4">
          {groups.map((group) => {
            const people = users.filter((user) => user.role === group.role);

            return (
              <section className={panelClass} key={group.role}>
                <div className="px-5 pt-4">
                  <h2 className="text-sm font-semibold">{group.title}</h2>
                  <p className="text-xs text-slate-500">
                    {loading ? "Loading..." : `${people.length} · ${group.detail}`}
                  </p>
                </div>
                <div className="overflow-x-auto px-2 pt-2 pb-3">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="text-xs font-medium text-slate-500">
                        <th className="px-3 py-3">Name</th>
                        <th className="px-3 py-3">Username</th>
                        <th className="px-3 py-3">Email</th>
                        <th className="px-3 py-3">Joined</th>
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {people.map((user) => (
                        <tr className="border-t border-slate-100" key={user.id}>
                          <td className="px-3 py-3 font-medium">
                            <span className="block">{user.name}</span>
                            <Badge className="mt-1" variant="outline">
                              {roleLabel(user.role)}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-slate-600">@{user.username}</td>
                          <td className="px-3 py-3 text-slate-600">{user.email || "—"}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDateTime(user.createdAt)}</td>
                          <td className="px-3 py-3 text-right">
                            <Button onClick={() => editUser(user)} size="sm" type="button" variant="outline">
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!loading && people.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-slate-500">No {group.title.toLowerCase()} logins yet.</p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </AdminFrame>
  );
}
