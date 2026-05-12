"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { removeBackground } from "@imgly/background-removal";
import {
  Upload,
  Download,
  Heart,
  Palette,
  RotateCcw,
  Trash2,
  Pencil,
  CheckCircle2,
  Car,
  ImagePlus,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const CANVAS_SIZE = 900;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function TeslaWrapCustomizerMVP() {
  const canvasRef = useRef(null);
  const templateRef = useRef(null);
  const designRef = useRef(null);

  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  });

  const [templateImg, setTemplateImg] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [photos, setPhotos] = useState([]);
  const [activePhotoId, setActivePhotoId] = useState(null);
  const [bgColor, setBgColor] = useState("#ff4fa3");
  const [pattern, setPattern] = useState("hearts");
  const [isProcessing, setIsProcessing] = useState(false);
  const [removeBgOnUpload, setRemoveBgOnUpload] = useState(true);

  const activePhoto = photos.find((p) => p.id === activePhotoId);

  const processFile = async (file, removeBg = false) => {
    let processedFile = file;

    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");

    if (isHeic) {
      const heic2any = (await import("heic2any")).default;
      const convertedBlob = await heic2any({
        blob: file,
        toType: "image/png",
        quality: 0.95,
      });

      const finalBlob = Array.isArray(convertedBlob)
        ? convertedBlob[0]
        : convertedBlob;

      processedFile = new File(
        [finalBlob],
        file.name.replace(/\.(heic|heif)$/i, ".png"),
        { type: "image/png" }
      );
    }

    let imageBlob = processedFile;

    if (removeBg) {
      imageBlob = await removeBackground(processedFile);
    }

    const url = URL.createObjectURL(imageBlob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const uploadTemplate = async (file) => {
    setIsProcessing(true);

    try {
      const img = await processFile(file, false);
      setTemplateImg(img);
      setTemplateName(file.name);
    } catch {
      alert(`Failed to upload ${file.name}`);
    }

    setIsProcessing(false);
  };

  const uploadPhotos = async (files) => {
    setIsProcessing(true);

    const newPhotos = [];

    for (const file of files) {
      try {
        const img = await processFile(file, removeBgOnUpload);

        newPhotos.push({
          id: crypto.randomUUID(),
          img,
          name: file.name.replace(/\.[^/.]+$/, ""),
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
        });
      } catch {
        alert(`Failed to upload ${file.name}`);
      }
    }

    setPhotos((prev) => {
      const updated = [...prev, ...newPhotos];
      if (!activePhotoId && updated.length > 0) {
        setActivePhotoId(updated[0].id);
      }
      return updated;
    });

    setIsProcessing(false);
  };

  const updateActivePhoto = (changes) => {
    if (!activePhotoId) return;

    setPhotos((prev) =>
      prev.map((p) => (p.id === activePhotoId ? { ...p, ...changes } : p))
    );
  };

  const deleteActivePhoto = () => {
    setPhotos((prev) => {
      const updated = prev.filter((p) => p.id !== activePhotoId);
      setActivePhotoId(updated[0]?.id || null);
      return updated;
    });
  };

  const drawHeart = (ctx, x, y, size) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 32, size / 32);
    ctx.beginPath();
    ctx.moveTo(16, 29);
    ctx.bezierCurveTo(14, 26, 2, 19, 2, 10);
    ctx.bezierCurveTo(2, 4, 10, 1, 16, 8);
    ctx.bezierCurveTo(22, 1, 30, 4, 30, 10);
    ctx.bezierCurveTo(30, 19, 18, 26, 16, 29);
    ctx.fill();
    ctx.restore();
  };

  const buildDesignCanvas = useCallback(() => {
    const designCanvas = designRef.current;
    if (!designCanvas) return null;

    designCanvas.width = CANVAS_SIZE;
    designCanvas.height = CANVAS_SIZE;

    const dctx = designCanvas.getContext("2d");
    dctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    dctx.fillStyle = bgColor;
    dctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    photos.forEach((photo) => {
      const maxBase = 520;
      const ratio = Math.min(
        maxBase / photo.img.width,
        maxBase / photo.img.height
      );

      const photoW = photo.img.width * ratio * photo.scale;
      const photoH = photo.img.height * ratio * photo.scale;

      const centerX = CANVAS_SIZE / 2 + photo.x;
      const centerY = CANVAS_SIZE / 2 + photo.y;

      dctx.save();
      dctx.translate(centerX, centerY);
      dctx.rotate((photo.rotation * Math.PI) / 180);
      dctx.drawImage(photo.img, -photoW / 2, -photoH / 2, photoW, photoH);
      dctx.restore();
    });

    if (pattern === "hearts") {
      dctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let y = 25; y < CANVAS_SIZE; y += 70) {
        for (let x = 25; x < CANVAS_SIZE; x += 70) {
          drawHeart(dctx, x, y, 22);
        }
      }
    }

    if (pattern === "dots") {
      dctx.fillStyle = "rgba(255,255,255,0.45)";
      for (let y = 20; y < CANVAS_SIZE; y += 45) {
        for (let x = 20; x < CANVAS_SIZE; x += 45) {
          dctx.beginPath();
          dctx.arc(x, y, 8, 0, Math.PI * 2);
          dctx.fill();
        }
      }
    }

    return designCanvas;
  }, [photos, bgColor, pattern]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const templateCanvas = templateRef.current;

    if (!canvas || !templateCanvas) return;

    const designCanvas = buildDesignCanvas();
    if (!designCanvas) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    templateCanvas.width = CANVAS_SIZE;
    templateCanvas.height = CANVAS_SIZE;

    const ctx = canvas.getContext("2d");
    const tctx = templateCanvas.getContext("2d");

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    tctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (!templateImg) {
      ctx.drawImage(designCanvas, 0, 0);
      return;
    }

    tctx.drawImage(templateImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const templateData = tctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const designData = designCanvas
      .getContext("2d")
      .getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const outputData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);

    for (let i = 0; i < templateData.data.length; i += 4) {
      const r = templateData.data[i];
      const g = templateData.data[i + 1];
      const b = templateData.data[i + 2];
      const brightness = (r + g + b) / 3;
      const isWhiteWrapArea = brightness > 120;

      outputData.data[i] = isWhiteWrapArea ? designData.data[i] : 0;
      outputData.data[i + 1] = isWhiteWrapArea ? designData.data[i + 1] : 0;
      outputData.data[i + 2] = isWhiteWrapArea ? designData.data[i + 2] : 0;
      outputData.data[i + 3] = 255;
    }

    ctx.putImageData(outputData, 0, 0);
  }, [templateImg, buildDesignCanvas]);

  useEffect(() => {
    render();
  }, [render]);

  const getCanvasPointer = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((e.clientX - rect.left) * CANVAS_SIZE) / rect.width,
      y: ((e.clientY - rect.top) * CANVAS_SIZE) / rect.height,
    };
  };

  const handleMouseDown = (e) => {
    if (!activePhoto) return;

    const p = getCanvasPointer(e);

    dragRef.current = {
      dragging: true,
      startX: p.x,
      startY: p.y,
      baseX: activePhoto.x,
      baseY: activePhoto.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.dragging || !activePhoto) return;

    const p = getCanvasPointer(e);

    updateActivePhoto({
      x: dragRef.current.baseX + (p.x - dragRef.current.startX),
      y: dragRef.current.baseY + (p.y - dragRef.current.startY),
    });
  };

  const handleMouseUp = () => {
    dragRef.current.dragging = false;
  };

  const handleWheel = (e) => {
    if (!activePhoto) return;

    e.preventDefault();

    updateActivePhoto({
      scale: clamp(
        Number((activePhoto.scale + (e.deltaY < 0 ? 0.05 : -0.05)).toFixed(2)),
        0.15,
        4
      ),
    });
  };

  const downloadPNG = () => {
    render();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "tesla-wrap-design.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const resetControls = () => {
    setBgColor("#ff4fa3");
    setPattern("hearts");
    setPhotos([]);
    setActivePhotoId(null);
  };

  const StepHeader = ({ number, icon: Icon, title, description, complete }) => (
    <div className="flex gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
          complete
            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
            : "border-zinc-700 bg-zinc-800 text-zinc-300"
        }`}
      >
        {complete ? <CheckCircle2 size={17} /> : number}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-6 space-y-5">
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 shadow-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-400/20 bg-pink-400/10 px-3 py-1 text-xs font-medium text-pink-200">
                <Sparkles size={13} /> Custom Tesla Wrap Builder
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Design your Tesla wrap in 3 simple steps.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Upload a vehicle template, place your photos/designs onto the white wrap area, then export a PNG that you can upload to your Tesla screen.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={downloadPNG}
                disabled={!templateImg}
                className="rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-40"
              >
                <Download size={14} className="mr-1.5" /> Download PNG
              </Button>

              <Button
                variant="ghost"
                onClick={resetControls}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80"
              >
                <RotateCcw size={14} />
              </Button>
            </div>
          </div>
        </div>

        {/* STEP 1 + STEP 2 stay above the editor */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="rounded-3xl border-zinc-800 bg-zinc-900 text-white">
            <CardContent className="p-5">
              <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <StepHeader
                  number="1"
                  icon={Car}
                  title="Upload your Tesla template"
                  complete={!!templateImg}
                  description="Find the correct wrap/template for your exact Tesla model, save it as an image, then upload it here. Use a clean template with white areas where the wrap should appear."
                />

                <a
                  href="https://www.google.com/search?q=tesla+screen+wrap+template"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-pink-300 hover:text-pink-200"
                >
                  Search for Tesla templates <ExternalLink size={12} />
                </a>

                <label className="block cursor-pointer rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-4 text-center transition hover:border-pink-400/60 hover:bg-zinc-800/70">
                  <Upload size={22} className="mx-auto mb-2 text-zinc-400" />
                  <span className="block text-sm font-medium text-zinc-200">
                    {templateName || "Choose template image"}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    PNG, JPG, JPEG, HEIC, or HEIF
                  </span>
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && uploadTemplate(e.target.files[0])
                    }
                  />
                </label>
              </section>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-zinc-800 bg-zinc-900 text-white">
            <CardContent className="p-5">
              <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <StepHeader
                  number="2"
                  icon={ImagePlus}
                  title="Upload your photos/designs"
                  complete={photos.length > 0}
                  description="Add the images you want on the wrap. Turn background removal on only when you want the subject cut out."
                />

                <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <input
                    type="checkbox"
                    checked={removeBgOnUpload}
                    onChange={(e) => setRemoveBgOnUpload(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-pink-400"
                  />
                  <span>
                    <span className="block text-sm font-medium text-zinc-200">
                      Remove image background
                    </span>
                    <span className="block text-xs leading-5 text-zinc-500">
                      Checked = remove background. Unchecked = keep the original image exactly as uploaded.
                    </span>
                  </span>
                </label>

                <label className="block cursor-pointer rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-4 text-center transition hover:border-pink-400/60 hover:bg-zinc-800/70">
                  <Upload size={22} className="mx-auto mb-2 text-zinc-400" />
                  <span className="block text-sm font-medium text-zinc-200">
                    Add photos/design files
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    You can upload multiple images
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.length && uploadPhotos(Array.from(e.target.files))
                    }
                  />
                </label>

                {isProcessing && (
                  <p className="rounded-xl border border-pink-400/20 bg-pink-400/10 px-3 py-2 text-xs text-pink-200">
                    Processing image files…
                  </p>
                )}

                {photos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Uploaded Images
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((photo, i) => (
                        <button
                          key={photo.id}
                          onClick={() => setActivePhotoId(photo.id)}
                          className={`max-w-[145px] truncate rounded-xl border px-3 py-2 text-xs transition ${
                            photo.id === activePhotoId
                              ? "border-white bg-white text-black"
                              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          }`}
                        >
                          {photo.name || `Image ${i + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </CardContent>
          </Card>
        </div>

        {/* Editor workspace: controls are now directly beside the canvas */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
          <Card className="rounded-3xl border-zinc-800 bg-zinc-900 text-white lg:sticky lg:top-5 lg:self-start">
            <CardContent className="space-y-5 p-5">
              <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Pencil size={15} className="text-zinc-400" /> Wrap Editor Controls
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    These controls edit the selected image on the wrap editor beside this panel.
                  </p>
                </div>

                <div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <Palette size={12} /> Background Color
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-11 w-14 rounded-xl border border-zinc-700 bg-transparent"
                    />
                    <span className="font-mono text-xs text-zinc-500">{bgColor}</span>
                  </div>
                </div>

                <div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <Heart size={12} /> Pattern
                  </span>
                  <select
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-sm"
                  >
                    <option value="hearts">Hearts</option>
                    <option value="dots">Dots</option>
                    <option value="none">None</option>
                  </select>
                </div>

                {activePhoto ? (
                  <div className="space-y-3 border-t border-zinc-800 pt-5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <Pencil size={12} /> Selected Image Controls
                    </p>

                    <div>
                      <label className="text-xs text-zinc-500">Rename Image</label>
                      <input
                        type="text"
                        value={activePhoto.name}
                        onChange={(e) => updateActivePhoto({ name: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                      />
                    </div>

                    {[
                      { label: "Scale", key: "scale", min: 0.15, max: 4, step: 0.05 },
                      { label: "Rotation", key: "rotation", min: -180, max: 180, step: 1 },
                      { label: "Move X", key: "x", min: -500, max: 500, step: 5 },
                      { label: "Move Y", key: "y", min: -500, max: 500, step: 5 },
                    ].map(({ label, key, min, max, step }) => (
                      <div key={key}>
                        <div className="mb-1 flex justify-between">
                          <label className="text-xs text-zinc-500">{label}</label>
                          <span className="font-mono text-xs text-zinc-600">{Number(activePhoto[key]).toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={activePhoto[key]}
                          onChange={(e) => updateActivePhoto({ [key]: Number(e.target.value) })}
                          className="w-full accent-pink-400"
                        />
                      </div>
                    ))}

                    <Button
                      variant="destructive"
                      onClick={deleteActivePhoto}
                      className="w-full rounded-xl text-xs"
                    >
                      <Trash2 size={13} className="mr-1.5" /> Delete Image
                    </Button>
                  </div>
                ) : (
                  <p className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-500">
                    Upload and select an image to unlock image controls.
                  </p>
                )}
              </section>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-zinc-800 bg-zinc-900">
            <CardContent className="p-0">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-sm font-semibold text-white">Wrap Editor</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Drag selected images to move them. Scroll on the canvas to resize. Use the sliders for precise edits.
                </p>
              </div>

              <div className="p-5">
                <div className="flex min-h-[640px] items-center justify-center overflow-auto rounded-3xl border border-zinc-800 bg-black p-4">
                  {templateImg ? (
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onWheel={handleWheel}
                      className="max-w-full cursor-move rounded-2xl border border-zinc-800 shadow-2xl"
                    />
                  ) : (
                    <div className="max-w-md text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                        <Upload className="text-zinc-500" />
                      </div>
                      <p className="text-sm font-medium text-zinc-300">Upload your Tesla template to start designing.</p>
                      <p className="mt-2 text-xs leading-5 text-zinc-600">
                        The design will only appear on the white parts of the template.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-zinc-800 bg-zinc-900 text-white">
          <CardContent className="p-5">
            <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <StepHeader
                number="3"
                icon={Download}
                title="Download and upload to Tesla"
                complete={!!templateImg && photos.length > 0}
                description="When your design is done, download the PNG. Send it to your phone, open the Tesla app or browser method you use for custom lock screen/wrap uploads, then select this PNG from your photo library/files."
              />

              <Button
                onClick={downloadPNG}
                disabled={!templateImg}
                className="rounded-xl bg-pink-500 text-white hover:bg-pink-400 disabled:opacity-40"
              >
                <Download size={15} className="mr-2" /> Download Final PNG
              </Button>

              <p className="text-xs leading-5 text-zinc-500">
                Tip: after downloading, AirDrop or email the PNG to your phone so it is easy to select when uploading it to your Tesla.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>

      <canvas ref={templateRef} className="hidden" />
      <canvas ref={designRef} className="hidden" />
    </div>
  );
}
