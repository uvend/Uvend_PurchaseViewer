"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FieldShell } from "@/components/field/field-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/textarea";
import { captureGps } from "@/lib/location";

type JobNote = {
  id: string;
  text: string;
  source: string;
  latitude: number | null;
  longitude: number | null;
  locationStatus: string | null;
  createdAt: string;
  user: { name: string | null; username: string | null } | null;
};

type JobDetail = {
  id: string;
  title: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  status: "TODO" | "ACTIVE" | "COMPLETE";
  notes: JobNote[];
};

export default function InstallationJobPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [note, setNote] = useState("");
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadJob() {
      const response = await fetch(`/api/jobs/${params.id}`);

      if (!response.ok) {
        if (!cancelled) {
          setMessage("Could not load this job card.");
        }
        return;
      }

      const data = (await response.json()) as { job: JobDetail };

      if (!cancelled) {
        setJob(data.job);
      }
    }

    void loadJob();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function loadJob() {
    const response = await fetch(`/api/jobs/${params.id}`);

    if (!response.ok) {
      setMessage("Could not load this job card.");
      return;
    }

    const data = (await response.json()) as { job: JobDetail };
    setJob(data.job);
  }

  async function addNote(text: string, source: "voice" | "typed") {
    const location = await captureGps();
    const response = await fetch(`/api/jobs/${params.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        source,
        latitude: location.latitude,
        longitude: location.longitude,
        locationStatus: location.locationStatus,
      }),
    });

    if (!response.ok) {
      throw new Error("Could not save note");
    }

    setNote("");
    await loadJob();
    setMessage(`Note saved. ${location.locationStatus}`);
  }

  async function submitTyped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!note.trim()) {
      return;
    }

    setSaving(true);

    try {
      await addNote(note, "typed");
    } catch {
      setMessage("Could not save the note.");
    } finally {
      setSaving(false);
    }
  }

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage("Voice notes need Chrome or Edge on this phone.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-ZA";
    recognition.interimResults = false;
    recognition.continuous = false;
    setListening(true);
    setMessage("Listening...");

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (!transcript) {
        setListening(false);
        setMessage("No speech captured. Try again.");
        return;
      }

      try {
        await addNote(transcript, "voice");
      } catch {
        setMessage("Heard the note, but could not save it.");
      } finally {
        setListening(false);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setMessage("Voice capture stopped. Type the note instead.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }

  async function saveJob() {
    setSaving(true);

    try {
      const response = await fetch(`/api/jobs/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETE" }),
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      await loadJob();
      setMessage("Job saved as complete.");
    } catch {
      setMessage("Could not save the job.");
    } finally {
      setSaving(false);
    }
  }

  if (!job) {
    return (
      <FieldShell backHref="/installations" title="Job card">
        <p className="text-sm text-muted-foreground">{message || "Loading job card..."}</p>
      </FieldShell>
    );
  }

  return (
    <FieldShell backHref="/installations" subtitle={job.customerName} title={job.title}>
      <div className="grid gap-3 rounded-xl border bg-card p-4 text-sm">
        <div>
          <p className="font-medium">{job.customerName}</p>
          <p className="text-muted-foreground">{job.address}</p>
          {job.customerPhone ? <p className="text-muted-foreground">{job.customerPhone}</p> : null}
        </div>
        <Button asChild variant="outline">
          <a href={`/api/jobs/${job.id}/pdf`}>Download job card</a>
        </Button>
      </div>

      {message ? <Notice>{message}</Notice> : null}

      <Button disabled={listening} onClick={startVoice} type="button" variant="outline">
        {listening ? "Listening..." : "Record voice note"}
      </Button>

      <form className="grid gap-3" onSubmit={submitTyped}>
        <div className="grid gap-2">
          <Label htmlFor="job-note">Typed note</Label>
          <Textarea
            id="job-note"
            onChange={(event) => setNote(event.target.value)}
            placeholder="What happened on site"
            rows={4}
            value={note}
          />
        </div>
        <Button disabled={saving || !note.trim()} type="submit" variant="secondary">
          Add note and recapture GPS
        </Button>
      </form>

      <div className="grid gap-2">
        {job.notes.map((entry) => (
          <article className="grid gap-1 rounded-xl border bg-card p-4 text-sm" key={entry.id}>
            <strong>{entry.source === "voice" ? "Voice" : "Typed"}</strong>
            <p>{entry.text}</p>
            <p className="text-muted-foreground">
              {entry.user?.name || entry.user?.username || "Staff"} ·{" "}
              {new Intl.DateTimeFormat("en-ZA", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(entry.createdAt))}
            </p>
            <p className="text-muted-foreground">
              {entry.latitude != null && entry.longitude != null
                ? `${entry.latitude.toFixed(5)}, ${entry.longitude.toFixed(5)}`
                : entry.locationStatus || "No GPS"}
            </p>
          </article>
        ))}
      </div>

      <Button disabled={saving} onClick={saveJob} type="button">
        {job.status === "COMPLETE" ? "Saved as complete" : "Save job"}
      </Button>
    </FieldShell>
  );
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start(): void;
  }

  interface SpeechRecognitionEvent {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
  }
}
