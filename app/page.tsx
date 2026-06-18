import { hasCloudChat, isVercelDeploy } from "@/lib/env";
import { getAppDownloadMeta } from "@/lib/app-download";
import { HomePage } from "@/components/marketing/home-page";

export const dynamic = "force-dynamic";

export default function RootPage() {
  return (
    <HomePage
      isCloudHost={isVercelDeploy()}
      cloudChat={hasCloudChat()}
      download={getAppDownloadMeta()}
    />
  );
}
