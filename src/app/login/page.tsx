import LoginForm from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-md bg-[var(--ink)] text-white flex items-center justify-center text-xs font-semibold">PS</div>
            <h1 className="text-2xl">Payroll SG</h1>
          </div>
          <p className="hint">Sign in to continue</p>
        </div>
        <div className="card">
          <div className="bd">
            <LoginForm from={from} />
          </div>
        </div>
      </div>
    </div>
  );
}
