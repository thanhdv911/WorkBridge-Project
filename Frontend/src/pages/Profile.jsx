import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ProfileCover from '../components/profile/ProfileCover';
import ProfileSidebar from '../components/profile/ProfileSidebar';
import ProfileContent from '../components/profile/ProfileContent';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login first');
        navigate('/login');
        return;
      }

      const res = await axios.get('http://localhost:5029/api/profile/applicant', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setEditForm(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile');
      if (err.response?.status === 401) {
        navigate('/login');
      }
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditForm({ ...user }); // Ensure fresh copy
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5029/api/profile/applicant', editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(editForm); // Update local state immediately
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <ProfileCover user={user} onEditClick={handleEditClick} />
      
      <main className="max-w-[1320px] mx-auto px-6 lg:px-10 py-8 grid lg:grid-cols-[320px_1fr] gap-8">
        <ProfileSidebar user={user} />
        
        <ProfileContent 
          user={user} 
          isEditing={isEditing}
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </main>
    </div>
  );
}
