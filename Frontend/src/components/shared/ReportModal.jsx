import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api, { getApiErrorMessage } from '../../services/api';
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
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Không thể gửi báo cáo. Vui lòng thử lại.'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-slate-900/60 px-3 py-[clamp(0.75rem,4dvh,2rem)] backdrop-blur-sm animate-fadeIn sm:px-4">
            <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl animate-scaleUp sm:max-h-[calc(100dvh-4rem)]">
                <div className="flex shrink-0 justify-between items-start border-b border-slate-100 px-5 py-5 sm:px-6">
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

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                        <div className="space-y-2">
                            <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Chọn lý do</label>
                            <div className="grid grid-cols-1 gap-2">
                                {reasons.map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setReason(r)}
                                        className={`min-h-12 rounded-2xl border px-5 py-3 text-left text-sm font-bold transition-all ${
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
                            <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Chi tiết bổ sung (Tùy chọn)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Mô tả vấn đề..."
                                className="max-h-40 min-h-28 w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 font-medium text-slate-800 focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Đang gửi...' : (
                                <>
                                    <span className="material-symbols-outlined !text-xl">flag</span>
                                    Gửi báo cáo
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ReportModal;
