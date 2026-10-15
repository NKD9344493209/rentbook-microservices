import { Link } from 'react-router-dom';
import { Building, Receipt, Wrench } from '../components/Icons.jsx';

/* Shared two-panel frame for Login and Register. */
export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-navy text-white p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-coral/25 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-coral flex items-center justify-center font-extrabold text-lg">R</span>
          <span className="font-extrabold text-xl">RentBook</span>
        </div>

        <div className="relative">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] max-w-md">
            Every room, every rupee, every repair. One place.
          </h1>
          <p className="text-white/60 mt-5 max-w-sm">
            Owners run their buildings from a single dashboard. Tenants always know what they owe and when.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
            {[
              [Building, 'Properties', 'Rooms & occupancy'],
              [Receipt, 'Bills', 'Rent + utilities'],
              [Wrench, 'Repairs', 'Track every fix'],
            ].map(([Icon, t, s]) => (
              <div key={t} className="rounded-2xl bg-white/8 border border-white/10 p-4">
                <Icon width={20} height={20} className="text-coral" />
                <p className="font-bold text-sm mt-3">{t}</p>
                <p className="text-[11px] text-white/50">{s}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">Built as two microservices · user-service and billing-service</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <span className="w-8 h-8 rounded-lg bg-coral text-white flex items-center justify-center font-extrabold">R</span>
            <span className="font-extrabold text-lg">RentBook</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
