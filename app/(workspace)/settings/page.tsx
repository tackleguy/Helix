import { TopBar } from "@/components/workspace/topbar";
import { SettingsPage } from "@/components/workspace/settings-page";

export default function SettingsRoute() {
  return (
    <>
      <TopBar title="Settings" />
      <SettingsPage />
    </>
  );
}
