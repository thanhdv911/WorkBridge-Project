import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../../services/api';

const audienceOptions = [
    { value: 'All', label: 'Tất cả người dùng' },
    { value: 'Applicant', label: 'Cá nhân' },
    { value: 'Employer', label: 'Doanh nghiệp' }
];

const emailTypes = [
    { value: 'Upgrade', label: 'Nâng cấp web' },
    { value: 'Maintenance', label: 'Bảo trì' },
    { value: 'General', label: 'Thông báo chung' }
];

const formatDateTime = (value) => {
    if (!value) return 'Chưa đặt';
    return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return 'Sắp hoàn tất';
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
};

const AdminOperations = () => {
    const [maintenance, setMaintenance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingMaintenance, setSavingMaintenance] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [maintenanceForm, setMaintenanceForm] = useState({
        durationMinutes: 30,
        title: 'WorkBridge đang bảo trì',
        message: 'Hệ thống đang được bảo trì để nâng cấp trải nghiệm. Vui lòng quay lại sau ít phút.',
        sendEmail: true,
        audience: 'All',
        emailSubject: 'WorkBridge thông báo bảo trì hệ thống',
        emailMessage: ''
    });
    const [emailForm, setEmailForm] = useState({
        type: 'Upgrade',
        audience: 'All',
        subject: 'WorkBridge nâng cấp trải nghiệm mới',
        message: 'WorkBridge vừa cập nhật một số cải tiến để việc tìm việc, ứng tuyển và quản lý tuyển dụng mượt mà hơn.',
        actionUrl: 'https://workbridge.io.vn',
        actionText: 'Mở WorkBridge'
    });

    const loadMaintenance = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/platform/admin/maintenance');
            setMaintenance(res.data || null);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Không thể tải trạng thái bảo trì.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMaintenance();
    }, [loadMaintenance]);

    const statusTone = useMemo(() => {
        if (maintenance?.isActive) {
            return {
                badge: 'bg-amber-50 text-amber-700 ring-amber-100',
                icon: 'construction',
                label: 'Đang bảo trì',
                copy: `Còn khoảng ${formatRemaining(maintenance.remainingSeconds)}`
            };
        }

        return {
            badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
            icon: 'verified',
            label: 'Đang hoạt động',
            copy: 'Người dùng có thể truy cập bình thường'
        };
    }, [maintenance]);

    const handleMaintenanceChange = (field, value) => {
        setMaintenanceForm((current) => ({ ...current, [field]: value }));
    };

    const handleEmailChange = (field, value) => {
        setEmailForm((current) => ({ ...current, [field]: value }));
    };

    const enableMaintenance = async (event) => {
        event.preventDefault();
        setSavingMaintenance(true);

        try {
            const res = await api.post('/platform/admin/maintenance', {
                isEnabled: true,
                durationMinutes: Number(maintenanceForm.durationMinutes),
                title: maintenanceForm.title,
                message: maintenanceForm.message,
                sendEmail: maintenanceForm.sendEmail,
                audience: maintenanceForm.audience,
                emailSubject: maintenanceForm.emailSubject,
                emailMessage: maintenanceForm.emailMessage
            });

            setMaintenance(res.data?.maintenance || null);
            toast.success(res.data?.message || 'Đã bật bảo trì.');
            if (res.data?.queuedCount > 0) {
                toast.success(`Đã đưa ${res.data.queuedCount} email vào hàng đợi.`);
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Không thể bật bảo trì.'));
        } finally {
            setSavingMaintenance(false);
        }
    };

    const disableMaintenance = async () => {
        setSavingMaintenance(true);

        try {
            const res = await api.post('/platform/admin/maintenance', {
                isEnabled: false,
                title: 'WorkBridge đã hoạt động trở lại',
                message: 'Hệ thống đã hoàn tất bảo trì và hoạt động bình thường.',
                sendEmail: false,
                audience: 'All'
            });
            setMaintenance(res.data?.maintenance || null);
            toast.success(res.data?.message || 'Đã tắt bảo trì.');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Không thể tắt bảo trì.'));
        } finally {
            setSavingMaintenance(false);
        }
    };

    const sendBroadcastEmail = async (event) => {
        event.preventDefault();
        setSendingEmail(true);

        try {
            const res = await api.post('/platform/admin/broadcast-email', emailForm);
            toast.success(res.data?.message || 'Đã gửi email vào hàng đợi.');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Không thể gửi email.'));
        } finally {
            setSendingEmail(false);
        }
    };

    if (loading) {
        return (
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="h-80 animate-pulse rounded-[28px] border border-white/80 bg-white/80 shadow-sm" />
                <div className="h-80 animate-pulse rounded-[28px] border border-white/80 bg-white/80 shadow-sm" />
            </div>
        );
    }

    return (
        <div className="space-y-5 anim-fadeUp">
            <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${statusTone.badge}`}>
                                    <span className="material-symbols-outlined !text-[16px]">{statusTone.icon}</span>
                                    {statusTone.label}
                                </span>
                                <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Trạng thái vận hành</h3>
                                <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
                                    Bật bảo trì để tạm khóa các thao tác của người dùng, hiển thị màn hình bảo trì và giữ quyền truy cập cho admin.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={loadMaintenance}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
                            >
                                <span className="material-symbols-outlined !text-[18px]">refresh</span>
                                Tải lại
                            </button>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            {[
                                ['Tình trạng', statusTone.label, statusTone.copy, statusTone.icon],
                                ['Bắt đầu', formatDateTime(maintenance?.startedAtUtc), 'Theo giờ hệ thống', 'schedule'],
                                ['Kết thúc dự kiến', formatDateTime(maintenance?.endsAtUtc), maintenance?.isActive ? statusTone.copy : 'Chưa có lịch', 'event_available']
                            ].map(([label, value, note, icon]) => (
                                <div key={label} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
                                        <span className="material-symbols-outlined !text-[20px] text-primary">{icon}</span>
                                    </div>
                                    <p className="mt-3 text-base font-black text-slate-950">{value}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">{note}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 lg:border-l lg:border-t-0">
                        <div className="flex h-full flex-col justify-between gap-6">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-primary">Màn hình người dùng</p>
                                <h4 className="mt-3 text-xl font-black tracking-tight text-slate-950">
                                    {maintenance?.title || 'WorkBridge đang hoạt động'}
                                </h4>
                                <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
                                    {maintenance?.message || 'Người dùng truy cập hệ thống bình thường.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={disableMaintenance}
                                disabled={!maintenance?.isActive || savingMaintenance}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                            >
                                <span className="material-symbols-outlined !text-[19px]">power_settings_new</span>
                                Tắt bảo trì
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
                <form onSubmit={enableMaintenance} className="rounded-[28px] border border-white/80 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-primary ring-1 ring-sky-100">
                            <span className="material-symbols-outlined !text-[24px]">engineering</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-slate-950">Thiết lập bảo trì</h3>
                            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                                Chọn thời lượng, nội dung hiển thị và có gửi email thông báo hay không.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-xs font-black text-slate-500">Thời gian bảo trì (phút)</span>
                            <input
                                type="number"
                                min="1"
                                max="1440"
                                value={maintenanceForm.durationMinutes}
                                onChange={(event) => handleMaintenanceChange('durationMinutes', event.target.value)}
                                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                            />
                        </label>

                        <label className="block">
                            <span className="text-xs font-black text-slate-500">Nhóm nhận email</span>
                            <select
                                value={maintenanceForm.audience}
                                onChange={(event) => handleMaintenanceChange('audience', event.target.value)}
                                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                            >
                                {audienceOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="mt-4 block">
                        <span className="text-xs font-black text-slate-500">Tiêu đề màn hình bảo trì</span>
                        <input
                            value={maintenanceForm.title}
                            onChange={(event) => handleMaintenanceChange('title', event.target.value)}
                            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                        />
                    </label>

                    <label className="mt-4 block">
                        <span className="text-xs font-black text-slate-500">Nội dung hiển thị</span>
                        <textarea
                            rows="4"
                            value={maintenanceForm.message}
                            onChange={(event) => handleMaintenanceChange('message', event.target.value)}
                            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-900 transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                        />
                    </label>

                    <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <input
                            type="checkbox"
                            checked={maintenanceForm.sendEmail}
                            onChange={(event) => handleMaintenanceChange('sendEmail', event.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-black text-slate-700">Gửi email thông báo khi bật bảo trì</span>
                    </label>

                    {maintenanceForm.sendEmail && (
                        <div className="mt-4 grid gap-4 rounded-[22px] border border-sky-100 bg-sky-50/60 p-4">
                            <label className="block">
                                <span className="text-xs font-black text-slate-500">Tiêu đề email</span>
                                <input
                                    value={maintenanceForm.emailSubject}
                                    onChange={(event) => handleMaintenanceChange('emailSubject', event.target.value)}
                                    className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm font-bold text-slate-900 transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-black text-slate-500">Nội dung email thêm</span>
                                <textarea
                                    rows="3"
                                    value={maintenanceForm.emailMessage}
                                    onChange={(event) => handleMaintenanceChange('emailMessage', event.target.value)}
                                    placeholder="Để trống nếu muốn dùng nội dung bảo trì tự động."
                                    className="mt-2 w-full resize-none rounded-xl border border-sky-100 bg-white px-3 py-3 text-sm font-semibold leading-relaxed text-slate-900 transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                />
                            </label>
                        </div>
                    )}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="submit"
                            disabled={savingMaintenance}
                            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-[0_16px_34px_rgba(19,146,236,.28)] transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            <span className="material-symbols-outlined !text-[19px]">construction</span>
                            Bật bảo trì
                        </button>
                        <button
                            type="button"
                            onClick={disableMaintenance}
                            disabled={!maintenance?.isActive || savingMaintenance}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
                        >
                            <span className="material-symbols-outlined !text-[19px]">close</span>
                            Tắt
                        </button>
                    </div>
                </form>

                <form onSubmit={sendBroadcastEmail} className="rounded-[28px] border border-white/80 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                            <span className="material-symbols-outlined !text-[24px]">campaign</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-slate-950">Gửi email vận hành</h3>
                            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                                Dùng cho thông báo bảo trì, nâng cấp web hoặc cập nhật quan trọng.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-xs font-black text-slate-500">Loại email</span>
                            <select
                                value={emailForm.type}
                                onChange={(event) => handleEmailChange('type', event.target.value)}
                                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                            >
                                {emailTypes.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="text-xs font-black text-slate-500">Người nhận</span>
                            <select
                                value={emailForm.audience}
                                onChange={(event) => handleEmailChange('audience', event.target.value)}
                                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                            >
                                {audienceOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="mt-4 block">
                        <span className="text-xs font-black text-slate-500">Tiêu đề</span>
                        <input
                            value={emailForm.subject}
                            onChange={(event) => handleEmailChange('subject', event.target.value)}
                            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                        />
                    </label>

                    <label className="mt-4 block">
                        <span className="text-xs font-black text-slate-500">Nội dung</span>
                        <textarea
                            rows="7"
                            value={emailForm.message}
                            onChange={(event) => handleEmailChange('message', event.target.value)}
                            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-900 transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                        />
                    </label>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-xs font-black text-slate-500">Liên kết nút</span>
                            <input
                                value={emailForm.actionUrl}
                                onChange={(event) => handleEmailChange('actionUrl', event.target.value)}
                                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                            />
                        </label>

                        <label className="block">
                            <span className="text-xs font-black text-slate-500">Chữ trên nút</span>
                            <input
                                value={emailForm.actionText}
                                onChange={(event) => handleEmailChange('actionText', event.target.value)}
                                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                            />
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={sendingEmail}
                        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        <span className="material-symbols-outlined !text-[19px]">send</span>
                        Gửi email
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminOperations;
