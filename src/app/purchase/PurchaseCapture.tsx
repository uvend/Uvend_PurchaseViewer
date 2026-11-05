"use client";

import { ChangeEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { FieldShell } from "@/components/field/field-shell";
import { parseSlipText } from "@/lib/slip-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CaptureKind = "slip" | "item";

type PhotoState = {
  file: File;
  fileName: string;
  mimeType: string;
  previewUrl: string;
};

type ReusableLabel = {
  shop: string;
  slipLabel: string;
  itemLabel: string;
  description: string;
};

type SignedInUser = {
  userId: string;
  username: string;
  role: "USER" | "ADMIN" | "INSTALLER";
};

type OcrCapture = {
  text: string;
  requestId: string;
  words: { text: string; score: number }[];
  imageWidth: number | null;
  imageHeight: number | null;
  file: File;
};

type JobOption = {
  id: string;
  title: string;
  customerName: string;
  address: string;
  status: "TODO" | "ACTIVE" | "COMPLETE";
};

const shops = [
  "Builders",
  "Plumblink",
  "Astore",
  "Midas",
  "Masterparts",
  "Brights",
  "Cashbuild",
  "BUCO",
  "Build It",
  "Progress",
  "ABM Plumblink",
  "AutoZone",
  "Agrimark",
  "Sparesboyz",
  "Small hardware nearby",
  "Other shop",
];

const starterLabels: ReusableLabel[] = [
  {
    shop: "Builders",
    slipLabel: "Builders slip",
    itemLabel: "Materials photo",
    description: "Installation materials",
  },
  {
    shop: "Midas",
    slipLabel: "Midas slip",
    itemLabel: "Vehicle parts photo",
    description: "Vehicle parts for installer route",
  },
  {
    shop: "Masterparts",
    slipLabel: "Masterparts slip",
    itemLabel: "Replacement part photo",
    description: "Replacement part",
  },
];

const stepLabels = ["Slip", "Item", "Shop", "Details", "Confirm"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [signedInUser, setSignedInUser] = useState<SignedInUser | null>(null);
  const [shop, setShop] = useState("");
  const [customShop, setCustomShop] = useState("");
  const [slipPhoto, setSlipPhoto] = useState<PhotoState | null>(null);
  const [itemPhoto, setItemPhoto] = useState<PhotoState | null>(null);
  const [slipLabel, setSlipLabel] = useState("Slip pic");
  const [itemLabel, setItemLabel] = useState("Item pic");
  const [description, setDescription] = useState("");
  const [pinnedLabels, setPinnedLabels] = useState<ReusableLabel[]>(starterLabels);
  const [locationStatus, setLocationStatus] = useState("Location not captured yet");
  const [location, setLocation] = useState("");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobId, setJobId] = useState("");
  const [slipNote, setSlipNote] = useState("");
  const [itemNote, setItemNote] = useState("");
  const [slipTotal, setSlipTotal] = useState("");
  const [slipAmount, setSlipAmount] = useState("");
  const [slipRefunds, setSlipRefunds] = useState("");
  const [slipDateTime, setSlipDateTime] = useState("");
  const [slipCard, setSlipCard] = useState("");
  const [slipNotes, setSlipNotes] = useState("");
  const [ocrCapture, setOcrCapture] = useState<OcrCapture | null>(null);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "reading" | "done" | "failed">("idle");
  const ocrRequest = useRef(0);
  const filledByOcr = useRef(false);

  const selectedShop =
    shop === ""
      ? "Not recorded"
      : shop === "Other shop"
        ? customShop || "Custom shop"
        : shop;
  const selectedCard = slipCard.trim() || "Not found";
  const progressWidth = `${((step + 1) / stepLabels.length) * 100}%`;

  useEffect(() => {
    async function loadSession() {
      const response = await fetch("/api/auth/me");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        user: SignedInUser;
      };

      setSignedInUser(data.user);
    }

    loadSession();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      const response = await fetch("/api/jobs");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { jobs: JobOption[] };

      if (!cancelled) {
        setJobs(data.jobs);
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  const latitudeError = coordinateError(manualLatitude, -90, 90, "Latitude");
  const longitudeError = coordinateError(manualLongitude, -180, 180, "Longitude");
  const customShopError = shop === "Other shop" && !customShop.trim() ? "Enter the shop name." : "";
  const descriptionError = description.trim() ? "" : "Add a description.";
  const slipLabelError = slipLabel.trim() ? "" : "Add a slip label.";
  const itemLabelError = itemLabel.trim() ? "" : "Add an item label.";
  const slipPhotoError = slipPhoto ? "" : "Photograph the slip.";
  const itemPhotoError = itemPhoto ? "" : "Photograph the item.";
  const ocrPending = ocrStatus === "reading";

  const canContinue = useMemo(() => {
    if (step === 0) {
      return !slipPhotoError && !ocrPending;
    }

    if (step === 1) {
      return !itemPhotoError;
    }

    if (step === 2) {
      return !customShopError && !latitudeError && !longitudeError;
    }

    if (step === 3) {
      return !descriptionError && !slipLabelError && !itemLabelError;
    }

    return true;
  }, [
    customShopError,
    descriptionError,
    itemLabelError,
    itemPhotoError,
    latitudeError,
    longitudeError,
    ocrPending,
    slipLabelError,
    slipPhotoError,
    step,
  ]);

  function nextStep() {
    if (!canContinue) {
      return;
    }

    setStep((currentStep) => Math.min(currentStep + 1, stepLabels.length - 1));
  }

  function previousStep() {
    setStep((currentStep) => Math.max(currentStep - 1, 0));
  }

  async function acceptPhoto(file: File, captureKind: CaptureKind) {
    const prepared = await compressPhoto(file);

    if (!prepared) {
      if (captureKind === "slip") {
        ocrRequest.current += 1;
        setSlipPhoto(null);
        setOcrCapture(null);
        setOcrStatus("failed");
        setSlipNote("That photo is too large to read. Take it again, closer to the slip.");
      } else {
        setItemPhoto(null);
        setItemNote("That photo is too large. Take it again.");
      }
      return;
    }

    const photo = {
      file: prepared,
      fileName: prepared.name,
      mimeType: prepared.type || "image/jpeg",
      previewUrl: URL.createObjectURL(prepared),
    };

    if (captureKind === "slip") {
      setItemNote("");
      setSlipPhoto(photo);
      setOcrStatus("reading");
      void readSlip(prepared);
      return;
    }

    setItemNote("");
    setItemPhoto(photo);
  }

  function redoPhoto(captureKind: CaptureKind) {
    if (captureKind === "slip") {
      ocrRequest.current += 1;
      setSlipPhoto(null);
      setSlipNote("");
      setSlipNotes("");
      setSlipTotal("");
      setSlipAmount("");
      setSlipRefunds("");
      setSlipDateTime("");
      setSlipCard("");
      setOcrCapture(null);
      setOcrStatus("idle");
      if (filledByOcr.current) {
        filledByOcr.current = false;
        setDescription("");
      }
      return;
    }

    setItemPhoto(null);
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not available on this device");
      return;
    }

    setLocationStatus("Capturing current location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const capturedLocation = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
        setLocation(capturedLocation);
        setManualLatitude(position.coords.latitude.toFixed(5));
        setManualLongitude(position.coords.longitude.toFixed(5));
        setLocationStatus("Location captured");
      },
      () => {
        setLocationStatus("Location permission denied or unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function pinCurrentLabel() {
    const reusableLabel = {
      shop: selectedShop,
      slipLabel,
      itemLabel,
      description,
    };

    setPinnedLabels((currentLabels) => [reusableLabel, ...currentLabels]);
  }

  function applyPinnedLabel(label: ReusableLabel) {
    setShop(shops.includes(label.shop) ? label.shop : "Other shop");
    setCustomShop(shops.includes(label.shop) ? "" : label.shop);
    setSlipLabel(label.slipLabel);
    setItemLabel(label.itemLabel);
    setDescription(label.description);
  }

  function resetFlow(message?: string) {
    setStep(0);
    setShop("");
    setCustomShop("");
    setSlipPhoto(null);
    setItemPhoto(null);
    setSlipLabel("Slip pic");
    setItemLabel("Item pic");
    setDescription("");
    setSlipNote("");
    setSlipNotes("");
    setSlipTotal("");
    setSlipAmount("");
    setSlipRefunds("");
    setSlipDateTime("");
    setSlipCard("");
    setOcrCapture(null);
    setOcrStatus("idle");
    filledByOcr.current = false;
    ocrRequest.current += 1;
    setLocation("");
    setManualLatitude("");
    setManualLongitude("");
    setLocationStatus("Location not captured yet");
    setSubmitMessage(message ?? "");
    setJobId("");
  }

  async function readSlip(file: File) {
    const requestId = ocrRequest.current + 1;
    ocrRequest.current = requestId;
    setSlipNote("Reading the slip...");
    setOcrStatus("reading");

    try {
      const prepared = await compressPhoto(file);

      if (!prepared) {
        setOcrCapture(null);
        setOcrStatus("failed");
        setSlipNote("That photo is too large to read. Take it again, closer to the slip.");
        return;
      }

      const body = new FormData();
      body.append("file", prepared, "slip.jpg");
      const response = await fetch("/api/ocr", { method: "POST", body });
      const data = (await response.json()) as {
        text?: string;
        error?: string;
        requestId?: string;
        words?: { text: string; score: number }[];
        imageWidth?: number | null;
        imageHeight?: number | null;
        fields?: {
          total: string;
          amount: string;
          refunds: string;
          dateTime: string;
          card: string;
          notes: string;
        };
      };

      if (requestId !== ocrRequest.current) {
        return;
      }

      if (!response.ok) {
        setOcrCapture(null);
        setOcrStatus("failed");
        setSlipNote(data.error || "Could not read the slip. You can continue and type the details.");
        return;
      }

      const text = data.text?.trim() ?? "";
      const fields = data.fields ?? parseSlipText(text);
      setSlipTotal(fields.total);
      setSlipAmount(fields.amount);
      setSlipRefunds(fields.refunds);
      setSlipDateTime(fields.dateTime);
      setSlipCard(fields.card);
      setSlipNotes(fields.notes);
      const summary = [
        fields.total && `Total ${fields.total}`,
        fields.amount && `Amount ${fields.amount}`,
        fields.refunds && `Refund ${fields.refunds}`,
      ]
        .filter(Boolean)
        .join(", ");
      setOcrCapture({
        text,
        requestId: data.requestId ?? "",
        words: data.words ?? [],
        imageWidth: data.imageWidth ?? null,
        imageHeight: data.imageHeight ?? null,
        file: prepared,
      });
      setDescription((current) => (current.trim() && !filledByOcr.current ? current : summary));
      filledByOcr.current = Boolean(summary);
      setOcrStatus("done");
      setSlipNote(text ? "Filled from the slip. You can edit it before saving." : "No text found on the slip.");
    } catch {
      if (requestId !== ocrRequest.current) {
        return;
      }

      setSlipNote("Could not read the slip. You can continue and type the details.");
      setOcrCapture(null);
      setOcrStatus("failed");
    }
  }

  function readFileAsBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function getCoordinates() {
    const manualLat = Number(manualLatitude.trim());
    const manualLng = Number(manualLongitude.trim());

    if (Number.isFinite(manualLat) && Number.isFinite(manualLng)) {
      return { latitude: manualLat, longitude: manualLng };
    }

    const [latitude, longitude] = location
      .split(",")
      .map((coordinate) => Number(coordinate.trim()));

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }

    return { latitude: undefined, longitude: undefined };
  }

  async function submitAndReset() {
    if (!slipPhoto || !itemPhoto) {
      setSubmitMessage("Please capture both photos before submitting.");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("Saving purchase...");

    try {
      const coordinates = getCoordinates();
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopName: selectedShop,
          customShop: shop === "Other shop",
          cardLabel: selectedCard,
          description,
          slipTotal,
          slipAmount,
          slipRefunds,
          slipDateTime,
          slipCard,
          slipNotes,
          jobId: jobId || null,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          locationStatus,
          slipLabel,
          slipImage: {
            fileName: slipPhoto.fileName,
            mimeType: slipPhoto.mimeType,
            base64: await readFileAsBase64(slipPhoto.file),
          },
          itemLabel,
          itemImage: {
            fileName: itemPhoto.fileName,
            mimeType: itemPhoto.mimeType,
            base64: await readFileAsBase64(itemPhoto.file),
          },
          ocr: ocrCapture
            ? {
                text: ocrCapture.text,
                requestId: ocrCapture.requestId,
                words: ocrCapture.words,
                imageWidth: ocrCapture.imageWidth,
                imageHeight: ocrCapture.imageHeight,
                image: {
                  fileName: ocrCapture.file.name || "slip.jpg",
                  mimeType: ocrCapture.file.type || "image/jpeg",
                  base64: await readFileAsBase64(ocrCapture.file),
                },
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Purchase save failed");
      }

      const result = (await response.json()) as {
        purchase: {
          id: string;
        };
      };

      resetFlow(`Purchase saved. Reference: ${result.purchase.id}`);
    } catch {
      setSubmitMessage("Could not save purchase. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FieldShell
      subtitle={signedInUser ? `@${signedInUser.username}` : "Not signed in"}
      title="New purchase"
      tone="navy"
      headerExtra={
        <div className="mt-3" aria-label={`Step ${step + 1} of ${stepLabels.length}`}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{stepLabels[step]}</span>
            <span className="text-blue-200">
              {step + 1} of {stepLabels.length}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full bg-white transition-[width] duration-200" style={{ width: progressWidth }} />
          </div>
        </div>
      }
      footer={
        <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
          <Button disabled={step === 0} onClick={previousStep} type="button" variant="outline">
            Back
          </Button>
          {step < stepLabels.length - 1 ? (
            <Button disabled={!canContinue} onClick={nextStep} type="button">
              {ocrPending && step === 0 ? "Reading slip..." : "Continue"}
            </Button>
          ) : (
            <Button disabled={isSubmitting} onClick={submitAndReset} type="button">
              {isSubmitting ? "Saving..." : "Save purchase"}
            </Button>
          )}
        </div>
      }
    >
      {submitMessage ? <Notice>{submitMessage}</Notice> : null}

        {step === 2 && (
          <section className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Which shop?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Shop is optional. Latitude and longitude are required.
              </p>
            </div>

            <Button onClick={() => setShop("")} type="button" variant={shop === "" ? "default" : "outline"}>
              Skip shop
            </Button>

            <div className="grid grid-cols-2 gap-2">
              {shops.map((shopName) => (
                <Button
                  className="h-auto min-h-11 whitespace-normal px-3 py-3"
                  key={shopName}
                  onClick={() => setShop(shopName)}
                  type="button"
                  variant={shop === shopName ? "default" : "outline"}
                >
                  {shopName}
                </Button>
              ))}
            </div>

            {shop === "Other shop" && (
              <div className="grid gap-2">
                <Label htmlFor="custom-shop">Custom shop name</Label>
                <Input
                  aria-invalid={customShopError ? true : undefined}
                  autoComplete="organization"
                  id="custom-shop"
                  onChange={(event) => setCustomShop(event.target.value)}
                  placeholder="Enter supplier"
                  value={customShop}
                />
                <FieldError message={customShopError} />
              </div>
            )}

            <Button onClick={captureLocation} type="button" variant="secondary">
              Use current GPS
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  aria-invalid={latitudeError ? true : undefined}
                  id="latitude"
                  inputMode="decimal"
                  onChange={(event) => setManualLatitude(event.target.value)}
                  placeholder="-33.9249"
                  value={manualLatitude}
                />
                <FieldError message={latitudeError} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  aria-invalid={longitudeError ? true : undefined}
                  id="longitude"
                  inputMode="decimal"
                  onChange={(event) => setManualLongitude(event.target.value)}
                  placeholder="18.4241"
                  value={manualLongitude}
                />
                <FieldError message={longitudeError} />
              </div>
            </div>
            <p
              className={cn(
                "text-sm",
                locationStatus === "Location permission denied or unavailable" ||
                  locationStatus === "Geolocation is not available on this device"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {locationStatus}
              {manualLatitude && manualLongitude
                ? `: ${manualLatitude}, ${manualLongitude}`
                : location
                  ? `: ${location}`
                  : ""}
            </p>
          </section>
        )}

        {step === 0 && (
          <>
            <CaptureScreen
              captureKind="slip"
              error={slipPhoto ? "" : slipPhotoError}
              heading="Photograph the slip"
              helper="The reader fills the amounts and the card number from the slip."
              note={slipPhoto ? "" : slipNote}
              onCapture={acceptPhoto}
              onRedo={redoPhoto}
              photo={slipPhoto}
            >
              {slipPhoto ? (
                <div className="grid gap-3">
                  <SlipField id="slip-total" label="Total" onChange={setSlipTotal} value={slipTotal} />
                  <SlipField id="slip-amount" label="Amount" onChange={setSlipAmount} value={slipAmount} />
                  <SlipField id="slip-refunds" label="Refunds" onChange={setSlipRefunds} value={slipRefunds} />
                  <SlipField id="slip-when" label="Date and time" onChange={setSlipDateTime} value={slipDateTime} />
                  <SlipField id="slip-card" label="Card number" onChange={setSlipCard} value={slipCard} />
                  <div className="grid gap-2">
                    <Label htmlFor="slip-notes">Notes</Label>
                    <Textarea
                      id="slip-notes"
                      onChange={(event) => setSlipNotes(event.target.value)}
                      placeholder={slipNote === "Reading the slip..." ? "Reading the slip..." : "The rest of the slip"}
                      rows={4}
                      value={slipNotes}
                    />
                  </div>
                  {slipNote ? (
                    <p className={cn("text-sm", ocrStatus === "failed" ? "text-destructive" : "text-muted-foreground")}>
                      {slipNote}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </CaptureScreen>
          </>
        )}

        {step === 1 && (
          <CaptureScreen
            captureKind="item"
            error={itemPhoto ? "" : itemNote || itemPhotoError}
            heading="Photograph the item"
            helper="The part, tool, or material, so it can be matched to the slip."
            onCapture={acceptPhoto}
            onRedo={redoPhoto}
            photo={itemPhoto}
          />
        )}

        {step === 3 && (
          <section className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Job card</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Attach this purchase to a job, or skip and add it on the invoice later.
              </p>
            </div>

            <div className="grid gap-2">
              <button className={choiceClass(jobId === "")} onClick={() => setJobId("")} type="button">
                <span className="block font-medium">No job card</span>
                <span className="mt-0.5 block text-muted-foreground">You can attach it on the invoice</span>
              </button>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No job cards yet.</p>
              ) : (
                jobs.map((job) => (
                  <button
                    className={choiceClass(jobId === job.id)}
                    key={job.id}
                    onClick={() => setJobId(job.id)}
                    type="button"
                  >
                    <span className="block font-medium">{job.title}</span>
                    <span className="mt-0.5 block text-muted-foreground">{job.customerName}</span>
                    <span className="block text-muted-foreground">{job.address}</span>
                  </button>
                ))
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold tracking-tight">Label it</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A short description is enough. Pin ones you use often.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1">{selectedShop}</span>
              <span className="rounded-md bg-muted px-2 py-1">{selectedCard}</span>
              <span className="rounded-md bg-muted px-2 py-1">{slipPhoto?.fileName || "Slip"}</span>
              <span className="rounded-md bg-muted px-2 py-1">{itemPhoto?.fileName || "Item"}</span>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slip-label">Slip label</Label>
              <Input
                aria-invalid={slipLabelError ? true : undefined}
                id="slip-label"
                onChange={(event) => setSlipLabel(event.target.value)}
                value={slipLabel}
              />
              <FieldError message={slipLabelError} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-label">Item label</Label>
              <Input
                aria-invalid={itemLabelError ? true : undefined}
                id="item-label"
                onChange={(event) => setItemLabel(event.target.value)}
                value={itemLabel}
              />
              <FieldError message={itemLabelError} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                aria-invalid={descriptionError ? true : undefined}
                id="description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="PVC conduit and fittings for the Claremont install"
                rows={4}
                value={description}
              />
              <FieldError message={descriptionError} />
            </div>

            <Button onClick={pinCurrentLabel} type="button" variant="outline">
              Pin this label
            </Button>

            <div className="grid gap-2" aria-label="Pinned labels">
              {pinnedLabels.map((label, index) => (
                <button
                  className="rounded-lg border bg-card px-3 py-3 text-left text-sm hover:bg-accent"
                  key={`${label.shop}-${label.description}-${index}`}
                  onClick={() => applyPinnedLabel(label)}
                  type="button"
                >
                  <span className="block font-medium">{label.shop}</span>
                  <span className="mt-0.5 block text-muted-foreground">{label.description}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Check it</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This is what gets stored with the photos.
              </p>
            </div>

            <div className="rounded-xl border bg-card px-4">
              <Row label="Shop" value={selectedShop} />
              <Row label="User" value={signedInUser ? `@${signedInUser.username}` : "Not signed in"} />
              <Row label="Card number" value={selectedCard} />
              <Row label="Slip" value={slipLabel} />
              <Row label="Item photo" value={itemLabel} />
              <Row label="Description" value={description} />
              <Row label="Total" value={slipTotal || "Not found"} />
              <Row label="Amount" value={slipAmount || "Not found"} />
              <Row label="Refunds" value={slipRefunds || "Not found"} />
              <Row label="Date and time" value={slipDateTime || "Not found"} />
              <Row label="Notes" value={slipNotes || "None"} />
              <Row
                label="Job"
                value={jobs.find((job) => job.id === jobId)?.title ?? "No job card"}
              />
              <Row
                label="Location"
                value={
                  manualLatitude && manualLongitude
                    ? `${manualLatitude}, ${manualLongitude}`
                    : location || "Not added"
                }
              />
            </div>
          </section>
        )}
    </FieldShell>
  );
}

function SlipField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} onChange={(event) => onChange(event.target.value)} value={value} />
    </div>
  );
}

function CaptureScreen({
  captureKind,
  error,
  heading,
  helper,
  note,
  onCapture,
  onRedo,
  photo,
  children,
}: {
  captureKind: CaptureKind;
  error?: string;
  heading: string;
  helper: string;
  note?: string;
  onCapture: (file: File, captureKind: CaptureKind) => void;
  onRedo: (captureKind: CaptureKind) => void;
  photo: PhotoState | null;
  children?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraNote, setCameraNote] = useState("");

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!cameraOn || !video || !stream) {
      return;
    }

    video.srcObject = stream;
    void video.play().catch(() => {
      setCameraNote("The camera did not start. Choose a photo instead.");
    });
  }, [cameraOn]);

  async function openCamera() {
    setCameraNote("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraNote("This device has no camera. Choose a photo instead.");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 960, max: 1280 },
          height: { ideal: 720, max: 960 },
        },
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setCameraNote("Camera permission was denied. Choose a photo instead.");
    }
  }

  function takePhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth) {
      setCameraNote("The camera is not ready yet.");
      return;
    }

    const longest = Math.max(video.videoWidth, video.videoHeight);
    const scale = Math.min(1, 1024 / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      setCameraNote("Could not save that photo. Try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraNote("Could not save that photo. Try again.");
          return;
        }

        stopCamera();
        onCapture(new File([blob], `${captureKind}.jpg`, { type: "image/jpeg" }), captureKind);
      },
      "image/jpeg",
      0.5,
    );
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    stopCamera();
    onCapture(file, captureKind);
  }

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      </div>

      <video
        autoPlay
        className={cn(
          "w-full rounded-xl border bg-black object-cover",
          cameraOn && !photo ? "h-72" : "pointer-events-none absolute h-px w-px opacity-0",
        )}
        muted
        playsInline
        ref={videoRef}
      />
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={`${captureKind} preview`} className="h-72 w-full rounded-xl border object-cover" src={photo.previewUrl} />
      ) : cameraOn ? null : (
        <div
          className={cn(
            "flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/40 px-6 text-center text-sm",
            error && "border-destructive ring-[3px] ring-destructive/30",
          )}
        >
          <Camera className="size-5 text-muted-foreground" />
          <strong>Take a small photo</strong>
          <span className="text-muted-foreground">The camera is capped so the file stays small.</span>
        </div>
      )}

      <FieldError message={photo ? "" : error || ""} />
      {cameraNote ? <p className="text-sm text-destructive">{cameraNote}</p> : null}
      {note ? <p className="text-sm text-destructive">{note}</p> : null}

      {children}

      {photo ? <p className="text-sm text-muted-foreground">{photo.fileName}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        {cameraOn ? (
          <Button className="w-full" onClick={takePhoto} type="button">
            Take photo
          </Button>
        ) : (
          <Button className="w-full" onClick={() => void openCamera()} type="button">
            {photo ? "Retake with camera" : "Open camera"}
          </Button>
        )}
        <Button asChild className="w-full" type="button" variant="outline">
          <label>
            Choose photo
            <input accept="image/*" className="sr-only" onChange={choosePhoto} type="file" />
          </label>
        </Button>
      </div>
      {cameraOn ? (
        <Button onClick={stopCamera} type="button" variant="outline">
          Close camera
        </Button>
      ) : null}
      {photo ? (
        <Button onClick={() => onRedo(captureKind)} type="button" variant="outline">
          Clear photo
        </Button>
      ) : null}
    </section>
  );
}

async function compressPhoto(file: File) {
  const limit = 500 * 1024;
  let maxEdge = 1024;
  let quality = 0.5;

  try {
    const bitmap = await createImageBitmap(file);

    try {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          break;
        }

        context.drawImage(bitmap, 0, 0, width, height);
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", quality);
        });

        if (blob && blob.size > 0 && blob.size <= limit) {
          return new File([blob], "photo.jpg", { type: "image/jpeg" });
        }

        quality = Math.max(0.35, quality - 0.08);
        maxEdge = Math.round(maxEdge * 0.8);
      }
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }

  return null;
}

function FieldError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

function coordinateError(value: string, minimum: number, maximum: number, label: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return `${label} is required.`;
  }

  const number = Number(trimmed);

  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    return `Enter a valid ${label.toLowerCase()}.`;
  }

  return "";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <strong className="max-w-[65%] text-right font-medium">{value}</strong>
    </div>
  );
}

function choiceClass(selected: boolean) {
  return cn(
    "rounded-lg border bg-card px-3 py-3 text-left text-sm transition-colors hover:bg-accent",
    selected && "border-foreground bg-accent",
  );
}
