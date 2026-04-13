import ResetPasswordClient from "./reset-password-client";

interface ResetPasswordPageProps {
  searchParams?: {
    email?: string | string[];
  };
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const emailParam = searchParams?.email;
  const directEmail = Array.isArray(emailParam)
    ? emailParam[0] || ""
    : emailParam || "";

  return <ResetPasswordClient directEmail={directEmail} />;
}
