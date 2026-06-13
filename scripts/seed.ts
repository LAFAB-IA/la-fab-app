/**
 * Development seed script — never run against production.
 * Usage:  npm run seed
 *         npm run seed -- --reset   (prints warning, no-op)
 */

import { faker } from "@faker-js/faker/locale/fr"

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = "https://la-fabriq-ia-gateway.onrender.com"
const SEED_PASSWORD = "SeedPassword123!"

const MÉTIERS = ["impression", "menuiserie", "métallurgie", "packaging"] as const
const PRODUCT_TYPES = ["boîte", "pochette", "étiquette", "sachet", "présentoir", "carton"] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function post<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`POST ${path} → ${res.status}: ${text}`)
    }
    return res.json() as Promise<T>
}

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: readonly T[], n: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, n)
}

// ─── Seeding functions ────────────────────────────────────────────────────────

interface RegisteredClient {
    account_id: string
    email: string
}

async function seedClients(count: number): Promise<RegisteredClient[]> {
    console.log(`\nCreating clients...`)
    const clients: RegisteredClient[] = []
    const errors: string[] = []

    for (let i = 0; i < count; i++) {
        const firstName = faker.person.firstName()
        const lastName = faker.person.lastName()
        const email = faker.internet.email({ firstName, lastName, provider: "lafab-seed.dev" })

        try {
            const data = await post<{ account_id?: string; user?: { id: string } }>("/api/auth/signup", {
                email,
                password: SEED_PASSWORD,
                firstName,
                lastName,
            })
            const account_id = data.account_id ?? data.user?.id ?? ""
            clients.push({ account_id, email })
        } catch (err) {
            errors.push(`  ✗ ${email}: ${(err as Error).message}`)
        }
    }

    if (errors.length) errors.forEach(e => console.error(e))
    console.log(`✓ ${clients.length}/${count} clients created`)
    return clients
}

interface RegisteredSupplier {
    supplier_id: string
    email: string
}

async function seedSuppliers(count: number): Promise<RegisteredSupplier[]> {
    console.log(`\nCreating suppliers...`)
    const suppliers: RegisteredSupplier[] = []
    const errors: string[] = []

    for (let i = 0; i < count; i++) {
        const companyName = faker.company.name()
        const métier = pick(MÉTIERS)
        const email = faker.internet.email({ provider: "fournisseur-seed.dev" })

        try {
            const data = await post<{ supplier_id?: string; id?: string }>("/api/supplier-portal/register", {
                email,
                password: SEED_PASSWORD,
                company_name: companyName,
                trades: [métier],
            })
            const supplier_id = data.supplier_id ?? data.id ?? ""
            suppliers.push({ supplier_id, email })
        } catch (err) {
            errors.push(`  ✗ ${email}: ${(err as Error).message}`)
        }
    }

    if (errors.length) errors.forEach(e => console.error(e))
    console.log(`✓ ${suppliers.length}/${count} suppliers created`)
    return suppliers
}

interface CreatedProject {
    project_id: string
    account_id: string
}

async function seedProjects(count: number, clients: RegisteredClient[]): Promise<CreatedProject[]> {
    console.log(`\nCreating projects...`)
    const projects: CreatedProject[] = []
    const errors: string[] = []

    if (clients.length === 0) {
        console.error("  ✗ No clients available — skipping projects")
        return projects
    }

    for (let i = 0; i < count; i++) {
        const client = pick(clients)
        const productType = pick(PRODUCT_TYPES)
        const quantity = faker.number.int({ min: 500, max: 50000 })
        const w = faker.number.int({ min: 50, max: 400 })
        const h = faker.number.int({ min: 50, max: 600 })
        const d = faker.number.int({ min: 10, max: 200 })

        try {
            const data = await post<{ project_id?: string; id?: string }>("/api/project/create", {
                account_id: client.account_id,
                brief: faker.lorem.sentences({ min: 2, max: 4 }),
                productType,
                quantity,
                dimensions: { width: w, height: h, depth: d },
            })
            const project_id = data.project_id ?? data.id ?? ""
            projects.push({ project_id, account_id: client.account_id })
        } catch (err) {
            errors.push(`  ✗ project ${i + 1}: ${(err as Error).message}`)
        }
    }

    if (errors.length) errors.forEach(e => console.error(e))
    console.log(`✓ ${projects.length}/${count} projects created`)
    return projects
}

async function seedConsultations(projects: CreatedProject[], suppliers: RegisteredSupplier[]): Promise<void> {
    console.log(`\nCreating consultations...`)
    let total = 0
    let failed = 0

    if (suppliers.length === 0) {
        console.error("  ✗ No suppliers available — skipping consultations")
        return
    }

    for (const project of projects) {
        const count = faker.number.int({ min: 2, max: 3 })
        const selected = pickN(suppliers, Math.min(count, suppliers.length))

        for (const supplier of selected) {
            try {
                await post("/api/consultation/create", {
                    project_id: project.project_id,
                    supplier_id: supplier.supplier_id,
                })
                total++
            } catch {
                failed++
            }
        }
    }

    if (failed) console.error(`  ✗ ${failed} consultations failed`)
    console.log(`✓ ${total} consultations created across ${projects.length} projects`)
}

async function seedInvoices(projects: CreatedProject[], count: number): Promise<void> {
    console.log(`\nCreating invoices...`)
    let created = 0
    let failed = 0

    const targets = pickN(projects, Math.min(count, projects.length))

    for (const project of targets) {
        const amount = faker.number.float({ min: 500, max: 25000, fractionDigits: 2 })

        try {
            await post("/api/invoice/create", {
                project_id: project.project_id,
                account_id: project.account_id,
                amount,
                currency: "EUR",
                status: pick(["pending", "paid"]),
            })
            created++
        } catch {
            failed++
        }
    }

    if (failed) console.error(`  ✗ ${failed} invoices failed`)
    console.log(`✓ ${created}/${targets.length} invoices created`)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2)

    if (args.includes("--reset")) {
        console.warn("\n⚠  Reset not implemented — delete data manually in Supabase dashboard")
        return
    }

    console.log(`\n=== LA FAB — Dev Seed ===`)
    console.log(`Target: ${BASE_URL}`)
    console.log(`========================`)

    const clients = await seedClients(10)
    const suppliers = await seedSuppliers(8)
    const projects = await seedProjects(20, clients)
    await seedConsultations(projects, suppliers)
    await seedInvoices(projects, 10)

    console.log(`\n=== Seed complete ===\n`)
}

main().catch(err => {
    console.error("\n✗ Seed failed:", err.message)
    process.exit(1)
})
