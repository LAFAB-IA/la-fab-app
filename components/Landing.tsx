"use client"

import React, { useEffect, useRef, useState } from "react"
import {
    FileUp, Route, BarChart3, Rocket,
    Brain, Layers, Shield, Activity, BadgeCheck, Leaf,
    Users,
} from "lucide-react"

const C = {
    dark:   "#3A4040",
    darkGradEnd: "#2d3333",
    yellow: "#F4CF15",
    white:  "#FAFFFD",
    bg:     "#f0f0ee",
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

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    const { ref, visible } = useFadeIn()
    return (
        <div ref={ref} style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
        }}>
            {children}
        </div>
    )
}

/* ── Landing ───────────────────────────────────────────────────────────────── */

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
                    padding: "0 32px", height: 64,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    backgroundColor: scrolled ? "rgba(250,255,253,0.95)" : "transparent",
                    backdropFilter: scrolled ? "blur(12px)" : "none",
                    borderBottom: scrolled ? `1px solid ${C.border}` : "none",
                    transition: "all 0.3s ease",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                            width: 28, height: 28, backgroundColor: C.yellow, borderRadius: 6,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: C.dark }}>LF</span>
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 700, color: scrolled ? C.dark : C.white }}>
                            LA FAB
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <a href="/login" style={{
                            padding: "8px 18px", fontSize: 14, fontWeight: 600,
                            color: scrolled ? C.dark : C.white, textDecoration: "none", borderRadius: 8,
                        }}>
                            Se connecter
                        </a>
                        <a href="/login" style={{
                            padding: "8px 20px", fontSize: 14, fontWeight: 700,
                            color: C.dark, textDecoration: "none",
                            backgroundColor: C.yellow, borderRadius: 8,
                        }}>
                            Démarrer
                        </a>
                    </div>
                </nav>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 1 — HERO
                ══════════════════════════════════════════════════════════════════ */}
                <section style={{
                    minHeight: "100vh",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "100px 24px 80px",
                    background: `linear-gradient(160deg, ${C.dark} 0%, ${C.darkGradEnd} 100%)`,
                    textAlign: "center",
                }}>
                    <div style={{ maxWidth: 760, margin: "0 auto" }}>
                        <h1 style={{
                            fontSize: "clamp(32px, 5vw, 48px)",
                            fontWeight: 600,
                            lineHeight: 1.15,
                            color: C.white,
                            marginBottom: 20,
                        }}>
                            LA FAB orchestre vos projets d&#39;impression
                        </h1>

                        <p style={{
                            fontSize: 18, lineHeight: 1.6,
                            color: "rgba(250,255,253,0.7)",
                            maxWidth: 600, margin: "0 auto 40px",
                        }}>
                            La plateforme B2B qui connecte vos briefs aux meilleurs fournisseurs.
                            De l&#39;impression au packaging, en passant par la menuiserie et la métallurgie.
                        </p>

                        {/* CTA buttons */}
                        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
                            <a href="/projet/nouveau" style={{
                                padding: "16px 32px", backgroundColor: C.yellow, color: C.dark,
                                borderRadius: 8, fontSize: 16, fontWeight: 700, textDecoration: "none",
                                border: "none",
                            }}>
                                Déposer un brief
                            </a>
                            <a href="#comment-ca-marche" style={{
                                padding: "16px 32px", color: C.yellow,
                                borderRadius: 8, fontSize: 16, fontWeight: 600, textDecoration: "none",
                                border: `1px solid ${C.yellow}`, backgroundColor: "transparent",
                            }}>
                                Découvrir la plateforme
                            </a>
                        </div>

                        {/* Social proof */}
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            color: C.yellow, fontSize: 14,
                        }}>
                            <Users size={16} />
                            <span>Déjà 50+ projets gérés — Rejoignez nos clients satisfaits</span>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 2 — COMMENT ÇA MARCHE
                ══════════════════════════════════════════════════════════════════ */}
                <section id="comment-ca-marche" style={{ padding: "96px 24px", backgroundColor: C.white }}>
                    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                        <FadeIn>
                            <h2 style={{ fontSize: 32, fontWeight: 600, color: C.dark, textAlign: "center", marginBottom: 64 }}>
                                Comment ça marche
                            </h2>
                        </FadeIn>

                        {/* Steps */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap", gap: 0 }}>
                            {([
                                { n: 1, icon: <FileUp size={24} />, title: "Déposez votre brief", desc: "Uploadez votre cahier des charges. Notre IA l'analyse en quelques secondes." },
                                { n: 2, icon: <Route size={24} />, title: "Matching fournisseurs", desc: "Notre algorithme sélectionne les fournisseurs les plus pertinents selon vos critères." },
                                { n: 3, icon: <BarChart3 size={24} />, title: "Comparez les offres", desc: "Recevez et comparez les devis de nos fournisseurs vérifiés." },
                                { n: 4, icon: <Rocket size={24} />, title: "Lancez la production", desc: "Validez, payez, et suivez votre projet en temps réel." },
                            ] as const).map((step, i) => (
                                <FadeIn key={step.n} delay={i * 0.1}>
                                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                                        <div style={{ textAlign: "center", width: 200, padding: "0 12px" }}>
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
                                            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                                                {step.desc}
                                            </div>
                                        </div>
                                        {/* Connector line */}
                                        {i < 3 && (
                                            <div style={{
                                                width: 48, height: 2, backgroundColor: C.border,
                                                marginTop: 26, flexShrink: 0,
                                            }} />
                                        )}
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 3 — AVANTAGES
                ══════════════════════════════════════════════════════════════════ */}
                <section style={{ padding: "96px 24px", backgroundColor: C.bg }}>
                    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                        <FadeIn>
                            <h2 style={{ fontSize: 32, fontWeight: 600, color: C.dark, textAlign: "center", marginBottom: 56 }}>
                                Pourquoi choisir LA FAB
                            </h2>
                        </FadeIn>

                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 20,
                        }}>
                            {([
                                { icon: <Brain size={28} />, title: "IA intégrée", desc: "Notre intelligence artificielle analyse vos briefs, extrait les spécifications, et optimise le routing fournisseurs." },
                                { icon: <Layers size={28} />, title: "Multi-métiers", desc: "Impression, menuiserie, métallurgie, logistique, packaging — tous vos besoins en un seul endroit." },
                                { icon: <Shield size={28} />, title: "Paiement sécurisé", desc: "Paiement Stripe avec acompte 30/70. Vos transactions sont sécurisées et tracées." },
                                { icon: <Activity size={28} />, title: "Suivi temps réel", desc: "Suivez chaque étape de vos projets. Notifications instantanées, messagerie intégrée." },
                                { icon: <BadgeCheck size={28} />, title: "Fournisseurs vérifiés", desc: "Réseau de fournisseurs qualifiés avec scores de confiance et historique vérifié." },
                                { icon: <Leaf size={28} />, title: "CO2 optimisé", desc: "Routing intelligent qui privilégie la proximité géographique pour réduire l'empreinte carbone." },
                            ]).map((card, i) => (
                                <FadeIn key={card.title} delay={i * 0.07}>
                                    <div style={{
                                        backgroundColor: C.white, borderRadius: 12,
                                        padding: "28px 24px",
                                        boxShadow: "0 1px 4px rgba(58,64,64,0.06)",
                                    }}>
                                        <div style={{ color: C.yellow, marginBottom: 14 }}>{card.icon}</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 8 }}>{card.title}</div>
                                        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{card.desc}</div>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>

                    {/* Responsive: 2 cols tablet, 1 col mobile */}
                    <style>{`
                        @media (max-width: 900px) {
                            section:nth-of-type(3) > div > div:last-child {
                                grid-template-columns: repeat(2, 1fr) !important;
                            }
                        }
                        @media (max-width: 580px) {
                            section:nth-of-type(3) > div > div:last-child {
                                grid-template-columns: 1fr !important;
                            }
                        }
                    `}</style>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 4 — CHIFFRES CLÉS
                ══════════════════════════════════════════════════════════════════ */}
                <section style={{
                    padding: "80px 24px",
                    background: C.dark,
                }}>
                    <FadeIn>
                        <div style={{
                            maxWidth: 900, margin: "0 auto",
                            display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 40,
                            textAlign: "center",
                        }}>
                            {([
                                { val: "50+", label: "projets gérés" },
                                { val: "18", label: "fournisseurs vérifiés" },
                                { val: "< 24h", label: "délai de réponse moyen" },
                                { val: "98%", label: "taux de satisfaction" },
                            ]).map((s) => (
                                <div key={s.label}>
                                    <div style={{ fontSize: 48, fontWeight: 700, color: C.yellow, lineHeight: 1 }}>
                                        {s.val}
                                    </div>
                                    <div style={{ fontSize: 14, color: C.white, marginTop: 8 }}>
                                        {s.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 5 — CTA FINAL
                ══════════════════════════════════════════════════════════════════ */}
                <section style={{ padding: "96px 24px", backgroundColor: C.white, textAlign: "center" }}>
                    <FadeIn>
                        <div style={{ maxWidth: 600, margin: "0 auto" }}>
                            <h2 style={{ fontSize: 36, fontWeight: 600, color: C.dark, lineHeight: 1.2, marginBottom: 16 }}>
                                Prêt à lancer votre prochain projet ?
                            </h2>
                            <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.6, marginBottom: 36 }}>
                                Créez votre compte gratuitement et déposez votre premier brief en moins de 2 minutes.
                            </p>
                            <a href="/login" style={{
                                display: "inline-block", padding: "16px 40px",
                                backgroundColor: C.yellow, color: C.dark,
                                borderRadius: 8, fontSize: 16, fontWeight: 700,
                                textDecoration: "none",
                                boxShadow: "0 4px 20px rgba(244,207,21,0.3)",
                            }}>
                                Créer mon compte
                            </a>
                            <div style={{ marginTop: 20 }}>
                                <a href="/supplier/register" style={{
                                    fontSize: 14, color: C.muted, textDecoration: "underline",
                                }}>
                                    Vous êtes fournisseur ?
                                </a>
                            </div>
                        </div>
                    </FadeIn>
                </section>

                {/* ══════════════════════════════════════════════════════════════════
                    FOOTER
                ══════════════════════════════════════════════════════════════════ */}
                <footer style={{ backgroundColor: C.dark, padding: "48px 24px 32px" }}>
                    <div style={{
                        maxWidth: 960, margin: "0 auto",
                        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32,
                        alignItems: "start",
                    }}>
                        {/* Col 1 — Logo */}
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
                            <p style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", lineHeight: 1.5 }}>
                                La plateforme qui orchestre vos projets
                            </p>
                        </div>

                        {/* Col 2 — Liens */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <a href="/login" style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", textDecoration: "none" }}>Connexion</a>
                            <a href="/supplier/register" style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", textDecoration: "none" }}>Espace fournisseur</a>
                            <a href="mailto:contact@lafab-360.fr" style={{ fontSize: 13, color: "rgba(250,255,253,0.6)", textDecoration: "none" }}>Contact</a>
                        </div>

                        {/* Col 3 — Contact */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "right" }}>
                            <span style={{ fontSize: 13, color: "rgba(250,255,253,0.6)" }}>contact@lafab-360.fr</span>
                            <span style={{ fontSize: 13, color: "rgba(250,255,253,0.6)" }}>lafab-360.fr</span>
                        </div>
                    </div>

                    <div style={{
                        maxWidth: 960, margin: "32px auto 0", paddingTop: 24,
                        borderTop: "1px solid rgba(250,255,253,0.1)",
                        textAlign: "center", fontSize: 12, color: "rgba(250,255,253,0.4)",
                    }}>
                        © 2026 LA FAB — Tous droits réservés
                    </div>

                    {/* Responsive footer */}
                    <style>{`
                        @media (max-width: 640px) {
                            footer > div:first-child {
                                grid-template-columns: 1fr !important;
                                text-align: center;
                            }
                            footer > div:first-child > div:last-child {
                                text-align: center !important;
                            }
                        }
                    `}</style>
                </footer>
            </div>
        </>
    )
}
