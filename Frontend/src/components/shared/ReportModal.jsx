import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ReportModal = ({ isOpen, onClose, entityId, entityType, entityTitle }) => {
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem('token');

    const reasons = [
        'Nội dung không phù hợp',
        'Thông tin sai lệch',
        'Lừa đảo',
        'Quấy rối',
        'Spam',
        'Khác'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason) {
            toast.error('Vui lòng chọn lý do');
            return;
        }

        setLoading(true);
        try {
            await api.post('/report', {
                reportedEntityId: entityId,
                entityType: entityType,
                reason: reason,
                description: description
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Đã gửi báo cáo thành công');
            onClose();
        } catch {
            toast.error('Gửi báo cáo thất bại');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-scaleUp border border-white/20">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Báo cáo nội dung</h2>
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mt-1">
                            Báo cáo: <span className="text-primary">{entityTitle}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all group">
                        <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Chọn lý do</label>
                        <div className="grid grid-cols-1 gap-2">
                            {reasons.map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setReason(r)}
                                    className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all text-left border ${
                                        reason === r
                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-primary/30'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Chi tiết bổ sung (Tùy chọn)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả vấn đề..."
                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-medium min-h-[120px] resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Đang gửi...' : (
                            <>
                                <span className="material-symbols-outlined !text-xl">flag</span>
                                Gửi báo cáo
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReportModal;
