"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Camera } from "lucide-react";
import { FieldShell } from "@/components/field/field-shell";
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

const businessCards = [
  "Std Bank - **** 7377",
  "Backup business card",
  "Admin card",
  "Other card",
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

const stepLabels = ["Card", "Slip", "Item", "Shop", "Details", "Confirm"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [signedInUser, setSignedInUser] = useState<SignedInUser | null>(null);
  const [shop, setShop] = useState("");
  const [customShop, setCustomShop] = useState("");
  const [businessCard, setBusinessCard] = useState(businessCards[0]);
  const [customCard, setCustomCard] = useState("");
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

  const selectedShop =
    shop === ""
      ? "Not recorded"
      : shop === "Other shop"
        ? customShop || "Custom shop"
        : shop;
  const selectedCard =
    businessCard === "Other card" ? customCard || "Custom card" : businessCard;
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

  const canContinue = useMemo(() => {
    if (step === 0) {
      return businessCard !== "Other card" || customCard.trim().length > 0;
    }

    if (step === 1) {
      return Boolean(slipPhoto);
    }

    if (step === 2) {
      return Boolean(itemPhoto);
    }

    if (step === 3) {
      return shop !== "Other shop" || customShop.trim().length > 0;
    }

    if (step === 4) {
      return description.trim().length > 0;
    }

    return true;
  }, [
    businessCard,
    customCard,
    customShop,
    description,
    itemPhoto,
    shop,
    slipPhoto,
    step,
  ]);

  function nextStep() {
    setStep((currentStep) => Math.min(currentStep + 1, stepLabels.length - 1));
  }

  function previousStep() {
    setStep((currentStep) => Math.max(currentStep - 1, 0));
  }

  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>,
    captureKind: CaptureKind,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const photo = {
      file,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      previewUrl: URL.createObjectURL(file),
    };

    if (captureKind === "slip") {
      setSlipPhoto(photo);
      return;
    }

    setItemPhoto(photo);
  }

  function redoPhoto(captureKind: CaptureKind) {
    if (captureKind === "slip") {
      setSlipPhoto(null);
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
    setBusinessCard(businessCards[0]);
    setCustomCard("");
    setSlipPhoto(null);
    setItemPhoto(null);
    setSlipLabel("Slip pic");
    setItemLabel("Item pic");
    setDescription("");
    setLocation("");
    setManualLatitude("");
    setManualLongitude("");
    setLocationStatus("Location not captured yet");
    setSubmitMessage(message ?? "");
    setJobId("");
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
      showNav={false}
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
              Continue
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

        {step === 3 && (
          <section className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Which shop?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional. Add the supplier if you know it, or leave it for later.
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
                  autoComplete="organization"
                  id="custom-shop"
                  onChange={(event) => setCustomShop(event.target.value)}
                  placeholder="Enter supplier"
                  value={customShop}
                />
              </div>
            )}

            <Button onClick={captureLocation} type="button" variant="secondary">
              Use current GPS
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  inputMode="decimal"
                  onChange={(event) => setManualLatitude(event.target.value)}
                  placeholder="-33.9249"
                  value={manualLatitude}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  inputMode="decimal"
                  onChange={(event) => setManualLongitude(event.target.value)}
                  placeholder="18.4241"
                  value={manualLongitude}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
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
          <section className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Which card?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This is what admin matches to the bank statement.
              </p>
            </div>

            <div className="grid gap-2">
              {businessCards.map((cardName) => (
                <button
                  className={choiceClass(businessCard === cardName)}
                  key={cardName}
                  onClick={() => setBusinessCard(cardName)}
                  type="button"
                >
                  <span className="block font-medium">{cardName}</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    {cardName.includes("7377") ? "Standard Bank card" : "Tap if this was the card"}
                  </span>
                </button>
              ))}
            </div>

            {businessCard === "Other card" && (
              <div className="grid gap-2">
                <Label htmlFor="custom-card">Custom card label</Label>
                <Input
                  autoComplete="off"
                  id="custom-card"
                  onChange={(event) => setCustomCard(event.target.value)}
                  placeholder="FNB card ending 1234"
                  value={customCard}
                />
              </div>
            )}

            <div className="grid gap-1 text-sm text-muted-foreground">
              <p>Card: {selectedCard}</p>
            </div>
          </section>
        )}

        {step === 1 && (
          <CaptureScreen
            captureKind="slip"
            heading="Photograph the slip"
            helper="Photograph the card slip clearly."
            onChange={handlePhotoChange}
            onRedo={redoPhoto}
            photo={slipPhoto}
          />
        )}

        {step === 2 && (
          <CaptureScreen
            captureKind="item"
            heading="Photograph the item"
            helper="The part, tool, or material, so it can be matched to the slip."
            onChange={handlePhotoChange}
            onRedo={redoPhoto}
            photo={itemPhoto}
          />
        )}

        {step === 4 && (
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
              <Input id="slip-label" onChange={(event) => setSlipLabel(event.target.value)} value={slipLabel} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-label">Item label</Label>
              <Input id="item-label" onChange={(event) => setItemLabel(event.target.value)} value={itemLabel} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="PVC conduit and fittings for the Claremont install"
                rows={4}
                value={description}
              />
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

        {step === 5 && (
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
              <Row label="Card" value={selectedCard} />
              <Row label="Slip" value={slipLabel} />
              <Row label="Item photo" value={itemLabel} />
              <Row label="Description" value={description} />
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

function CaptureScreen({
  captureKind,
  heading,
  helper,
  onChange,
  onRedo,
  photo,
}: {
  captureKind: CaptureKind;
  heading: string;
  helper: string;
  onChange: (event: ChangeEvent<HTMLInputElement>, captureKind: CaptureKind) => void;
  onRedo: (captureKind: CaptureKind) => void;
  photo: PhotoState | null;
}) {
  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      </div>

      <label
        className={cn(
          "flex min-h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40 text-center",
          photo && "border-solid p-0",
        )}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`${captureKind} preview`} className="h-72 w-full object-cover" src={photo.previewUrl} />
        ) : (
          <span className="grid justify-items-center gap-2 px-6 text-sm">
            <Camera className="size-5 text-muted-foreground" />
            <strong>Open camera</strong>
            <span className="text-muted-foreground">Or choose a photo from the gallery</span>
          </span>
        )}
        <input
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => onChange(event, captureKind)}
          type="file"
        />
      </label>

      {photo ? <p className="text-sm text-muted-foreground">{photo.fileName}</p> : null}

      <Button disabled={!photo} onClick={() => onRedo(captureKind)} type="button" variant="outline">
        Retake
      </Button>
    </section>
  );
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
