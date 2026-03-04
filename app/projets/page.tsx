"use client"
import ProjectsList from "@/components/ProjectsList"
import AuthGuard from "@/components/AuthGuard"

export default function Page() {
    return (
        <AuthGuard>
            <ProjectsList />
        </AuthGuard>
    )
}
