"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { FieldShell } from "@/components/field/field-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/textarea";
import { captureGps } from "@/lib/location";
import { formatSlot, kindLabel, type JobKind } from "@/lib/job-schedule";

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
  kind: JobKind | null;
  meterNumber: string | null;
  startsAt: string | null;
  endsAt: string | null;
  notes: JobNote[];
};

export default function InstallationJobPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [fromVoice, setFromVoice] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    setFromVoice(false);
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
      await addNote(note, fromVoice ? "voice" : "typed");
    } catch {
      setMessage("Could not save the note.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("This phone cannot record a voice note. Type it instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        void fillNoteFromSpeech(blob);
      };

      recorder.start();
      setRecording(true);
      setMessage("Recording. Tap stop when the note is finished.");
    } catch {
      setMessage("Allow the microphone, then try the voice note again.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      setRecording(false);
      return;
    }

    setRecording(false);
    setTranscribing(true);
    setMessage("Turning the recording into text...");
    recorder.stop();
  }

  async function fillNoteFromSpeech(blob: Blob) {
    if (blob.size < 1000) {
      setTranscribing(false);
      setMessage("That recording was too short. Say the note again.");
      return;
    }

    const body = new FormData();
    const extension = blob.type.includes("mp4") ? "m4a" : "webm";
    body.set("file", new File([blob], `note.${extension}`, { type: blob.type || "audio/webm" }));

    try {
      const response = await fetch("/api/speech", { method: "POST", body });
      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !data.text) {
        setMessage(data.error || "Could not turn that recording into text.");
        return;
      }

      const text = data.text;
      setNote((current) => (current.trim() ? `${current.trim()} ${text}` : text));
      setFromVoice(true);
      setMessage("The voice note is in the notes box. Check it, then add the note.");
    } catch {
      setMessage("Could not turn that recording into text.");
    } finally {
      setTranscribing(false);
    }
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
      setMessage("Job complete. You are available again.");
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
          <p className="text-muted-foreground">
            {kindLabel(job.kind)}
            {job.meterNumber ? ` · Meter ${job.meterNumber}` : ""}
          </p>
          {job.startsAt && job.endsAt ? (
            <p className="text-muted-foreground">
              {job.status === "COMPLETE" ? "Available" : "Unavailable"} · {formatSlot(job.startsAt, job.endsAt)}
            </p>
          ) : null}
          <p className="text-muted-foreground">{job.address}</p>
          {job.customerPhone ? <p className="text-muted-foreground">{job.customerPhone}</p> : null}
        </div>
        <Button asChild variant="outline">
          <a href={`/api/jobs/${job.id}/pdf`}>Download job card</a>
        </Button>
      </div>

      {message ? <Notice>{message}</Notice> : null}

      <form className="grid gap-3" onSubmit={submitTyped}>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="job-note">Notes</Label>
            <Button
              disabled={saving || transcribing}
              onClick={recording ? stopRecording : startRecording}
              type="button"
              variant="outline"
            >
              {transcribing ? "Writing the note..." : recording ? "Stop and write the note" : "Record voice note"}
            </Button>
          </div>
          <Textarea
            id="job-note"
            onChange={(event) => setNote(event.target.value)}
            placeholder="What happened on site"
            rows={4}
            value={note}
          />
        </div>
        <Button disabled={saving || recording || transcribing || !note.trim()} type="submit" variant="secondary">
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

      <Button disabled={saving || job.status === "COMPLETE"} onClick={saveJob} type="button">
        {job.status === "COMPLETE" ? "Job complete. You are available." : "Mark job complete"}
      </Button>
    </FieldShell>
  );
}
