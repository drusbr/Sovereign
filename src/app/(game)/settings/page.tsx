import { Settings } from "lucide-react";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function SettingsPage() {
  return (
    <PagePlaceholder
      icon={Settings}
      title="Settings"
      description="Configure game difficulty, narration style, notification preferences, and save data for your presidency."
    />
  );
}
