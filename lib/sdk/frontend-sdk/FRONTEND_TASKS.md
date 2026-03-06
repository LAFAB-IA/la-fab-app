# LA FAB — Frontend Tasks

## Convention
- Quand tu commences une tâche, mets ton prénom devant : [Yannis] ou [Guillaume]
- Quand c'est terminé, coche la case ✅

## Pages

### Auth (Guillaume a commencé)
- [x] [Guillaume] /login — Login + Signup
- [ ] [ ] /forgot-password — Reset password
- [ ] [ ] Middleware auth Next.js (redirect si pas connecté)

### Client
- [ ] [ ] /projets — Liste projets client
- [ ] [ ] /projet/:id — Détail projet (brief, statut, messages, devis)
- [ ] [ ] /projet/nouveau — Création projet + upload brief
- [ ] [ ] /factures — Liste factures client
- [ ] [ ] /facture/:id — Détail facture + bouton payer
- [ ] [ ] /invoice/success — Page succès paiement (appelle GET /api/stripe/verify/:session_id)
- [ ] [ ] /invoice/cancel — Page annulation paiement
- [ ] [ ] /notifications — Centre de notifications
- [ ] [ ] /profil — Profil utilisateur (édition)

### Admin
- [x] [Guillaume] /admin/dashboard — Dashboard analytics
- [x] [Guillaume] /admin/quote-validation — Validation devis
- [ ] [ ] /admin/projets — Liste tous les projets
- [ ] [ ] /admin/factures — Liste toutes les factures
- [ ] [ ] /admin/fournisseurs — Gestion fournisseurs
- [ ] [ ] /admin/audit — Logs d'audit
- [ ] [ ] /admin/webhooks — Gestion webhooks sortants

### Fournisseur
- [ ] [ ] /supplier/register — Inscription fournisseur
- [ ] [ ] /supplier/dashboard — Dashboard fournisseur
- [ ] [ ] /supplier/consultations — Liste consultations reçues

### Marketing
- [ ] [ ] / — Landing page
- [ ] [ ] /a-propos — Page about

## Composants partagés
- [ ] [ ] Layout.tsx (navbar + sidebar + footer)
- [ ] [ ] AuthGuard.tsx (protection routes)
- [ ] [ ] InvoiceStatusBadge.tsx
- [ ] [ ] ProjectStatusBadge.tsx
- [ ] [ ] NotificationBell.tsx (WebSocket)
- [ ] [ ] PaymentButton.tsx (Stripe checkout)
- [ ] [ ] PdfDownloadButton.tsx

## Intégrations
- [ ] [ ] Setup frontend-sdk dans le projet Next.js
- [ ] [ ] Variables d'environnement (NEXT_PUBLIC_API_URL)
- [ ] [ ] Déploiement Render
