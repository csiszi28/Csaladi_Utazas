import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { forgotPasswordAction } from "@/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Elfelejtett jelszó</CardTitle>
          <CardDescription>Írd be az e-mail címedet a visszaállításhoz</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={forgotPasswordAction}
            fields={[
              { name: "email", label: "E-mail", type: "email", placeholder: "email@pelda.hu" },
            ]}
            submitLabel="Link küldése"
            successMessage="Ha létezik ilyen fiók, elküldtük a visszaállító linket."
          />
          <p className="mt-4 text-center text-sm">
            <Link href="/auth/login" className="text-primary hover:underline">
              Vissza a bejelentkezéshez
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
