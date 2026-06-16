import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import GoongAddressPicker from '../shared/GoongAddressPicker';
import { composeGoongAddress, parseStoredGoongAddress } from '../../services/goongAddressService';

const EmployerBranches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    province: '',
    district: '',
    ward: '',
    detailAddress: '',
    phone: ''
  });
  const [saving, setSaving] = useState(false);
  const [companyAddress, setCompanyAddress] = useState(null);
  const token = localStorage.getItem('token');

  const fullAddress = composeGoongAddress({
    detailAddress: form.detailAddress,
    ward: form.ward,
    district: form.district,
    province: form.province
  });

  useEffect(() => {
    fetchBranches();
    fetchCompanyAddress();
  }, []);

  const fetchCompanyAddress = async () => {
    try {
      const res = await api.get('/employer/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const parsed = parseStoredGoongAddress(res.data?.address || '');
      if (parsed.province || parsed.city) {
        setCompanyAddress({
          province: parsed.province || parsed.city || '',
          district: parsed.district || '',
          ward: parsed.ward || '',
          detailAddress: parsed.detailAddress || parsed.address || ''
        });
      }
    } catch {
      // silently ignore
    }
  };

  const handleCopyCompanyAddress = () => {
    if (!companyAddress) return;
    setForm(prev => ({
      ...prev,
      province: companyAddress.province,
      district: companyAddress.district,
      ward: companyAddress.ward,
      detailAddress: companyAddress.detailAddress
    }));
    toast.success('Đã sao chép địa chỉ công ty.');
  };

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(response.data);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Không thể tải danh sách chi nhánh.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chi nhánh này? Thao tác này không thể hoàn tác.')) {
      return;
    }

    try {
      await api.delete(`/branches/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Đã xóa chi nhánh thành công.');
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa chi nhánh.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Tên chi nhánh là bắt buộc.');
      return;
    }

    if (!form.province.trim() || !form.district.trim() || !form.ward.trim() || !form.detailAddress.trim()) {
      toast.error('Vui lòng chọn địa chỉ từ Goong để đồng bộ tỉnh/thành, quận/huyện và phường/xã.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/branches', {
        name: form.name.trim(),
        address: fullAddress,
        phone: form.phone.trim() || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Đã tạo chi nhánh thành công.');
      setForm({
        name: '',
        province: '',
        district: '',
        ward: '',
        detailAddress: '',
        phone: ''
      });
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tạo chi nhánh.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6 min-w-0">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Chi nhánh</h2>
          <p className="text-sm text-slate-700 mt-1">Tạo cửa hàng/địa điểm trước khi gửi lời mời nhận việc.</p>
        </div>

        <input
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Tên chi nhánh"
          className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10"
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-700">Địa chỉ chi nhánh *</span>
            {companyAddress && (
              <button
                type="button"
                onClick={handleCopyCompanyAddress}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-dk bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-all"
              >
                <span className="material-symbols-outlined !text-[13px]">content_copy</span>
                Sao chép địa chỉ công ty
              </button>
            )}
          </div>
          <GoongAddressPicker
            value={{
              address: form.detailAddress,
              ward: form.ward,
              district: form.district,
              city: form.province
            }}
            onChange={(next) => setForm(prev => ({
              ...prev,
              province: next.city,
              district: next.district,
              ward: next.ward,
              detailAddress: next.address
            }))}
            placeholder="Gõ địa chỉ chi nhánh và chọn gợi ý từ Goong..."
            required
          />
        </div>

        <input
          value={form.phone}
          onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="Số điện thoại"
          className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10"
        />

        <button
          disabled={saving}
          className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Tạo chi nhánh'}
        </button>
      </form>

      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
        <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Địa điểm của bạn</h3>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-800">Đang tải chi nhánh...</div>
        ) : branches.length === 0 ? (
          <div className="p-10 text-center text-slate-800">Chưa có chi nhánh nào.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {branches.map(branch => (
              <div key={branch.branchId} className="px-5 sm:px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 group">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 truncate">{branch.name}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-700 hover:text-primary hover:underline truncate block"
                    title="Xem vị trí & Chỉ đường trên Google Maps"
                  >
                    {branch.address}
                  </a>
                  {branch.phone && <p className="text-xs text-slate-800 mt-0.5">{branch.phone}</p>}
                </div>
                <div className="flex items-center gap-3 self-start md:self-center flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    branch.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-slate-50 text-slate-700 border-slate-100'
                  }`}>
                    {branch.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  </span>
                  <button
                    onClick={() => handleDeleteBranch(branch.branchId)}
                    className="h-9 w-9 rounded-xl text-slate-800 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 active:bg-rose-100 transition-all flex items-center justify-center hover:scale-105 duration-200"
                    title="Xóa chi nhánh"
                  >
                    <span className="material-symbols-outlined !text-xl">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default EmployerBranches;
