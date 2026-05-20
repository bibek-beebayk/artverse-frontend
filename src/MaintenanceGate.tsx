import { FormEvent, PropsWithChildren, useEffect, useState } from 'react';
import { Cpu, Lock, RefreshCw, Rocket, ShieldCheck } from 'lucide-react';
import { getMaintenanceStatus, requestMaintenanceAccess } from './lib/api.ts';

const STORAGE_KEY = 'artverse_maintenance_token';

export function MaintenanceGate({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    'Artverse is currently offline for updates, polishing, and launch preparation. We will be back soon.'
  );

  useEffect(() => {
    const verifyAccess = async () => {
      const token = localStorage.getItem(STORAGE_KEY) || undefined;

      try {
        const status = await getMaintenanceStatus(token);
        setMaintenanceMessage(status.maintenance_message || maintenanceMessage);
        if (!status.maintenance_mode || status.access_granted) {
          if (!status.maintenance_mode) {
            localStorage.removeItem(STORAGE_KEY);
          }
          setAccessGranted(true);
          setError(null);
        } else {
          setAccessGranted(false);
        }
      } catch (statusError) {
        console.error('Failed to verify maintenance access:', statusError);
        localStorage.removeItem(STORAGE_KEY);
        setAccessGranted(true);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    void verifyAccess();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessKey.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await requestMaintenanceAccess(accessKey.trim());
      if (response.maintenance_message) {
        setMaintenanceMessage(response.maintenance_message);
      }
      if (response.token) {
        localStorage.setItem(STORAGE_KEY, response.token);
      }
      setAccessGranted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Access denied.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center px-6">
        <div className="glass-card border-white/10 px-8 py-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.35em] text-gray-400">
          <RefreshCw size={16} className="animate-spin text-neon-blue" />
          Checking access
        </div>
      </div>
    );
  }

  if (accessGranted) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-cyber-black text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-[10%] h-72 w-72 rounded-full bg-neon-purple/10 blur-3xl" />
        <div className="absolute top-[20%] right-[10%] h-64 w-64 rounded-full bg-neon-blue/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.92)_100%)]" />
      </div>

      <div className="relative min-h-screen px-6 py-10 flex items-center justify-center">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8">
          <section className="glass-card border-white/10 p-8 md:p-10 lg:p-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-purple/15 border border-neon-purple/20 text-neon-purple text-[10px] uppercase tracking-[0.35em] font-bold mb-6">
              <Cpu size={12} />
              <span>Maintenance Mode</span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center shadow-[0_0_20px_rgba(188,19,254,0.35)]">
                <Rocket className="text-white fill-white" size={20} />
              </div>
              <span className="font-display font-bold text-2xl tracking-wider">
                ARTVERSE <span className="text-neon-purple">AI</span>
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight leading-none mb-5">
              We Will Be <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-purple">Back Soon</span>
            </h1>

            <p className="max-w-2xl text-sm md:text-base text-gray-400 leading-relaxed mb-8">
              {maintenanceMessage}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2">Current Status</p>
                <p className="text-sm text-white font-semibold uppercase tracking-wider">Private maintenance window</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2">Availability</p>
                <p className="text-sm text-white font-semibold uppercase tracking-wider">Public access paused</p>
              </div>
            </div>
          </section>

          <aside className="glass-card border-white/10 p-8 md:p-10 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-[10px] uppercase tracking-[0.35em] font-bold mb-6">
                <ShieldCheck size={12} />
                <span>Authorized Access</span>
              </div>

              <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-white mb-4">
                Access For Approved Viewers
              </h2>

              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                If you have the maintenance access key, you can continue into the private build from here.
              </p>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.35em] mb-3">
                    Access Key
                  </span>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="password"
                      value={accessKey}
                      onChange={(event) => setAccessKey(event.target.value)}
                      placeholder="Enter maintenance key"
                      className="w-full bg-cyber-black/60 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-blue"
                    />
                  </div>
                </label>

                {error && (
                  <div className="rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-4 py-3 text-sm text-neon-pink">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !accessKey.trim()}
                  className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl bg-white text-cyber-black font-black uppercase tracking-widest transition-all hover:bg-neon-blue hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Verifying
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Enter Private Build
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="mt-8 text-[11px] text-gray-500 uppercase tracking-[0.28em] leading-relaxed">
              Unauthorized visitors will remain on the maintenance page until the public launch resumes.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
