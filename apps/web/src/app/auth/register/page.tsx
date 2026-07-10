import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Regisztráció</CardTitle>
          <CardDescription>Hozd létre a családi fiókodat</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Van már fiókod?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Bejelentkezés
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
