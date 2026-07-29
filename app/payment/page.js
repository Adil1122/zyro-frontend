"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Design tokens ────────────────────────────────────────────────────────────
const D = {
  bg: "#070c0a",
  card: "#0e1713",
  card2: "#121e18",
  card3: "#16221c",
  text: "#ffffff",
  text2: "#8fa79c",
  text3: "#7a8f86",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.13)",
  accent: "#22c55e",
  accentLight: "#7ef2c0",
  accentInk: "#04231a",
  accentTint: "rgba(34,197,94,0.11)",
  accentGrad: "linear-gradient(135deg, #7ef2c0 0%, #22c55e 55%, #0e9f63 100%)",
  warning: "#f0b429",
  warningTint: "rgba(240,180,41,0.11)",
  warningBorder: "rgba(240,180,41,0.3)",
  destructive: "#f2726b",
  destructiveTint: "rgba(242,114,107,0.11)",
  radius: "10px",
  radiusLg: "16px",
};

// ── Bank directory ────────────────────────────────────────────────────────────
const BANKS = [
  { key: "meezan",  name: "Meezan Bank",               code: "MZ", title: "Zyro Tech (Pvt) Ltd", number: "04567890123456", iban: "PK36MEZN0004567890123456" },
  { key: "hbl",     name: "HBL",                        code: "HB", title: "Zyro Tech (Pvt) Ltd", number: "01234567890123", iban: "PK24HABB0001234567890123" },
  { key: "ubl",     name: "UBL",                        code: "UB", title: "Zyro Tech (Pvt) Ltd", number: "02345678901234", iban: "PK16UNIL0002345678901234" },
  { key: "mcb",     name: "MCB Bank",                   code: "MC", title: "Zyro Tech (Pvt) Ltd", number: "03456789012345", iban: "PK55MUCB0003456789012345" },
  { key: "alfalah", name: "Bank Alfalah",                code: "AF", title: "Zyro Tech (Pvt) Ltd", number: "05678901234567", iban: "PK89ALFH0005678901234567" },
  { key: "abl",     name: "Allied Bank",                 code: "AB", title: "Zyro Tech (Pvt) Ltd", number: "06789012345678", iban: "PK42ABPA0006789012345678" },
  { key: "bahl",    name: "Bank Al Habib",               code: "BH", title: "Zyro Tech (Pvt) Ltd", number: "07890123456789", iban: "PK73BAHL0007890123456789" },
  { key: "askari",  name: "Askari Bank",                 code: "AK", title: "Zyro Tech (Pvt) Ltd", number: "08901234567890", iban: "PK18ASCM0008901234567890" },
  { key: "faysal",  name: "Faysal Bank",                 code: "FB", title: "Zyro Tech (Pvt) Ltd", number: "09012345678901", iban: "PK67FAYS0009012345678901" },
  { key: "scb",     name: "Standard Chartered",          code: "SC", title: "Zyro Tech (Pvt) Ltd", number: "01123456789012", iban: "PK31SCBL0001123456789012" },
  { key: "nbp",     name: "National Bank of Pakistan",   code: "NB", title: "Zyro Tech (Pvt) Ltd", number: "02234567890123", iban: "PK58NBPA0002234567890123" },
  { key: "js",      name: "JS Bank",                     code: "JS", title: "Zyro Tech (Pvt) Ltd", number: "03345678901234", iban: "PK94JSBL0003345678901234" },
  { key: "soneri",  name: "Soneri Bank",                 code: "SN", title: "Zyro Tech (Pvt) Ltd", number: "04456789012345", iban: "PK27SONE0004456789012345" },
  { key: "metro",   name: "Habib Metropolitan Bank",     code: "HM", title: "Zyro Tech (Pvt) Ltd", number: "05567890123456", iban: "PK62MPBL0005567890123456" },
];

// ── Wallet/bank method config ─────────────────────────────────────────────────
const VERIFY_METHODS = {
  jazzcash: {
    label: "JazzCash", type: "wallet",
    account: { title: "Zyro Tech", number: "0312-3456789" },
    senderLabel: "Sender mobile number",
    senderPlaceholder: "03xx-xxxxxxx (the account you sent money from)",
    senderErr: "Enter the 11-digit number you sent money from",
    tidLabel: "Transaction ID (TID)",
    tidPlaceholder: "Enter payment transaction ID",
    validateSender: (v) => /^03\d{2}-?\d{7}$/.test(v.trim()),
  },
  easypaisa: {
    label: "EasyPaisa", type: "wallet",
    account: { title: "Zyro Tech", number: "0345-9876543" },
    senderLabel: "Sender mobile number",
    senderPlaceholder: "03xx-xxxxxxx (the account you sent money from)",
    senderErr: "Enter the 11-digit number you sent money from",
    tidLabel: "Transaction ID (TID)",
    tidPlaceholder: "Enter payment transaction ID",
    validateSender: (v) => /^03\d{2}-?\d{7}$/.test(v.trim()),
  },
  bank: {
    label: "Bank Transfer", type: "bank",
    senderLabel: "Sender account title",
    senderPlaceholder: "Name on the account you transferred from",
    senderErr: "Enter the account title you transferred from",
    tidLabel: "Transaction reference / slip number",
    tidPlaceholder: "Enter bank reference or deposit slip number",
    validateSender: (v) => v.trim().length >= 3,
  },
};

function fmtSize(bytes) {
  return bytes < 1024 ? bytes + " B" : (bytes / 1024).toFixed(0) + " KB";
}

function fmtTimer(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const IconCheck = ({ size = 12, color = "#04231a" }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M2 6.2l2.7 2.7L10 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconShield = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M7 1.5l4.5 1.8v3.2c0 3-1.9 5.3-4.5 6-2.6-.7-4.5-3-4.5-6V3.3z" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
);
const IconLock = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke={color} strokeWidth="1.2"/>
    <path d="M4.5 6V4a2.5 2.5 0 015 0v2" stroke={color} strokeWidth="1.2"/>
  </svg>
);
const IconChevron = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M2.5 4.5L6 8l3.5-3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconBack = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M10 3.5L5 8l5 4.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCopy = ({ size = 12, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <rect x="4" y="4" width="7" height="7" rx="1.3" stroke={color} strokeWidth="1.3"/>
    <path d="M2 8V2.5A1.5 1.5 0 013.5 1H8" stroke={color} strokeWidth="1.3"/>
  </svg>
);
const IconUpload = ({ size = 26, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 4v11m0-11l-4 4m4-4l4 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IconImage = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke={color} strokeWidth="1.4"/>
    <circle cx="6" cy="6.5" r="1.2" stroke={color} strokeWidth="1.2"/>
    <path d="M3 12l3.5-3.5L9 11l2-2 2 2" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
);
const IconX = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M2 2l10 10M12 2L2 12" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IconAlert = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2l6.5 11H1.5z" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M8 6.5v3M8 11.5h.01" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconClock = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8.5" r="6" stroke={color} strokeWidth="1.4"/>
    <path d="M8 5.5v3l2 1.3" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M6 1.5h4" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconStar = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <path d="M9 1.5l2.3 4.7 5.2.7-3.8 3.7.9 5.2L9 13.4l-4.6 2.4.9-5.2-3.8-3.7 5.2-.7z" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);
const IconWA = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path d="M3 10c0-3.9 3.1-7 7-7s7 3.1 7 7-3.1 7-7 7c-1.1 0-2.1-.2-3-.7L3 17l1.2-3.8c-.8-1-1.2-2-1.2-3.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);
const IconSuccess = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.5 4.5L19 7" stroke="#04231a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconExpired = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8.5" stroke="#f2726b" strokeWidth="1.8"/>
    <path d="M12 7.5v5l3.2 2" stroke="#f2726b" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconBank = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M1 4.5L6 1l5 3.5M2 4.5v5.5M4.5 4.5v5.5M7.5 4.5v5.5M10 4.5v5.5M1 10h10" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCard = () => (
  <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
    <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="#fff" strokeWidth="1.4"/>
    <path d="M2.5 8h15" stroke="#fff" strokeWidth="1.4"/>
    <rect x="5" y="11" width="4" height="1.6" rx="0.5" fill="#fff"/>
  </svg>
);
const IconShieldCheck = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M7 1.5l4.5 1.8v3.2c0 3-1.9 5.3-4.5 6-2.6-.7-4.5-3-4.5-6V3.3z" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M4.8 7l1.5 1.5L9.2 5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");

  // Plan
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);

  // View router: checkout | verify | stripe-success | wallet-success | expired
  const [view, setView] = useState("checkout");

  // Checkout view: which method is selected
  const [selectedMethod, setSelectedMethod] = useState("stripe");

  // Verify view: which tab is active
  const [verifyTab, setVerifyTab] = useState("jazzcash");

  // Bank picker
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [currentBank, setCurrentBank] = useState(BANKS[0]);
  const [bankQuery, setBankQuery] = useState("");
  const bankPickerRef = useRef(null);

  // Form fields
  const [senderValue, setSenderValue] = useState("");
  const [tidValue, setTidValue] = useState("");

  // File upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Validation errors
  const [errors, setErrors] = useState({});

  // Terms
  const [termsChecked, setTermsChecked] = useState(false);

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimerRef = useRef(null);

  // Copy button states: key = field identifier
  const [copiedKey, setCopiedKey] = useState(null);

  // Session timer
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const timerRef = useRef(null);

  // Wallet success reference
  const [refNo, setRefNo] = useState("");

  // ── Fetch plan ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!planId) { router.push("/plans"); return; }
    (async () => {
      try {
        const res = await fetch("/api/plans");
        const data = await res.json();
        const found = data.plans?.find(p => p.id === planId);
        if (found) setPlan(found);
        else router.push("/plans");
      } catch {
        router.push("/plans");
      } finally {
        setPlanLoading(false);
      }
    })();
  }, [planId, router]);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2400);
  }, []);

  // ── View router with timer management ──────────────────────────────────────
  const goToView = useCallback((v) => {
    setView(v);
    if (v === "verify") {
      setSecondsLeft(30 * 60);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  useEffect(() => {
    if (secondsLeft === 0 && view === "verify") setView("expired");
  }, [secondsLeft, view]);

  // ── Bank picker: close on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (bankPickerRef.current && !bankPickerRef.current.contains(e.target)) {
        setBankPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Copy helper ─────────────────────────────────────────────────────────────
  const copyValue = useCallback((value, key) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedKey(key);
    showToast(value + " copied");
    setTimeout(() => setCopiedKey(null), 1800);
  }, [showToast]);

  // ── File handling ───────────────────────────────────────────────────────────
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const acceptFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors(p => ({ ...p, file: "Please upload an image file (PNG or JPG)" }));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrors(p => ({ ...p, file: `File is ${fmtSize(file.size)} — please upload under 5MB` }));
      return;
    }
    setSelectedFile(file);
    setErrors(p => ({ ...p, file: null }));
    const reader = new FileReader();
    reader.onloadend = () => setFileBase64(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const removeFile = () => {
    setSelectedFile(null);
    setFileBase64("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Verify tab switch ───────────────────────────────────────────────────────
  const switchVerifyTab = (tab) => {
    setVerifyTab(tab);
    setTidValue("");
    setErrors(p => ({ ...p, tid: null }));
    if (termsChecked) {
      setTermsChecked(false);
    }
  };

  // ── Stripe pay ──────────────────────────────────────────────────────────────
  const handleStripePay = async () => {
    const storedUser = localStorage.getItem("zyro_user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    if (!user) return router.push("/login");

    setIsProcessing(true);
    try {
      const res = await fetch("/api/payments/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, userId: user.id, paymentMethodId: "pm_card_visa" }),
      });
      const data = await res.json();
      if (data.success) {
        const { data: updatedUser } = await supabase.from("users").select("*, plans(*)").eq("id", user.id).single();
        if (updatedUser) localStorage.setItem("zyro_user", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("authChange"));
        goToView("stripe-success");
      } else {
        throw new Error(data.error || "Payment failed");
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Wallet continue ─────────────────────────────────────────────────────────
  const handleWalletContinue = () => {
    setIsProcessing(true);
    const initialTab = selectedMethod === "bank" ? "bank" : selectedMethod;
    switchVerifyTab(initialTab);
    setTimeout(() => {
      setIsProcessing(false);
      goToView("verify");
    }, 700);
  };

  // ── Receipt submit ──────────────────────────────────────────────────────────
  const handleSubmitReceipt = async () => {
    const m = VERIFY_METHODS[verifyTab];
    const newErrors = {};
    if (!m.validateSender(senderValue)) newErrors.sender = m.senderErr;
    if (tidValue.trim().length < 4) newErrors.tid = "This field is required";
    if (!selectedFile) newErrors.file = "Upload a screenshot of your payment receipt";
    if (!termsChecked) newErrors.terms = true;

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      showToast("Check the highlighted fields");
      return;
    }
    setErrors({});

    const storedUser = localStorage.getItem("zyro_user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    if (!user) return router.push("/login");

    setIsProcessing(true);
    try {
      let endpoint, body;
      if (verifyTab === "bank") {
        endpoint = "/api/payments/bank";
        body = { planId, userId: user.id, senderName: senderValue, transactionId: tidValue, screenshot: fileBase64, bankName: currentBank.name, bankKey: currentBank.key };
      } else {
        endpoint = `/api/payments/${verifyTab}`;
        body = { planId, userId: user.id, senderNumber: senderValue, transactionId: tidValue, screenshot: fileBase64 };
      }

      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        const { data: updatedUser } = await supabase.from("users").select("*, plans(*)").eq("id", user.id).single();
        if (updatedUser) localStorage.setItem("zyro_user", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("authChange"));
        setRefNo("ZP-" + Math.floor(80000 + Math.random() * 9000));
        goToView("wallet-success");
      } else {
        throw new Error(data.error || "Submission failed");
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Expired restart ─────────────────────────────────────────────────────────
  const handleRestart = () => {
    setTidValue("");
    setErrors(p => ({ ...p, tid: null, file: null, terms: null }));
    setSelectedFile(null);
    setFileBase64("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTermsChecked(false);
    goToView("verify");
  };

  const priceLabel = plan ? `Rs ${parseFloat(plan.price).toLocaleString("en-US")}` : "—";
  const filteredBanks = BANKS.filter(b => b.name.toLowerCase().includes(bankQuery.toLowerCase()));

  // ── Recipient rows for verify view ─────────────────────────────────────────
  const renderRecipient = () => {
    const m = VERIFY_METHODS[verifyTab];
    if (m.type === "wallet") {
      return (
        <>
          <div style={styles.recipientRow}>
            <label style={{ fontSize: 12.5, color: D.text2, flexShrink: 0 }}>Account title</label>
            <div style={styles.recipientVal}><b style={styles.recipientB}>{m.account.title}</b></div>
          </div>
          <div style={{ ...styles.recipientRow, borderTop: `1px solid ${D.border}` }}>
            <label style={{ fontSize: 12.5, color: D.text2, flexShrink: 0 }}>Account number</label>
            <div style={styles.recipientVal}>
              <b style={styles.recipientB}>{m.account.number}</b>
              <CopyBtn value={m.account.number} copyKey="account" copiedKey={copiedKey} onCopy={copyValue} />
            </div>
          </div>
        </>
      );
    }
    // Bank
    return (
      <>
        <div style={styles.recipientRow}>
          <label style={{ fontSize: 12.5, color: D.text2, flexShrink: 0 }}>Bank</label>
          <div style={styles.recipientVal}><b style={styles.recipientB}>{currentBank.name}</b></div>
        </div>
        <div style={{ ...styles.recipientRow, borderTop: `1px solid ${D.border}` }}>
          <label style={{ fontSize: 12.5, color: D.text2, flexShrink: 0 }}>Account title</label>
          <div style={styles.recipientVal}><b style={styles.recipientB}>{currentBank.title}</b></div>
        </div>
        <div style={{ ...styles.recipientRow, borderTop: `1px solid ${D.border}` }}>
          <label style={{ fontSize: 12.5, color: D.text2, flexShrink: 0 }}>Account number</label>
          <div style={styles.recipientVal}>
            <b style={{ ...styles.recipientB, fontSize: 13 }}>{currentBank.number}</b>
            <CopyBtn value={currentBank.number} copyKey="number" copiedKey={copiedKey} onCopy={copyValue} />
          </div>
        </div>
        <div style={{ ...styles.recipientRow, borderTop: `1px solid ${D.border}` }}>
          <label style={{ fontSize: 12.5, color: D.text2, flexShrink: 0 }}>IBAN</label>
          <div style={styles.recipientVal}>
            <b style={{ ...styles.recipientB, fontSize: 11, letterSpacing: "0.03em" }}>{currentBank.iban}</b>
            <CopyBtn value={currentBank.iban} copyKey="iban" copiedKey={copiedKey} onCopy={copyValue} />
          </div>
        </div>
      </>
    );
  };

  if (planLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: D.bg, color: D.text2, fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  const isStepConfirmed = view === "stripe-success" || view === "wallet-success";
  const showTimer = view === "verify";

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(1100px 520px at 50% -10%, rgba(34,197,94,0.07), transparent 60%), ${D.bg}`, color: D.text, fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 14, WebkitFontSmoothing: "antialiased" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; cursor: pointer; }
        a { color: inherit; text-decoration: none; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${D.borderStrong}; border-radius: 4px; }
        @keyframes viewIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes btnSpin { to { transform: rotate(360deg); } }
        .view-panel { animation: viewIn 0.3s cubic-bezier(.16,1,.3,1); }
        .method-card:hover { border-color: ${D.text3} !important; }
        .bank-opt:hover { background: ${D.card3} !important; color: ${D.text} !important; }
        .copy-btn:hover { color: ${D.text} !important; border-color: ${D.accent} !important; }
        .back-link:hover { color: ${D.text} !important; }
        .support-link:hover { color: ${D.text} !important; }
        .dropzone-el:hover { border-color: ${D.accent} !important; background: ${D.accentTint} !important; }
        .btn-primary:hover:not(:disabled) { filter: brightness(1.06); }
        .file-remove:hover { color: ${D.destructive} !important; background: ${D.destructiveTint} !important; }
        .bank-trigger:hover { border-color: ${D.text3} !important; }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 24px 80px" }}>

        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 16 }}>
            <span style={{ width: 26, height: 26, borderRadius: 7, background: D.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", color: D.accentInk, fontSize: 13, fontWeight: 800 }}>Z</span>
            Zyro
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: D.text3 }}>
            <StepDot label="Plan" state="done" />
            <div style={{ width: 20, height: 1, background: D.borderStrong }} />
            <StepDot label="Payment" state={isStepConfirmed ? "done" : "active"} />
            <div style={{ width: 20, height: 1, background: D.borderStrong }} />
            <StepDot label="Confirmed" state={isStepConfirmed ? "active" : "idle"} />
          </div>
        </div>

        {/* Grid */}
        <div className="checkout-grid-inner" style={{ display: "grid", gridTemplateColumns: "clamp(300px,340px,340px) 1fr", gap: 24, alignItems: "start" }}>

          {/* Order summary — sticky left column */}
          <aside style={{ ...styles.card, padding: 24, position: "sticky", top: 24, order: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 18, borderBottom: `1px solid ${D.border}`, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: D.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", color: D.accentInk, flexShrink: 0 }}>
                <IconStar size={18} color={D.accentInk} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{plan?.name} Plan</div>
                <div style={{ fontSize: 12, color: D.text3, marginTop: 2 }}>Billed monthly</div>
              </div>
            </div>
            <div style={{ ...styles.summaryLine }}>
              <span>{plan?.name} plan — 1 month</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{priceLabel}</span>
            </div>
            <div style={{ ...styles.summaryLine }}>
              <span>Tax</span>
              <span>Rs 0</span>
            </div>
            <div style={{ ...styles.summaryLine, borderTop: `1px solid ${D.border}`, marginTop: 10, paddingTop: 14, fontSize: 14.5, fontWeight: 700, color: D.text }}>
              <span>Total due</span>
              <span style={{ color: D.accentLight, fontVariantNumeric: "tabular-nums" }}>{priceLabel}</span>
            </div>

            {/* Timer */}
            {showTimer && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: D.warningTint, border: `1px solid ${D.warningBorder}`, borderRadius: D.radius, padding: "11px 14px", margin: "16px 0", fontSize: 12, color: D.text2 }}>
                <IconClock size={15} color={D.warning} />
                <span>Complete within <b style={{ color: D.text, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtTimer(secondsLeft)}</b></span>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12, color: D.text3, lineHeight: 1.5, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${D.border}` }}>
              <IconShield size={15} color={D.accentLight} />
              <span>256-bit encrypted checkout. Payments are verified securely — Zyro never sees or stores your card or bank details.</span>
            </div>
            <a href="#" className="support-link" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: D.text2, fontWeight: 600, paddingTop: 16, marginTop: 6, transition: "color 0.15s ease" }}>
              <IconWA size={17} />
              Need help? Chat with support
            </a>
          </aside>

          {/* Panel host */}
          <div style={{ order: 2 }}>
            <div style={{ ...styles.card, padding: "26px 28px" }}>

              {/* VIEW: checkout */}
              {view === "checkout" && (
                <div className="view-panel">
                  <h1 style={styles.panelH1}>Checkout</h1>
                  <p style={styles.panelSub}>Activate your <b style={{ color: D.accentLight, fontWeight: 700 }}>{plan?.name}</b> subscription</p>

                  <div style={styles.sectionLabel}>Select payment method</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                    {[
                      { id: "stripe",    name: "Card (Stripe)",           sub: "Visa, Mastercard — secure, instant activation", dot: "#7a73ff" },
                      { id: "jazzcash",  name: "JazzCash Mobile Wallet",  sub: "Manual verification — confirmed within 2 hours", dot: "#d8232a" },
                      { id: "easypaisa", name: "EasyPaisa Mobile Wallet", sub: "Manual verification — confirmed within 2 hours", dot: "#00a651" },
                      { id: "bank",      name: "Bank Transfer",           sub: "Manual verification — confirmed within 1 business day", dot: "#60a5fa" },
                    ].map(m => (
                      <button
                        key={m.id}
                        className="method-card"
                        onClick={() => setSelectedMethod(m.id)}
                        style={{ ...styles.methodCard, ...(selectedMethod === m.id ? styles.methodCardSelected : {}) }}
                      >
                        <span style={{ ...styles.methodRadio, ...(selectedMethod === m.id ? styles.methodRadioSelected : {}) }}>
                          {selectedMethod === m.id && <IconCheck size={10} color={D.accentInk} />}
                        </span>
                        <span style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...(m.id === "stripe" ? { background: "linear-gradient(155deg, #7a73ff, #5b52f5)" } : { background: D.card3, border: `1px solid ${D.border}` }) }}>
                          {m.id === "stripe" ? <IconCard /> : m.id === "bank" ? <IconBank size={12} /> : <span style={{ fontSize: 11, fontWeight: 800, color: m.dot }}>{m.id === "jazzcash" ? "JC" : "EP"}</span>}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, color: D.text, marginBottom: 2 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                            {m.name}
                          </span>
                          <span style={{ fontSize: 12, color: D.text3 }}>{m.sub}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Stripe card form */}
                  {selectedMethod === "stripe" && (
                    <div>
                      <div style={styles.sectionLabel}>Card information</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: D.text3, marginBottom: 14 }}>
                        <IconShield size={13} color={D.accentLight} />
                        <span>Secured by Stripe Elements — your card number never touches Zyro's servers</span>
                      </div>
                      <div style={styles.field}>
                        <label style={styles.fieldLabel}>Card number</label>
                        <div style={styles.stripeMount}>1234 1234 1234 1234</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={styles.field}>
                          <label style={styles.fieldLabel}>Expiry</label>
                          <div style={styles.stripeMount}>MM / YY</div>
                        </div>
                        <div style={styles.field}>
                          <label style={styles.fieldLabel}>CVC</label>
                          <div style={styles.stripeMount}>CVC</div>
                        </div>
                      </div>
                      <button className="btn-primary" disabled={isProcessing} onClick={handleStripePay} style={styles.btnPrimary}>
                        {isProcessing ? <span style={{ animation: "btnSpin 0.7s linear infinite", display: "inline-block" }}>◌</span> : <IconLock size={13} color={D.accentInk} />}
                        {isProcessing ? "Confirming payment…" : `Pay ${priceLabel}`}
                      </button>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 16, fontSize: 11.5, color: D.text3, fontWeight: 600 }}>
                        <IconLock size={13} color={D.accentLight} />
                        SSL secured · PCI DSS compliant via Stripe
                      </div>
                    </div>
                  )}

                  {/* Wallet/bank continue */}
                  {selectedMethod !== "stripe" && (
                    <div>
                      <div style={{ display: "flex", gap: 10, background: D.warningTint, border: `1px solid ${D.warningBorder}`, borderRadius: 11, padding: "13px 15px", marginBottom: 18, fontSize: 12.5, color: D.text2, lineHeight: 1.55 }}>
                        <IconAlert size={15} color={D.warning} />
                        <div>
                          You'll transfer <b style={{ color: D.text }}>{priceLabel}</b> to our <b style={{ color: D.text }}>{selectedMethod === "jazzcash" ? "JazzCash" : selectedMethod === "easypaisa" ? "EasyPaisa" : "bank"}</b> account on the next step, then upload your receipt for verification.
                        </div>
                      </div>
                      <button className="btn-primary" disabled={isProcessing} onClick={handleWalletContinue} style={styles.btnPrimary}>
                        {isProcessing ? <span style={{ animation: "btnSpin 0.7s linear infinite", display: "inline-block" }}>◌</span> : null}
                        {isProcessing ? "Preparing…" : "Continue to payment instructions"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: verify */}
              {view === "verify" && (
                <div className="view-panel">
                  <button className="back-link" onClick={() => goToView("checkout")} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: D.text3, fontWeight: 600, background: "none", border: "none", marginBottom: 16, transition: "color 0.15s ease" }}>
                    <IconBack size={13} color={D.text3} />
                    Back to payment methods
                  </button>
                  <h1 style={styles.panelH1}>Complete your payment</h1>
                  <p style={styles.panelSub}>Choose your wallet or bank, then upload your receipt for verification.</p>

                  {/* Tabs */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 16, background: D.card2, padding: 4, borderRadius: 11, border: `1px solid ${D.border}` }}>
                    {["jazzcash", "easypaisa", "bank"].map(tab => (
                      <button
                        key={tab}
                        onClick={() => switchVerifyTab(tab)}
                        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, height: 52, borderRadius: 8, border: "none", background: verifyTab === tab ? D.card : "none", color: verifyTab === tab ? D.text : D.text2, fontSize: 11.5, fontWeight: 600, transition: "background 0.15s ease, color 0.15s ease", boxShadow: verifyTab === tab ? `0 1px 0 ${D.borderStrong} inset, 0 2px 8px rgba(0,0,0,0.25)` : "none", cursor: "pointer", padding: "0 4px" }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 17, height: 17, borderRadius: 5, background: tab === "bank" ? D.card3 : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: tab === "bank" ? D.text2 : "#000", flexShrink: 0, padding: 2 }}>
                            {tab === "jazzcash" ? "JC" : tab === "easypaisa" ? "EP" : <IconBank size={8} />}
                          </span>
                          {tab === "jazzcash" ? "JazzCash" : tab === "easypaisa" ? "EasyPaisa" : "Bank"}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Bank picker */}
                  {verifyTab === "bank" && (
                    <div style={{ position: "relative", marginBottom: 14 }} ref={bankPickerRef}>
                      <button className="bank-trigger" onClick={() => { setBankPickerOpen(o => !o); setBankQuery(""); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, height: 48, padding: "0 14px", background: D.card2, border: `1px solid ${D.borderStrong}`, borderRadius: 10, color: D.text, cursor: "pointer", transition: "border-color 0.15s ease" }}>
                        <span style={{ width: 26, height: 26, borderRadius: 7, background: D.card3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: D.text2, flexShrink: 0 }}>{currentBank.code}</span>
                        <span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: 600 }}>{currentBank.name}</span>
                        <span style={{ color: D.text3, transition: "transform 0.15s ease", transform: bankPickerOpen ? "rotate(180deg)" : "none" }}>
                          <IconChevron size={13} color={D.text3} />
                        </span>
                      </button>
                      {bankPickerOpen && (
                        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 30, background: D.card2, border: `1px solid ${D.borderStrong}`, borderRadius: 12, boxShadow: "0 16px 40px rgba(0,0,0,0.45)", overflow: "hidden" }}>
                          <div style={{ padding: 10, borderBottom: `1px solid ${D.border}` }}>
                            <input type="text" placeholder="Search your bank…" value={bankQuery} onChange={e => setBankQuery(e.target.value)} autoFocus style={{ width: "100%", height: 38, background: D.bg, border: `1px solid ${D.borderStrong}`, borderRadius: 8, padding: "0 12px", color: D.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                          </div>
                          <div style={{ maxHeight: 240, overflowY: "auto", padding: 6 }}>
                            {filteredBanks.length === 0 ? (
                              <div style={{ padding: 18, textAlign: "center", fontSize: 12.5, color: D.text3 }}>No bank matches "{bankQuery}"</div>
                            ) : filteredBanks.map(b => (
                              <button key={b.key} className="bank-opt" onClick={() => { setCurrentBank(b); setBankPickerOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 8, background: b.key === currentBank.key ? D.accentTint : "none", border: "none", color: b.key === currentBank.key ? D.accentLight : D.text2, fontSize: 13, fontWeight: 500, textAlign: "left", cursor: "pointer", transition: "background 0.1s ease, color 0.1s ease" }}>
                                <span style={{ width: 24, height: 24, borderRadius: 6, background: b.key === currentBank.key ? D.accentGrad : D.card3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: b.key === currentBank.key ? D.accentInk : D.text2, flexShrink: 0 }}>{b.code}</span>
                                {b.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recipient details */}
                  <div style={{ border: `1px solid rgba(34,197,94,0.3)`, background: D.accentTint, borderRadius: 12, padding: "18px 20px", marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: D.text3 }}>Official recipient details</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: D.accentLight }}>
                        <IconShieldCheck size={13} color={D.accentLight} />
                        Verified account
                      </span>
                    </div>
                    {renderRecipient()}
                  </div>

                  {/* Instruction */}
                  <div style={{ display: "flex", gap: 10, background: D.warningTint, border: `1px solid ${D.warningBorder}`, borderRadius: 11, padding: "13px 15px", marginBottom: 18, fontSize: 12.5, color: D.text2, lineHeight: 1.55 }}>
                    <IconAlert size={15} color={D.warning} />
                    <div>
                      Transfer <b style={{ color: D.text }}>{priceLabel}</b> to the <b style={{ color: D.text }}>{VERIFY_METHODS[verifyTab].label}</b> account above, then fill in your details below and upload the transaction receipt.
                    </div>
                  </div>

                  {/* Sender field */}
                  <div style={{ ...styles.field, ...(errors.sender ? styles.fieldErr : {}) }}>
                    <label style={styles.fieldLabel}>{VERIFY_METHODS[verifyTab].senderLabel} <span style={{ color: D.destructive }}>*</span></label>
                    <input type="text" value={senderValue} onChange={e => { setSenderValue(e.target.value); if (VERIFY_METHODS[verifyTab].validateSender(e.target.value)) setErrors(p => ({ ...p, sender: null })); }} placeholder={VERIFY_METHODS[verifyTab].senderPlaceholder}
                      style={{ ...styles.textInput, ...(errors.sender ? { borderColor: D.destructive } : {}) }} />
                    {errors.sender && <div style={styles.errMsg}>{errors.sender}</div>}
                  </div>

                  {/* TID field */}
                  <div style={{ ...styles.field, ...(errors.tid ? styles.fieldErr : {}) }}>
                    <label style={styles.fieldLabel}>{VERIFY_METHODS[verifyTab].tidLabel} <span style={{ color: D.destructive }}>*</span></label>
                    <input type="text" value={tidValue} onChange={e => { setTidValue(e.target.value); if (e.target.value.trim().length >= 4) setErrors(p => ({ ...p, tid: null })); }} placeholder={VERIFY_METHODS[verifyTab].tidPlaceholder}
                      style={{ ...styles.textInput, ...(errors.tid ? { borderColor: D.destructive } : {}) }} />
                    {errors.tid && <div style={styles.errMsg}>{errors.tid}</div>}
                  </div>

                  {/* File upload */}
                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>Payment screenshot <span style={{ color: D.destructive }}>*</span></label>
                    {!selectedFile ? (
                      <div
                        className="dropzone-el"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); acceptFile(e.dataTransfer.files[0]); }}
                        style={{ border: `1.5px dashed ${errors.file ? D.destructive : (dragOver ? D.accent : D.borderStrong)}`, borderRadius: 11, padding: "26px 16px", textAlign: "center", background: dragOver ? D.accentTint : D.card2, transition: "border-color 0.15s ease, background 0.15s ease", cursor: "pointer" }}
                      >
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => acceptFile(e.target.files[0])} />
                        <IconUpload size={26} color={D.text3} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: D.text2, marginTop: 10 }}>Choose or drag a screenshot</div>
                        <div style={{ fontSize: 11.5, color: D.text3, marginTop: 4 }}>PNG or JPG, up to 5MB</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, background: D.card2, border: `1px solid ${D.borderStrong}`, borderRadius: 11, padding: "12px 14px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: D.accentTint, color: D.accentLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <IconImage size={16} color={D.accentLight} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: D.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedFile.name}</div>
                          <div style={{ fontSize: 11, color: D.text3, marginTop: 2 }}>{fmtSize(selectedFile.size)}</div>
                        </div>
                        <button className="file-remove" onClick={removeFile} style={{ background: "none", border: "none", color: D.text3, padding: 4, borderRadius: 6, cursor: "pointer", transition: "color 0.15s ease, background 0.15s ease" }}>
                          <IconX size={14} color="currentColor" />
                        </button>
                      </div>
                    )}
                    {errors.file && <div style={styles.errMsg}>{errors.file}</div>}
                  </div>

                  {/* Terms */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "20px 0 6px" }}>
                    <button onClick={() => { setTermsChecked(p => !p); setErrors(p => ({ ...p, terms: null })); }} style={{ width: 19, height: 19, borderRadius: 5, border: `1.5px solid ${errors.terms ? D.destructive : D.borderStrong}`, background: termsChecked ? D.accentGrad : D.card2, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s ease, border-color 0.15s ease" }}>
                      {termsChecked && <IconCheck size={12} color={D.accentInk} />}
                    </button>
                    <p style={{ fontSize: 12.5, color: errors.terms ? D.destructive : D.text2, lineHeight: 1.5 }}>
                      I confirm this transfer was made from an account under my own name, and the details above are accurate.
                    </p>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <button className="btn-primary" disabled={isProcessing} onClick={handleSubmitReceipt} style={styles.btnPrimary}>
                      {isProcessing ? <span style={{ animation: "btnSpin 0.7s linear infinite", display: "inline-block" }}>◌</span> : null}
                      {isProcessing ? "Submitting…" : "Submit Receipt"}
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW: stripe success */}
              {view === "stripe-success" && (
                <div className="view-panel" style={{ textAlign: "center", padding: "30px 0 10px" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: D.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                    <IconSuccess size={24} />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Payment successful</h2>
                  <p style={{ fontSize: 13, color: D.text2, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 20px" }}>
                    Your <b style={{ color: D.text }}>{plan?.name}</b> plan is active now — a receipt has been sent to your email.
                  </p>
                  <button className="btn-primary" onClick={() => router.push("/")} style={{ ...styles.btnPrimary, maxWidth: 280, margin: "0 auto" }}>
                    Go to dashboard
                  </button>
                </div>
              )}

              {/* VIEW: wallet success */}
              {view === "wallet-success" && (
                <div className="view-panel" style={{ textAlign: "center", padding: "30px 0 10px" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: D.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                    <IconSuccess size={24} />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Receipt submitted</h2>
                  <p style={{ fontSize: 13, color: D.text2, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 20px" }}>
                    We're verifying your payment now. This is usually confirmed within 2 hours — you'll get a WhatsApp message the moment your <b style={{ color: D.text }}>{plan?.name}</b> plan is active.
                  </p>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: D.card2, border: `1px solid ${D.border}`, borderRadius: 9, padding: "9px 16px", fontSize: 12.5, color: D.text2, marginBottom: 24 }}>
                    Reference <b style={{ color: D.accentLight, fontWeight: 700 }}>{refNo}</b>
                  </div>
                  <button className="btn-primary" onClick={() => router.push("/")} style={{ ...styles.btnPrimary, maxWidth: 280, margin: "0 auto" }}>
                    Done
                  </button>
                </div>
              )}

              {/* VIEW: expired */}
              {view === "expired" && (
                <div className="view-panel" style={{ textAlign: "center", padding: "30px 0 10px" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: D.destructiveTint, border: `1px solid rgba(242,114,107,0.35)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                    <IconExpired size={24} />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Payment window expired</h2>
                  <p style={{ fontSize: 13, color: D.text2, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 20px" }}>
                    This session timed out for security. Your plan price is still held — just start a new payment window to continue.
                  </p>
                  <button className="btn-primary" onClick={handleRestart} style={{ ...styles.btnPrimary, maxWidth: 280, margin: "0 auto" }}>
                    Get new payment details
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* Toast */}
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: `translateX(-50%) translateY(${toastVisible ? 0 : 20}px)`, background: D.card3, border: `1px solid ${D.borderStrong}`, color: D.text, padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, opacity: toastVisible ? 1 : 0, transition: "opacity 0.25s ease, transform 0.25s ease", zIndex: 200, boxShadow: "0 12px 32px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
        <span style={{ color: D.accentLight }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
        {toastMsg}
      </div>

      {/* Responsive override */}
      <style>{`
        @media (max-width: 860px) {
          .checkout-grid-inner { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .shell-inner { padding: 20px 16px 60px !important; }
          .panel-inner { padding: 22px 18px !important; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StepDot({ label, state }) {
  const bg = state === "done" || state === "active"
    ? "linear-gradient(135deg, #7ef2c0 0%, #22c55e 55%, #0e9f63 100%)"
    : "#16221c";
  const color = state === "idle" ? "#7a8f86" : "#04231a";
  const textColor = state === "active" ? "#ffffff" : "#7a8f86";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, transition: "color 0.2s ease" }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, background: bg, color, transition: "background 0.25s ease, color 0.25s ease" }}>
        {state === "done"
          ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5L8.5 2.5" stroke="#04231a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          : label === "Plan" ? "1" : label === "Payment" ? "2" : "3"
        }
      </div>
      <span style={{ color: textColor, fontWeight: state === "active" ? 600 : 400 }}>{label}</span>
    </div>
  );
}

function CopyBtn({ value, copyKey, copiedKey, onCopy }) {
  const copied = copiedKey === copyKey;
  return (
    <button
      className="copy-btn"
      onClick={() => onCopy(value, copyKey)}
      style={{ display: "flex", alignItems: "center", gap: 5, background: "#0e1713", border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.13)"}`, color: copied ? "#7ef2c0" : "#8fa79c", fontSize: 11.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer", transition: "color 0.15s ease, border-color 0.15s ease" }}
    >
      {copied
        ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.2l2.7 2.7L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <IconCopy size={12} color="currentColor" />
      }
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Shared styles object ──────────────────────────────────────────────────────
const D2 = {
  bg: "#070c0a", card: "#0e1713", card2: "#121e18", card3: "#16221c",
  text: "#ffffff", text2: "#8fa79c", text3: "#7a8f86",
  border: "rgba(255,255,255,0.07)", borderStrong: "rgba(255,255,255,0.13)",
  accentLight: "#7ef2c0", accentInk: "#04231a", accentTint: "rgba(34,197,94,0.11)",
  accentGrad: "linear-gradient(135deg, #7ef2c0 0%, #22c55e 55%, #0e9f63 100%)",
  destructive: "#f2726b", radius: "10px", radiusLg: "16px",
};

const styles = {
  card: { background: D2.card, border: `1px solid ${D2.border}`, borderRadius: D2.radiusLg, boxShadow: "0 1px 2px rgba(0,0,0,0.2), 0 12px 32px -12px rgba(0,0,0,0.35)" },
  panelH1: { fontSize: 19, fontWeight: 800, marginBottom: 3 },
  panelSub: { fontSize: 12.5, color: D2.text3, marginBottom: 22 },
  sectionLabel: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: D2.text3, marginBottom: 12 },
  summaryLine: { display: "flex", justifyContent: "space-between", fontSize: 13, color: D2.text2, padding: "6px 0" },
  methodCard: { display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 12, border: `1.5px solid ${D2.borderStrong}`, background: D2.card2, textAlign: "left", width: "100%", transition: "border-color 0.15s ease, background 0.15s ease", cursor: "pointer" },
  methodCardSelected: { borderColor: "#22c55e", background: "rgba(34,197,94,0.11)" },
  methodRadio: { width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${D2.borderStrong}`, background: D2.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  methodRadioSelected: { borderColor: "#22c55e", background: "linear-gradient(135deg, #7ef2c0 0%, #22c55e 55%, #0e9f63 100%)" },
  field: { marginBottom: 16 },
  fieldErr: {},
  fieldLabel: { display: "block", fontSize: 12.5, color: D2.text2, marginBottom: 7, fontWeight: 600 },
  textInput: { width: "100%", height: 44, background: D2.card2, border: `1px solid ${D2.borderStrong}`, borderRadius: 9, padding: "0 13px", color: D2.text, fontSize: 13.5, fontFamily: "inherit", outline: "none" },
  stripeMount: { width: "100%", height: 44, background: D2.card2, border: `1px solid ${D2.borderStrong}`, borderRadius: 9, padding: "0 13px", display: "flex", alignItems: "center", fontSize: 13.5, color: D2.text3 },
  errMsg: { fontSize: 11.5, color: "#f2726b", marginTop: 6 },
  btnPrimary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, padding: "0 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, border: "none", width: "100%", background: "linear-gradient(135deg, #7ef2c0 0%, #22c55e 55%, #0e9f63 100%)", color: "#04231a", cursor: "pointer", transition: "filter 0.15s ease" },
  recipientRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", gap: 12 },
  recipientVal: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  recipientB: { fontSize: 14.5, fontWeight: 800, letterSpacing: "0.01em", overflowWrap: "anywhere", textAlign: "right" },
};
