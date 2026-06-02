import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import GoongAddressPicker from '../shared/GoongAddressPicker';
import { composeGoongAddress, parseStoredGoongAddress } from '../../services/goongAddressService';

export default function EmployerProfileTab() {
  const [profile, setProfile] = useState({
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    province: '',
    district: '',
    ward: '',
    detailAddress: '',
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
      const data = response.data;
      const parsedAddress = parseStoredGoongAddress(data.address || '');

      setProfile({
        companyName: data.companyName || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        province: parsedAddress.province || parsedAddress.city || '',
        district: parsedAddress.district || '',
        ward: parsedAddress.ward || '',
        detailAddress: parsedAddress.detailAddress || parsedAddress.address || '',
        description: data.description || '',
        logoUrl: data.logoUrl || ''
      });
    } catch (error) {
      toast.error('Không thể tải thông tin hồ sơ.');
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

    if (!profile.province || !profile.district || !profile.ward || !profile.detailAddress.trim()) {
      toast.error('Vui lòng chọn địa chỉ từ Goong để đồng bộ tỉnh/thành, quận/huyện và phường/xã.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        companyName: profile.companyName,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
        address: composeGoongAddress({
          detailAddress: profile.detailAddress,
          ward: profile.ward,
          district: profile.district,
          province: profile.province
        }),
        description: profile.description,
        logoUrl: profile.logoUrl
      };

      await api.put('/employer/profile', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Hồ sơ công ty đã được cập nhật thành công!');
    } catch (error) {
      toast.error('Không thể cập nhật hồ sơ.');
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
          Hồ sơ công ty
        </h2>
        <p className="text-sm text-slate-500 mt-1">Cập nhật thông tin công ty để thu hút các ứng viên tốt hơn.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Tên công ty *</label>
            <input
              type="text"
              name="companyName"
              value={profile.companyName}
              onChange={handleChange}
              required
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Ví dụ: Acme Corp"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Email liên hệ *</label>
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
            <label className="text-sm font-semibold text-slate-700">Số điện thoại liên hệ</label>
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
            <label className="text-sm font-semibold text-slate-700">Đường dẫn ảnh Logo (URL)</label>
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

        <div className="space-y-3">
          <GoongAddressPicker
            value={{
              address: profile.detailAddress,
              ward: profile.ward,
              district: profile.district,
              city: profile.province
            }}
            onChange={(next) => setProfile(prev => ({
              ...prev,
              province: next.city,
              district: next.district,
              ward: next.ward,
              detailAddress: next.address
            }))}
            label="Địa chỉ công ty"
            placeholder="Gõ địa chỉ công ty và chọn gợi ý từ Goong..."
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Mô tả công ty</label>
          <textarea
            name="description"
            value={profile.description}
            onChange={handleChange}
            rows={5}
            className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y"
            placeholder="Giới thiệu với ứng viên về văn hóa công ty, sứ mệnh, và lý do họ nên làm việc cho bạn..."
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
            {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </div>
      </form>
    </div>
  );
}
