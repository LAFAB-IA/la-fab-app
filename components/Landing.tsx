"use client"

import React, { useEffect, useRef, useState } from "react"

const C = {
    dark:   "#3A4040",
    yellow: "#F4CF15",
    white:  "#FAFFFD",
    bg:     "#f0f0ee",
    muted:  "#7a8080",
    border: "#e0e0de",
}

// ─── Hook animation au scroll ─────────────────────────────────────────────────
function useInView(threshold = 0.15) {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [])
    return [ref, visible]
}

// ─── Composants sections ──────────────────────────────────────────────────────

function FadeIn({ children, delay = 0 }) {
    const [ref, visible] = useInView()
    return (
        <div ref={ref} style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
        }}>
            {children}
        </div>
    )
}

function Step({ number, title, desc }) {
    return (
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 18, color: C.dark, fontFamily: "'DM Serif Display', serif" }}>
                {number}
            </div>
            <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.dark, marginBottom: 6, fontFamily: "'DM Serif Display', serif" }}>{title}</div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{desc}</div>
            </div>
        </div>
    )
}

function Feature({ icon, title, desc }) {
    return (
        <div style={{ backgroundColor: C.white, borderRadius: 16, padding: "28px 24px", border: "1px solid " + C.border, boxShadow: "0 2px 8px rgba(58,64,64,0.06)" }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 8, fontFamily: "'DM Serif Display', serif" }}>{title}</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{desc}</div>
        </div>
    )
}

// ─── Landing ──────────────────────────────────────────────────────────────────

export default function Landing() {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40)
        window.addEventListener("scroll", onScroll)
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <>
            {/* Google Fonts */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: ${C.bg}; }
                ::selection { background: ${C.yellow}; color: ${C.dark}; }
            `}</style>

            <div style={{ fontFamily: "'DM Sans', sans-serif", color: C.dark, backgroundColor: C.bg, overflowX: "hidden" }}>

                {/* ── NAV ── */}
                <nav style={{
                    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
                    padding: "0 32px", height: 64,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    backgroundColor: scrolled ? "rgba(250,255,253,0.95)" : "transparent",
                    backdropFilter: scrolled ? "blur(12px)" : "none",
                    borderBottom: scrolled ? "1px solid " + C.border : "none",
                    transition: "all 0.3s ease",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, backgroundColor: C.yellow, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: C.dark }}>LF</span>
                        </div>
                        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 400, color: C.dark }}>LA FAB</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <a href="/login" style={{ padding: "8px 18px", fontSize: 14, fontWeight: 600, color: C.dark, textDecoration: "none", borderRadius: 8 }}>
                            Se connecter
                        </a>
                        <a href="/login" style={{ padding: "8px 20px", fontSize: 14, fontWeight: 700, color: C.dark, textDecoration: "none", backgroundColor: C.yellow, borderRadius: 8 }}>
                            Démarrer
                        </a>
                    </div>
                </nav>

                {/* ── HERO ── */}
                <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 24px 80px", position: "relative", overflow: "hidden" }}>

                    {/* Fond décoratif */}
                    <div style={{ position: "absolute", top: "15%", right: "-5%", width: 420, height: 420, borderRadius: "50%", backgroundColor: C.yellow, opacity: 0.12, filter: "blur(80px)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", bottom: "10%", left: "-8%", width: 320, height: 320, borderRadius: "50%", backgroundColor: C.dark, opacity: 0.06, filter: "blur(60px)", pointerEvents: "none" }} />

                    {/* Grille décorative */}
                    <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`, backgroundSize: "60px 60px", opacity: 0.4, pointerEvents: "none" }} />

                    <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>

                        <div style={{
                            display: "inline-block", backgroundColor: C.yellow, color: C.dark,
                            padding: "5px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                            letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 28,
                            animation: "fadeDown 0.6s ease both",
                        }}>
                            Impression professionnelle
                        </div>

                        <h1 style={{
                            fontFamily: "'DM Serif Display', serif",
                            fontSize: "clamp(44px, 8vw, 80px)",
                            fontWeight: 400,
                            lineHeight: 1.1,
                            color: C.dark,
                            marginBottom: 24,
                            animation: "fadeUp 0.7s ease 0.1s both",
                        }}>
                            Vos projets print,<br />
                            <em style={{ color: C.muted }}>sans friction.</em>
                        </h1>

                        <p style={{
                            fontSize: "clamp(16px, 2.5vw, 19px)",
                            color: C.muted,
                            lineHeight: 1.7,
                            maxWidth: 520,
                            margin: "0 auto 40px",
                            animation: "fadeUp 0.7s ease 0.2s both",
                        }}>
                            Déposez votre brief, recevez un devis en 24h, validez et suivez votre production — tout depuis un seul espace.
                        </p>

                        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.7s ease 0.3s both" }}>
                            <a href="/login" style={{
                                padding: "14px 32px", backgroundColor: C.dark, color: C.white,
                                borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none",
                                boxShadow: "0 4px 20px rgba(58,64,64,0.2)",
                                transition: "transform 0.15s, box-shadow 0.15s",
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(58,64,64,0.28)" }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(58,64,64,0.2)" }}
                            >
                                Déposer un brief →
                            </a>
                            <a href="#comment" style={{
                                padding: "14px 28px", backgroundColor: C.white, color: C.dark,
                                borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: "none",
                                border: "1px solid " + C.border,
                            }}>
                                Comment ça marche
                            </a>
                        </div>

                        {/* Stats */}
                        <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 64, flexWrap: "wrap", animation: "fadeUp 0.7s ease 0.4s both" }}>
                            {[
                                { val: "24h",    label: "Délai de réponse" },
                                { val: "100%",   label: "Suivi en temps réel" },
                                { val: "Pro",    label: "Qualité garantie" },
                            ].map((s) => (
                                <div key={s.val} style={{ textAlign: "center" }}>
                                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: C.dark, lineHeight: 1 }}>{s.val}</div>
                                    <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── COMMENT ÇA MARCHE ── */}
                <section id="comment" style={{ padding: "96px 24px", backgroundColor: C.white }}>
                    <div style={{ maxWidth: 800, margin: "0 auto" }}>
                        <FadeIn>
                            <div style={{ textAlign: "center", marginBottom: 56 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Processus</div>
                                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 400, color: C.dark, lineHeight: 1.2 }}>
                                    Simple comme bonjour.
                                </h2>
                            </div>
                        </FadeIn>

                        <div style={{ display: "flex", flexDirection: "column", gap: 36, maxWidth: 520, margin: "0 auto" }}>
                            {[
                                { n: 1, title: "Déposez votre brief", desc: "Uploadez votre PDF ou décrivez votre besoin. Notre IA analyse automatiquement les spécifications : format, quantité, finitions, délai." },
                                { n: 2, title: "Recevez votre devis", desc: "Sous 24h, vous recevez un devis détaillé et personnalisé. Consultez-le, posez vos questions, validez en un clic." },
                                { n: 3, title: "On s'occupe du reste", desc: "Une fois validé, suivez l'avancement de votre production en temps réel depuis votre espace client. Livraison garantie." },
                            ].map((s, i) => (
                                <FadeIn key={s.n} delay={i * 0.12}>
                                    <Step number={s.n} title={s.title} desc={s.desc} />
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section style={{ padding: "96px 24px", backgroundColor: C.bg }}>
                    <div style={{ maxWidth: 960, margin: "0 auto" }}>
                        <FadeIn>
                            <div style={{ textAlign: "center", marginBottom: 56 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Fonctionnalités</div>
                                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 400, color: C.dark, lineHeight: 1.2 }}>
                                    Tout ce qu'il faut,<br />rien de superflu.
                                </h2>
                            </div>
                        </FadeIn>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                            {[
                                { icon: "🤖", title: "Analyse IA du brief", desc: "Notre IA extrait automatiquement toutes les specs de votre document — format, quantité, finitions, délai. Zéro saisie manuelle." },
                                { icon: "📄", title: "Devis instantané", desc: "Recevez un devis PDF professionnel, détaillé et signable directement depuis votre espace client." },
                                { icon: "📊", title: "Suivi en temps réel", desc: "De la validation à la livraison, suivez chaque étape de votre commande avec des notifications automatiques." },
                                { icon: "💳", title: "Paiement sécurisé", desc: "Réglez vos factures en ligne via Stripe. Simple, rapide, sécurisé. Historique complet disponible." },
                                { icon: "💬", title: "Messagerie intégrée", desc: "Échangez directement avec notre équipe sur chaque projet. Toutes les communications centralisées." },
                                { icon: "📁", title: "Espace fichiers", desc: "BAT, fichiers de production, bons de livraison — tout est stocké et accessible depuis votre compte." },
                            ].map((f, i) => (
                                <FadeIn key={f.title} delay={i * 0.08}>
                                    <Feature {...f} />
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                <section style={{ padding: "96px 24px" }}>
                    <FadeIn>
                        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", backgroundColor: C.dark, borderRadius: 24, padding: "64px 48px", position: "relative", overflow: "hidden" }}>

                            {/* Décoration */}
                            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", backgroundColor: C.yellow, opacity: 0.15, pointerEvents: "none" }} />
                            <div style={{ position: "absolute", bottom: -60, left: -30, width: 240, height: 240, borderRadius: "50%", backgroundColor: C.yellow, opacity: 0.08, pointerEvents: "none" }} />

                            <div style={{ position: "relative", zIndex: 1 }}>
                                <div style={{ display: "inline-block", backgroundColor: "rgba(244,207,21,0.15)", color: C.yellow, padding: "5px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 24 }}>
                                    Commencer maintenant
                                </div>
                                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 400, color: C.white, lineHeight: 1.2, marginBottom: 20 }}>
                                    Votre prochain projet<br />commence ici.
                                </h2>
                                <p style={{ fontSize: 16, color: "rgba(250,255,253,0.65)", lineHeight: 1.7, marginBottom: 36, maxWidth: 440, margin: "0 auto 36px" }}>
                                    Créez votre compte gratuitement et déposez votre premier brief en moins de 2 minutes.
                                </p>
                                <a href="/login" style={{
                                    display: "inline-block", padding: "15px 36px",
                                    backgroundColor: C.yellow, color: C.dark,
                                    borderRadius: 12, fontSize: 15, fontWeight: 700,
                                    textDecoration: "none",
                                    boxShadow: "0 4px 24px rgba(244,207,21,0.35)",
                                }}>
                                    Créer mon compte →
                                </a>
                            </div>
                        </div>
                    </FadeIn>
                </section>

                {/* ── FOOTER ── */}
                <footer style={{ borderTop: "1px solid " + C.border, padding: "32px 24px", backgroundColor: C.white }}>
                    <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 24, height: 24, backgroundColor: C.yellow, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: C.dark }}>LF</span>
                            </div>
                            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: C.dark }}>LA FAB</span>
                        </div>
                        <div style={{ fontSize: 13, color: C.muted }}>© 2026 LA FAB — Impression professionnelle</div>
                        <div style={{ display: "flex", gap: 20 }}>
                            <a href="/login" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>Connexion</a>
                            <a href="mailto:contact@lafab.fr" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>Contact</a>
                        </div>
                    </div>
                </footer>

            </div>

            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeDown {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    )
}
