import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from '../LivestockEpidemicTracker.jpeg';
import SiteFooter from "../components/SiteFooter";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [statusMsg, setStatusMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [canContinue, setCanContinue] = useState(false);

    const navigate = useNavigate();

    const API_URL =
        process.env.NODE_ENV === "production"
            ? "/CSE442/2026-Spring/cse-442c/backend/public/api/forgot_password_request.php"
            : "http://localhost:8000/api/forgot_password_request.php";

    const onSubmit = async (e) => {
        e.preventDefault();
        setStatusMsg("");
        setErrorMsg("");
        setCanContinue(false);

        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail.endsWith("@buffalo.edu")) {
            setErrorMsg("A @buffalo.edu email address is required.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: trimmedEmail }),
            });

            let data;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (res.ok && data && data.ok === true) {
                setStatusMsg(data.message || "If an account exists for that email, " +
                    "a confirmation code has been sent.");
                setCanContinue(true);
                return;
            }

            const msg = (data && (data.error || data.message)) || "Request failed.";
            setErrorMsg(msg);
        } catch {
            setErrorMsg("Network error: could not reach the server.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fp-page">
    <div style={{ background: '#ffffff', color: 'black', padding: '20px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <img src={logo} alt="logo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 4 }} />
            <h1 style={{ margin: 0, fontSize: '2.4rem', letterSpacing: '1.5px', fontWeight: 'bold' }}>
                LIVESTOCK EPIDEMIC TRACKER
            </h1>
        </div>
    </div>

            <main className="fp-main">
                <section className="fp-card">
                    <div className="fp-card__title">Forgot your password?</div>

                    <form className="fp-form" onSubmit={onSubmit}>
                        <p className="fp-help">
                            Please enter the Email Address
                            <br />
                            you would like the reset key sent to
                        </p>

                        <label className="fp-field">
                            <span className="fp-label">Email Address</span>
                            <input
                                className="fp-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </label>

                        {statusMsg ? <div className="fp-status">{statusMsg}</div> : null}
                        {errorMsg ? <div className="fp-error">{errorMsg}</div> : null}

                        <button className="fp-btn fp-btn--primary" type="submit" disabled={isLoading}>
                            {isLoading ? "Sending..." : "Request Confirmation Code"}
                        </button>

                        {canContinue ? (
                            <button
                                className="fp-btn fp-btn--primary"
                                type= "button"
                                onClick={() =>
                                    navigate("/reset-password", {
                                        state:{
                                            email: email.trim().toLowerCase(),
                                            fromForgot: true,
                                        },
                                    })
                                }
                            >
                                Continue to Reset Password
                            </button>
                        ) :null}

                        <button
                            type="button"
                            className="fp-btn fp-btn--secondary"
                            onClick={() => navigate("/")}
                        >
                            Back to login
                        </button>
                    </form>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}