import { BRAND } from "@/lib/brand";
import { AuthAtmosphere, AuthGlobe } from "@/components/auth/auth-background";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <AuthAtmosphere />
      <AuthGlobe />

      <div className="auth-stage">
        <div className="auth-brand text-center text-white">
          <p className="font-display text-3xl font-bold tracking-[0.28em] drop-shadow-[0_2px_18px_rgba(0,20,50,0.45)] sm:text-4xl">
            {BRAND.shortName}
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-white/75 sm:text-sm">
            {BRAND.taglineHu}
          </p>
        </div>

        <div className="auth-form-panel">{children}</div>
      </div>
    </div>
  );
}
