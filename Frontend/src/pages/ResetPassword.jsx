import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import WorkBridgeLogo from '../components/shared/WorkBridgeLogo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !token) {
      toast.error('Liên kết đặt lại mật khẩu không hợp lệ.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        token,
        newPassword
      });
      toast.success(response.data?.message || 'Đã đặt lại mật khẩu.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn.');
    } finally {
      setSubmitting(false);
    }
  };

  const invalidLink = !email || !token;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50 flex items-center justify-center px-4 py-10 font-display">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-300/30 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <Link to="/" className="inline-flex items-center" aria-label="WorkBridge">
            <WorkBridgeLogo imageClassName="h-[52px] w-auto max-w-[210px] drop-shadow-[0_6px_14px_rgba(37,99,235,0.14)]" />
          </Link>
          <h1 className="mt-6 text-2xl font-black text-slate-900">Tạo mật khẩu mới</h1>
          <p className="mt-2 text-sm text-slate-700">Liên kết đặt lại mật khẩu chỉ dùng được một lần và sẽ hết hạn sau 30 phút.</p>
        </div>

        {invalidLink ? (
          <div className="p-6">
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
              Liên kết đặt lại mật khẩu không hợp lệ hoặc thiếu thông tin.
            </div>
            <Link to="/login" className="mt-5 flex h-11 items-center justify-center rounded-xl bg-primary text-white font-bold text-sm">
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
              <input
                value={email}
                readOnly
                className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mật khẩu mới</label>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                minLength={8}
                required
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Tối thiểu 8 ký tự"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nhập lại mật khẩu</label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                minLength={8}
                required
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <button
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dk text-white font-bold text-sm disabled:opacity-60"
            >
              {submitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
