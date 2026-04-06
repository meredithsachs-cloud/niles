// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ══════════════════════════════════════════════
//  SUPABASE CLIENT
// ══════════════════════════════════════════════

const SUPABASE_URL = "https://zgbsevjitszqqwazwubd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnYnNldmppdHN6cXF3YXp3dWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTg0MDAsImV4cCI6MjA5MDk5NDQwMH0.rmPSR3gjpD22hjEZv5ffVbSDxT1CgaVQfkgb61tGhyw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════

const PINK = "#FF2D92";
const FUCHSIA = "#C2006A";

const CATEGORIES = [
  { id: "pantry",    label: "Pantry",        emoji: "🥫", color: "#FF9F43" },
  { id: "fridge",    label: "Fridge",         emoji: "🥦", color: "#26de81" },
  { id: "freezer",   label: "Freezer",        emoji: "🧊", color: "#4ECDC4" },
  { id: "cleaning",  label: "Cleaning",       emoji: "🧹", color: "#A29BFE" },
  { id: "personal",  label: "Personal Care",  emoji: "🧴", color: "#FD79A8" },
  { id: "medicine",  label: "Medicine",       emoji: "💊", color: "#6C5CE7" },
  { id: "laundry",   label: "Laundry",        emoji: "🫧", color: "#74B9FF" },
  { id: "paper",     label: "Paper Goods",    emoji: "🧻", color: "#FFEAA7" },
  { id: "pet",       label: "Pet",            emoji: "🐾", color: "#FAB1A0" },
  { id: "beverages", label: "Beverages",      emoji: "🥤", color: "#55EFC4" },
  { id: "snacks",    label: "Snacks",         emoji: "🍿", color: "#FDCB6E" },
  { id: "baby",      label: "Baby & Kids",    emoji: "🍼", color: "#FFD3E8" },
  { id: "other",     label: "Other",          emoji: "📦", color: "#DFE6E9" },
];

const LOCATIONS = [
  "Pantry", "Refrigerator", "Freezer", "Kitchen Cabinet",
  "Bathroom", "Under Sink", "Laundry Room", "Garage", "Basement", "Other",
];

const UNITS = [
  "count", "oz", "fl oz", "lbs", "g", "kg", "L", "mL",
  "gallon", "pack", "box", "bag", "bottle", "can", "jar", "roll",
];

const DEFAULT_STORES = [
  "Amazon", "Target", "Walmart", "Costco",
  "Whole Foods", "Trader Joe's", "CVS", "Walgreens",
];

// ══════════════════════════════════════════════
//  DATA HELPERS — Supabase
// ══════════════════════════════════════════════

// Convert Supabase row → app item object
const rowToItem = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  quantity: row.quantity,
  lowStock: row.min_quantity,
  unit: row.unit,
  stores: (() => { try { return JSON.parse(row.stores_json || "[]"); } catch { return []; } })(),
  upc: row.upc || "",
  notes: row.notes || "",
  photo: row.photo || null,
  imageUrl: row.image_url || null,
  brand: row.brand || "",
  location: row.location || "",
  expirationDate: row.expiration_date || "",
  createdAt: row.created_at,
});

// Convert app item object → Supabase row (for insert/update)
const itemToRow = (item, userId) => ({
  ...(item.id && !item.id.includes("-") ? {} : {}), // UUID stays as-is
  user_id: userId,
  name: item.name,
  category: item.category || "other",
  quantity: item.quantity ?? 1,
  min_quantity: item.lowStock ?? 1,
  unit: item.unit || "count",
  stores_json: JSON.stringify(item.stores || []),
  upc: item.upc || null,
  notes: item.notes || null,
  photo: item.photo || null,
  image_url: item.imageUrl || null,
  brand: item.brand || null,
  location: item.location || null,
  expiration_date: item.expirationDate || null,
});

// ══════════════════════════════════════════════
//  PRODUCT LOOKUP (Open Food Facts)
// ══════════════════════════════════════════════

const lookupUpc = async (upc) => {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${upc}.json`
    );
    const data = await res.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const raw = (p.categories_tags || []).join(" ").toLowerCase();
      let catId = "other";
      if (raw.includes("beverages") || raw.includes("drinks") || raw.includes("water"))
        catId = "beverages";
      else if (raw.includes("snack") || raw.includes("chip") || raw.includes("cookie") || raw.includes("candy"))
        catId = "snacks";
      else if (raw.includes("frozen"))
        catId = "freezer";
      else if (raw.includes("dairy") || raw.includes("cheese") || raw.includes("yogurt") || raw.includes("milk"))
        catId = "fridge";
      else if (raw.includes("cereal") || raw.includes("pasta") || raw.includes("rice") || raw.includes("sauce") || raw.includes("canned") || raw.includes("bread"))
        catId = "pantry";
      else if (raw.includes("personal") || raw.includes("hygiene") || raw.includes("beauty") || raw.includes("soap"))
        catId = "personal";
      else if (raw.includes("cleaning") || raw.includes("detergent"))
        catId = "cleaning";
      else if (raw.includes("pet"))
        catId = "pet";
      else if (raw.includes("baby"))
        catId = "baby";
      return {
        name: p.product_name || p.product_name_en || "",
        brand: p.brands || "",
        category: catId,
        imageUrl: p.image_front_small_url || p.image_url || null,
      };
    }
  } catch {}
  return null;
};

// ══════════════════════════════════════════════
//  SHARED UI PRIMITIVES
// ══════════════════════════════════════════════

const iStyle = {
  width: "100%",
  padding: "13px 14px",
  marginBottom: 12,
  border: "2px solid #F0F0F0",
  borderRadius: 12,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  background: "white",
};

const btnPrimary = {
  width: "100%",
  padding: "15px",
  background: `linear-gradient(135deg, ${PINK}, ${FUCHSIA})`,
  color: "white",
  border: "none",
  borderRadius: 14,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 20px rgba(255,45,146,0.35)",
  letterSpacing: "0.3px",
  fontFamily: "inherit",
};

const btnSecondary = {
  width: "100%",
  padding: "13px",
  background: "white",
  color: PINK,
  border: `2px solid ${PINK}`,
  borderRadius: 14,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

// ══════════════════════════════════════════════
//  AUTH SCREEN
// ══════════════════════════════════════════════

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const submit = async () => {
    setErr("");
    setSuccessMsg("");
    if (!email || !password) { setErr("Please fill in all fields."); return; }
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setErr(error.message); setLoading(false); }
      // On success, onAuthStateChange in root handles navigation
    } else {
      if (!name) { setErr("Please enter your name."); setLoading(false); return; }
      if (password.length < 6) { setErr("Password must be at least 6 characters."); setLoading(false); return; }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) {
        setErr(error.message);
      } else {
        setSuccessMsg("Account created! Check your email to confirm, then sign in.");
        setMode("login");
      }
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setErr("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setErr(error.message);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(155deg, ${PINK} 0%, #FF87C3 45%, #FFF0F7 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div
          style={{
            width: 80, height: 80,
            background: "white",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            boxShadow: "0 8px 32px rgba(255,45,146,0.35)",
            fontSize: 38,
          }}
        >
          🎩
        </div>
        <h1 style={{ color: "white", fontSize: 38, fontWeight: 800, margin: 0, letterSpacing: "-1px", fontFamily: "'Syne', sans-serif" }}>
          Niles
        </h1>
        <p style={{ color: "rgba(255,255,255,0.88)", fontSize: 14, margin: "6px 0 0", letterSpacing: "0.3px" }}>
          Your personal home butler
        </p>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 28,
          padding: "30px 26px 26px",
          width: "100%",
          maxWidth: 390,
          boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
        }}
      >
        {/* Toggle */}
        <div style={{ display: "flex", background: "#F6F6F6", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {["login", "signup"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setErr(""); setSuccessMsg(""); }}
              style={{
                flex: 1, padding: "10px", border: "none", borderRadius: 10,
                background: mode === m ? "white" : "transparent",
                color: mode === m ? PINK : "#999",
                fontWeight: mode === m ? 700 : 500,
                fontSize: 14, cursor: "pointer",
                boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {successMsg && (
          <p style={{ color: "#00b894", fontSize: 13, margin: "-6px 0 14px", textAlign: "center", background: "#00b89411", borderRadius: 8, padding: "10px 12px" }}>
            {successMsg}
          </p>
        )}

        {mode === "signup" && (
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={iStyle}
          />
        )}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={iStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ ...iStyle, marginBottom: 16 }}
        />

        {err && (
          <p style={{ color: "#FF006E", fontSize: 13, margin: "-6px 0 14px", textAlign: "center" }}>{err}</p>
        )}

        <button onClick={submit} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }} disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#F0F0F0" }} />
          <span style={{ fontSize: 12, color: "#bbb", fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#F0F0F0" }} />
        </div>

        {/* Google OAuth */}
        <button
          onClick={signInWithGoogle}
          style={{
            ...btnSecondary,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            color: "#444", borderColor: "#E8E8E8",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  SCANNER MODAL
// ══════════════════════════════════════════════

function ScannerModal({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const detectorRef = useRef(null);
  const [status, setStatus] = useState("init");
  const [manualUpc, setManualUpc] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const hasDetector = typeof BarcodeDetector !== "undefined";

  useEffect(() => {
    if (hasDetector) { startCamera(); }
    else { setStatus("manual"); }
    return () => { stopCamera(); };
  }, []);

  const stopCamera = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      detectorRef.current = new BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
      });
      setStatus("scanning");
      scan();
    } catch {
      setErrMsg("Camera not available. Enter UPC manually.");
      setStatus("manual");
    }
  };

  const scan = async () => {
    if (!videoRef.current || !detectorRef.current) return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes.length > 0) { stopCamera(); onDetect(codes[0].rawValue); return; }
    } catch {}
    animRef.current = requestAnimationFrame(scan);
  };

  const submitManual = () => {
    if (manualUpc.trim().length < 8) { setErrMsg("Please enter a valid UPC (8–14 digits)."); return; }
    onDetect(manualUpc.trim());
  };

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Scan Barcode</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#999" }}>✕</button>
        </div>

        {status === "scanning" && (
          <>
            <div style={{ position: "relative", background: "#000" }}>
              <video ref={videoRef} style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }} playsInline muted />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "72%", height: 100, border: `3px solid ${PINK}`, borderRadius: 12, boxShadow: "0 0 0 2000px rgba(0,0,0,0.45)", position: "relative" }}>
                  <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: "50%", marginTop: -1, width: "90%", height: 2, background: PINK, opacity: 0.8 }} />
                </div>
              </div>
            </div>
            <p style={{ textAlign: "center", color: "#888", fontSize: 13, padding: "12px 20px 0" }}>Hold barcode steady within the frame</p>
            <div style={{ padding: "12px 20px 20px" }}>
              <button onClick={() => { stopCamera(); setStatus("manual"); }} style={btnSecondary}>Enter UPC manually</button>
            </div>
          </>
        )}

        {(status === "manual" || status === "init") && (
          <div style={{ padding: "0 20px 24px" }}>
            {errMsg && <p style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>{errMsg}</p>}
            <input
              placeholder="Enter UPC / barcode number"
              value={manualUpc}
              onChange={(e) => setManualUpc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
              style={{ ...iStyle }}
              autoFocus
            />
            <button onClick={submitManual} style={btnPrimary}>Look Up Product</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  ITEM MODAL
// ══════════════════════════════════════════════

function ItemModal({ item, allCategories, stores, onSave, onDelete, onClose }) {
  const isEdit = !!item;
  const [tab, setTab] = useState("main");
  const [form, setForm] = useState(
    item || {
      name: "", category: "other", quantity: 1, lowStock: 1,
      unit: "count", stores: [], upc: "", notes: "", photo: null,
      imageUrl: null, brand: "", location: "", expirationDate: "",
    }
  );
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const photoRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleStore = (s) => {
    const arr = form.stores.includes(s) ? form.stores.filter((x) => x !== s) : [...form.stores, s];
    set("stores", arr);
  };

  const handleScan = async (upc) => {
    setShowScanner(false);
    setScanLoading(true);
    set("upc", upc);
    const info = await lookupUpc(upc);
    if (info) {
      setForm((f) => ({
        ...f,
        upc,
        name: info.name || f.name,
        brand: info.brand || f.brand,
        category: info.category || f.category,
        imageUrl: info.imageUrl || f.imageUrl,
      }));
    }
    setScanLoading(false);
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("photo", ev.target.result);
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!form.name.trim()) return;
    onSave(form);
    onClose();
  };

  return (
    <>
      {showScanner && <ScannerModal onDetect={handleScan} onClose={() => setShowScanner(false)} />}
      <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={modalStyle}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>
              {isEdit ? "Edit Item" : "Add Item"}
            </h3>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#999" }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "#F6F6F6", borderRadius: 12, padding: 4 }}>
            {["main", "details"].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "9px", border: "none", borderRadius: 10,
                background: tab === t ? "white" : "transparent",
                color: tab === t ? PINK : "#999",
                fontWeight: tab === t ? 700 : 500,
                fontSize: 13, cursor: "pointer",
                boxShadow: tab === t ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                fontFamily: "inherit",
              }}>
                {t === "main" ? "Main Info" : "Details"}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }}>
            {tab === "main" && (
              <>
                {/* Scan button */}
                <button
                  onClick={() => setShowScanner(true)}
                  style={{
                    ...btnSecondary, marginBottom: 14, display: "flex",
                    alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  📷 {scanLoading ? "Looking up product…" : "Scan Barcode"}
                </button>

                {/* Photo */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div
                    onClick={() => photoRef.current?.click()}
                    style={{
                      width: 68, height: 68, borderRadius: 14,
                      background: form.photo || form.imageUrl ? "transparent" : "#F5F5F5",
                      border: "2px dashed #E0E0E0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", overflow: "hidden", flexShrink: 0,
                    }}
                  >
                    {form.photo
                      ? <img src={form.photo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="" />
                      : form.imageUrl
                      ? <img src={form.imageUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="" />
                      : <span style={{ fontSize: 24 }}>📷</span>
                    }
                  </div>
                  <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
                  <div style={{ flex: 1 }}>
                    <input placeholder="Brand (optional)" value={form.brand} onChange={(e) => set("brand", e.target.value)} style={{ ...iStyle, marginBottom: 8, fontSize: 13 }} />
                    <input placeholder="Item name *" value={form.name} onChange={(e) => set("name", e.target.value)} style={{ ...iStyle, marginBottom: 0, fontWeight: 600 }} />
                  </div>
                </div>

                {/* Category */}
                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 8px" }}>Category</p>
                <div style={{ overflowX: "auto", display: "flex", gap: 6, marginBottom: 16, paddingBottom: 4 }}>
                  {allCategories.map((c) => (
                    <button key={c.id} onClick={() => set("category", c.id)} style={{
                      padding: "6px 12px", borderRadius: 20, whiteSpace: "nowrap",
                      border: `2px solid ${form.category === c.id ? c.color : "#eee"}`,
                      background: form.category === c.id ? c.color + "22" : "white",
                      color: form.category === c.id ? c.color : "#888",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>

                {/* Quantity + Unit */}
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>Quantity</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => set("quantity", Math.max(0, form.quantity - 1))} style={{ width: 36, height: 36, borderRadius: 10, background: "#F5F5F5", border: "none", fontSize: 18, cursor: "pointer", fontFamily: "inherit" }}>−</button>
                      <input type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", parseFloat(e.target.value) || 0)} style={{ width: 60, textAlign: "center", padding: "8px", border: "2px solid #F0F0F0", borderRadius: 10, fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "inherit" }} />
                      <button onClick={() => set("quantity", form.quantity + 1)} style={{ width: 36, height: 36, borderRadius: 10, background: PINK + "15", border: `2px solid ${PINK}33`, color: PINK, fontSize: 18, cursor: "pointer", fontFamily: "inherit" }}>+</button>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>Unit</p>
                    <select value={form.unit} onChange={(e) => set("unit", e.target.value)} style={{ ...iStyle, marginBottom: 0, height: 38, padding: "0 10px" }}>
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* Stores */}
                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 8px" }}>Where to buy</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {stores.map((s) => (
                    <button key={s} onClick={() => toggleStore(s)} style={{
                      padding: "6px 12px", borderRadius: 20,
                      border: `2px solid ${form.stores.includes(s) ? PINK : "#eee"}`,
                      background: form.stores.includes(s) ? PINK + "15" : "white",
                      color: form.stores.includes(s) ? PINK : "#888",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}>{s}</button>
                  ))}
                </div>
              </>
            )}

            {tab === "details" && (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 8px" }}>Location in home</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {LOCATIONS.map((l) => (
                    <button key={l} onClick={() => set("location", form.location === l ? "" : l)} style={{
                      padding: "6px 12px", borderRadius: 20,
                      border: `2px solid ${form.location === l ? "#6C5CE7" : "#eee"}`,
                      background: form.location === l ? "#6C5CE722" : "white",
                      color: form.location === l ? "#6C5CE7" : "#888",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}>{l}</button>
                  ))}
                </div>

                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>Expiration date</p>
                <input type="date" value={form.expirationDate} onChange={(e) => set("expirationDate", e.target.value)} style={{ ...iStyle }} />

                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>Low stock alert at</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <input type="number" min="0" value={form.lowStock} onChange={(e) => set("lowStock", parseInt(e.target.value) || 0)} style={{ ...iStyle, marginBottom: 0, width: 80 }} />
                  <span style={{ fontSize: 13, color: "#888" }}>{form.unit} or less</span>
                </div>

                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>Notes</p>
                <textarea placeholder="Any notes about this item..." value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} style={{ ...iStyle, resize: "vertical", fontFamily: "inherit" }} />
              </>
            )}
          </div>

          <div style={{ paddingTop: 16, display: "flex", gap: 8, flexDirection: "column" }}>
            <button onClick={save} style={{ ...btnPrimary, opacity: form.name ? 1 : 0.5 }} disabled={!form.name}>
              {isEdit ? "Save Changes" : "Add to Backstock"}
            </button>
            {isEdit && (
              <button onClick={() => { onDelete(form.id); onClose(); }} style={{ ...btnSecondary, color: "#FF006E", borderColor: "#FF006E" }}>
                Delete Item
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
//  ITEM CARD
// ══════════════════════════════════════════════

function ItemCard({ item, allCategories, onClick }) {
  const cat = allCategories.find((c) => c.id === item.category) || allCategories[0];
  const isLow = item.quantity <= item.lowStock;
  const isExpiringSoon = item.expirationDate && (() => {
    const days = (new Date(item.expirationDate) - new Date()) / 86400000;
    return days >= 0 && days <= 30;
  })();
  const isExpired = item.expirationDate && new Date(item.expirationDate) < new Date();

  return (
    <div
      onClick={onClick}
      style={{
        background: "white", borderRadius: 18, overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)", cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s", position: "relative",
        border: isExpired ? "2px solid #FF006E33" : isLow ? `2px solid ${PINK}33` : "2px solid transparent",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; }}
    >
      <div style={{ height: 130, background: `linear-gradient(150deg, ${cat.color}44, ${cat.color}1A)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, position: "relative", overflow: "hidden" }}>
        {item.photo
          ? <img src={item.photo} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", position: "absolute", inset: 0, padding: "10px", boxSizing: "border-box" }} alt="" />
          : item.imageUrl
          ? <img src={item.imageUrl} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", position: "absolute", inset: 0, padding: "10px", boxSizing: "border-box" }} alt="" />
          : <span style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.12))" }}>{cat.emoji}</span>}
        <span style={{ position: "absolute", top: 6, left: 6, background: cat.color, color: "white", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{cat.emoji}</span>
        {isExpired && <span style={{ position: "absolute", top: 6, right: 6, background: "#FF006E", color: "white", borderRadius: 20, padding: "2px 7px", fontSize: 9, fontWeight: 700 }}>EXPIRED</span>}
        {!isExpired && isExpiringSoon && <span style={{ position: "absolute", top: 6, right: 6, background: "#FFBE0B", color: "#333", borderRadius: 20, padding: "2px 7px", fontSize: 9, fontWeight: 700 }}>EXP SOON</span>}
        {isLow && !isExpired && !isExpiringSoon && <span style={{ position: "absolute", top: 6, right: 6, background: PINK, color: "white", borderRadius: 20, padding: "2px 7px", fontSize: 9, fontWeight: 700 }}>LOW</span>}
      </div>
      <div style={{ padding: "10px 11px 12px" }}>
        {item.brand && <p style={{ margin: "0 0 1px", fontSize: 10, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{item.brand}</p>}
        <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#1A1A2E", lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.name}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: isLow ? PINK : "#1A1A2E" }}>{item.quantity}</span>
          <span style={{ fontSize: 11, color: "#bbb", fontWeight: 500 }}>{item.unit}</span>
        </div>
        {item.location && <p style={{ margin: "4px 0 0", fontSize: 10, color: "#bbb" }}>📍 {item.location}</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  SHOPPING LIST VIEW
// ══════════════════════════════════════════════

function ShoppingListView({ items, stores, allCategories }) {
  const [selectedStore, setSelectedStore] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);

  const storesWithItems = stores.filter((s) => items.some((i) => i.stores.includes(s)));

  const filtered = items.filter((i) => {
    const atStore = selectedStore ? i.stores.includes(selectedStore) : true;
    const lowCheck = showLowOnly ? i.quantity <= i.lowStock : true;
    return atStore && lowCheck;
  });

  const grouped = allCategories
    .map((c) => ({ ...c, items: filtered.filter((i) => i.category === c.id) }))
    .filter((c) => c.items.length > 0);

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Store filter */}
      <div style={{ overflowX: "auto", display: "flex", gap: 6, paddingBottom: 12 }}>
        <button onClick={() => setSelectedStore("")} style={{ padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap", border: `2px solid ${!selectedStore ? PINK : "#e8e8e8"}`, background: !selectedStore ? PINK + "18" : "white", color: !selectedStore ? PINK : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          All Stores
        </button>
        {storesWithItems.map((s) => (
          <button key={s} onClick={() => setSelectedStore(selectedStore === s ? "" : s)} style={{ padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap", border: `2px solid ${selectedStore === s ? PINK : "#e8e8e8"}`, background: selectedStore === s ? PINK + "18" : "white", color: selectedStore === s ? PINK : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {s}
          </button>
        ))}
      </div>

      {/* Low stock toggle */}
      <button onClick={() => setShowLowOnly(!showLowOnly)} style={{ marginBottom: 16, padding: "7px 16px", borderRadius: 20, border: `2px solid ${showLowOnly ? PINK : "#e8e8e8"}`, background: showLowOnly ? PINK + "18" : "white", color: showLowOnly ? PINK : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        ⚠️ Low stock only
      </button>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🛒</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#888", margin: "0 0 6px" }}>Nothing here</p>
          <p style={{ fontSize: 13, color: "#bbb", margin: 0 }}>Add items or adjust your filters</p>
        </div>
      ) : (
        grouped.map((grp) => (
          <div key={grp.id} style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: grp.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {grp.emoji} {grp.label}
            </p>
            {grp.items.map((item) => {
              const isLow = item.quantity <= item.lowStock;
              return (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "white", borderRadius: 14, padding: "12px 14px", marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: grp.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, overflow: "hidden" }}>
                    {item.photo
                      ? <img src={item.photo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="" />
                      : item.imageUrl
                      ? <img src={item.imageUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="" />
                      : grp.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1A1A2E" }}>{item.name}</p>
                    {item.brand && <p style={{ margin: "1px 0 0", fontSize: 11, color: "#bbb" }}>{item.brand}</p>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 10, color: "#bbb", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>on hand</p>
                    <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: isLow ? PINK : "#1A1A2E", lineHeight: 1 }}>{item.quantity}</p>
                    <p style={{ margin: "1px 0 0", fontSize: 10, color: "#bbb" }}>{item.unit}</p>
                    {isLow && <p style={{ margin: "3px 0 0", fontSize: 9, fontWeight: 700, color: PINK, textTransform: "uppercase", letterSpacing: "0.3px" }}>restock</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
//  BACKSTOCK SCREEN
// ══════════════════════════════════════════════

function BackstockScreen({ user }) {
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([...DEFAULT_STORES]);
  const [view, setView] = useState("shelf");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterCat, setFilterCat] = useState("");
  const [filterStore, setFilterStore] = useState("");
  const [search, setSearch] = useState("");
  const [newStore, setNewStore] = useState("");
  const [showStoreInput, setShowStoreInput] = useState(false);
  const [loading, setLoading] = useState(true);

  const allCategories = CATEGORIES;

  // Load items from Supabase
  useEffect(() => {
    loadItems();
    loadStores();
  }, [user.id]);

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data.map(rowToItem));
    setLoading(false);
  };

  const loadStores = async () => {
    const { data, error } = await supabase
      .from("user_stores")
      .select("name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (!error && data && data.length > 0) {
      setStores(data.map((r) => r.name));
    }
    // Otherwise keep DEFAULT_STORES
  };

  const handleSave = async (item) => {
    const isNew = !items.find((i) => i.id === item.id);
    if (isNew) {
      const row = itemToRow(item, user.id);
      const { data, error } = await supabase.from("items").insert(row).select().single();
      if (!error && data) setItems((prev) => [rowToItem(data), ...prev]);
    } else {
      const row = itemToRow(item, user.id);
      const { data, error } = await supabase.from("items").update(row).eq("id", item.id).select().single();
      if (!error && data) setItems((prev) => prev.map((i) => (i.id === item.id ? rowToItem(data) : i)));
    }
  };

  const handleDelete = async (id) => {
    await supabase.from("items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addStore = async () => {
    const name = newStore.trim();
    if (!name || stores.includes(name)) { setNewStore(""); setShowStoreInput(false); return; }
    const { error } = await supabase.from("user_stores").insert({ user_id: user.id, name, emoji: "🏪", color: "#888888" });
    if (!error) setStores((prev) => [...prev, name]);
    setNewStore("");
    setShowStoreInput(false);
  };

  const filtered = items.filter((i) => {
    const matchCat = filterCat ? i.category === filterCat : true;
    const matchStore = filterStore ? i.stores.includes(filterStore) : true;
    const matchSearch = search ? i.name.toLowerCase().includes(search.toLowerCase()) || (i.brand || "").toLowerCase().includes(search.toLowerCase()) : true;
    return matchCat && matchStore && matchSearch;
  });

  const lowStockCount = items.filter((i) => i.quantity <= i.lowStock).length;
  const expiredCount = items.filter((i) => i.expirationDate && new Date(i.expirationDate) < new Date()).length;

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#F7F7F9", minHeight: "100%", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "white", padding: "20px 16px 0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1A1A2E", fontFamily: "'Syne', sans-serif" }}>Backstock</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>
              {items.length} item{items.length !== 1 ? "s" : ""}
              {lowStockCount > 0 && <span style={{ color: PINK }}> · {lowStockCount} low</span>}
              {expiredCount > 0 && <span style={{ color: "#FF006E" }}> · {expiredCount} expired</span>}
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${PINK}, ${FUCHSIA})`, border: "none", borderRadius: 14, color: "white", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(255,45,146,0.35)" }}>+</button>
        </div>

        <div style={{ display: "flex", gap: 0, marginBottom: 0 }}>
          {[{ id: "shelf", label: "My Shelf" }, { id: "shopping", label: "🛒 Shopping List" }].map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} style={{ flex: 1, padding: "11px 8px", border: "none", borderBottom: `3px solid ${view === v.id ? PINK : "transparent"}`, background: "transparent", color: view === v.id ? PINK : "#999", fontWeight: view === v.id ? 700 : 500, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === "shopping" ? (
        <div style={{ paddingTop: 20 }}>
          <ShoppingListView items={items} stores={stores} allCategories={allCategories} />
        </div>
      ) : (
        <>
          <div style={{ padding: "14px 16px 0" }}>
            <input placeholder="🔍  Search items..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...iStyle, marginBottom: 10, background: "white" }} />

            <div style={{ overflowX: "auto", display: "flex", gap: 6, paddingBottom: 8 }}>
              <button onClick={() => setFilterCat("")} style={{ padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap", border: `2px solid ${!filterCat ? PINK : "#e8e8e8"}`, background: !filterCat ? PINK + "18" : "white", color: !filterCat ? PINK : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>All</button>
              {allCategories.filter((c) => items.some((i) => i.category === c.id)).map((c) => (
                <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? "" : c.id)} style={{ padding: "6px 12px", borderRadius: 20, whiteSpace: "nowrap", border: `2px solid ${filterCat === c.id ? c.color : "#e8e8e8"}`, background: filterCat === c.id ? c.color + "22" : "white", color: filterCat === c.id ? c.color : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            {stores.filter((s) => items.some((i) => i.stores.includes(s))).length > 0 && (
              <div style={{ overflowX: "auto", display: "flex", gap: 6, paddingBottom: 8 }}>
                <button onClick={() => setFilterStore("")} style={{ padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap", border: `2px solid ${!filterStore ? "#6C5CE7" : "#e8e8e8"}`, background: !filterStore ? "#6C5CE722" : "white", color: !filterStore ? "#6C5CE7" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>All Stores</button>
                {stores.filter((s) => items.some((i) => i.stores.includes(s))).map((s) => (
                  <button key={s} onClick={() => setFilterStore(filterStore === s ? "" : s)} style={{ padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap", border: `2px solid ${filterStore === s ? "#6C5CE7" : "#e8e8e8"}`, background: filterStore === s ? "#6C5CE722" : "white", color: filterStore === s ? "#6C5CE7" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{s}</button>
                ))}
                <button onClick={() => setShowStoreInput(!showStoreInput)} style={{ padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap", border: "2px dashed #ddd", background: "white", color: "#bbb", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add store</button>
              </div>
            )}

            {stores.filter((s) => items.some((i) => i.stores.includes(s))).length === 0 && (
              <div style={{ overflowX: "auto", display: "flex", gap: 6, paddingBottom: 8 }}>
                <button onClick={() => setShowStoreInput(!showStoreInput)} style={{ padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap", border: "2px dashed #ddd", background: "white", color: "#bbb", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add store</button>
              </div>
            )}

            {showStoreInput && (
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input placeholder="Store name" value={newStore} onChange={(e) => setNewStore(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addStore()} style={{ ...iStyle, marginBottom: 0, flex: 1 }} autoFocus />
                <button onClick={addStore} style={{ padding: "0 16px", background: PINK, color: "white", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Add</button>
              </div>
            )}
          </div>

          <div style={{ padding: "12px 16px 0" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                <p style={{ color: "#aaa", fontSize: 14 }}>Loading your items…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>🏠</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#888", margin: "0 0 8px" }}>
                  {items.length === 0 ? "Your shelf is empty" : "No items match"}
                </p>
                <p style={{ fontSize: 14, color: "#bbb", margin: 0 }}>
                  {items.length === 0 ? "Tap + to start building your backstock" : "Try clearing your filters"}
                </p>
                {items.length === 0 && (
                  <button onClick={() => setShowAdd(true)} style={{ ...btnPrimary, marginTop: 24, width: "auto", padding: "13px 32px" }}>Add First Item</button>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {filtered.map((item) => (
                  <ItemCard key={item.id} item={item} allCategories={allCategories} onClick={() => setEditItem(item)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showAdd && <ItemModal allCategories={allCategories} stores={stores} onSave={handleSave} onDelete={handleDelete} onClose={() => setShowAdd(false)} />}
      {editItem && <ItemModal item={editItem} allCategories={allCategories} stores={stores} onSave={handleSave} onDelete={handleDelete} onClose={() => setEditItem(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════
//  HOME SCREEN
// ══════════════════════════════════════════════

function HomeScreen({ user, items, onNavigate }) {
  const lowStock = items.filter((i) => i.quantity <= i.lowStock);
  const expiring = items.filter((i) => { if (!i.expirationDate) return false; const days = (new Date(i.expirationDate) - new Date()) / 86400000; return days >= 0 && days <= 7; });
  const expired = items.filter((i) => i.expirationDate && new Date(i.expirationDate) < new Date());
  const catCounts = CATEGORIES.map((c) => ({ ...c, count: items.filter((i) => i.category === c.id).length })).filter((c) => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 4);

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "there";

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#F7F7F9", minHeight: "100%", paddingBottom: 80 }}>
      <div style={{ background: `linear-gradient(135deg, ${PINK}, ${FUCHSIA})`, padding: "32px 20px 28px", color: "white" }}>
        <p style={{ margin: "0 0 4px", fontSize: 13, opacity: 0.85 }}>Good day+</p>
        <h2 style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", fontFamily: "'Syne', sans-serif" }}>
          {displayName} 👋
        </h2>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>Niles is at your service.</p>
      </div>

      <div style={{ padding: "20px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Total Items", value: items.length, color: "#6C5CE7", emoji: "📦" },
            { label: "Low Stock", value: lowStock.length, color: PINK, emoji: "⚠️" },
            { label: "Expiring", value: expiring.length + expired.length, color: "#FF9F43", emoji: "📅" },
          ].map((s) => (
            <div key={s.label} onClick={() => onNavigate("backstock")} style={{ background: "white", borderRadius: 16, padding: "14px 10px", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", cursor: "pointer" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'Syne', sans-serif" }}>{s.value}</p>
              <p style={{ margin: "3px 0 0", fontSize: 10, color: "#bbb", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {catCounts.length > 0 && (
          <div style={{ background: "white", borderRadius: 20, padding: "18px 20px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>Top Categories</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {catCounts.map((c) => (
                <div key={c.id} onClick={() => onNavigate("backstock")} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.emoji}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>{c.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{c.count} items</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div style={{ background: "white", borderRadius: 20, padding: "24px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>Start Your Backstock</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#888", lineHeight: 1.5 }}>Scan or manually add household items to keep track of what you have.</p>
            <button onClick={() => onNavigate("backstock")} style={{ ...btnPrimary, width: "auto", padding: "13px 32px" }}>Add First Item</button>
          </div>
        )}

        <div onClick={() => onNavigate("gifts")} style={{ marginTop: 16, background: "linear-gradient(135deg, #6C5CE7, #a29bfe)", borderRadius: 20, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", boxShadow: "0 4px 20px rgba(108,92,231,0.3)" }}>
          <div style={{ fontSize: 32 }}>🎁</div>
          <div>
            <p style={{ margin: 0, color: "white", fontWeight: 700, fontSize: 15 }}>Gift Giver</p>
            <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 13 }}>Coming soon — never miss a birthday</p>
          </div>
          <div style={{ marginLeft: "auto", color: "rgba(255,255,255,0.6)", fontSize: 18 }}>›</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  GIFT GIVER PLACEHOLDER
// ═══════════════════════════════════════════════

function GiftGiverScreen() {
  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#F7F7F9", minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
      <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, #6C5CE7, #a29bfe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, marginBottom: 24, boxShadow: "0 12px 40px rgba(108,92,231,0.3)" }}>🎁</div>
      <h2 style={{ margin: "0 0 12px", fontSize: 26, fontWeight: 800, color: "#1A1A2E", fontFamily: "'Syne', sans-serif" }}>Gift Giver</h2>
      <p style={{ margin: "0 0 32px", fontSize: 15, color: "#888", lineHeight: 1.6, maxWidth: 300 }}>Never miss a birthday or special occasion. Smart gift suggestions, reminders, and more — coming next.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        {[{ emoji: "📅", text: "Birthday & event reminders" }, { emoji: "🔔", text: "Batch digest notifications" }, { emoji: "🤖", text: "AI-powered gift suggestions" }, { emoji: "📸", text: "Share wish lists & screenshots" }].map((f) => (
          <div key={f.text} style={{ background: "white", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: 22 }}>{f.emoji}</span>
            <span style={{ fontSize: 14, color: "#555", fontWeight: 500 }}>{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  PROFILE SCREEN
// ══════════════════════════════════════════════

function ProfileScreen({ user, onLogout }) {
  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#F7F7F9", minHeight: "100%", paddingBottom: 80 }}>
      <div style={{ background: `linear-gradient(135deg, ${PINK}, ${FUCHSIA})`, padding: "36px 20px 28px", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 12px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        <h2 style={{ color: "white", margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{displayName}</h2>
        <p style={{ color: "rgba(255,255,255,0.8)", margin: 0, fontSize: 13 }}>{user.email}</p>
      </div>
      <div style={{ padding: "20px 16px" }}>
        <div style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <button onClick={onLogout} style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: "inherit", borderTop: "1px solid #F5F5F5" }}>
            <span style={{ fontSize: 20 }}>🚪</span>
            <span style={{ fontSize: 15, color: "#FF006E", fontWeight: 600 }}>Sign Out</span>
          </button>
        </div>
        <p style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: "#ccc" }}>Niles · Your personal home butler 🎩</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  BOTTOM NAV
// ══════════════════════════════════════════════

function BottomNav({ screen, setScreen }) {
  const tabs = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "backstock", label: "Backstock", icon: "📦" },
    { id: "gifts", label: "Gifts", icon: "🎁" },
    { id: "profile", label: "Profile", icon: "👤" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "white", borderTop: "1px solid #F0F0F0", display: "flex", paddingBottom: "env(safe-area-inset-bottom, 8px)", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)", zIndex: 100 }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setScreen(t.id)} style={{ flex: 1, padding: "10px 4px 8px", border: "none", background: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: screen === t.id ? PINK : "#bbb", transition: "color 0.15s" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════

function MainApp({ user, onLogout }) {
  const [screen, setScreen] = useState("home");
  const [items, setItems] = useState([]);

  // Load items once for HomeScreen stats
  useEffect(() => {
    supabase.from("items").select("*").eq("user_id", user.id).then(({ data }) => {
      if (data) setItems(data.map(rowToItem));
    });
  }, [user.id]);

  const screens = {
    home: <HomeScreen user={user} items={items} onNavigate={setScreen} />,
    backstock: <BackstockScreen user={user} />,
    gifts: <GiftGiverScreen />,
    profile: <ProfileScreen user={user} onLogout={onLogout} />,
  };

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#F7F7F9", position: "relative", fontFamily: "'DM Sans', -apple-system, sans-serif", overflowX: "hidden" }}>
      <div style={{ minHeight: "calc(100vh - 64px)" }}>{screens[screen]}</div>
      <BottomNav screen={screen} setScreen={setScreen} />
    </div>
  );
}

// ══════════════════════════════════════════════
//  SHARED MODAL STYLES
// ══════════════════════════════════════════════

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "flex-end", justifyContent: "center",
  zIndex: 1000, backdropFilter: "blur(2px)",
};

const modalStyle = {
  background: "white", borderRadius: "28px 28px 0 0",
  padding: "24px 20px 32px", width: "100%", maxWidth: 430,
  maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
  fontFamily: "'DM Sans', -apple-system, sans-serif",
};

// ══════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════

export default function NilesApp() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Load fonts
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap";
    document.head.appendChild(link);

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(155deg, ${PINK} 0%, #FF87C3 45%, #FFF0F7 100%)` }}>
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎩</div>
          <p style={{ fontSize: 16, fontWeight: 600, opacity: 0.9 }}>Loading Niles…</p>
     0  </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  return <MainApp user={user} onLogout={handleLogout} />;
}
