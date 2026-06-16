import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import WorkBridgeLogo from '../components/shared/WorkBridgeLogo';

const STORAGE_KEY = 'workbridge_maintenance';

const readStoredMaintenance = () => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const formatRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return 'Đang kiểm tra lại';
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
};

const formatDateTime = (value) => {
    if (!value) return 'Đang cập nhật';
    return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const Maintenance = () => {
    const navigate = useNavigate();
    const [maintenance, setMaintenance] = useState(() => readStoredMaintenance());
    const [remainingSeconds, setRemainingSeconds] = useState(() => readStoredMaintenance()?.remainingSeconds || null);
    const [checking, setChecking] = useState(false);
    const [apiDown, setApiDown] = useState(false);
    const isAdmin = localStorage.getItem('role') === 'Admin';

    const fallback = useMemo(() => ({
        title: 'WorkBridge đang gián đoạn kết nối',
        message: 'Hệ thống đang tạm thời không phản hồi. Đội ngũ WorkBridge đang kiểm tra để khôi phục trong thời gian sớm nhất.',
        endsAtUtc: null,
        remainingSeconds: null
    }), []);

    const safeMaintenance = maintenance || fallback;

    const refreshStatus = useCallback(async () => {
        setChecking(true);
        try {
            const res = await api.get('/platform/maintenance');
            const nextMaintenance = res.data || null;
            setApiDown(false);
            setMaintenance(nextMaintenance);
            setRemainingSeconds(nextMaintenance?.remainingSeconds || null);

            if (!nextMaintenance?.isActive) {
                sessionStorage.removeItem(STORAGE_KEY);
                navigate('/', { replace: true });
            }
        } catch (error) {
            const fromResponse = error.response?.data?.maintenance;
            if (fromResponse) {
                setMaintenance(fromResponse);
                setRemainingSeconds(fromResponse.remainingSeconds || null);
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromResponse));
            } else {
                setApiDown(true);
                setMaintenance((current) => current || fallback);
            }
        } finally {
            setChecking(false);
        }
    }, [fallback, navigate]);

    useEffect(() => {
        refreshStatus();
        const interval = window.setInterval(refreshStatus, 45000);
        return () => window.clearInterval(interval);
    }, [refreshStatus]);

    useEffect(() => {
        if (!remainingSeconds) return undefined;
        const interval = window.setInterval(() => {
            setRemainingSeconds((current) => {
                if (!current || current <= 1) return 0;
                return current - 1;
            });
        }, 1000);
        return () => window.clearInterval(interval);
    }, [remainingSeconds]);

    return (
        <main className="relative min-h-[100dvh] overflow-hidden bg-[#062f4f] text-white">
            <div
                className="absolute inset-0 opacity-90"
                style={{
                    backgroundImage: [
                        'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px)',
                        'linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)',
                        'linear-gradient(135deg, rgba(2,6,23,.96), rgba(7,89,133,.88) 45%, rgba(14,165,233,.72))'
                    ].join(', '),
                    backgroundSize: '96px 96px, 96px 96px, cover'
                }}
                aria-hidden="true"
            />
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300" aria-hidden="true" />

            <section className="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-5 py-8 sm:px-8">
                <header className="flex items-center justify-between gap-4">
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_16px_44px_rgba(2,6,23,.22)]">
                        <WorkBridgeLogo imageClassName="h-9 w-auto" />
                    </div>
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => navigate('/admin-dashboard')}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
                        >
                            <span className="material-symbols-outlined !text-[18px]">admin_panel_settings</span>
                            Admin
                        </button>
                    )}
                </header>

                <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.05fr)_420px]">
                    <div className="anim-fadeUp">
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/35 bg-cyan-100/12 px-4 py-2 text-xs font-black text-cyan-100 backdrop-blur">
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.9)]" />
                            {apiDown ? 'Đang kiểm tra máy chủ' : 'Bảo trì hệ thống'}
                        </span>

                        <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                            {safeMaintenance.title}
                        </h1>
                        <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-sky-100/85 sm:text-lg">
                            {safeMaintenance.message}
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={refreshStatus}
                                disabled={checking}
                                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-sky-700 shadow-[0_18px_44px_rgba(2,6,23,.22)] transition hover:-translate-y-0.5 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                <span className={`material-symbols-outlined !text-[19px] ${checking ? 'animate-spin' : ''}`}>refresh</span>
                                Thử kết nối lại
                            </button>
                            <a
                                href="mailto:support@workbridge.com"
                                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
                            >
                                <span className="material-symbols-outlined !text-[19px]">mail</span>
                                Liên hệ hỗ trợ
                            </a>
                        </div>
                    </div>

                    <aside className="anim-fadeUp-d2 rounded-[32px] border border-white/18 bg-white/12 p-5 shadow-[0_24px_70px_rgba(2,6,23,.28)] backdrop-blur-xl">
                        <div className="rounded-[26px] bg-white p-5 text-slate-950 shadow-2xl">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-800">Thời gian dự kiến</p>
                                    <p className="mt-2 text-3xl font-black text-slate-950">{formatRemaining(remainingSeconds)}</p>
                                </div>
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-primary ring-1 ring-sky-100">
                                    <span className="material-symbols-outlined !text-[28px]">timer</span>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                {[
                                    ['Bắt đầu', formatDateTime(safeMaintenance.startedAtUtc), 'schedule'],
                                    ['Hoàn tất dự kiến', formatDateTime(safeMaintenance.endsAtUtc), 'event_available'],
                                    ['Trạng thái', apiDown ? 'Máy chủ chưa phản hồi' : 'Đang bảo trì an toàn', 'verified_user']
                                ].map(([label, value, icon]) => (
                                    <div key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                        <span className="material-symbols-outlined !text-[20px] text-primary">{icon}</span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-slate-800">{label}</p>
                                            <p className="truncate text-sm font-black text-slate-800">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 rounded-[24px] border border-white/16 bg-white/10 p-4">
                            <p className="text-sm font-black text-white">Dữ liệu của bạn vẫn an toàn</p>
                            <p className="mt-2 text-sm font-medium leading-6 text-sky-100/80">
                                Các thao tác đang xử lý sẽ được giữ ổn định. Sau khi hoàn tất, bạn có thể tiếp tục sử dụng WorkBridge như bình thường.
                            </p>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
};

export default Maintenance;
