/**
 * AfterBI staff home: the three things a staff member does, one tap each.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Contact, FileText, IdCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { staffNumber } from '@/lib/staff';

const TILES = [
  { to: 'proposals', label: 'Proposals', icon: FileText, text: 'Make a prospect their own proposal on the spot, signed and ready to send.' },
  { to: 'id-card', label: 'My ID card', icon: IdCard, text: 'Your AfterBI staff ID card, signed by the CEO, ready to print.' },
  { to: 'card', label: 'My business card', icon: Contact, text: 'Send your contact card to anyone you meet.' },
];

export default function StaffHome() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[24px] bg-[#0f1f36] p-6 text-white sm:p-8">
        <div aria-hidden className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#ee6a00]/30 blur-3xl" />
        <p className="text-[13px] font-semibold text-white/60">{greet},</p>
        <h1 className="mt-1 font-display text-[2rem] font-extrabold leading-tight tracking-[-0.04em] sm:text-[2.4rem]">
          {user?.firstName ?? 'Welcome'}
        </h1>
        <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-white/70">
          AfterBI staff{user ? ` · ${staffNumber(user.id)}` : ''}. Everything you need to present AfterBI to a prospect is
          here. You cannot see any customer&rsquo;s records.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map(({ to, label, icon: Icon, text }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col rounded-2xl border border-hairline surface-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff6ed] text-[#c95600]">
              <Icon size={20} aria-hidden />
            </span>
            <span className="mt-3 text-[16px] font-bold text-primary">{label}</span>
            <span className="mt-1 flex-1 text-[13.5px] leading-relaxed text-secondary">{text}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-[#c95600]">
              Open <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
