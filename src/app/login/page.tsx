import LoginForm from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "radial-gradient(ellipse at top, var(--surface-2), var(--paper) 60%)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-9 text-center">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--ink)] text-white flex items-center justify-center text-sm font-semibold" style={{ boxShadow: "var(--shadow-md)" }}>PS</div>
            <h1 className="text-3xl">Payroll SG</h1>
          </div>
          <p className="hint" style={{ fontSize: 13 }}>Sign in to continue</p>
        </div>
        <div className="card" style={{ boxShadow: "var(--shadow-md)" }}>
          <div className="bd">
            <LoginForm from={from} />
          </div>
        </div>
      </div>
    </div>
  );
}
