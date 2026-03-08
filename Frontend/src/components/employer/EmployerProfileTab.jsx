import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function EmployerProfileTab() {
  const [profile, setProfile] = useState({
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    description: '',
    logoUrl: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/employer/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Filter out nulls to prevent React controlled input warnings
      const data = response.data;
      setProfile({
        companyName: data.companyName || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        address: data.address || '',
        description: data.description || '',
        logoUrl: data.logoUrl || ''
      });
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/employer/profile', profile, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Company profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/70 p-8 flex justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden anim-fadeUp">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">domain</span>
          Company Profile
        </h2>
        <p className="text-sm text-slate-500 mt-1">Update your company details to attract better candidates.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Company Name *</label>
            <input 
              type="text" 
              name="companyName"
              value={profile.companyName}
              onChange={handleChange}
              required
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Contact Email *</label>
            <input 
              type="email" 
              name="contactEmail"
              value={profile.contactEmail}
              onChange={handleChange}
              required
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="hr@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Contact Phone</label>
            <input 
              type="tel" 
              name="contactPhone"
              value={profile.contactPhone}
              onChange={handleChange}
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="+84 123 456 789"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Logo Image URL</label>
            <input 
              type="url" 
              name="logoUrl"
              value={profile.logoUrl}
              onChange={handleChange}
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Company Address</label>
          <input 
            type="text" 
            name="address"
            value={profile.address}
            onChange={handleChange}
            className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder="Main headquarters address"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Company Description</label>
          <textarea 
            name="description"
            value={profile.description}
            onChange={handleChange}
            rows={5}
            className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y"
            placeholder="Tell candidates about your company culture, mission, and why they should work for you..."
          ></textarea>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving}
            className="h-11 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined !text-lg">save</span>
            )}
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
