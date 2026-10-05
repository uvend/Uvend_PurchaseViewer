"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AdminLogoutButton } from "./admin/AdminLogoutButton";

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

const stepLabels = ["Shop", "Card", "Slip", "Item", "Details", "Confirm"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [signedInUser, setSignedInUser] = useState<SignedInUser | null>(null);
  const [shop, setShop] = useState("Builders");
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

  const selectedShop = shop === "Other shop" ? customShop || "Custom shop" : shop;
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

  const canContinue = useMemo(() => {
    if (step === 0) {
      return shop !== "Other shop" || customShop.trim().length > 0;
    }

    if (step === 1) {
      return businessCard !== "Other card" || customCard.trim().length > 0;
    }

    if (step === 2) {
      return Boolean(slipPhoto);
    }

    if (step === 3) {
      return Boolean(itemPhoto);
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
    <main className="app-shell">
      <section className="phone-card" aria-label="MR A purchase capture flow">
        <header className="hero">
          <div>
            <p className="eyebrow">MR A business card log</p>
            <h1>Capture every road purchase.</h1>
          </div>
          <div className="hero-actions">
            <span className="status-pill">
              {signedInUser ? `@${signedInUser.username}` : "Mobile first"}
            </span>
            <AdminLogoutButton redirectTo="/login" />
          </div>
        </header>

        <div className="progress" aria-label={`Step ${step + 1} of ${stepLabels.length}`}>
          <div className="progress-bar" style={{ width: progressWidth }} />
        </div>

        <nav className="step-tabs" aria-label="Purchase capture steps">
          {stepLabels.map((label, index) => (
            <span className={index === step ? "active" : ""} key={label}>
              {index + 1}. {label}
            </span>
          ))}
        </nav>

        {submitMessage && <p className="submit-message">{submitMessage}</p>}

        {step === 0 && (
          <section className="screen">
            <p className="screen-kicker">Step 1</p>
            <h2>Where was the business card used?</h2>
            <p className="helper">
              Pick a common South African supplier, then add location for the
              purchase statement.
            </p>

            <div className="shop-grid">
              {shops.map((shopName) => (
                <button
                  className={shop === shopName ? "shop-chip selected" : "shop-chip"}
                  key={shopName}
                  onClick={() => setShop(shopName)}
                  type="button"
                >
                  {shopName}
                </button>
              ))}
            </div>

            {shop === "Other shop" && (
              <label className="field">
                Custom shop name
                <input
                  autoComplete="organization"
                  onChange={(event) => setCustomShop(event.target.value)}
                  placeholder="Enter supplier"
                  value={customShop}
                />
              </label>
            )}

            <button className="ghost-button" onClick={captureLocation} type="button">
              Use current GPS location
            </button>
            <div className="manual-location-grid">
              <label className="field">
                Test latitude
                <input
                  inputMode="decimal"
                  onChange={(event) => setManualLatitude(event.target.value)}
                  placeholder="-33.9249"
                  value={manualLatitude}
                />
              </label>
              <label className="field">
                Test longitude
                <input
                  inputMode="decimal"
                  onChange={(event) => setManualLongitude(event.target.value)}
                  placeholder="18.4241"
                  value={manualLongitude}
                />
              </label>
            </div>
            <p className="location-copy">
              {locationStatus}
              {manualLatitude && manualLongitude
                ? `: ${manualLatitude}, ${manualLongitude}`
                : location
                  ? `: ${location}`
                  : ""}
            </p>
          </section>
        )}

        {step === 1 && (
          <section className="screen">
            <p className="screen-kicker">Step 2</p>
            <h2>Which card was used?</h2>
            <p className="helper">
              Confirm the business card before capturing the slip so admin can
              match the purchase to the bank statement.
            </p>

            <div className="card-grid">
              {businessCards.map((cardName) => (
                <button
                  className={
                    businessCard === cardName ? "choice-card selected" : "choice-card"
                  }
                  key={cardName}
                  onClick={() => setBusinessCard(cardName)}
                  type="button"
                >
                  <span>{cardName}</span>
                  <small>
                    {cardName.includes("7377")
                      ? "Standard Bank card from the note"
                      : "Tap if this was the card used"}
                  </small>
                </button>
              ))}
            </div>

            {businessCard === "Other card" && (
              <label className="field">
                Custom card label
                <input
                  autoComplete="off"
                  onChange={(event) => setCustomCard(event.target.value)}
                  placeholder="Example: FNB card ending 1234"
                  value={customCard}
                />
              </label>
            )}

            <div className="summary-strip">
              <span>Shop: {selectedShop}</span>
              <span>Card: {selectedCard}</span>
            </div>
          </section>
        )}

        {step === 2 && (
          <CaptureScreen
            captureKind="slip"
            stepNumber={3}
            heading="Capture the card slip"
            helper="Take a clear image of the payment slip before leaving the shop."
            onChange={handlePhotoChange}
            onRedo={redoPhoto}
            photo={slipPhoto}
          />
        )}

        {step === 3 && (
          <CaptureScreen
            captureKind="item"
            stepNumber={4}
            heading="Capture the purchased item"
            helper="Photograph the part, tool, or material so admin can match it to the slip."
            onChange={handlePhotoChange}
            onRedo={redoPhoto}
            photo={itemPhoto}
          />
        )}

        {step === 4 && (
          <section className="screen">
            <p className="screen-kicker">Step 5</p>
            <h2>Add purchase labels</h2>
            <p className="helper">
              Admin gets the shop, slip photo label, item photo label, and a
              description. Pin common descriptions for reuse.
            </p>

            <div className="summary-strip">
              <span>{selectedShop}</span>
              <span>{selectedCard}</span>
              <span>{slipPhoto?.fileName || "Slip pic"}</span>
              <span>{itemPhoto?.fileName || "Item pic"}</span>
            </div>

            <label className="field">
              Slip picture label
              <input
                onChange={(event) => setSlipLabel(event.target.value)}
                value={slipLabel}
              />
            </label>

            <label className="field">
              Item picture label
              <input
                onChange={(event) => setItemLabel(event.target.value)}
                value={itemLabel}
              />
            </label>

            <label className="field">
              Item description
              <textarea
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Example: PVC conduit and fittings for Claremont install"
                rows={4}
                value={description}
              />
            </label>

            <button className="ghost-button" onClick={pinCurrentLabel} type="button">
              Pin this label for reuse
            </button>

            <div className="pinned-list" aria-label="Pinned labels">
              {pinnedLabels.map((label, index) => (
                <button
                  className="pinned-card"
                  key={`${label.shop}-${label.description}-${index}`}
                  onClick={() => applyPinnedLabel(label)}
                  type="button"
                >
                  <strong>{label.shop}</strong>
                  <span>{label.description}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="screen">
            <p className="screen-kicker">Step 6</p>
            <h2>Confirm purchase record</h2>
            <p className="helper">
              This is the record that would be logged, stored with the images,
              and emailed to admin.
            </p>

            <div className="confirmation-card">
              <Row label="Shop" value={selectedShop} />
              <Row
                label="User"
                value={signedInUser ? `@${signedInUser.username}` : "Not signed in"}
              />
              <Row label="Card used" value={selectedCard} />
              <Row label="Slip" value={slipLabel} />
              <Row label="Item photo" value={itemLabel} />
              <Row label="Description" value={description} />
              <Row
                label="Location"
                value={
                  manualLatitude && manualLongitude
                    ? `${manualLatitude}, ${manualLongitude}`
                    : location || "Not added"
                }
              />
              <Row label="Statement status" value="Ready for admin confirmation email" />
            </div>
          </section>
        )}

        <footer className="actions">
          <button
            className="secondary-button"
            disabled={step === 0}
            onClick={previousStep}
            type="button"
          >
            Back
          </button>

          {step < stepLabels.length - 1 ? (
            <button
              className="primary-button"
              disabled={!canContinue}
              onClick={nextStep}
              type="button"
            >
              Next
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={isSubmitting}
              onClick={submitAndReset}
              type="button"
            >
              {isSubmitting ? "Saving..." : "Confirm and start new"}
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}

function CaptureScreen({
  captureKind,
  stepNumber,
  heading,
  helper,
  onChange,
  onRedo,
  photo,
}: {
  captureKind: CaptureKind;
  stepNumber: number;
  heading: string;
  helper: string;
  onChange: (event: ChangeEvent<HTMLInputElement>, captureKind: CaptureKind) => void;
  onRedo: (captureKind: CaptureKind) => void;
  photo: PhotoState | null;
}) {
  return (
    <section className="screen">
      <p className="screen-kicker">Step {stepNumber}</p>
      <h2>{heading}</h2>
      <p className="helper">{helper}</p>

      <label className={photo ? "camera-drop has-image" : "camera-drop"}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`${captureKind} preview`} src={photo.previewUrl} />
        ) : (
          <span>
            <strong>Tap to open camera</strong>
            <small>Use the phone camera or upload from gallery</small>
          </span>
        )}
        <input
          accept="image/*"
          capture="environment"
          onChange={(event) => onChange(event, captureKind)}
          type="file"
        />
      </label>

      {photo && <p className="file-name">{photo.fileName}</p>}

      <button
        className="redo-button"
        disabled={!photo}
        onClick={() => onRedo(captureKind)}
        type="button"
      >
        Redo photo
      </button>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="confirm-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
