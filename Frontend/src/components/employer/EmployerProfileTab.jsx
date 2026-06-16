import React, { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../../services/api';
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
    logoUrl: '',
    reputationScore: 80
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
        logoUrl: data.logoUrl || '',
        reputationScore: data.reputationScore ?? 80
      });
    } catch (error) {
      toast.error('Không thể tải thông tin hồ sơ.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFullLogoUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa là 2MB.');
      return;
    }

    const allowedExtensions = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedExtensions.includes(file.type)) {
      toast.error('Chỉ hỗ trợ định dạng ảnh PNG, JPG, JPEG, WEBP.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const response = await api.post('/employer/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const newLogoUrl = response.data?.logoUrl || response.data?.LogoUrl;
      if (newLogoUrl) {
        setProfile(prev => ({ ...prev, logoUrl: newLogoUrl }));
        toast.success('Tải lên ảnh logo thành công.');
      } else {
        toast.error('Không nhận được đường dẫn logo mới.');
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || error.response?.data?.Message || 'Không thể tải lên logo.';
      toast.error(errMsg);
      console.error('Logo upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setProfile(prev => ({ ...prev, logoUrl: '' }));
    toast.success('Đã gỡ logo. Vui lòng nhấn Lưu hồ sơ để cập nhật.');
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

      const response = await api.put('/employer/profile', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProfile((prev) => ({ ...prev, reputationScore: response.data?.reputationScore ?? prev.reputationScore }));
      toast.success('Hồ sơ công ty đã được cập nhật thành công.');
    } catch (error) {
      toast.error('Không thể cập nhật hồ sơ doanh nghiệp. Vui lòng kiểm tra các trường bắt buộc.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-panel rounded-2xl p-8 flex justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="profile-panel overflow-hidden rounded-2xl anim-fadeUp">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">domain</span>
              Hồ sơ công ty
            </h2>
            <p className="text-sm text-slate-700 mt-1">Cập nhật đầy đủ thông tin để điểm uy tín đạt 100 và thu hút ứng viên tốt hơn.</p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase text-slate-800">Điểm uy tín</p>
            <p className="text-2xl font-black text-primary">{profile.reputationScore}/100</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Logo Upload Widget */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
          <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            {profile.logoUrl ? (
              <img 
                src={getFullLogoUrl(profile.logoUrl)} 
                alt="Logo công ty" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-slate-300 !text-4xl">domain</span>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Ảnh đại diện / Logo công ty</h3>
            <p className="text-xs text-slate-700">Chấp nhận định dạng PNG, JPG, JPEG, WEBP. Dung lượng tối đa 2MB.</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                <span className="material-symbols-outlined !text-base">cloud_upload</span>
                Chọn ảnh
                <input 
                  type="file" 
                  accept=".png,.jpg,.jpeg,.webp" 
                  className="hidden" 
                  onChange={handleLogoUpload}
                  disabled={isUploading}
                />
              </label>
              {profile.logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all"
                >
                  <span className="material-symbols-outlined !text-base">delete</span>
                  Gỡ bỏ
                </button>
              )}
            </div>
          </div>
        </div>

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
              placeholder="Ví dụ: WorkBridge Cafe"
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
              placeholder="hr@congty.vn"
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
