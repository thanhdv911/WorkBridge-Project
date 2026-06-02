import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const roleLabel = (roleName) => {
    if (roleName === 'Admin') return 'Quản trị viên';
    if (roleName === 'Employer') return 'Doanh nghiệp';
    return 'Cá nhân';
};

const getRoleClass = (roleName) => {
    if (roleName === 'Admin') return 'bg-purple-50 text-purple-600';
    if (roleName === 'Employer') return 'bg-blue-50 text-blue-600';
    return 'bg-emerald-50 text-emerald-600';
};

const getReputationTone = (score = 0) => {
    if (score >= 85) return { text: 'text-emerald-600', bg: 'bg-emerald-500', soft: 'bg-emerald-50 border-emerald-100' };
    if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-500', soft: 'bg-amber-50 border-amber-100' };
    return { text: 'text-rose-600', bg: 'bg-rose-500', soft: 'bg-rose-50 border-rose-100' };
};

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [scoreDrafts, setScoreDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingScoreId, setSavingScoreId] = useState(null);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            const nextUsers = Array.isArray(res.data) ? res.data : [];
            const nextDrafts = {};

            nextUsers.forEach((user) => {
                if (user.reputationScore !== null && user.reputationScore !== undefined) {
                    nextDrafts[user.userId] = String(user.reputationScore);
                }
            });

            setUsers(nextUsers);
            setScoreDrafts(nextDrafts);
        } catch {
            toast.error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (userId, currentStatus) => {
        setUpdatingStatusId(userId);
        try {
            const newStatus = currentStatus === 'Active' ? 'Locked' : 'Active';
            await api.patch(`/admin/users/${userId}/status`, { newStatus });
            toast.success(newStatus === 'Active' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
            fetchUsers();
        } catch {
            toast.error('Không thể cập nhật trạng thái người dùng');
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleScoreChange = (userId, value) => {
        setScoreDrafts((prev) => ({ ...prev, [userId]: value }));
    };

    const handleUpdateReputation = async (userId) => {
        const rawScore = Number(scoreDrafts[userId]);
        if (!Number.isFinite(rawScore)) {
            toast.error('Điểm uy tín phải là số từ 0 đến 100');
            return;
        }

        const reputationScore = Math.max(0, Math.min(100, Math.round(rawScore)));
        setSavingScoreId(userId);
        try {
            await api.patch(`/admin/users/${userId}/reputation`, { reputationScore });
            toast.success('Đã cập nhật điểm uy tín');
            setUsers((prev) => prev.map((user) => (
                user.userId === userId ? { ...user, reputationScore } : user
            )));
            setScoreDrafts((prev) => ({ ...prev, [userId]: String(reputationScore) }));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật điểm uy tín');
        } finally {
            setSavingScoreId(null);
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-16 w-full rounded-2xl bg-slate-100" />)}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeInUp">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-800">Người dùng hệ thống</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                        Khóa tài khoản và chỉnh điểm uy tín của doanh nghiệp/cá nhân.
                    </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                    Tổng số: {users.length}
                </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-[1040px] w-full text-left">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Thông tin người dùng</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vai trò</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Điểm uy tín</th>
                                <th className="px-8 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Trạng thái</th>
                                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/70">
                            {users.map((user) => {
                                const canEditReputation = user.roleName !== 'Admin' && user.reputationScore !== null && user.reputationScore !== undefined;
                                const score = Number(user.reputationScore ?? 0);
                                const tone = getReputationTone(score);

                                return (
                                    <tr key={user.userId} className="transition-colors hover:bg-slate-50/40">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-800">{user.fullName}</div>
                                            <div className="mt-0.5 text-xs text-slate-400">{user.email}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${getRoleClass(user.roleName)}`}>
                                                {roleLabel(user.roleName)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            {canEditReputation ? (
                                                <div className={`max-w-[260px] rounded-2xl border p-3 ${tone.soft}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={scoreDrafts[user.userId] ?? ''}
                                                            onChange={(event) => handleScoreChange(user.userId, event.target.value)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === 'Enter') handleUpdateReputation(user.userId);
                                                            }}
                                                            className="h-9 w-20 rounded-xl border border-white bg-white px-3 text-sm font-black text-slate-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                                                        />
                                                        <span className={`text-sm font-black ${tone.text}`}>/100</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateReputation(user.userId)}
                                                            disabled={savingScoreId === user.userId}
                                                            className="ml-auto inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <span className="material-symbols-outlined !text-[15px]">{savingScoreId === user.userId ? 'progress_activity' : 'save'}</span>
                                                            Lưu
                                                        </button>
                                                    </div>
                                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                                                        <div className={`h-full rounded-full ${tone.bg}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                                                    </div>
                                                    <div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                        Báo cáo: {user.reportCount ?? 0}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-300">Không áp dụng</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                user.status === 'Active' ? 'border-green-100 bg-green-50 text-green-600' : 'border-rose-100 bg-rose-50 text-rose-600'
                                            }`}>
                                                {user.status === 'Active' ? 'Đang hoạt động' : 'Đã khóa'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {user.roleName !== 'Admin' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateStatus(user.userId, user.status)}
                                                    disabled={updatingStatusId === user.userId}
                                                    className={`h-10 rounded-xl px-4 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                                        user.status === 'Active'
                                                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white'
                                                            : 'bg-green-50 text-green-600 hover:bg-green-500 hover:text-white'
                                                    }`}
                                                >
                                                    {user.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
