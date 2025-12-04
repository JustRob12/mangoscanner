"use client";

import { useEffect, useRef, useState } from "react";

type PredictionResult = {
  predicted_sweetness_brix: number;
  defect_pct: number;
  volume_cm3: number;
  quality_grade: string;
};

const API_URL = "https://mango-ann-api.onrender.com/predict";

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [lengthMm, setLengthMm] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [thicknessMm, setThicknessMm] = useState("");
  const [weightG, setWeightG] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Camera capture state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOpen(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to access camera. Please check permissions.";
      setError(message);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "captured-mango.jpg", {
        type: "image/jpeg",
      });
      setImageFile(file);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      stopCamera();
    }, "image/jpeg");
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!imageFile) {
      setError("Please select or capture a mango image.");
      return;
    }

    if (!lengthMm || !widthMm || !thicknessMm || !weightG) {
      setError("Please fill in all physical measurements.");
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("length_mm", lengthMm);
    formData.append("width_mm", widthMm);
    formData.append("thickness_mm", thicknessMm);
    formData.append("weight_g", weightG);

    try {
      setIsLoading(true);
      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Request failed with status ${res.status}`);
      }

      const data = (await res.json()) as PredictionResult;
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error while predicting.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-emerald-50 text-zinc-900">
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10 sm:px-8">
        <header className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Mango Quality Scanner
          </h1>
          <p className="text-sm text-zinc-600">
            Upload or capture a mango photo, enter basic measurements, and get
            sweetness (°Brix), defect %, volume, and quality grade from the ANN
            model.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl bg-white/80 p-6 shadow-sm backdrop-blur"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-medium">Mango image</h2>
              <p className="text-xs text-zinc-500">
                You can either upload an existing photo or open your device
                camera to capture a new one.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-4 text-center text-xs hover:bg-amber-100/60">
                  <span className="font-semibold text-amber-800">
                    Upload from gallery/files
                  </span>
                  <span className="text-[11px] text-amber-700">
                    JPEG/PNG, clear close-up of one mango
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) return;
                      setImageFile(file);
                      const url = URL.createObjectURL(file);
                      setPreviewUrl((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return url;
                      });
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={isCameraOpen ? stopCamera : startCamera}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/70 px-4 py-4 text-center text-xs font-semibold text-emerald-800 hover:bg-emerald-100/70"
                >
                  {isCameraOpen ? "Close camera" : "Open camera"}
                  <span className="text-[11px] font-normal text-emerald-700">
                    Use device camera (where supported)
                  </span>
                </button>
              </div>

              {isCameraOpen && (
                <div className="mt-3 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <video
                    ref={videoRef}
                    className="h-48 w-full rounded-lg bg-black/80 object-contain"
                  />
                  <button
                    type="button"
                    onClick={captureFromCamera}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                  >
                    Capture photo
                  </button>
                </div>
              )}

              {previewUrl && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-emerald-800">
                    Selected image preview
                  </p>
                  <img
                    src={previewUrl}
                    alt="Selected mango preview"
                    className="max-h-60 w-full rounded-lg border border-emerald-100 object-contain bg-white"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-medium">Physical measurements</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Length (mm)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={lengthMm}
                    onChange={(e) => setLengthMm(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. 115"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Width (mm)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={widthMm}
                    onChange={(e) => setWidthMm(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. 90"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Thickness (mm)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={thicknessMm}
                    onChange={(e) => setThicknessMm(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. 72"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Weight (g)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={weightG}
                    onChange={(e) => setWeightG(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. 394"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Analyzing mango..." : "Scan mango quality"}
            </button>
          </form>

          <section className="space-y-4 rounded-2xl bg-white/60 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-medium">Prediction result</h2>
            {!result && !error && (
              <p className="text-sm text-zinc-500">
                Submit a mango above to see its predicted sweetness and quality
                grade here.
              </p>
            )}
            {result && (
              <div className="space-y-4">
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">
                    Quality grade
                  </p>
                  <p className="text-2xl font-semibold text-emerald-900">
                    {result.quality_grade}
                  </p>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="space-y-1 rounded-md bg-zinc-50 px-3 py-2">
                    <dt className="text-xs text-zinc-500">
                      Predicted sweetness
                    </dt>
                    <dd className="font-medium">
                      {result.predicted_sweetness_brix.toFixed(2)} °Brix
                    </dd>
                  </div>
                  <div className="space-y-1 rounded-md bg-zinc-50 px-3 py-2">
                    <dt className="text-xs text-zinc-500">Defect percentage</dt>
                    <dd className="font-medium">
                      {result.defect_pct.toFixed(2)} %
                    </dd>
                  </div>
                  <div className="space-y-1 rounded-md bg-zinc-50 px-3 py-2">
                    <dt className="text-xs text-zinc-500">Estimated volume</dt>
                    <dd className="font-medium">
                      {result.volume_cm3.toFixed(1)} cm³
                    </dd>
                  </div>
                </dl>
        </div>
            )}
            {isLoading && (
              <p className="text-sm text-zinc-500">Talking to the ANN API…</p>
            )}
          </section>
        </section>

        {/* <footer className="mt-auto pt-4 text-center text-xs text-zinc-500">
          Powered by Mango ANN API at{" "}
          <span className="font-mono text-amber-700">
            mango-ann-api.onrender.com
          </span>
        </footer> */}
      </main>
    </div>
  );
}

