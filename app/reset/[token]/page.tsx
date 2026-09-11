import { ResetScreen } from "@/components/AuthScreen";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetScreen token={token} />;
}
