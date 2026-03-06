# LA FAB — Frontend SDK

Client TypeScript + React hooks pour l'API LA FAB.

## Installation

Copier le dossier `frontend-sdk/` dans votre projet Next.js, puis importer :

```ts
import { initApi } from "@/frontend-sdk/hooks";
import { LaFabApi } from "@/frontend-sdk/api";
```

## Setup

Initialiser l'API une seule fois (dans `_app.tsx` ou un layout) :

```tsx
// app/providers.tsx
"use client";
import { initApi } from "@/frontend-sdk/hooks";

initApi(process.env.NEXT_PUBLIC_API_URL || "https://la-fabriq-ia-gateway.onrender.com");

export default function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

## Hooks

### useAuth

```tsx
import { useAuth } from "@/frontend-sdk/hooks";

function LoginPage() {
  const { user, login, logout, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <p>Chargement...</p>;

  if (isAuthenticated) {
    return (
      <div>
        <p>Bonjour {user!.first_name}</p>
        <button onClick={logout}>Déconnexion</button>
      </div>
    );
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      await login(form.get("email") as string, form.get("password") as string);
    }}>
      <input name="email" type="email" placeholder="Email" />
      <input name="password" type="password" placeholder="Mot de passe" />
      <button type="submit">Se connecter</button>
    </form>
  );
}
```

### useProjects

```tsx
import { useProjects } from "@/frontend-sdk/hooks";

function ProjectList() {
  const { projects, isLoading, refresh } = useProjects();

  if (isLoading) return <p>Chargement...</p>;

  return (
    <ul>
      {projects.map((p) => (
        <li key={p.project_id}>
          {p.product_id} — qty: {p.qty} — {p.status}
        </li>
      ))}
    </ul>
  );
}
```

### useProject

```tsx
import { useProject } from "@/frontend-sdk/hooks";

function ProjectDetail({ id }: { id: string }) {
  const { project, isLoading } = useProject(id);

  if (isLoading || !project) return <p>Chargement...</p>;

  return (
    <div>
      <h2>Projet {project.project_id}</h2>
      <p>Statut : {project.status}</p>
      <p>Produit : {project.product_id}</p>
      {project.brief_analysis && (
        <pre>{JSON.stringify(project.brief_analysis, null, 2)}</pre>
      )}
    </div>
  );
}
```

### useInvoices

```tsx
import { useInvoices } from "@/frontend-sdk/hooks";
import { getApi } from "@/frontend-sdk/hooks";

function InvoiceList() {
  const { invoices, isLoading } = useInvoices();

  const handlePay = async (invoiceId: string) => {
    const { checkout_url } = await getApi().createCheckout(invoiceId);
    window.location.href = checkout_url;
  };

  if (isLoading) return <p>Chargement...</p>;

  return (
    <ul>
      {invoices.map((inv) => (
        <li key={inv.id}>
          {inv.invoice_number} — {inv.total.toFixed(2)} € — {inv.status}
          {inv.status !== "paid" && (
            <button onClick={() => handlePay(inv.id)}>Payer</button>
          )}
          {inv.payment_type === "split" && inv.payment_step === "deposit_paid" && (
            <button onClick={() => getApi().createCheckout(inv.id, "balance")}>
              Payer le solde ({inv.balance_amount?.toFixed(2)} €)
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

### useNotifications

```tsx
import { useNotifications } from "@/frontend-sdk/hooks";

function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();

  return (
    <div>
      <span>Notifications ({unreadCount})</span>
      <button onClick={markAllAsRead}>Tout marquer comme lu</button>

      <ul>
        {notifications.map((n) => (
          <li
            key={n.id}
            style={{ fontWeight: n.read ? "normal" : "bold" }}
            onClick={() => !n.read && markAsRead(n.id)}
          >
            {n.title} — {n.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## API Client direct (sans hooks)

```ts
import { LaFabApi } from "@/frontend-sdk/api";

const api = new LaFabApi("https://la-fabriq-ia-gateway.onrender.com");

// Login
const { session, user } = await api.login("test@example.com", "password");
// Token is stored automatically

// Fetch projects
const projects = await api.getProjects();

// Create checkout
const { checkout_url } = await api.createCheckout(invoiceId, "deposit");

// AI search
const results = await api.searchProducts("kakemono 200x80");
```

## Types exportés

Tous les types sont dans `types.ts` :

```ts
import type { User, Project, Invoice, Notification, Consultation } from "@/frontend-sdk/types";
```
