"use client";
import SettingsPage from "@/components/dashboard/pages/SettingsPage";
import { useParams } from "next/navigation";

export default function Page() {
    const params = useParams();
    return <SettingsPage tabParam={params?.tab} />;
}
