"use client"

import React, { useEffect, useRef, useState } from "react"
import {
    FileUp, Route, BarChart3, Rocket,
    Brain, Layers, Shield, Activity, BadgeCheck, Leaf,
    Users, Linkedin, Quote,
} from "lucide-react"

const C = {
    dark:   "#000000",
    darkGradEnd: "#2d3333",
    yellow: "#F4CF15",
    white:  "#FAFFFD",
    bg:     "#f0f0ee",
    beige:  "#faf8f4",
    muted:  "#7a8080",
    border: "#e0e0de",
}

/* ── Fade-in au scroll ─────────────────────────────────────────────────────── */

function useFadeIn(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
            { threshold },
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [threshold])
    return { ref, visible }
}

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
    const { ref, visible } = useFadeIn()
    return (
        <div ref={ref} style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
            ...style,
        }}>
            {children}
        </div>
    )
}

/* ── Animated counter ──────────────────────────────────────────────────────── */

function AnimatedCounter({ target, suffix = "", prefix = "", duration = 2000 }: {
    target: number; suffix?: string; prefix?: string; duration?: number
}) {
    const ref = useRef<HTMLSpanElement>(null)
    const [value, setValue] = useState(0)
    const [started, setStarted] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect() } },
            { threshold: 0.3 },
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    useEffect(() => {
        if (!started) return
        const start = performance.now()
        const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
            setValue(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
    }, [started, target, duration])

    return <span ref={ref}>{prefix}{value}{suffix}</span>
}

/* ── Landing ───────────────────────────────────────────────────────────────── */

const LOGOS_CLIENTS = [
    "Groupe Delvaux", "Maison Artaud", "Industrie Perrot",
    "Atelier Morel", "Packing Rivière", "Métal Durand",
]

const TEMOIGNAGES = [
    {
        initials: "SD",
        name: "Sophie Delvaux",
        role: "Directrice Achats",
        company: "Groupe Delvaux",
        quote: "LA FAB a transformé notre gestion de projets d'impression. Délais divisés par 2, qualité irréprochable. On ne reviendrait pas en arrière.",
    },
    {
        initials: "MA",
        name: "Marc Artaud",
        role: "Responsable Production",
        company: "Maison Artaud",
        quote: "L'IA qui analyse nos briefs nous fait gagner un temps précieux. Les devis arrivent en moins de 24h, c'est impressionnant.",
    },
    {
        initials: "CP",
        name: "Claire Perrot",
        role: "CEO",
        company: "Industrie Perrot",
        quote: "En tant que fournisseur, LA FAB nous apporte des projets qualifiés. Le matching intelligent est vraiment pertinent.",
    },
]

export default function Landing() {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40)
        window.addEventListener("scroll", onScroll)
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <>
            <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: ${C.bg}; }
                ::selection { background: ${C.yellow}; color: ${C.dark}; }
            `}</style>

            <div style={{ fontFamily: "'Inter', sans-serif", color: C.dark, overflowX: "hidden" }}>

                {/* ── NAV ── */}
                <nav style={{
                    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
                    padding: "0 40px", height: 64,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    backgroundColor: scrolled ? "rgba(250,255,253,0.95)" : "transparent",
                    backdropFilter: scrolled ? "blur(12px)" : "none",
                    borderBottom: scrolled ? `1px solid ${C.border}` : "none",
                    transition: "all 0.3s ease",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, backgroundColor: C.yellow, borderRadius: 7,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: C.dark }}>LF</span>
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: scrolled ? C.dark : C.white }}>
                            LA FAB
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <a href="/login" className="nav-link" style={{
                            padding: "8px 18px", fontSize: 14, fontWeight: 600,
                            color: scrolled ? C.dark : C.white, textDecoration: "none", borderRadius: 8,
                        }}>
                            Se connecter
                        </a>
                        <a href="/login" className="btn-primary" style={{
                            padding: "8px 22px", fontSize: 14, fontWeight: 700,
                            color: C.dark, textDecoration: "none",
                            backgroundColor: C.yellow, borderRadius: 8,
                        }}>
                            Démarrer
                        </a>
                    </div>
                </nav>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 1 — HERO (gradient animé)
                ══════════════════════════════════════════════════════════════════ */}
                <section style={{
                    minHeight: "100vh",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "100px 24px 80px",
                    textAlign: "center",
                    position: "relative", overflow: "hidden",
                    backgroundColor: C.dark,
                }}>
                    {/* Background video */}
                    <video
                        autoPlay loop muted playsInline
                        style={{
                            position: "absolute", top: 0, left: 0,
                            width: "100%", height: "100%",
                            objectFit: "cover",
                        }}
                    >
                        <source src="https://videos.pexels.com/video-files/5377684/5377684-uhd_2560_1440_25fps.mp4" type="video/mp4" />
                    </video>
                    {/* Dark overlay */}
                    <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.6)",
                    }} />
                    <div style={{ maxWidth: 760, margin: "0 auto", position: "relative", zIndex: 1 }}>
                        <h1 style={{
                            fontSize: "clamp(34px, 5vw, 52px)",
                            fontWeight: 600,
                            lineHeight: 1.1,
                            color: C.white,
                            marginBottom: 20,
                            letterSpacing: "-0.03em",
                        }}>
                            Orchestrez vos projets industriels.
                            <br />
                            <span style={{ color: C.yellow }}>Zéro friction.</span>
                        </h1>

                        <p style={{
                            fontSize: 18, lineHeight: 1.6,
                            color: "rgba(250,255,253,0.7)",
                            maxWidth: 560, margin: "0 auto 40px",
                        }}>
                            La plateforme B2B qui connecte vos briefs aux meilleurs fournisseurs —
                            impression, packaging, menuiserie, métallurgie — en quelques clics.
                        </p>

                        {/* 2 CTA côte à côte */}
                        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
                            <a href="/projet/nouveau" className="btn-primary" style={{
                                padding: "16px 32px", backgroundColor: C.yellow, color: C.dark,
                                borderRadius: 8, fontSize: 16, fontWeight: 700, textDecoration: "none",
                                border: "none",
                            }}>
                                Déposer un brief
                            </a>
                            <a href="/supplier/register" className="btn-secondary" style={{
                                padding: "16px 32px", color: C.white,
                                borderRadius: 8, fontSize: 16, fontWeight: 600, textDecoration: "none",
                                border: `1px solid rgba(250,255,253,0.3)`, backgroundColor: "transparent",
                            }}>
                                Espace fournisseur
                            </a>
                        </div>

                        {/* Badge social proof */}
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            padding: "8px 18px", borderRadius: 20,
                            backgroundColor: "rgba(244,207,21,0.1)",
                            border: "1px solid rgba(244,207,21,0.2)",
                        }}>
                            <span className="landing-badge-pulse" style={{ display: "flex" }}>
                                <Users size={16} color={C.yellow} />
                            </span>
                            <span style={{ color: C.yellow, fontSize: 14, fontWeight: 500 }}>
                                50+ projets orchestrés
                            </span>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 2 — ILS NOUS FONT CONFIANCE (logos défilement)
                ══════════════════════════════════════════════════════════════════ */}
                <section style={{ padding: "48px 0", backgroundColor: C.white, overflow: "hidden" }}>
                    <FadeIn>
                        <p style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24 }}>
                            Ils nous font confiance
                        </p>
                    </FadeIn>
                    <div style={{ overflow: "hidden", position: "relative" }}>
                        {/* Fade edges */}
                        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 80, background: `linear-gradient(to right, ${C.white}, transparent)`, zIndex: 1 }} />
                        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 80, background: `linear-gradient(to left, ${C.white}, transparent)`, zIndex: 1 }} />
                        <div className="landing-marquee-track">
                            {[...LOGOS_CLIENTS, ...LOGOS_CLIENTS].map((name, i) => (
                                <div key={i} style={{
                                    flex: "0 0 auto",
                                    padding: "12px 40px",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    <div style={{
                                        width: 140, height: 48,
                                        backgroundColor: "#f4f4f3",
                                        borderRadius: 8,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        opacity: 0.5,
                                    }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 3 — COMMENT ÇA MARCHE
                ══════════════════════════════════════════════════════════════════ */}
                <section id="comment-ca-marche" style={{ padding: "96px 24px", backgroundColor: C.bg }}>
                    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                        <FadeIn>
                            <h2 style={{ fontSize: 32, fontWeight: 600, color: C.dark, textAlign: "center", marginBottom: 64 }}>
                                Comment ça marche
                            </h2>
                        </FadeIn>

                        <div className="landing-steps-row" style={{ display: "flex", alignItems: "stretch", justifyContent: "center", flexWrap: "wrap", gap: 0 }}>
                            {([
                                { n: 1, icon: <FileUp size={24} />, title: "Déposez votre brief", desc: "Uploadez votre cahier des charges. Notre IA l'analyse en quelques secondes." },
                                { n: 2, icon: <Route size={24} />, title: "Matching fournisseurs", desc: "Notre algorithme sélectionne les fournisseurs les plus pertinents selon vos critères." },
                                { n: 3, icon: <BarChart3 size={24} />, title: "Comparez les offres", desc: "Recevez et comparez les devis de nos fournisseurs vérifiés." },
                                { n: 4, icon: <Rocket size={24} />, title: "Lancez la production", desc: "Validez, payez, et suivez votre projet en temps réel." },
                            ] as const).map((step, i) => (
                                <FadeIn key={step.n} delay={i * 0.1}>
                                    <div style={{ display: "flex", alignItems: "stretch", height: "100%" }}>
                                        <div className="landing-step-card" style={{
                                            textAlign: "center", width: 210, padding: "20px 16px",
                                            borderRadius: 12, backgroundColor: C.white,
                                            display: "flex", flexDirection: "column", height: "100%",
                                        }}>
                                            <div style={{
                                                width: 52, height: 52, borderRadius: "50%",
                                                backgroundColor: C.yellow, color: C.dark,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                margin: "0 auto 12px", fontWeight: 700, fontSize: 20,
                                            }}>
                                                {step.n}
                                            </div>
                                            <div style={{ color: C.yellow, marginBottom: 8, display: "flex", justifyContent: "center" }}>
                                                {step.icon}
                                            </div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 6 }}>
                                                {step.title}
                                            </div>
                                            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, flex: 1 }}>
                                                {step.desc}
                                            </p>
                                        </div>
                                        {/* Horizontal connector */}
                                        {i < 3 && (
                                            <div className="landing-step-connector-h" style={{
                                                width: 40, height: 2, backgroundColor: C.border,
                                                marginTop: 46, flexShrink: 0, alignSelf: "flex-start",
                                            }} />
                                        )}
                                    </div>
                                    {/* Vertical connector (mobile) */}
                                    {i < 3 && (
                                        <div className="landing-step-connector-v" style={{
                                            display: "none", width: 2, height: 24,
                                            backgroundColor: C.border, margin: "0 auto",
                                        }} />
                                    )}
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 4 — POURQUOI LA FAB
                ══════════════════════════════════════════════════════════════════ */}
                <section style={{ padding: "96px 24px", backgroundColor: C.white }}>
                    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                        <FadeIn>
                            <h2 style={{ fontSize: 32, fontWeight: 600, color: C.dark, textAlign: "center", marginBottom: 56 }}>
                                Pourquoi choisir LA FAB
                            </h2>
                        </FadeIn>

                        <div className="landing-avantages-grid" style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 20, alignItems: "stretch",
                        }}>
                            {([
                                { icon: <Brain size={28} />, title: "IA intégrée", desc: "Notre intelligence artificielle analyse vos briefs, extrait les spécifications, et optimise le routing fournisseurs." },
                                { icon: <Layers size={28} />, title: "Multi-métiers", desc: "Impression, menuiserie, métallurgie, logistique, packaging — tous vos besoins en un seul endroit." },
                                { icon: <Shield size={28} />, title: "Paiement sécurisé", desc: "Paiement Stripe avec acompte 30/70. Vos transactions sont sécurisées et tracées." },
                                { icon: <Activity size={28} />, title: "Suivi temps réel", desc: "Suivez chaque étape de vos projets. Notifications instantanées, messagerie intégrée." },
                                { icon: <BadgeCheck size={28} />, title: "Fournisseurs vérifiés", desc: "Réseau de fournisseurs qualifiés avec scores de confiance et historique vérifié." },
                                { icon: <Leaf size={28} />, title: "CO2 optimisé", desc: "Routing intelligent qui privilégie la proximité géographique pour réduire l'empreinte carbone." },
                            ]).map((card, i) => (
                                <FadeIn key={card.title} delay={i * 0.07} style={{ height: "100%" }}>
                                    <div className="landing-card-hover" style={{
                                        backgroundColor: C.bg, borderRadius: 12,
                                        padding: "28px 24px",
                                        boxShadow: "0 1px 4px rgba(58,64,64,0.06)",
                                        height: "100%", display: "flex", flexDirection: "column",
                                    }}>
                                        <div style={{ color: C.yellow, marginBottom: 14 }}>{card.icon}</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 8 }}>{card.title}</div>
                                        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, flex: 1 }}>{card.desc}</p>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 5 — TÉMOIGNAGES
                ══════════════════════════════════════════════════════════════════ */}
                <section style={{ padding: "96px 24px", backgroundColor: C.beige }}>
                    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                        <FadeIn>
                            <h2 style={{ fontSize: 32, fontWeight: 600, color: C.dark, textAlign: "center", marginBottom: 56 }}>
                                Ce que disent nos clients
                            </h2>
                        </FadeIn>

                        <div className="landing-temoignages-grid" style={{
                            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "stretch",
                        }}>
                            {TEMOIGNAGES.map((t, i) => (
                                <FadeIn key={t.name} delay={i * 0.1} style={{ height: "100%" }}>
                                    <div style={{
                                        backgroundColor: C.white, borderRadius: 12, padding: "28px 24px",
                                        boxShadow: "0 1px 4px rgba(58,64,64,0.06)",
                                        position: "relative",
                                        height: "100%", display: "flex", flexDirection: "column",
                                    }}>
                                        <Quote size={32} style={{
                                            position: "absolute", top: 16, right: 20,
                                            color: C.yellow, opacity: 0.2,
                                        }} />
                                        <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.7, fontStyle: "italic", flex: 1 }}>
                                            &ldquo;{t.quote}&rdquo;
                                        </p>
                                        <div style={{ marginTop: 20 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: "50%",
                                                    backgroundColor: C.yellow, color: C.dark,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontWeight: 700, fontSize: 14,
                                                }}>
                                                    {t.initials}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{t.name}</div>
                                                    <div style={{ fontSize: 12, color: C.muted }}>{t.role}, {t.company}</div>
                                                </div>
                                            </div>
                                            {/* Placeholder badge */}
                                            <div style={{
                                                marginTop: 12, fontSize: 10, color: C.muted, opacity: 0.5,
                                                textTransform: "uppercase", letterSpacing: "0.05em",
                                            }}>
                                                Témoignage placeholder
                                            </div>
                                        </div>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 6 — CHIFFRES CLÉS (compteurs animés)
                ══════════════════════════════════════════════════════════════════ */}
                <section style={{
                    padding: "80px 24px",
                    background: C.dark,
                }}>
                    <div style={{
                        maxWidth: 900, margin: "0 auto",
                        display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 40,
                        textAlign: "center",
                    }}>
                        {([
                            { target: 50, suffix: "+", label: "projets gérés" },
                            { target: 18, suffix: "", label: "fournisseurs vérifiés" },
                            { target: 24, prefix: "< ", suffix: "h", label: "délai de réponse moyen" },
                            { target: 98, suffix: "%", label: "taux de satisfaction" },
                        ]).map((s) => (
                            <FadeIn key={s.label}>
                                <div>
                                    <div style={{ fontSize: 48, fontWeight: 700, color: C.yellow, lineHeight: 1 }}>
                                        <AnimatedCounter
                                            target={s.target}
                                            suffix={s.suffix}
                                            prefix={s.prefix || ""}
                                        />
                                    </div>
                                    <div style={{ fontSize: 14, color: C.white, marginTop: 8 }}>
                                        {s.label}
                                    </div>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 7 — CTA FINAL (2 parcours)
                ══════════════════════════════════════════════════════════════════ */}
                <section style={{
                    padding: "96px 24px",
                    background: `linear-gradient(160deg, #0d0d0d 0%, #1a1f2e 100%)`,
                }}>
                    <div style={{ maxWidth: 900, margin: "0 auto" }}>
                        <FadeIn>
                            <h2 style={{ fontSize: 32, fontWeight: 600, color: C.white, textAlign: "center", marginBottom: 56 }}>
                                Prêt à démarrer ?
                            </h2>
                        </FadeIn>

                        <div className="landing-cta-dual" style={{
                            display: "flex", gap: 24, justifyContent: "center",
                        }}>
                            {/* Client */}
                            <div style={{
                                flex: 1, maxWidth: 400,
                                backgroundColor: "rgba(250,255,253,0.05)",
                                border: "1px solid rgba(250,255,253,0.1)",
                                borderRadius: 16, padding: "40px 32px",
                                textAlign: "center",
                            }}>
                                <div style={{ fontSize: 14, color: C.yellow, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Vous êtes client
                                </div>
                                <h3 style={{ fontSize: 22, fontWeight: 600, color: C.white, marginBottom: 12 }}>
                                    Lancez votre premier projet
                                </h3>
                                <p style={{ fontSize: 14, color: "rgba(250,255,253,0.6)", lineHeight: 1.6, marginBottom: 28 }}>
                                    Créez votre compte gratuitement et déposez votre premier brief en moins de 2 minutes.
                                </p>
                                <a href="/login" className="btn-primary" style={{
                                    display: "inline-block", padding: "14px 32px",
                                    backgroundColor: C.yellow, color: C.dark,
                                    borderRadius: 8, fontSize: 15, fontWeight: 700,
                                    textDecoration: "none",
                                }}>
                                    Créer mon compte
                                </a>
                            </div>

                            {/* Fournisseur */}
                            <div style={{
                                flex: 1, maxWidth: 400,
                                backgroundColor: "rgba(250,255,253,0.05)",
                                border: "1px solid rgba(250,255,253,0.1)",
                                borderRadius: 16, padding: "40px 32px",
                                textAlign: "center",
                            }}>
                                <div style={{ fontSize: 14, color: C.yellow, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Vous êtes fournisseur
                                </div>
                                <h3 style={{ fontSize: 22, fontWeight: 600, color: C.white, marginBottom: 12 }}>
                                    Rejoignez notre réseau
                                </h3>
                                <p style={{ fontSize: 14, color: "rgba(250,255,253,0.6)", lineHeight: 1.6, marginBottom: 28 }}>
                                    Accédez à des projets qualifiés et développez votre activité avec LA FAB.
                                </p>
                                <a href="/supplier/register" style={{
                                    display: "inline-block", padding: "14px 32px",
                                    color: C.white, borderRadius: 8, fontSize: 15, fontWeight: 600,
                                    textDecoration: "none",
                                    border: `1px solid rgba(250,255,253,0.3)`,
                                    backgroundColor: "transparent",
                                    transition: "all 150ms ease",
                                }}>
                                    Rejoindre le réseau
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    FOOTER
                ══════════════════════════════════════════════════════════════════ */}
                <footer style={{ backgroundColor: C.dark, padding: "48px 24px 32px" }}>
                    <div className="landing-footer-grid" style={{
                        maxWidth: 960, margin: "0 auto",
                        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32,
                        alignItems: "start",
                    }}>
                        {/* Col 1 — Logo + socials */}
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                <div style={{
                                    width: 24, height: 24, backgroundColor: C.yellow, borderRadius: 5,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: C.dark }}>LF</span>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 700, color: C.white }}>LA FAB</span>
                            </div>
                            <p style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", lineHeight: 1.5, marginBottom: 16 }}>
                                La plateforme qui orchestre vos projets industriels.
                            </p>
                            <a href="#" aria-label="LinkedIn" style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 32, height: 32, borderRadius: 6,
                                backgroundColor: "rgba(250,255,253,0.08)",
                                color: "rgba(250,255,253,0.5)",
                                textDecoration: "none",
                                transition: "background-color 150ms ease",
                            }}>
                                <Linkedin size={16} />
                            </a>
                        </div>

                        {/* Col 2 — Liens */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <a href="/login" className="nav-link" style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", textDecoration: "none" }}>Connexion</a>
                            <a href="/supplier/register" className="nav-link" style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", textDecoration: "none" }}>Espace fournisseur</a>
                            <a href="mailto:contact@lafab-360.fr" className="nav-link" style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", textDecoration: "none" }}>Contact</a>
                        </div>

                        {/* Col 3 — Légal */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "right" }}>
                            <a href="#" className="nav-link" style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", textDecoration: "none" }}>Mentions légales</a>
                            <a href="#" className="nav-link" style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", textDecoration: "none" }}>CGV</a>
                            <a href="#" className="nav-link" style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", textDecoration: "none" }}>Politique de confidentialité</a>
                            <span style={{ fontSize: 13, color: "rgba(250,255,253,0.4)" }}>contact@lafab-360.fr</span>
                        </div>
                    </div>

                    <div style={{
                        maxWidth: 960, margin: "32px auto 0", paddingTop: 24,
                        borderTop: "1px solid rgba(250,255,253,0.1)",
                        textAlign: "center", fontSize: 12, color: "rgba(250,255,253,0.4)",
                    }}>
                        © 2026 LA FAB — Tous droits réservés
                    </div>
                </footer>
            </div>
        </>
    )
}
