"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OtpInput } from "@/components/OtpInput";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Mode = "login" | "register";
type Step = "form" | "otp" | "forgot" | "forgot-otp";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login, register, resendRegistrationOtp, verifyRegistration, forgotPassword, resetPassword } = useAuth();

  // Already signed in? There's nothing to do on this page — send them back
  // to their profile instead of showing the login/register form again.
  useEffect(() => {
    if (isAuthenticated) router.replace("/profile");
  }, [isAuthenticated, router]);

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetOtp, setResetOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  function switchMode(next: Mode) {
    setMode(next);
    setStep("form");
    setError(null);
    setNeedsVerification(false);
    setOtp("");
  }

  function openForgotPassword() {
    setForgotEmail(email);
    setError(null);
    setStep("forgot");
  }

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      window.location.href = "/";
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        // Account exists but was never verified — same OTP screen handles
        // both "fresh signup" and "came back days later to finish verifying".
        setNeedsVerification(true);
        setError("Your email isn't verified yet. Enter your password again and we'll send a code.");
        toast.info("Your email isn't verified yet — we'll send you a code.");
      } else {
        const msg = errorMessage(err, "Couldn't sign you in. Please try again.");
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendVerificationForExistingAccount() {
    setError(null);
    setLoading(true);
    try {
      const { expiresIn } = await resendRegistrationOtp(email);
      setSecondsLeft(expiresIn);
      setOtp("");
      setStep("otp");
      toast.success("Verification code sent to your email");
    } catch (err) {
      const msg = errorMessage(err, "Couldn't send the code. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError(null);
    setLoading(true);
    try {
      const { expiresIn } = await register(name, email, password, phone || undefined);
      setSecondsLeft(expiresIn);
      setOtp("");
      setStep("otp");
      toast.success("Verification code sent to your email");
    } catch (err) {
      const msg = errorMessage(err, "Couldn't create your account. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setLoading(true);
    try {
      await verifyRegistration(email, otp);
      toast.success("Email verified — you're all set!");
      window.location.href = "/";
    } catch (err) {
      const msg = errorMessage(err, "Couldn't verify that code. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setLoading(true);
    try {
      const { expiresIn } = await resendRegistrationOtp(email);
      setSecondsLeft(expiresIn);
      setOtp("");
      toast.success("Code resent to your email");
    } catch (err) {
      const msg = errorMessage(err, "Couldn't resend the code. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit() {
    setError(null);
    setLoading(true);
    try {
      const { expiresIn } = await forgotPassword(forgotEmail);
      setSecondsLeft(expiresIn);
      setResetOtp("");
      setNewPassword("");
      setStep("forgot-otp");
      toast.success("If that email is registered, a reset code is on its way");
    } catch (err) {
      const msg = errorMessage(err, "Couldn't send the reset code. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotResend() {
    setError(null);
    setLoading(true);
    try {
      const { expiresIn } = await forgotPassword(forgotEmail);
      setSecondsLeft(expiresIn);
      setResetOtp("");
      toast.success("Reset code resent to your email");
    } catch (err) {
      const msg = errorMessage(err, "Couldn't resend the code. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit() {
    setError(null);
    setLoading(true);
    try {
      await resetPassword(forgotEmail, resetOtp, newPassword);
      toast.success("Password reset — you're now signed in!");
      window.location.href = "/";
    } catch (err) {
      const msg = errorMessage(err, "Couldn't reset your password. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-(--radius-card,16px) border border-(--ink-100) p-8 shadow-sm">
          {step === "form" && (
            <>
              <div className="flex rounded-full bg-(--surface-alt,#F7F9FC) p-1">
                <button
                  onClick={() => switchMode("login")}
                  className={`flex-1 rounded-full py-2 font-heading text-sm font-semibold transition-colors ${
                    mode === "login" ? "bg-primary text-primary-foreground" : "text-(--ink-700)"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => switchMode("register")}
                  className={`flex-1 rounded-full py-2 font-heading text-sm font-semibold transition-colors ${
                    mode === "register" ? "bg-primary text-primary-foreground" : "text-(--ink-700)"
                  }`}
                >
                  Register
                </button>
              </div>

              <h1 className="mt-6 font-display text-xl font-semibold text-primary">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1 font-sans text-sm text-(--ink-500)">
                {mode === "login"
                  ? "Sign in with your email and password."
                  : "We'll email you a 6-digit code to verify your account."}
              </p>

              <div className="mt-6 flex flex-col gap-3">
                {mode === "register" && (
                  <div className="flex items-center gap-2 rounded-(--radius-btn,12px) border border-(--ink-300) px-3 py-3 focus-within:border-(--blue-600) focus-within:ring-2 focus-within:ring-(--blue-600)">
                    <User className="h-4 w-4 shrink-0 text-(--ink-500)" />
                    <input
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-transparent font-sans text-sm outline-none"
                    />
                  </div>
                )}

                {mode === "register" && (
                  <div className="flex items-center gap-2 rounded-(--radius-btn,12px) border border-(--ink-300) px-3 py-3 focus-within:border-(--blue-600) focus-within:ring-2 focus-within:ring-(--blue-600)">
                    <Phone className="h-4 w-4 shrink-0 text-(--ink-500)" />
                    <input
                      type="tel"
                      placeholder="Phone number (optional)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full bg-transparent font-sans text-sm outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-(--radius-btn,12px) border border-(--ink-300) px-3 py-3 focus-within:border-(--blue-600) focus-within:ring-2 focus-within:ring-(--blue-600)">
                  <Mail className="h-4 w-4 shrink-0 text-(--ink-500)" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setNeedsVerification(false);
                    }}
                    className="w-full bg-transparent font-sans text-sm outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-(--radius-btn,12px) border border-(--ink-300) px-3 py-3 focus-within:border-(--blue-600) focus-within:ring-2 focus-within:ring-(--blue-600)">
                  <Lock className="h-4 w-4 shrink-0 text-(--ink-500)" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "register" ? "Create a password (min. 6 characters)" : "Password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent font-sans text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="shrink-0 text-(--ink-500) hover:text-(--ink-700)"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="self-end font-heading text-xs font-semibold text-(--blue-600) hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {error && <p className="mt-3 font-sans text-sm text-(--coral-600)">{error}</p>}

              {needsVerification ? (
                <button
                  onClick={sendVerificationForExistingAccount}
                  disabled={loading || !email}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-(--radius-btn,12px) bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Verification Code
                </button>
              ) : (
                <button
                  onClick={mode === "login" ? handleLogin : handleRegister}
                  disabled={loading || !email || !password || (mode === "register" && !name)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-(--radius-btn,12px) bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "login" ? "Sign In" : "Create Account"}
                </button>
              )}
            </>
          )}

          {step === "otp" && (
            <>
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <h1 className="font-display text-xl font-semibold">Verify your email</h1>
              </div>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                Enter the 6-digit code sent to {email}.
              </p>

              <div className="mt-6">
                <OtpInput value={otp} onChange={setOtp} disabled={loading} />
              </div>

              {error && <p className="mt-3 font-sans text-sm text-(--coral-600)">{error}</p>}

              <button
                onClick={handleVerify}
                disabled={loading || otp.length !== 6}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-(--radius-btn,12px) bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify &amp; Continue
              </button>

              <button
                onClick={handleResend}
                disabled={loading || secondsLeft > 0}
                className="mt-3 w-full font-heading text-sm text-(--blue-600) disabled:text-(--ink-500)"
              >
                {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
              </button>

              <button
                onClick={() => {
                  setStep("form");
                  setError(null);
                }}
                className="mt-1 w-full font-heading text-xs text-(--ink-500)"
              >
                Back
              </button>
            </>
          )}

          {step === "forgot" && (
            <>
              <div className="flex items-center gap-2 text-primary">
                <Lock className="h-5 w-5" />
                <h1 className="font-display text-xl font-semibold">Reset your password</h1>
              </div>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                Enter your account email and we&apos;ll send you a 6-digit code to reset your password.
              </p>

              <div className="mt-6">
                <div className="flex items-center gap-2 rounded-(--radius-btn,12px) border border-(--ink-300) px-3 py-3 focus-within:border-(--blue-600) focus-within:ring-2 focus-within:ring-(--blue-600)">
                  <Mail className="h-4 w-4 shrink-0 text-(--ink-500)" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-transparent font-sans text-sm outline-none"
                  />
                </div>
              </div>

              {error && <p className="mt-3 font-sans text-sm text-(--coral-600)">{error}</p>}

              <button
                onClick={handleForgotSubmit}
                disabled={loading || !forgotEmail}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-(--radius-btn,12px) bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Code
              </button>

              <button
                onClick={() => {
                  setStep("form");
                  setError(null);
                }}
                className="mt-3 w-full font-heading text-xs text-(--ink-500)"
              >
                Back to Sign In
              </button>
            </>
          )}

          {step === "forgot-otp" && (
            <>
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <h1 className="font-display text-xl font-semibold">Enter reset code</h1>
              </div>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                Enter the 6-digit code sent to {forgotEmail}, then choose a new password.
              </p>

              <div className="mt-6">
                <OtpInput value={resetOtp} onChange={setResetOtp} disabled={loading} />
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-(--radius-btn,12px) border border-(--ink-300) px-3 py-3 focus-within:border-(--blue-600) focus-within:ring-2 focus-within:ring-(--blue-600)">
                <Lock className="h-4 w-4 shrink-0 text-(--ink-500)" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent font-sans text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="shrink-0 text-(--ink-500) hover:text-(--ink-700)"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && <p className="mt-3 font-sans text-sm text-(--coral-600)">{error}</p>}

              <button
                onClick={handleResetSubmit}
                disabled={loading || resetOtp.length !== 6 || newPassword.length < 6}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-(--radius-btn,12px) bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Reset Password &amp; Sign In
              </button>

              <button
                onClick={handleForgotResend}
                disabled={loading || secondsLeft > 0}
                className="mt-3 w-full font-heading text-sm text-(--blue-600) disabled:text-(--ink-500)"
              >
                {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
              </button>

              <button
                onClick={() => {
                  setStep("form");
                  setError(null);
                }}
                className="mt-1 w-full font-heading text-xs text-(--ink-500)"
              >
                Back to Sign In
              </button>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
