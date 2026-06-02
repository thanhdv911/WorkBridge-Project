import React from 'react';
import { Link } from 'react-router-dom';

export default function ProfileSidebar({ user, isOwnProfile = true }) {
  // Calculate a fake profile strength based on filled fields
  let strength = 30; // base for email/name
  if (user?.phone) strength += 10;
  if (user?.address) strength += 10;
  if (user?.university) strength += 20;
  if (user?.aboutMe) strength += 30;

  const getFormattedJoinedDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formattedDate = getFormattedJoinedDate(user?.createdAt);

  return (
    <aside className="anim-fadeUp bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 space-y-5 h-fit">
      {/* Profile completion strength */}
      {isOwnProfile && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Profile Strength</h3>
            <span className="text-sm font-black text-primary">{strength}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${strength}%` }}></div>
          </div>
          {strength < 100 ? (
            <p className="text-[11px] font-bold text-slate-400">Add more details to reach 100%</p>
          ) : (
            <p className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
              <span className="material-symbols-outlined !text-sm">check_circle</span>All star profile!
            </p>
          )}
          <div className="border-b border-slate-100/70 pt-3"></div>
        </div>
      )}

      {/* Contact info */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary !text-lg">contact_mail</span>Contact Details
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-slate-400 !text-lg">mail</span>
            <span className="text-slate-600 truncate font-semibold select-all" title={user?.email}>{user?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-slate-400 !text-lg">phone</span>
            <span className="text-slate-600 font-semibold">{user?.phone || 'Not provided'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-slate-400 !text-lg">location_on</span>
            <span className="text-slate-600 line-clamp-1 font-semibold" title={user?.address}>{user?.address || 'Not provided'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-slate-400 !text-lg">calendar_today</span>
            <span className="text-slate-500 font-medium">Joined {formattedDate}</span>
          </div>
        </div>
        <div className="border-b border-slate-100/70 pt-2"></div>
      </div>

      {/* Skills mock */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary !text-lg">psychology</span>Key Skills
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">Customer Service</span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-100">Communication</span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-600 border border-green-100">Microsoft Office</span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">Teamwork</span>
        </div>
        {isOwnProfile && <div className="border-b border-slate-100/70 pt-2"></div>}
      </div>

      {/* Quick links */}
      {isOwnProfile && (
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Quick Links</h3>
          <div className="space-y-0.5">
            <Link to="/my-applications" className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-primary/5 hover:text-primary transition-colors">
              <span className="material-symbols-outlined !text-lg text-slate-400 group-hover:text-primary">description</span>
              My Applications
            </Link>
            <Link to="/jobs" className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-primary/5 hover:text-primary transition-colors">
              <span className="material-symbols-outlined !text-lg text-slate-400 group-hover:text-primary">bookmark</span>
              Saved Jobs
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
