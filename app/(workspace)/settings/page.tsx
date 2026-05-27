import { TopBar } from "@/components/workspace/layout";
import { SettingsPage } from "@/components/workspace/settings-page";

export default function SettingsRoute() {
  return (
    <>
      <TopBar title="Settings" />
      <SettingsPage />
    </>
  );
}
