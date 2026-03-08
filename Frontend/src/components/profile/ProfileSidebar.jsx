import React from 'react';
import { Link } from 'react-router-dom';

export default function ProfileSidebar({ user }) {
  // Calculate a fake profile strength based on filled fields
  let strength = 30; // base for email/name
  if (user?.phone) strength += 10;
  if (user?.address) strength += 10;
  if (user?.university) strength += 20;
  if (user?.aboutMe) strength += 30;
  
  const formattedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <aside className="space-y-5">
      {/* Profile completion */}
      <div className="anim-fadeUp bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800">Profile Strength</h3>
          <span className="text-sm font-bold text-primary">{strength}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${strength}%` }}></div>
        </div>
        {strength < 100 && (
          <p className="text-xs text-slate-400 mt-2">Add more details to reach 100%</p>
        )}
      </div>

      {/* Contact info */}
      <div className="anim-fadeUp bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary !text-lg">contact_mail</span>Contact Info
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-slate-400 !text-xl">mail</span>
            <span className="text-slate-600 truncate">{user?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-slate-400 !text-xl">phone</span>
            <span className="text-slate-600">{user?.phone || 'Not provided'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-slate-400 !text-xl">location_on</span>
            <span className="text-slate-600 line-clamp-1">{user?.address || 'Not provided'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-slate-400 !text-xl">calendar_today</span>
            <span className="text-slate-600">Joined {formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Skills mock */}
      <div className="anim-fadeUp-d1 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary !text-lg">psychology</span>Skills
        </h3>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">Customer Service</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-100">Communication</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-600 border border-green-100">Microsoft Office</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">Teamwork</span>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Links</h3>
        <div className="space-y-1">
          <Link to="/my-applications" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-primary/5 hover:text-primary transition-colors">
            <span className="material-symbols-outlined !text-xl">description</span>My Applications
            <span className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">0</span>
          </Link>
          <Link to="/jobs" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-primary/5 hover:text-primary transition-colors">
            <span className="material-symbols-outlined !text-xl">bookmark</span>Saved Jobs
            <span className="ml-auto bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">0</span>
          </Link>
          <Link to="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-primary/5 hover:text-primary transition-colors">
            <span className="material-symbols-outlined !text-xl">settings</span>Settings
          </Link>
        </div>
      </div>
    </aside>
  );
}
