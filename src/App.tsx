import { useState, useEffect, useRef } from "react";

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
//  STORAGE HELPERS
// ══════════════════════════════════════════════

const genId = () =>
  Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const db = {
  getUsers: () => JSON.parse(localStorage.getItem("niles_users") || "[]"),
  saveUsers: (u) => localStorage.setItem("niles_users", JSON.stringify(u)),
  getCurrentUser: () => JSON.parse(localStorage.getItem("niles_cu") || "null"),
  saveCurrentUser: (u) => localStorage.setItem("niles_cu", JSON.stringify(u)),
  getItems: (uid) =>
    (JSON.parse(localStorage.getItem("niles_items") || "{}"))[uid] || [],
  saveItems: (uid, items) => {
    const all = JSON.parse(localStorage.getItem("niles_items") || "{}");
    all[uid] = items;
    localStorage.setItem("niles_items", JSON.stringify(all));
  },
  getStores: (uid) => {
    const all = JSON.parse(localStorage.getItem("niles_stores") || "{}");
    return all[uid] || [...DEFAULT_STORES];
  },
  saveStores: (uid, stores) => {
    const all = JSON.parse(localStorage.getItem("niles_stores") || "{}");
    all[uid] = stores;
    localStorage.setItem("niles_stores", JSON.stringify(all));
  },
  getCustomCats: (uid) =>
    (JSON.parse(localStorage.getItem("niles_ccats") || "{}"))[uid] || [],
  saveCustomCats: (uid, cats) => {
    const all = JSON.parse(localStorage.getItem("niles_ccats") || "{}");
    all[uid] = cats;
    localStorage.setItem("niles_ccats", JSON.stringify(all));
  },
};

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

function Badge({ label, color, onRemove }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: color + "22",
        color: color,
        border: `1px solid ${color}44`,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 600,
        margin: "2px 3px 2px 0",
      }}
    >
      {label}
      {onRemove && (
        <span
          onClick={onRemove}
          style={{ cursor: "pointer", fontSize: 11, marginLeft: 2, opacity: 0.7 }}
        >
          ✕
        </span>
      )}
    </span>
  );
}

// ══════════════════════════════════════════════
//  AUTH SCREEN
// ══════════════════════════════════════════════

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    setErr("");
    if (!email || !password) { setErr("Please fill in all fields."); return; }
    const users = db.getUsers();

    if (mode === "login") {
      const u = users.find(
        (x) => x.email === email.toLowerCase() && x.password === password
      );
      if (!u) { setErr("Invalid email or password."); return; }
      db.saveCurrentUser(u);
      onAuth(u);
    } else {
      if (!name) { setErr("Please enter your name."); return; }
      if (users.find((x) => x.email === email.toLowerCase())) {
        setErr("Email already in use."); return;
      }
      if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
      const u = { id: genId(), email: email.toLowerCase(), password, name };
      db.saveUsers([...users, u]);
      db.saveCurrentUser(u);
      onAuth(u);
    }
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
              onClick={() => { setMode(m); setErr(""); }}
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

        <button onClick={submit} style={btnPrimary}>
          {mode === "login" ? "Sign In" : "Create Account"}
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
  const [status, setStatus] = useState("init"); // init | scanning | error | manual
  const [manualUpc, setManualUpc] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const hasDetector = typeof BarcodeDetector !== "undefined";

  useEffect(() => {
    if (hasDetector) {
      startCamera();
    } else {
      setStatus("manual");
    }
    return () => {
      stopCamera();
    };
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
    } catch (e) {
      setErrMsg("Camera not available. Enter UPC manually.");
      setStatus("manual");
    }
  };

  const scan = async () => {
    if (!videoRef.current || !detectorRef.current) return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes.length > 0) {
        stopCamera();
        onDetect(codes[0].rawValue);
        return;
      }
    } catch {}
    animRef.current = requestAnimationFrame(scan);
  };

  const submitManual = () => {
    if (manualUpc.trim().length < 8) {
      setErrMsg("Please enter a valid UPC (8–14 digits).");
      return;
    }
    onDetect(manualUpc.trim());
  };

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Scan Barcode</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#999" }}>✕</button>
        </div>

        {status === "scanning" && (
          <>
            <div style={{ position: "relative", background: "#000" }}>
              <video
                ref={videoRef}
                style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }}
                playsInline
                muted
              />
              {/* Scan guide */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: "72%", height: 100,
                  border: `3px solid ${PINK}`,
                  borderRadius: 12,
                  boxShadow: "0 0 0 2000px rgba(0,0,0,0.45)",
                  position: "relative",
                }}>
                  <div style={{
                    position: "absolute", left: "50%", transform: "translateX(-50%)",
                    top: "50%", marginTop: -1,
                    width: "90%", height: 2,
                    background: PINK, opacity: 0.8,
                    animation: "scan-line 1.8s ease-in-out infinite",
                  }} />
                </div>
              </div>
            </div>
            <p style={{ textAlign: "center", color: "#888", fontSize: 13, padding: "12px 20px 0" }}>
              Hold barcode steady within the frame
            </p>
          </>
        )}

        <div style={{ padding: "16px 20px 24px" }}>
          {status !== "scanning" && (
            <>
              {errMsg && (
                <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 0, marginBottom: 16 }}>{errMsg}</p>
              )}
              {!hasDetector && (
                <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 0, marginBottom: 16 }}>
                  Live scanning requires Chrome on Android. Enter UPC below.
                </p>
              )}
            </>
          )}

          <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 8px" }}>
            Or enter UPC manually
          </p>
          <input
            placeholder="e.g. 0123456789012"
            value={manualUpc}
            onChange={(e) => setManualUpc(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
            style={{ ...iStyle, marginBottom: 14 }}
            inputMode="numeric"
          />
          {errMsg && status === "manual" && (
            <p style={{ color: "#FF006E", fontSize: 12, margin: "-8px 0 10px" }}>{errMsg}</p>
          )}
          <button onClick={submitManual} style={btnPrimary}>
            Look Up Product
          </button>
        </div>
      </div>
      <style>{`
        @keyframes scan-line {
          0%, 100% { transform: translateX(-50%) translateY(-40px); }
          50% { transform: translateX(-50%) translateY(40px); }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
//  ADD / EDIT ITEM MODAL
// ══════════════════════════════════════════════

function ItemModal({ item, allCategories, stores, onSave, onDelete, onClose }) {
  const isEdit = !!item;

  const [form, setForm] = useState(
    item || {
      id: genId(),
      name: "", brand: "", upc: "",
      category: "pantry",
      quantity: 1, unit: "count",
      stores: [],
      expirationDate: "",
      location: "",
      photo: null, imageUrl: null,
      notes: "",
      lowStock: 1,
    }
  );
  const [showScanner, setShowScanner] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [tab, setTab] = useState("basics"); // basics | details

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpcDetected = async (upc) => {
    setShowScanner(false);
    set("upc", upc);
    setLookingUp(true);
    const result = await lookupUpc(upc);
    if (result) {
      setForm((f) => ({
        ...f,
        upc,
        name: result.name || f.name,
        brand: result.brand || f.brand,
        category: result.category || f.category,
        imageUrl: result.imageUrl || f.imageUrl,
      }));
    }
    setLookingUp(false);
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("photo", ev.target.result);
    reader.readAsDataURL(file);
  };

  const toggleStore = (s) => {
    set("stores", form.stores.includes(s)
      ? form.stores.filter((x) => x !== s)
      : [...form.stores, s]
    );
  };

  const save = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, updatedAt: Date.now() });
    onClose();
  };

  const cat = allCategories.find((c) => c.id === form.category);

  return (
    <>
      {showScanner && (
        <ScannerModal onDetect={handleUpcDetected} onClose={() => setShowScanner(false)} />
      )}
      <div style={overlayStyle}>
        <div style={{ ...modalStyle, display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
              {isEdit ? "Edit Item" : "Add Item"}
            </h3>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#999" }}>✕</button>
          </div>

          {/* UPC row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              placeholder="UPC code"
              value={form.upc}
              onChange={(e) => set("upc", e.target.value)}
              style={{ ...iStyle, marginBottom: 0, flex: 1 }}
            />
            <button
              onClick={() => setShowScanner(true)}
              style={{
                padding: "0 16px",
                background: PINK + "15",
                border: `2px solid ${PINK}33`,
                borderRadius: 12,
                color: PINK,
                fontSize: 20,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              📷
            </button>
          </div>

          {lookingUp && (
            <p style={{ color: PINK, fontSize: 13, margin: "-4px 0 12px", textAlign: "center" }}>
              🔍 Looking up product…
            </p>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {["basics", "details"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "9px", border: "none", borderRadius: 10,
                  background: tab === t ? PINK : "#F5F5F5",
                  color: tab === t ? "white" : "#888",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                }}
              >
                {t === "basics" ? "Basics" : "Details"}
              </button>
            ))}
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: "auto", paddingBottom: 4 }}>
            {tab === "basics" && (
              <>
                {/* Photo / image preview */}
                <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
                  <div
                    style={{
                      width: 72, height: 72,
                      borderRadius: 14,
                      background: (cat?.color || "#eee") + "33",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 32, flexShrink: 0,
                      overflow: "hidden",
                      border: "2px dashed " + (cat?.color || "#ccc") + "66",
                    }}
                  >
                    {form.photo
                      ? <img src={form.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                      : form.imageUrl
                      ? <img src={form.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                      : cat?.emoji || "📦"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: "block", padding: "9px 14px",
                      background: "#F5F5F5", borderRadius: 10,
                      fontSize: 13, fontWeight: 600, color: "#666",
                      cursor: "pointer", textAlign: "center",
                    }}>
                      📷 Add Photo
                      <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
                    </label>
                    {(form.photo || form.imageUrl) && (
                      <button
                        onClick={() => setForm((f) => ({ ...f, photo: null, imageUrl: null }))}
                        style={{
                          display: "block", width: "100%", marginTop: 6,
                          padding: "7px", background: "none",
                          border: "none", fontSize: 12, color: "#bbb", cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                <input placeholder="Item name *" value={form.name} onChange={(e) => set("name", e.target.value)} style={iStyle} />
                <input placeholder="Brand (optional)" value={form.brand} onChange={(e) => set("brand", e.target.value)} style={iStyle} />

                {/* Category */}
                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 8px" }}>Category</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {allCategories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => set("category", c.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        border: `2px solid ${form.category === c.id ? c.color : "#eee"}`,
                        background: form.category === c.id ? c.color + "22" : "white",
                        color: form.category === c.id ? c.color : "#888",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>

                {/* Quantity + Unit */}
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>Quantity</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={() => set("quantity", Math.max(0, form.quantity - 1))}
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: "#F5F5F5", border: "none",
                          fontSize: 18, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >−</button>
                      <input
                        type="number"
                        min="0"
                        value={form.quantity}
                        onChange={(e) => set("quantity", parseFloat(e.target.value) || 0)}
                        style={{
                          width: 60, textAlign: "center",
                          padding: "8px", border: "2px solid #F0F0F0",
                          borderRadius: 10, fontSize: 16, fontWeight: 700,
                          outline: "none", fontFamily: "inherit",
                        }}
                      />
                      <button
                        onClick={() => set("quantity", form.quantity + 1)}
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: PINK + "15", border: `2px solid ${PINK}33`,
                          color: PINK, fontSize: 18, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >+</button>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>Unit</p>
                    <select
                      value={form.unit}
                      onChange={(e) => set("unit", e.target.value)}
                      style={{ ...iStyle, marginBottom: 0, height: 38, padding: "0 10px" }}
                    >
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* Stores */}
                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 8px" }}>Where to buy</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {stores.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleStore(s)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        border: `2px solid ${form.stores.includes(s) ? PINK : "#eee"}`,
                        background: form.stores.includes(s) ? PINK + "15" : "white",
                        color: form.stores.includes(s) ? PINK : "#888",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {tab === "details" && (
              <>
                {/* Location */}
                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 8px" }}>Location in home</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {LOCATIONS.map((l) => (
                    <button
                      key={l}
                      onClick={() => set("location", form.location === l ? "" : l)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        border: `2px solid ${form.location === l ? "#6C5CE7" : "#eee"}`,
                        background: form.location === l ? "#6C5CE722" : "white",
                        color: form.location === l ? "#6C5CE7" : "#888",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {/* Expiration */}
                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>Expiration date</p>
                <input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => set("expirationDate", e.target.value)}
                  style={{ ...iStyle }}
                />

                {/* Low stock threshold */}
                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>
                  Low stock alert at
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <input
                    type="number"
                    min="0"
                    value={form.lowStock}
                    onChange={(e) => set("lowStock", parseInt(e.target.value) || 0)}
                    style={{ ...iStyle, marginBottom: 0, width: 80 }}
                  />
                  <span style={{ fontSize: 13, color: "#888" }}>{form.unit} or less</span>
                </div>

                {/* Notes */}
                <p style={{ fontSize: 13, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>Notes</p>
                <textarea
                  placeholder="Any notes about this item..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  style={{
                    ...iStyle,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ paddingTop: 16, display: "flex", gap: 8, flexDirection: "column" }}>
            <button onClick={save} style={{ ...btnPrimary, opacity: form.name ? 1 : 0.5 }} disabled={!form.name}>
              {isEdit ? "Save Changes" : "Add to Backstock"}
            </button>
            {isEdit && (
              <button
                onClick={() => { onDelete(form.id); onClose(); }}
                style={{ ...btnSecondary, color: "#FF006E", borderColor: "#FF006E" }}
              >
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
        background: "white",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative",
        border: isExpired ? "2px solid #FF006E33" : isLow ? `2px solid ${PINK}33` : "2px solid transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)";
      }}
    >
      {/* Image / Icon area */}
      <div
        style={{
          height: 130,
          background: `linear-gradient(150deg, ${cat.color}44, ${cat.color}1A)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 52, position: "relative", overflow: "hidden",
        }}
      >
        {item.photo
          ? <img src={item.photo} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", position: "absolute", inset: 0, padding: "10px", boxSizing: "border-box" }} alt="" />
          : item.imageUrl
          ? <img src={item.imageUrl} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", position: "absolute", inset: 0, padding: "10px", boxSizing: "border-box" }} alt="" />
          : <span style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.12))" }}>{cat.emoji}</span>}

        {/* Category pill */}
        <span
          style={{
            position: "absolute", top: 6, left: 6,
            background: cat.color,
            color: "white",
            borderRadius: 20, padding: "2px 8px",
            fontSize: 10, fontWeight: 700,
            letterSpacing: "0.3px",
          }}
        >
          {cat.emoji}
        </span>

        {/* Alert badges */}
        {isExpired && (
          <span style={{
            position: "absolute", top: 6, right: 6,
            background: "#FF006E", color: "white",
            borderRadius: 20, padding: "2px 7px",
            fontSize: 9, fontWeight: 700,
          }}>EXPIRED</span>
        )}
        {!isExpired && isExpiringSoon && (
          <span style={{
            position: "absolute", top: 6, right: 6,
            background: "#FFBE0B", color: "#333",
            borderRadius: 20, padding: "2px 7px",
            fontSize: 9, fontWeight: 700,
          }}>EXP SOON</span>
        )}
        {isLow && !isExpired && !isExpiringSoon && (
          <span style={{
            position: "absolute", top: 6, right: 6,
            background: PINK, color: "white",
            borderRadius: 20, padding: "2px 7px",
            fontSize: 9, fontWeight: 700,
          }}>LOW</span>
        )}
      </div>

      {/* Info area */}
      <div style={{ padding: "10px 11px 12px" }}>
        {item.brand && (
          <p style={{ margin: "0 0 1px", fontSize: 10, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
            {item.brand}
          </p>
        )}
        <p style={{
          margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#1A1A2E",
          lineHeight: 1.25,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {item.name}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontSize: 16, fontWeight: 800,
            color: isLow ? PINK : "#1A1A2E",
          }}>
            {item.quantity}
          </span>
          <span style={{ fontSize: 11, color: "#bbb", fontWeight: 500 }}>
            {item.unit}
          </span>
        </div>
        {item.location && (
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "#bbb" }}>📍 {item.location}</p>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  SHOPPING LIST VIEW
// ══════════════════════════════════════════════

function ShoppingListView({ items, stores, allCategories, onBack }) {
  const [selectedStore, setSelectedStore] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);

  const storesWithItems = stores.filter((s) => items.some((i) => i.stores.includes(s)));

  const filtered = items.filter((i) => {
    const atStore = selectedStore ? i.stores.includes(selectedStore) : true;
    const lowCheck = showLowOnly ? i.quantity <= i.lowStock : true;
    return atStore && lowCheck;
  });

  const groupedByCategory = allCategories
    .map((c) => ({ cat: c, items: filtered.filter((i) => i.category === c.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Store filter */}
      <div style={{ overflowX: "auto", display: "flex", gap: 8, paddingBottom: 4, marginBottom: 16 }}>
        <button
          onClick={() => setSelectedStore("")}
          style={{
            padding: "8px 16px", borderRadius: 20, whiteSpace: "nowrap",
            border: `2px solid ${!selectedStore ? PINK : "#eee"}`,
            background: !selectedStore ? PINK + "18" : "white",
            color: !selectedStore ? PINK : "#888",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          All Stores
        </button>
        {storesWithItems.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedStore(s)}
            style={{
              padding: "8px 16px", borderRadius: 20, whiteSpace: "nowrap",
              border: `2px solid ${selectedStore === s ? PINK : "#eee"}`,
              background: selectedStore === s ? PINK + "18" : "white",
              color: selectedStore === s ? PINK : "#888",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Low stock toggle */}
      <button
        onClick={() => setShowLowOnly(!showLowOnly)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 12, marginBottom: 20,
          border: `2px solid ${showLowOnly ? PINK : "#eee"}`,
          background: showLowOnly ? PINK + "12" : "white",
          color: showLowOnly ? PINK : "#888",
          fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <span>{showLowOnly ? "✓" : "○"}</span>
        Low stock only
      </button>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#ccc" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <p style={{ fontSize: 15, fontWeight: 600 }}>No items found</p>
          <p style={{ fontSize: 13, color: "#ddd" }}>
            {selectedStore ? `No items tagged to ${selectedStore}` : "Add items and tag them to stores"}
          </p>
        </div>
      ) : (
        groupedByCategory.map(({ cat, items: catItems }) => (
          <div key={cat.id} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>{cat.emoji}</span>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#333" }}>{cat.label}</h4>
              <span style={{
                background: cat.color + "33", color: cat.color,
                borderRadius: 20, padding: "1px 8px",
                fontSize: 11, fontWeight: 700,
              }}>
                {catItems.length}
              </span>
            </div>
            {catItems.map((item) => {
              const isLow = item.quantity <= item.lowStock;
              return (
                <div key={item.id} style={{
                  background: "white",
                  borderRadius: 14,
                  padding: "12px 14px",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                  border: isLow ? `1px solid ${PINK}33` : "1px solid transparent",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: cat.color + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, flexShrink: 0, overflow: "hidden",
                  }}>
                    {item.photo
                      ? <img src={item.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                      : item.imageUrl
                      ? <img src={item.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                      : cat.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1A1A2E" }}>{item.name}</p>
                    {item.brand && <p style={{ margin: "1px 0 0", fontSize: 11, color: "#bbb" }}>{item.brand}</p>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 10, color: "#bbb", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>on hand</p>
                    <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: isLow ? PINK : "#1A1A2E", lineHeight: 1 }}>
                      {item.quantity}
                    </p>
                    <p style={{ margin: "1px 0 0", fontSize: 10, color: "#bbb" }}>{item.unit}</p>
                    {isLow && (
                      <p style={{ margin: "3px 0 0", fontSize: 9, fontWeight: 700, color: PINK, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                        restock
                      </p>
                    )}
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
  const [items, setItems] = useState(() => db.getItems(user.id));
  const [stores, setStores] = useState(() => db.getStores(user.id));
  const [customCats, setCustomCats] = useState(() => db.getCustomCats(user.id));
  const [view, setView] = useState("shelf"); // shelf | shopping
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterCat, setFilterCat] = useState("");
  const [filterStore, setFilterStore] = useState("");
  const [search, setSearch] = useState("");
  const [newStore, setNewStore] = useState("");
  const [showStoreInput, setShowStoreInput] = useState(false);

  const allCategories = [...CATEGORIES, ...customCats];

  const saveItems = (updated) => { setItems(updated); db.saveItems(user.id, updated); };

  const handleSave = (item) => {
    const existing = items.find((i) => i.id === item.id);
    saveItems(existing
      ? items.map((i) => (i.id === item.id ? item : i))
      : [...items, { ...item, createdAt: Date.now() }]
    );
  };

  const handleDelete = (id) => saveItems(items.filter((i) => i.id !== id));

  const addStore = () => {
    if (newStore.trim() && !stores.includes(newStore.trim())) {
      const updated = [...stores, newStore.trim()];
      setStores(updated);
      db.saveStores(user.id, updated);
    }
    setNewStore("");
    setShowStoreInput(false);
  };

  const filtered = items.filter((i) => {
    const matchCat = filterCat ? i.category === filterCat : true;
    const matchStore = filterStore ? i.stores.includes(filterStore) : true;
    const matchSearch = search
      ? i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.brand || "").toLowerCase().includes(search.toLowerCase())
      : true;
    return matchCat && matchStore && matchSearch;
  });

  const lowStockCount = items.filter((i) => i.quantity <= i.lowStock).length;
  const expiredCount = items.filter(
    (i) => i.expirationDate && new Date(i.expirationDate) < new Date()
  ).length;

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#F7F7F9", minHeight: "100%", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: "white",
        padding: "20px 16px 0",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1A1A2E", fontFamily: "'Syne', sans-serif" }}>Backstock</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>
              {items.length} item{items.length !== 1 ? "s" : ""}
              {lowStockCount > 0 && <span style={{ color: PINK }}> · {lowStockCount} low</span>}
              {expiredCount > 0 && <span style={{ color: "#FF006E" }}> · {expiredCount} expired</span>}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              width: 44, height: 44,
              background: `linear-gradient(135deg, ${PINK}, ${FUCHSIA})`,
              border: "none", borderRadius: 14,
              color: "white", fontSize: 22,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(255,45,146,0.35)",
            }}
          >
            +
          </button>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 0, marginBottom: 0 }}>
          {[
            { id: "shelf", label: "My Shelf" },
            { id: "shopping", label: "🛒 Shopping List" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                flex: 1, padding: "11px 8px",
                border: "none", borderBottom: `3px solid ${view === v.id ? PINK : "transparent"}`,
                background: "transparent",
                color: view === v.id ? PINK : "#999",
                fontWeight: view === v.id ? 700 : 500,
                fontSize: 14, cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === "shopping" ? (
        <div style={{ paddingTop: 20 }}>
          <ShoppingListView
            items={items}
            stores={stores}
            allCategories={allCategories}
          />
        </div>
      ) : (
        <>
          {/* Search + filters */}
          <div style={{ padding: "14px 16px 0" }}>
            <input
              placeholder="🔍  Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...iStyle, marginBottom: 10, background: "white" }}
            />

            {/* Category filter pills */}
            <div style={{ overflowX: "auto", display: "flex", gap: 6, paddingBottom: 8 }}>
              <button
                onClick={() => setFilterCat("")}
                style={{
                  padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap",
                  border: `2px solid ${!filterCat ? PINK : "#e8e8e8"}`,
                  background: !filterCat ? PINK + "18" : "white",
                  color: !filterCat ? PINK : "#888",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                All
              </button>
              {allCategories
                .filter((c) => items.some((i) => i.category === c.id))
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFilterCat(filterCat === c.id ? "" : c.id)}
                    style={{
                      padding: "6px 12px", borderRadius: 20, whiteSpace: "nowrap",
                      border: `2px solid ${filterCat === c.id ? c.color : "#e8e8e8"}`,
                      background: filterCat === c.id ? c.color + "22" : "white",
                      color: filterCat === c.id ? c.color : "#888",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
            </div>

            {/* Store filter pills */}
            {stores.filter((s) => items.some((i) => i.stores.includes(s))).length > 0 && (
              <div style={{ overflowX: "auto", display: "flex", gap: 6, paddingBottom: 8 }}>
                <button
                  onClick={() => setFilterStore("")}
                  style={{
                    padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap",
                    border: `2px solid ${!filterStore ? "#6C5CE7" : "#e8e8e8"}`,
                    background: !filterStore ? "#6C5CE722" : "white",
                    color: !filterStore ? "#6C5CE7" : "#888",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  All Stores
                </button>
                {stores
                  .filter((s) => items.some((i) => i.stores.includes(s)))
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStore(filterStore === s ? "" : s)}
                      style={{
                        padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap",
                        border: `2px solid ${filterStore === s ? "#6C5CE7" : "#e8e8e8"}`,
                        background: filterStore === s ? "#6C5CE722" : "white",
                        color: filterStore === s ? "#6C5CE7" : "#888",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                <button
                  onClick={() => setShowStoreInput(!showStoreInput)}
                  style={{
                    padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap",
                    border: "2px dashed #ddd",
                    background: "white", color: "#bbb",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  + Add store
                </button>
              </div>
            )}

            {showStoreInput && (
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  placeholder="Store name"
                  value={newStore}
                  onChange={(e) => setNewStore(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStore()}
                  style={{ ...iStyle, marginBottom: 0, flex: 1 }}
                  autoFocus
                />
                <button
                  onClick={addStore}
                  style={{
                    padding: "0 16px", background: PINK, color: "white",
                    border: "none", borderRadius: 12, cursor: "pointer",
                    fontWeight: 700, fontFamily: "inherit",
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Item grid */}
          <div style={{ padding: "12px 16px 0" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>🏠</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#888", margin: "0 0 8px" }}>
                  {items.length === 0 ? "Your shelf is empty" : "No items match"}
                </p>
                <p style={{ fontSize: 14, color: "#bbb", margin: 0 }}>
                  {items.length === 0
                    ? "Tap + to start building your backstock"
                    : "Try clearing your filters"}
                </p>
                {items.length === 0 && (
                  <button
                    onClick={() => setShowAdd(true)}
                    style={{ ...btnPrimary, marginTop: 24, width: "auto", padding: "13px 32px" }}
                  >
                    Add First Item
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                }}
              >
                {filtered.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    allCategories={allCategories}
                    onClick={() => setEditItem(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Item Modal */}
      {showAdd && (
        <ItemModal
          allCategories={allCategories}
          stores={stores}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit Item Modal */}
      {editItem && (
        <ItemModal
          item={editItem}
          allCategories={allCategories}
          stores={stores}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
//  HOME SCREEN
// ══════════════════════════════════════════════

function HomeScreen({ user, items, onNavigate }) {
  const lowStock = items.filter((i) => i.quantity <= i.lowStock);
  const expiring = items.filter((i) => {
    if (!i.expirationDate) return false;
    const days = (new Date(i.expirationDate) - new Date()) / 86400000;
    return days >= 0 && days <= 7;
  });
  const expired = items.filter(
    (i) => i.expirationDate && new Date(i.expirationDate) < new Date()
  );

  const allCategories = CATEGORIES;
  const catCounts = allCategories
    .map((c) => ({ ...c, count: items.filter((i) => i.category === c.id).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return (
    <div
      style={{
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: "#F7F7F9",
        minHeight: "100%",
        paddingBottom: 80,
      }}
    >
      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(135deg, ${PINK}, ${FUCHSIA})`,
          padding: "32px 20px 28px",
          color: "white",
        }}
      >
        <p style={{ margin: "0 0 4px", fontSize: 13, opacity: 0.85 }}>Good day,</p>
        <h2 style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", fontFamily: "'Syne', sans-serif" }}>
          {user.name} 👋
        </h2>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>Niles is at your service.</p>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Total Items", value: items.length, color: "#6C5CE7", emoji: "📦" },
            { label: "Low Stock", value: lowStock.length, color: PINK, emoji: "⚠️" },
            { label: "Expiring", value: expiring.length + expired.length, color: "#FF9F43", emoji: "📅" },
          ].map((s) => (
            <div
              key={s.label}
              onClick={() => onNavigate("backstock")}
              style={{
                background: "white",
                borderRadius: 16,
                padding: "14px 10px",
                textAlign: "center",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.value > 0 ? s.color : "#333" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {(lowStock.length > 0 || expired.length > 0) && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#333" }}>
              Needs Attention
            </h3>
            {expired.length > 0 && (
              <div
                onClick={() => onNavigate("backstock")}
                style={{
                  background: "#FF006E12",
                  border: "1px solid #FF006E33",
                  borderRadius: 14,
                  padding: "12px 14px",
                  marginBottom: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 22 }}>🗑️</span>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#FF006E" }}>
                    {expired.length} expired item{expired.length !== 1 ? "s" : ""}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
                    {expired.slice(0, 2).map((i) => i.name).join(", ")}
                    {expired.length > 2 && ` +${expired.length - 2} more`}
                  </p>
                </div>
              </div>
            )}
            {lowStock.length > 0 && (
              <div
                onClick={() => onNavigate("backstock")}
                style={{
                  background: PINK + "10",
                  border: `1px solid ${PINK}33`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 22 }}>📉</span>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: PINK }}>
                    {lowStock.length} item{lowStock.length !== 1 ? "s" : ""} running low
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
                    {lowStock.slice(0, 2).map((i) => i.name).join(", ")}
                    {lowStock.length > 2 && ` +${lowStock.length - 2} more`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top categories */}
        {catCounts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#333" }}>
              Your Shelf
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {catCounts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigate("backstock")}
                  style={{
                    background: "white",
                    borderRadius: 16,
                    padding: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: c.color + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>
                    {c.emoji}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>{c.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{c.count} items</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quickstart if empty */}
        {items.length === 0 && (
          <div style={{
            background: "white", borderRadius: 20, padding: "24px",
            textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>Start Your Backstock</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#888", lineHeight: 1.5 }}>
              Scan or manually add household items to keep track of what you have.
            </p>
            <button onClick={() => onNavigate("backstock")} style={{ ...btnPrimary, width: "auto", padding: "13px 32px" }}>
              Add First Item
            </button>
          </div>
        )}

        {/* Gift Giver placeholder teaser */}
        <div
          onClick={() => onNavigate("gifts")}
          style={{
            marginTop: 16,
            background: "linear-gradient(135deg, #6C5CE7, #a29bfe)",
            borderRadius: 20,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(108,92,231,0.3)",
          }}
        >
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
// ══════════════════════════════════════════════

function GiftGiverScreen() {
  return (
    <div style={{
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      background: "#F7F7F9",
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      textAlign: "center",
    }}>
      <div style={{
        width: 100, height: 100, borderRadius: "50%",
        background: "linear-gradient(135deg, #6C5CE7, #a29bfe)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 44, marginBottom: 24,
        boxShadow: "0 12px 40px rgba(108,92,231,0.3)",
      }}>
        🎁
      </div>
      <h2 style={{ margin: "0 0 12px", fontSize: 26, fontWeight: 800, color: "#1A1A2E", fontFamily: "'Syne', sans-serif" }}>
        Gift Giver
      </h2>
      <p style={{ margin: "0 0 32px", fontSize: 15, color: "#888", lineHeight: 1.6, maxWidth: 300 }}>
        Never miss a birthday or special occasion. Smart gift suggestions, reminders, and more — coming next.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        {[
          { emoji: "📅", text: "Birthday & event reminders" },
          { emoji: "🔔", text: "Batch digest notifications" },
          { emoji: "🤖", text: "AI-powered gift suggestions" },
          { emoji: "📸", text: "Share wish lists & screenshots" },
        ].map((f) => (
          <div key={f.text} style={{
            background: "white",
            borderRadius: 14,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}>
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
  return (
    <div style={{
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      background: "#F7F7F9",
      minHeight: "100%",
      paddingBottom: 80,
    }}>
      <div style={{ background: `linear-gradient(135deg, ${PINK}, ${FUCHSIA})`, padding: "36px 20px 28px", textAlign: "center" }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, margin: "0 auto 12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <h2 style={{ color: "white", margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{user.name}</h2>
        <p style={{ color: "rgba(255,255,255,0.8)", margin: 0, fontSize: 13 }}>{user.email}</p>
      </div>

      <div style={{ padding: "20px 16px" }}>
        <div style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%", padding: "16px 20px",
              background: "none", border: "none",
              display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer", fontFamily: "inherit",
              borderTop: "1px solid #F5F5F5",
            }}
          >
            <span style={{ fontSize: 20 }}>🚪</span>
            <span style={{ fontSize: 15, color: "#FF006E", fontWeight: 600 }}>Sign Out</span>
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: "#ccc" }}>
          Niles · Your personal home butler 🎩
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  BOTTOM NAV
// ══════════════════════════════════════════════

function BottomNav({ screen, setScreen }) {
  const tabs = [
    { id: "home",      label: "Home",     icon: "🏠" },
    { id: "backstock", label: "Backstock", icon: "📦" },
    { id: "gifts",     label: "Gifts",    icon: "🎁" },
    { id: "profile",   label: "Profile",  icon: "👤" },
  ];

  return (
    <div style={{
      position: "fixed",
      bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430,
      background: "white",
      borderTop: "1px solid #F0F0F0",
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 8px)",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
      zIndex: 100,
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setScreen(t.id)}
          style={{
            flex: 1, padding: "10px 4px 8px",
            border: "none", background: "none",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: screen === t.id ? PINK : "#bbb",
            transition: "color 0.15s",
          }}>
            {t.label}
          </span>
          {screen === t.id && (
            <div style={{
              position: "absolute",
              bottom: "env(safe-area-inset-bottom, 8px)",
              width: 4, height: 4,
              borderRadius: "50%",
              background: PINK,
              marginTop: 2,
            }} />
          )}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════

function MainApp({ user, onLogout }) {
  const [screen, setScreen] = useState("home");
  const items = db.getItems(user.id);

  const screens = {
    home: <HomeScreen user={user} items={items} onNavigate={setScreen} />,
    backstock: <BackstockScreen user={user} />,
    gifts: <GiftGiverScreen />,
    profile: <ProfileScreen user={user} onLogout={onLogout} />,
  };

  return (
    <div style={{
      maxWidth: 430,
      margin: "0 auto",
      minHeight: "100vh",
      background: "#F7F7F9",
      position: "relative",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      overflowX: "hidden",
    }}>
      <div style={{ minHeight: "calc(100vh - 64px)" }}>
        {screens[screen]}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} />
    </div>
  );
}

// ══════════════════════════════════════════════
//  SHARED MODAL STYLES
// ══════════════════════════════════════════════

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  zIndex: 1000,
  backdropFilter: "blur(2px)",
};

const modalStyle = {
  background: "white",
  borderRadius: "28px 28px 0 0",
  padding: "24px 20px 32px",
  width: "100%",
  maxWidth: 430,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
  fontFamily: "'DM Sans', -apple-system, sans-serif",
};

// ══════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════

export default function NilesApp() {
  const [user, setUser] = useState(() => db.getCurrentUser());

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap";
    document.head.appendChild(link);
    link.onload = () => {
      document.body.style.fontFamily = "'DM Sans', -apple-system, sans-serif";
    };
  }, []);

  const handleAuth = (u) => setUser(u);

  const handleLogout = () => {
    db.saveCurrentUser(null);
    setUser(null);
  };

  if (!user) return <AuthScreen onAuth={handleAuth} />;
  return <MainApp user={user} onLogout={handleLogout} />;
}