import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ProfileContent({ user, setUser, isEditing, editForm, setEditForm, onSave, onCancel }) {
  const [cvLoading, setCvLoading] = useState(false);

  const handleCvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
       toast.error('Please upload a PDF file.');
       return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setCvLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/profile/applicant/upload-cv', formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setUser({ ...user, cvUrl: res.data.cvUrl });
      toast.success('CV uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload CV.');
    } finally {
      setCvLoading(false);
    }
  };
  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="anim-fadeUp bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-primary">
            <span className="material-symbols-outlined !text-xl">edit_document</span>Edit Profile
          </h2>
          
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={editForm.fullName} 
                  onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={editForm.phone || ''} 
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">University</label>
                <input 
                  type="text" 
                  value={editForm.university || ''} 
                  onChange={(e) => setEditForm({...editForm, university: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Major</label>
                <input 
                  type="text" 
                  value={editForm.major || ''} 
                  onChange={(e) => setEditForm({...editForm, major: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Study Year</label>
                <select 
                  value={editForm.studyYear || ''} 
                  onChange={(e) => setEditForm({...editForm, studyYear: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm bg-white"
                >
                  <option value="">Select Year</option>
                  <option value="1st Year Student">1st Year Student</option>
                  <option value="2nd Year Student">2nd Year Student</option>
                  <option value="3rd Year Student">3rd Year Student</option>
                  <option value="4th Year Student">4th Year Student</option>
                  <option value="Graduated">Graduated</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
              <input 
                type="text" 
                value={editForm.address || ''} 
                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">About Me</label>
              <textarea 
                rows="4"
                value={editForm.aboutMe || ''} 
                onChange={(e) => setEditForm({...editForm, aboutMe: e.target.value})}
                className="w-full p-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm resize-none"
                placeholder="Write a short introduction about yourself..."
              ></textarea>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={onSave}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-primary-dk text-white font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              >
                Save Changes
              </button>
              <button 
                onClick={onCancel}
                className="h-11 px-6 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* About */}
      <div className="anim-fadeUp bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary !text-xl">person</span>About Me
        </h2>
        {user?.aboutMe ? (
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{user.aboutMe}</p>
        ) : (
          <p className="text-sm text-slate-400 italic">No description provided yet.</p>
        )}
      </div>

      {/* Mock Work Experience */}
      <div className="anim-fadeUp-d1 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary !text-xl">work_history</span>Work Experience
          </h2>
        </div>
        <div className="space-y-5 text-center py-6 text-slate-400">
          <span className="material-symbols-outlined !text-4xl mb-2 opacity-50">work_off</span>
          <p className="text-sm">Experience data loading...</p>
        </div>
      </div>

      {/* CV / Resume Section */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8 anim-fadeUp-d2">
        <h2 className="text-lg font-bold flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary !text-xl">description</span>
            Curriculum Vitae (CV)
          </div>
          {user?.cvUrl && (
            <a 
              href={`http://localhost:5029${user.cvUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined !text-sm">open_in_new</span>
              View Current CV
            </a>
          )}
        </h2>

        <div className={`relative border-2 border-dashed rounded-2xl p-8 transition-all text-center ${user?.cvUrl ? 'border-green-100 bg-green-50/30' : 'border-slate-200 hover:border-primary/50 bg-slate-50/50'}`}>
          <input 
            type="file" 
            accept=".pdf"
            onChange={handleCvUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={cvLoading}
          />
          
          {cvLoading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-bold text-slate-500">Uploading your CV...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className={`material-symbols-outlined !text-4xl mb-3 ${user?.cvUrl ? 'text-green-500' : 'text-slate-300'}`}>
                {user?.cvUrl ? 'check_circle' : 'cloud_upload'}
              </span>
              <p className="text-sm font-bold text-slate-700">
                {user?.cvUrl ? 'Replace your CV' : 'Upload your CV (PDF)'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Recommended size: Under 5MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Availability Mock */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary !text-xl">event_available</span>Availability
        </h2>
        <div className="grid grid-cols-7 gap-2 text-center">
          <div className="text-xs font-semibold text-slate-400 pb-2">Mon</div>
          <div className="text-xs font-semibold text-slate-400 pb-2">Tue</div>
          <div className="text-xs font-semibold text-slate-400 pb-2">Wed</div>
          <div className="text-xs font-semibold text-slate-400 pb-2">Thu</div>
          <div className="text-xs font-semibold text-slate-400 pb-2">Fri</div>
          <div className="text-xs font-semibold text-slate-400 pb-2">Sat</div>
          <div className="text-xs font-semibold text-slate-400 pb-2">Sun</div>
          {/* Mock row */}
          <div className="py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold">AM</div>
          <div className="py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold">AM</div>
          <div className="py-2 rounded-lg bg-slate-50 text-slate-300 text-xs">—</div>
          <div className="py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold">AM</div>
          <div className="py-2 rounded-lg bg-slate-50 text-slate-300 text-xs">—</div>
          <div className="py-2 rounded-lg bg-green-50 text-green-600 text-xs font-semibold">All</div>
          <div className="py-2 rounded-lg bg-green-50 text-green-600 text-xs font-semibold">All</div>
        </div>
      </div>
    </div>
  );
}
