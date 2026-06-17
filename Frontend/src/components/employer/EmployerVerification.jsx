import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function EmployerVerification() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [taxId, setTaxId] = useState('');
  const [licenseFile, setLicenseFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/employer/profile');
      setProfile(response.data);
      if (response.data.taxId) setTaxId(response.data.taxId);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taxId.trim()) {
      toast.error('Vui lòng nhập Mã số thuế');
      return;
    }
    if (!licenseFile && profile?.verificationStatus !== 'Pending' && profile?.verificationStatus !== 'Verified') {
      toast.error('Vui lòng đính kèm Giấy phép kinh doanh');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('TaxId', taxId);
    if (licenseFile) {
      formData.append('BusinessLicenseFile', licenseFile);
    }

    try {
      const response = await api.post('/employer/verify', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(response.data.message || 'Hồ sơ xác thực đã được gửi');
      fetchProfile();
      setLicenseFile(null);
    } catch (error) {
      console.error('Submit verification error:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi xác thực');
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = profile?.verificationStatus === 'Pending' && !profile?.businessLicenseUrl 
    ? 'Unverified' 
    : profile?.verificationStatus;

  if (loading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Xác thực Doanh nghiệp (KYB)</h2>
        <p className="text-slate-500 mt-1">Xác thực thông tin để mở khóa tính năng Đăng tin tuyển dụng công khai.</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-semibold text-slate-700">Trạng thái hiện tại:</span>
          {currentStatus === 'Verified' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
              <span className="material-symbols-outlined !text-[16px]">verified</span>
              Đã xác thực
            </span>
          )}
          {currentStatus === 'Pending' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              <span className="material-symbols-outlined !text-[16px]">pending_actions</span>
              Đang chờ duyệt
            </span>
          )}
          {currentStatus === 'Rejected' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">
              <span className="material-symbols-outlined !text-[16px]">cancel</span>
              Bị từ chối
            </span>
          )}
          {currentStatus === 'Unverified' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
              <span className="material-symbols-outlined !text-[16px]">help</span>
              Chưa xác thực
            </span>
          )}
        </div>
        {currentStatus === 'Verified' && (
          <p className="text-emerald-600 text-sm">Hồ sơ của bạn đã được xác thực thành công. Bạn có thể đăng tin bình thường.</p>
        )}
        {currentStatus === 'Pending' && (
          <p className="text-amber-600 text-sm">Hồ sơ đang trong quá trình xét duyệt. Chúng tôi sẽ phản hồi sớm nhất.</p>
        )}
        {currentStatus === 'Unverified' && (
          <p className="text-slate-600 text-sm">Bạn cần điền mã số thuế và tải lên giấy phép kinh doanh để được xác thực.</p>
        )}
        {currentStatus === 'Rejected' && (
          <p className="text-rose-600 text-sm">Hồ sơ của bạn không hợp lệ hoặc bị từ chối. Vui lòng kiểm tra và gửi lại.</p>
        )}
      </div>

      {currentStatus !== 'Verified' && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Mã số thuế doanh nghiệp *</label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              disabled={currentStatus === 'Pending'}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="VD: 0312345678"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Giấy phép ĐKKD (Ảnh/PDF) *</label>
            {profile?.businessLicenseUrl && (
              <div className="mb-3">
                <a href={api.defaults.baseURL.replace('/api', '') + profile.businessLicenseUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined !text-[16px]">description</span>
                  Xem Giấy phép đã tải lên
                </a>
              </div>
            )}
            <input
              type="file"
              onChange={handleFileChange}
              disabled={currentStatus === 'Pending'}
              accept=".png,.jpg,.jpeg,.pdf,.webp"
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-primary/10 file:text-primary
                hover:file:bg-primary/20"
            />
            <p className="mt-1 text-xs text-slate-500">Hỗ trợ định dạng: .jpg, .png, .pdf. Tối đa 5MB.</p>
          </div>

          {currentStatus !== 'Pending' && (
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:bg-slate-400"
            >
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu xác thực'}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
