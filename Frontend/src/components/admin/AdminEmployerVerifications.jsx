import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminEmployerVerifications() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      const response = await api.get('/admin/employers/verifications/pending');
      setVerifications(response.data);
    } catch (error) {
      console.error('Error fetching verifications:', error);
      toast.error('Không thể tải danh sách xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (employerId, status) => {
    const isApproved = status === 'Verified';
    if (!window.confirm(isApproved ? 'Xác nhận phê duyệt hồ sơ này?' : 'Từ chối hồ sơ này?')) {
      return;
    }

    try {
      await api.patch(`/admin/employers/verifications/${employerId}/review`, { status });
      toast.success(isApproved ? 'Đã phê duyệt hồ sơ' : 'Đã từ chối hồ sơ');
      fetchVerifications();
    } catch (error) {
      console.error('Error reviewing verification:', error);
      toast.error('Có lỗi xảy ra khi xử lý hồ sơ.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-2 border-b border-slate-100 flex items-center justify-between">
      </div>

      {verifications.length === 0 ? (
        <div className="p-12 text-center text-slate-500">
          <span className="material-symbols-outlined !text-4xl text-slate-300 mb-2">check_circle</span>
          <p>Không có hồ sơ nào đang chờ duyệt</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Công ty / Email</th>
                <th className="px-4 py-3">Mã số thuế</th>
                <th className="px-4 py-3">Giấy phép</th>
                <th className="px-4 py-3">Ngày gửi</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {verifications.map(v => (
                <tr key={v.employerId} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{v.companyName || 'Chưa cập nhật'}</div>
                    <div className="text-xs text-slate-500">{v.contactEmail}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{v.taxId}</td>
                  <td className="px-4 py-3">
                    <a 
                      href={api.defaults.baseURL.replace('/api', '') + v.businessLicenseUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                    >
                      <span className="material-symbols-outlined !text-[16px]">visibility</span>
                      Xem tài liệu
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(v.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleReview(v.employerId, 'Verified')}
                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors shadow-sm"
                      >
                        Phê duyệt
                      </button>
                      <button 
                        onClick={() => handleReview(v.employerId, 'Rejected')}
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg font-medium hover:bg-rose-100 transition-colors"
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
