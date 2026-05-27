import { WorkspaceLayout, TopBar } from "@/components/workspace/layout";

export default function WorkspaceRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceLayout>
      {children}
    </WorkspaceLayout>
  );
}
