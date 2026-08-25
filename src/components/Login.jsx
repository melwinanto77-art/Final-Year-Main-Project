import React, { useState } from "react";
import { login as apiLogin } from "../api.js";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, UserCheck, Sparkles } from "lucide-react";

/* Credentials are verified by the API against hashed passwords — there is no
   password in this file any more. The seeded development accounts are
   admin@consciousorbit.com and founder@venture.io; change them before this is
   exposed to anything real. */

export default function Login({ onLogin, onBack }) {
  // isAdmin: false -> Executive Sign in, true -> Admin Sign in (Triggers 3D Card Flip)
  const [isAdmin, setIsAdmin] = useState(false);

  // isSignUp: inside Executive Sign in card, toggle for users without account
  const [isSignUp, setIsSignUp] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin && isSignUp && !agreedToTerms) {
      alert("Please agree to the Terms & Privacy Policy to proceed.");
      return;
    }

    // Sign-up is still a demo flow; signing IN authenticates for real.
    if (isSignUp) {
      setError("");
      if (onLogin) onLogin("executive", email.trim().toLowerCase());
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const data = await apiLogin(email.trim(), password, isAdmin ? "admin" : "client");
      const role = data?.user?.role === "admin" ? "admin" : "executive";
      if (onLogin) onLogin(role, data?.user?.email || email.trim().toLowerCase());
    } catch (err) {
      setError(
        err?.name === "ApiUnavailable"
          ? "Cannot reach the server. Start the backend and try again."
          : err?.message || "Sign in failed. Check your email and password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 overflow-hidden selection:bg-[#D4AF37] selection:text-[#4A0A13] transition-colors duration-700 ${
        isAdmin ? "bg-[#FAF4E8] text-[#4A0A13]" : "bg-[#4A0A13] text-[#FAF4E8]"
      }`}
    >
      {/* Soft Ambient Radial Background Glow */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
          isAdmin
            ? "bg-[radial-gradient(circle_at_50%_50%,rgba(74,10,19,0.08)_0%,transparent_65%)]"
            : "bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.15)_0%,transparent_65%)]"
        }`}
      />

      {/* Top Navigation Header */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className={`group flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer px-3.5 py-1.5 rounded-full border shadow-xs ${
            isAdmin
              ? "bg-[#FAF4E8] hover:bg-[#F5EAD4] text-[#4A0A13] border-[#4A0A13]/30"
              : "bg-[#38070E] hover:bg-[#38070E]/80 text-[#F5D77F] border-[#D4AF37]/30"
          }`}
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition" />
          <span>Home</span>
        </button>

        <div className="cursor-pointer" onClick={onBack}>
          <span
            className={`font-mono text-xs font-extrabold uppercase tracking-[0.2em] transition-colors ${
              isAdmin ? "text-[#4A0A13]" : "text-[#F5D77F]"
            }`}
          >
            Conscious Orbital
          </span>
        </div>
      </header>

      {/* Centered Main Container */}
      <main className="relative z-10 w-full max-w-[370px] my-auto flex flex-col items-center justify-center">
        
        {/* Toggle Switcher: ONLY 2 OPTIONS (Sign in vs Admin Sign in) */}
        <div
          className={`relative mb-6 flex items-center justify-center gap-5 select-none px-4 py-2 rounded-full border shadow-md transition-colors duration-700 ${
            isAdmin
              ? "bg-[#FAF4E8]/90 border-[#4A0A13]/40 text-[#4A0A13]"
              : "bg-[#38070E]/80 border-[#D4AF37]/40 text-[#FAF4E8]"
          }`}
        >
          <span
            onClick={() => { setIsAdmin(false); setError(""); }}
            className={`text-xs font-bold cursor-pointer transition-colors ${
              !isAdmin
                ? "text-[#F5D77F]"
                : "text-[#4A0A13]/60 hover:text-[#4A0A13]"
            }`}
          >
            Sign in
          </span>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => { setIsAdmin(e.target.checked); setError(""); }}
              className="sr-only peer"
            />
            <div
              className={`w-10 h-5.5 rounded-full border peer transition-colors relative ${
                isAdmin
                  ? "bg-[#FAF4E8] border-[#4A0A13]/60"
                  : "bg-[#4A0A13] border-[#D4AF37]/60"
              }`}
            >
              <div
                className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full transition-transform duration-500 ${
                  isAdmin
                    ? "translate-x-[18px] bg-[#4A0A13]"
                    : "translate-x-0 bg-[#F5D77F]"
                }`}
              />
            </div>
          </label>

          <span
            onClick={() => { setIsAdmin(true); setError(""); }}
            className={`text-xs font-bold cursor-pointer transition-colors ${
              isAdmin
                ? "text-[#4A0A13]"
                : "text-[#FAF4E8]/60 hover:text-[#FAF4E8]"
            }`}
          >
            Admin Sign in
          </span>
        </div>

        {/* 3D FLIP CARD CONTAINER */}
        <div className="w-full h-[420px] [perspective:1000px]">
          <div
            className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${
              isAdmin ? "[transform:rotateY(180deg)]" : ""
            }`}
          >
            
            {/* ============================================================ */}
            {/* FRONT FACE: SIGN IN (Executive Profile) — CARD COLOUR = IVORY */}
            {/* ============================================================ */}
            <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-[#FAF4E8] text-[#4A0A13] rounded-3xl border border-[#D4AF37] p-6 shadow-2xl flex flex-col justify-between items-center text-center">
              
              {/* Card Header */}
              <div className="space-y-1 w-full">
                <div className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-[#B8860B] uppercase font-mono tracking-wider">
                  {isSignUp ? <Sparkles size={13} /> : <UserCheck size={13} />}
                  <span>{isSignUp ? "New Account" : "Executive Profile"}</span>
                </div>
                <h2 className="font-serif italic text-2xl sm:text-3xl font-extrabold text-[#4A0A13]">
                  {isSignUp ? "Sign up" : "Sign in"}
                </h2>
                <p className="text-[0.72rem] text-[#7A1C29] font-medium">
                  {isSignUp
                    ? "Start your intelligence journey"
                    : "Welcome back to Conscious Orbital"}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="w-full space-y-3.5 my-auto">
                {isSignUp && (
                  <div className="space-y-1 text-left">
                    <label className="font-mono text-[0.65rem] uppercase font-bold text-[#B8860B] tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-xl border border-[#D4AF37]/60 bg-[#FAF4E8] px-3.5 py-2 text-xs text-[#4A0A13] placeholder-[#7A1C29]/45 focus:border-[#4A0A13] focus:outline-none transition shadow-xs"
                    />
                  </div>
                )}

                <div className="space-y-1 text-left">
                  <label className="font-mono text-[0.65rem] uppercase font-bold text-[#B8860B] tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-[#D4AF37]/60 bg-[#FAF4E8] px-3.5 py-2.5 text-xs text-[#4A0A13] placeholder-[#7A1C29]/45 focus:border-[#4A0A13] focus:outline-none transition shadow-xs"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[0.65rem] uppercase font-bold text-[#B8860B] tracking-wider">
                      Password
                    </label>
                    {!isSignUp && (
                      <a
                        href="#forgot"
                        onClick={(e) => e.preventDefault()}
                        className="text-[0.65rem] font-bold text-[#800000] hover:underline"
                      >
                        Forgot?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-[#D4AF37]/60 bg-[#FAF4E8] px-3.5 py-2.5 pr-8 text-xs text-[#4A0A13] placeholder-[#7A1C29]/45 focus:border-[#4A0A13] focus:outline-none transition shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A1C29]/60 hover:text-[#4A0A13] transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {isSignUp && (
                  <div className="flex items-center gap-2 pt-0.5 text-left">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="h-3 w-3 rounded border-[#D4AF37] text-[#4A0A13] focus:ring-[#4A0A13] cursor-pointer"
                    />
                    <label
                      htmlFor="terms"
                      className="text-[0.68rem] text-[#4A0A13] cursor-pointer font-medium"
                    >
                      I agree to the{" "}
                      <a
                        href="#terms"
                        onClick={(e) => e.preventDefault()}
                        className="text-[#800000] underline font-bold"
                      >
                        Terms & Privacy
                      </a>
                    </label>
                  </div>
                )}

                {error && !isAdmin && (
                  <p className="text-[0.7rem] font-bold text-[#B3261E] bg-[#FDECEA] border border-[#B3261E]/30 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full border border-[#D4AF37] bg-[#4A0A13] hover:bg-[#5C0F1A] active:scale-[0.98] py-3 text-xs font-bold text-[#F5D77F] shadow-md transition cursor-pointer mt-1 disabled:opacity-60"
                >
                  {submitting ? "Signing in…" : isSignUp ? "Sign up & Create Account" : "Sign in"}
                </button>
              </form>

              {/* Bottom Sign up / Sign in link */}
              <div className="text-[0.7rem] text-[#7A1C29] font-medium pt-2">
                {isSignUp ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(false); setError(""); }}
                      className="font-bold text-[#800000] hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Need an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(true); setError(""); }}
                      className="font-bold text-[#800000] hover:underline cursor-pointer"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* BACK FACE: ADMIN SIGN IN — CARD COLOUR = MAROON              */}
            {/* ============================================================ */}
            <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-[#4A0A13] text-[#FAF4E8] rounded-3xl border border-[#D4AF37] p-6 shadow-2xl flex flex-col justify-between items-center text-center">
              
              {/* Card Header */}
              <div className="space-y-1 w-full">
                <div className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-[#F5D77F] uppercase font-mono tracking-wider bg-[#38070E] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40">
                  <ShieldCheck size={13} className="text-[#D4AF37]" />
                  <span>System Governance</span>
                </div>
                <h2 className="font-serif italic text-2xl sm:text-3xl font-extrabold text-[#FAF4E8]">
                  Admin Sign in
                </h2>
                <p className="text-[0.72rem] text-[#F5D77F]/80 font-medium">
                  Master Control & Governance Portal
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="w-full space-y-3 my-auto">
                <div className="space-y-1 text-left">
                  <label className="font-mono text-[0.65rem] uppercase font-bold text-[#F5D77F] tracking-wider">
                    Admin Email / ID
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@consciousorbital.ai"
                    className="w-full rounded-xl border border-[#D4AF37]/50 bg-[#38070E] px-3.5 py-2 text-xs text-[#FAF4E8] placeholder-[#F5D77F]/40 focus:border-[#D4AF37] focus:outline-none transition shadow-xs font-sans"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-mono text-[0.65rem] uppercase font-bold text-[#F5D77F] tracking-wider">
                    Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-[#D4AF37]/50 bg-[#38070E] px-3.5 py-2 pr-8 text-xs text-[#FAF4E8] placeholder-[#F5D77F]/40 focus:border-[#D4AF37] focus:outline-none transition shadow-xs font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#F5D77F]/60 hover:text-[#FAF4E8] transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && isAdmin && (
                  <p className="text-[0.7rem] font-bold text-[#FFB4A9] bg-[#5C0F1A] border border-[#FFB4A9]/40 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full border border-[#F5D77F] bg-gradient-to-r from-[#D4AF37] to-[#C89B3C] hover:from-[#E6C260] hover:to-[#D4AF37] active:scale-[0.98] py-2.5 text-xs font-extrabold text-[#4A0A13] shadow-lg transition cursor-pointer mt-1 disabled:opacity-60"
                >
                  {submitting ? "Authenticating…" : "Authenticate Admin"}
                </button>
              </form>

              {/* Bottom Switch Link */}
              <div className="text-[0.7rem] text-[#F5D77F]/80 font-medium pt-2">
                Need Executive Access?{" "}
                <button
                  type="button"
                  onClick={() => { setIsAdmin(false); setError(""); }}
                  className="font-bold text-[#F5D77F] hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-2 text-center text-[0.68rem] font-mono transition-colors duration-700">
        <span className={isAdmin ? "text-[#4A0A13]/75" : "text-[#F5D77F]/75"}>
          © 2026 Conscious Orbital · Executive &amp; System Governance
        </span>
      </footer>
    </div>
  );
}
