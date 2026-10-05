import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  ScanBarcode,
  Search,
  Sparkles,
  Camera,
  CameraOff,
  Flashlight,
  RotateCcw,
  Check,
  AlertCircle,
  Plus,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Layers,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { BarcodeScannerSession, MacroMealItem, MealSlotCategory } from "../../types";
import { startBarcodeScanner } from "../../services/barcodeScannerService";

const SCANNER_ELEMENT_ID = "fittrack-barcode-reader";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSlot: MealSlotCategory;
  availableSlots?: string[];
  onAddMealItem: (item: MacroMealItem) => void;
}

interface ParsedProduct {
  code: string;
  name: string;
  brand: string;
  imageUrl?: string;
  servingSize?: string;
  // per 100g
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  fiberPer100g: number;
  sugarPer100g?: number;
  sodiumPer100g?: number;
}

const MEAL_SLOT_OPTIONS: { key: MealSlotCategory; label: string }[] = [
  { key: "mic_dejun", label: "Mic Dejun" },
  { key: "pranz", label: "Prânz" },
  { key: "pre_workout", label: "Pre-Workout" },
  { key: "post_workout", label: "Post-Workout" },
  { key: "cina", label: "Cină" },
  { key: "gustari", label: "Gustări" },
];

// Curated popular bodybuilding & fitness products with verified barcodes for instant 1-click test
const POPULAR_BARCODES = [
  { code: "3228857000166", name: "Fulgi de Ovăz Integrali", brand: "Quaker" },
  { code: "8000500310427", name: "Paste Integrale Penne", brand: "Barilla" },
  { code: "3017620422003", name: "Nutella Crema Alune", brand: "Ferrero" },
  { code: "5449000000996", name: "Coca-Cola Zero Zahăr", brand: "Coca-Cola" },
  { code: "7613035634629", name: "Cereale Fitness", brand: "Nestlé" },
  { code: "3560070817088", name: "Iaurt Grecesc 0% / 10%", brand: "Danone / Olympus" },
];

function describeCameraError(err: unknown): string {
  const name =
    err instanceof DOMException || err instanceof Error
      ? err.name
      : typeof err === "string" && /permission|notallowed/i.test(err)
        ? "NotAllowedError"
        : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Accesul la cameră a fost refuzat. Permite camera pentru FitTrack din setările browserului/telefonului, apoi încearcă din nou.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Nu a fost găsită nicio cameră pe acest dispozitiv.";
  }
  if (name === "NotReadableError") {
    return "Camera este folosită de altă aplicație. Închide-o și încearcă din nou.";
  }
  return "Camera nu a putut fi pornită.";
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  defaultSlot,
  availableSlots,
  onAddMealItem,
}) => {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<MealSlotCategory>(defaultSlot);
  const [grams, setGrams] = useState<number>(100);

  // Dynamic slot options
  const slotOptions = useMemo(() => {
    if (availableSlots && availableSlots.length > 0) {
      return availableSlots.map((s) => ({ key: s, label: s }));
    }
    const hasDefault = MEAL_SLOT_OPTIONS.some((o) => o.key === defaultSlot);
    if (!hasDefault && defaultSlot) {
      return [{ key: defaultSlot, label: defaultSlot }, ...MEAL_SLOT_OPTIONS];
    }
    return MEAL_SLOT_OPTIONS;
  }, [availableSlots, defaultSlot]);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [product, setProduct] = useState<ParsedProduct | null>(null);

  // Camera stream & simulation state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchHint, setTorchHint] = useState<string | null>(null);
  const [cameraPermissionFailed, setCameraPermissionFailed] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<BarcodeScannerSession | null>(null);
  // Bumped on every stop so a scanner that finishes starting after the user left is shut down immediately.
  const startTokenRef = useRef(0);
  const fetchProductRef = useRef<(code: string) => Promise<void>>(async () => undefined);

  // Sync slot with defaultSlot
  useEffect(() => {
    setSelectedSlot(defaultSlot);
  }, [defaultSlot]);

  // Clean up camera stream on close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setProduct(null);
      setBarcodeInput("");
      setErrorMsg(null);
      setGrams(100);
      setCameraError(null);
      setCameraPermissionFailed(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      startTokenRef.current += 1;
      const session = scannerRef.current;
      scannerRef.current = null;
      if (session) void session.stop();
    };
  }, []);

  const stopCamera = () => {
    startTokenRef.current += 1;
    const session = scannerRef.current;
    scannerRef.current = null;
    if (session) void session.stop();
    setIsCameraActive(false);
    setTorchOn(false);
    setTorchHint(null);
  };

  // Must stay synchronous up to getUserMedia: iOS Safari only grants the prompt inside the tap handler.
  const startCamera = async () => {
    setCameraPermissionFailed(false);
    setCameraError(null);
    setTorchHint(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPermissionFailed(true);
      setCameraError(
        window.isSecureContext
          ? "Acest browser nu permite accesul la cameră."
          : "Camera funcționează doar pe o conexiune securizată (HTTPS)."
      );
      return;
    }

    const token = ++startTokenRef.current;

    try {
      const session = await startBarcodeScanner(SCANNER_ELEMENT_ID, (code) => {
        navigator.vibrate?.(80);
        stopCamera();
        setBarcodeInput(code);
        void fetchProductRef.current(code);
      });

      if (token !== startTokenRef.current) {
        void session.stop();
        return;
      }

      scannerRef.current = session;
      setTorchOn(false);
      setIsCameraActive(true);
    } catch (err) {
      console.warn("Camera access not available or denied:", err);
      setCameraPermissionFailed(true);
      setCameraError(describeCameraError(err));
      setIsCameraActive(false);
    }
  };

  const toggleTorch = async () => {
    const session = scannerRef.current;
    if (!session) return;

    if (!session.torchSupported) {
      setTorchHint("Camera acestui dispozitiv nu are bliț controlabil.");
      return;
    }

    const next = !torchOn;
    const applied = await session.setTorch(next);
    if (applied) {
      setTorchOn(next);
      setTorchHint(null);
    } else {
      setTorchHint("Blițul nu a putut fi comandat. Încearcă din nou.");
    }
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Fetch product from Open Food Facts API
  const handleFetchProduct = async (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim();
    if (!cleanCode) {
      setErrorMsg("Introdu un cod de bare valid.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setProduct(null);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${cleanCode}.json`
      );

      if (!response.ok) {
        throw new Error(`Eroare server (${response.status})`);
      }

      const data = await response.json();

      if (data.status === 0 || !data.product) {
        setErrorMsg(
          `Produsul cu codul ${cleanCode} nu a fost găsit în baza globală Open Food Facts. Poți încerca alt cod sau îl poți introduce manual.`
        );
        setIsLoading(false);
        return;
      }

      const p = data.product;
      const nutriments = p.nutriments || {};

      // Parse calories (prefer kcal over kJ, or convert)
      let kcal = nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"];
      if (kcal === undefined || kcal === null) {
        const kj = nutriments["energy_100g"] ?? nutriments["energy"];
        if (kj) kcal = Math.round(Number(kj) / 4.184);
        else kcal = 0;
      }

      const protein = Number(nutriments["proteins_100g"] ?? nutriments["proteins"] ?? 0);
      const carbs = Number(nutriments["carbohydrates_100g"] ?? nutriments["carbohydrates"] ?? 0);
      const fats = Number(nutriments["fat_100g"] ?? nutriments["fat"] ?? 0);
      const fiber = Number(nutriments["fiber_100g"] ?? nutriments["fiber"] ?? 0);
      const sugar = nutriments["sugars_100g"] !== undefined ? Number(nutriments["sugars_100g"]) : undefined;
      const sodium = nutriments["sodium_100g"] !== undefined 
        ? Math.round(Number(nutriments["sodium_100g"]) * 1000) 
        : nutriments["salt_100g"] 
        ? Math.round(Number(nutriments["salt_100g"]) * 400) 
        : undefined;

      const productName =
        p.product_name_ro ||
        p.product_name ||
        p.product_name_en ||
        "Produs Fără Nume";

      const brand = p.brands || p.brand_owner || "Brand Nedefinit";
      const imageUrl = p.image_front_url || p.image_url || p.image_small_url;

      // Extract serving size number if present (e.g. "30g" -> 30)
      let defaultServingGrams = 100;
      if (p.serving_quantity) {
        const parsed = Number(p.serving_quantity);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 1000) {
          defaultServingGrams = parsed;
        }
      }

      setProduct({
        code: cleanCode,
        name: productName,
        brand,
        imageUrl,
        servingSize: p.serving_size,
        caloriesPer100g: Math.round(Number(kcal)),
        proteinPer100g: Number(protein.toFixed(1)),
        carbsPer100g: Number(carbs.toFixed(1)),
        fatsPer100g: Number(fats.toFixed(1)),
        fiberPer100g: Number(fiber.toFixed(1)),
        sugarPer100g: sugar !== undefined ? Number(sugar.toFixed(1)) : undefined,
        sodiumPer100g: sodium,
      });

      setGrams(defaultServingGrams);
      setBarcodeInput(cleanCode);
    } catch (err: any) {
      console.error("Open Food Facts fetch error:", err);
      setErrorMsg(
        "Nu s-a putut conecta la baza de date Open Food Facts. Verifică conexiunea la internet sau încearcă din nou."
      );
    } finally {
      setIsLoading(false);
    }
  };

  fetchProductRef.current = handleFetchProduct;

  // Real-time calculation based on grams portion
  const computedPortion = useMemo(() => {
    if (!product) return null;
    const factor = Math.max(1, grams) / 100;
    return {
      calories: Math.round(product.caloriesPer100g * factor),
      protein: Number((product.proteinPer100g * factor).toFixed(1)),
      carbs: Number((product.carbsPer100g * factor).toFixed(1)),
      fats: Number((product.fatsPer100g * factor).toFixed(1)),
      fiber: Number((product.fiberPer100g * factor).toFixed(1)),
      sugar: product.sugarPer100g !== undefined ? Number((product.sugarPer100g * factor).toFixed(1)) : undefined,
      sodium: product.sodiumPer100g !== undefined ? Math.round(product.sodiumPer100g * factor) : undefined,
    };
  }, [product, grams]);

  // Confirm and save to diary
  const handleConfirmSave = () => {
    if (!product || !computedPortion) return;

    const newItem: MacroMealItem = {
      id: "scan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      name: `${product.name} (${grams}g)`,
      category: selectedSlot,
      grams,
      calories: computedPortion.calories,
      protein: computedPortion.protein,
      carbs: computedPortion.carbs,
      fats: computedPortion.fats,
      fiber: computedPortion.fiber,
      sugar: computedPortion.sugar,
      sodium: computedPortion.sodium,
      barcode: product.code,
      brand: product.brand,
      imageUrl: product.imageUrl,
      time: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
    };

    onAddMealItem(newItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-[2.5rem] bg-[#121215] border border-white/10 shadow-2xl overflow-hidden text-white">
        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <ScanBarcode className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Scaner Cod de Bare
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Open Food Facts
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Punctează codul de bare sau introdu cifrele pentru date nutriționale instant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* CAMERA VIEWFINDER (Simulated or Real Hardware Stream) */}
          <div className="relative w-full h-48 sm:h-56 rounded-3xl bg-zinc-950 border border-white/10 overflow-hidden flex flex-col items-center justify-center group shadow-inner">
            {/* html5-qrcode renders its own <video> here; the container must exist before the scanner starts */}
            <div
              className={`absolute inset-0 transition-opacity ${
                isCameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />
            </div>

            {!isCameraActive && (
              /* Simulated Camera Viewfinder with High-Tech Grid & Scan Line */
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-black to-zinc-950 flex items-center justify-center">
                {/* Tech grid texture */}
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />
              </div>
            )}

            {cameraError && !isCameraActive ? (
              /* Visual fallback when permission is denied or no camera is available */
              <div
                role="alert"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 pb-10 text-center"
              >
                <div className="size-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <CameraOff className="size-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-200 leading-snug">{cameraError}</p>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  Poți introduce manual codul de bare mai jos.
                </p>
              </div>
            ) : (
              <>
                {/* Glowing Laser Scan Bar */}
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_15px_#f97316] animate-pulse pointer-events-none z-10" />

                {/* Viewfinder Target Framing Reticle */}
                <div className="relative size-36 sm:size-44 border border-white/20 rounded-2xl flex items-center justify-center pointer-events-none z-10">
                  {/* 4 Corner Markers */}
                  <div className="absolute -top-1 -left-1 size-4 border-t-2 border-l-2 border-orange-500 rounded-tl-sm" />
                  <div className="absolute -top-1 -right-1 size-4 border-t-2 border-r-2 border-orange-500 rounded-tr-sm" />
                  <div className="absolute -bottom-1 -left-1 size-4 border-b-2 border-l-2 border-orange-500 rounded-bl-sm" />
                  <div className="absolute -bottom-1 -right-1 size-4 border-b-2 border-r-2 border-orange-500 rounded-br-sm" />

                  <div className="flex flex-col items-center text-center px-2">
                    <ScanBarcode className="size-8 text-orange-500/70 mb-1 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Cadrează Codul
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Viewfinder Control Bar Overlays */}
            <div className="absolute bottom-3 inset-x-4 flex items-center justify-between z-20">
              <button
                type="button"
                onClick={toggleCamera}
                className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-bold text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="size-3.5 text-rose-400" />
                    <span>Oprește Camera</span>
                  </>
                ) : (
                  <>
                    <Camera className="size-3.5 text-emerald-400" />
                    <span>{cameraPermissionFailed ? "Încearcă din nou" : "Pornește Camera"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleTorch}
                disabled={!isCameraActive}
                aria-pressed={torchOn}
                className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  torchOn
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                    : "bg-black/60 border-white/10 text-zinc-400 hover:text-white"
                }`}
                title={isCameraActive ? "Lanternă" : "Pornește camera pentru a folosi blițul"}
              >
                <Flashlight className="size-3.5" />
              </button>
            </div>

            {torchHint && (
              <p
                role="status"
                className="absolute top-3 inset-x-4 z-20 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-amber-300 text-center"
              >
                {torchHint}
              </p>
            )}
          </div>

          {/* BARCODE INPUT & QUICK SEARCH */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Număr Cod de Bare (EAN / UPC)</span>
              <span className="text-[10px] font-medium text-zinc-500">12 sau 13 cifre</span>
            </label>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFetchProduct(barcodeInput);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="ex: 3228857000166"
                  className="w-full h-12 pl-4 pr-10 rounded-2xl bg-zinc-900 border border-white/10 text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
                {barcodeInput && (
                  <button
                    type="button"
                    onClick={() => setBarcodeInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !barcodeInput.trim()}
                className="h-12 px-5 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:hover:bg-orange-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 active:scale-95"
              >
                {isLoading ? (
                  <div className="size-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="size-4" />
                    <span>Caută</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick 1-Click Samples for instant testing */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                Exemple populare (apasă pentru test instant):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_BARCODES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setBarcodeInput(item.code);
                      handleFetchProduct(item.code);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/5 hover:border-orange-500/30 text-[11px] font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* PARSED PRODUCT RESULT & SERVING PORTION CALCULATOR */}
          {product && computedPortion && (
            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/10 space-y-5 animate-in slide-in-from-bottom-3 duration-300">
              {/* Product Identity */}
              <div className="flex items-start gap-4">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="size-16 rounded-2xl object-cover bg-black border border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="size-16 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center shrink-0 text-zinc-500">
                    <ScanBarcode className="size-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block truncate">
                    {product.brand}
                  </span>
                  <h3 className="text-base font-black text-white tracking-tight leading-snug line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Cod: <span className="font-mono text-zinc-300">{product.code}</span>
                    {product.servingSize && ` · Porție ambalaj: ${product.servingSize}`}
                  </p>
                </div>
              </div>

              {/* Meal Slot Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                  Selectează Masa pentru Salvare:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {slotOptions.map((slot) => {
                    const isSelected = selectedSlot === slot.key;
                    return (
                      <button
                        key={slot.key}
                        type="button"
                        onClick={() => setSelectedSlot(slot.key)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-black text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-orange-500 text-black shadow-sm"
                            : "bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Portion Weight Slider & Presets */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Gramaj Consumat:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={2000}
                      value={grams}
                      onChange={(e) => setGrams(Math.max(1, Number(e.target.value) || 1))}
                      className="w-20 h-9 px-2 text-center rounded-xl bg-black border border-white/20 text-sm font-black text-white focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-xs font-bold text-zinc-400">grame</span>
                  </div>
                </div>

                {/* Quick gram buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[50, 100, 150, 200, 250, 300].map((presetGrams) => (
                    <button
                      key={presetGrams}
                      type="button"
                      onClick={() => setGrams(presetGrams)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0 ${
                        grams === presetGrams
                          ? "bg-white text-black font-black"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {presetGrams}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated portion nutrition pills */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                {/* Calories */}
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center">
                  <span className="text-[9px] font-black uppercase tracking-wider text-orange-400 block">
                    Calorii
                  </span>
                  <span className="text-lg font-black text-white block mt-0.5">
                    {computedPortion.calories}
                  </span>
                  <span className="text-[9px] text-zinc-400">kcal</span>
                </div>

                {/* Protein */}
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 block">
                    Proteine
                  </span>
                  <span className="text-lg font-black text-white block mt-0.5">
                    {computedPortion.protein}g
                  </span>
                  <span className="text-[9px] text-zinc-400">din {grams}g</span>
                </div>

                {/* Carbs */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block">
                    Carbohidrați
                  </span>
                  <span className="text-lg font-black text-white block mt-0.5">
                    {computedPortion.carbs}g
                  </span>
                  <span className="text-[9px] text-zinc-400">din {grams}g</span>
                </div>

                {/* Fats */}
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 block">
                    Grăsimi
                  </span>
                  <span className="text-lg font-black text-white block mt-0.5">
                    {computedPortion.fats}g
                  </span>
                  <span className="text-[9px] text-zinc-400">din {grams}g</span>
                </div>
              </div>

              {/* Confirm and Add Button */}
              <button
                type="button"
                onClick={handleConfirmSave}
                className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
              >
                <Check className="size-4 stroke-[3]" />
                <span>Adaugă în {MEAL_SLOT_OPTIONS.find((s) => s.key === selectedSlot)?.label}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
