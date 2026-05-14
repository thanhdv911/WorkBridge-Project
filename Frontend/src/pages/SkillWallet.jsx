import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const BADGE_COLORS = {
    'Uy Tín (5-Star Worker)': { bg: 'from-amber-400 to-yellow-500', shadow: 'shadow-amber-200', text: 'text-amber-900' },
    'Thánh Đúng Giờ (Punctual)': { bg: 'from-sky-400 to-blue-500', shadow: 'shadow-blue-200', text: 'text-blue-900' },
    'Bậc Thầy Giao Tiếp (Communicator)': { bg: 'from-violet-400 to-purple-500', shadow: 'shadow-purple-200', text: 'text-purple-900' },
    default: { bg: 'from-slate-400 to-slate-600', shadow: 'shadow-slate-200', text: 'text-slate-900' },
};

const getBadgeStyle = (name) => BADGE_COLORS[name] || BADGE_COLORS.default;

const StarRating = ({ rating }) => (
    <div className="flex gap-0.5">
        {[1,2,3,4,5].map(s => (
            <span key={s} className={`material-symbols-outlined !text-lg ${s <= rating ? 'filled text-amber-400' : 'text-slate-200'}`}>star</span>
        ))}
    </div>
);

const SkillWallet = () => {
    const [cv, setCv] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const cvRef = useRef(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchCv();
    }, []);

    const fetchCv = async () => {
        try {
            setLoading(true);
            const res = await api.get('/gamification/cv/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCv(res.data);
        } catch (err) {
            toast.error('Could not load your Skill Wallet.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 300);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!cv) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-slate-500 font-medium">No profile data available.</p>
            </div>
        );
    }

    const maxEndorsements = Math.max(1, ...cv.topSkills.map(s => s.endorsementCount));

    return (
        <>
            {/* Print Styles */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #cv-printable, #cv-printable * { visibility: visible; }
                    #cv-printable { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="bg-[#FDFDFF] min-h-screen pb-20 font-display relative overflow-hidden">
                {/* Background blobs */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[100px] pointer-events-none"></div>

                {/* Page Header */}
                <div className="relative z-10 bg-white/60 backdrop-blur-xl border-b border-slate-200/50 pb-12 pt-10 no-print">
                    <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
                        <div className="flex items-end justify-between gap-6 flex-wrap">
                            <div>
                                <div className="anim-fadeUp inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider mb-4 border border-primary/10">
                                    <span className="material-symbols-outlined !text-sm">workspace_premium</span>
                                    Gamified Profile
                                </div>
                                <h1 className="anim-fadeUp-d1 text-4xl font-black text-slate-900 tracking-tight">
                                    Skill <span className="grad-text">Wallet</span>
                                </h1>
                                <p className="anim-fadeUp-d2 text-slate-500 mt-3 text-lg font-medium">
                                    Your living proof of work. Export to a stunning Practical CV.
                                </p>
                            </div>
                            <button
                                onClick={handlePrint}
                                className="no-print inline-flex items-center gap-3 h-14 px-8 rounded-2xl bg-slate-900 text-white font-black shadow-xl shadow-black/10 hover:bg-primary hover:shadow-primary/25 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined !text-xl">print</span>
                                Export Practical CV
                            </button>
                        </div>
                    </div>
                </div>

                <main className="relative z-10 max-w-[1320px] mx-auto px-6 lg:px-10 mt-12">
                    {/* Stats Row */}
                    <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 anim-fadeUp">
                        {[
                            { icon: 'work_history', label: 'Jobs Completed', value: cv.totalJobsCompleted, color: 'text-primary' },
                            { icon: 'schedule', label: 'Hours Logged', value: `${cv.totalHoursWorked}h`, color: 'text-emerald-500' },
                            { icon: 'star', label: 'Avg. Rating', value: cv.averageRating > 0 ? `${cv.averageRating} ★` : 'N/A', color: 'text-amber-500' },
                            { icon: 'emoji_events', label: 'Badges Earned', value: cv.earnedBadges.length, color: 'text-violet-500' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`material-symbols-outlined !text-2xl ${stat.color}`}>{stat.icon}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                </div>
                                <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Badge Cabinet + Skills in grid */}
                    <div className="grid lg:grid-cols-[1fr_380px] gap-8 mb-8">
                        {/* Skill Endorsements */}
                        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-8 anim-fadeUp">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary !text-xl">verified</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Endorsed Skills</h2>
                                    <p className="text-sm text-slate-400 font-medium">Verified by real employers</p>
                                </div>
                            </div>

                            {cv.topSkills.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <span className="material-symbols-outlined !text-4xl block mb-2 opacity-30">psychology</span>
                                    <p className="font-medium text-sm">No endorsed skills yet. Complete a job to get started!</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {cv.topSkills.map((skill, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-bold text-slate-700">{skill.skillName}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined !text-base text-primary">thumb_up</span>
                                                    <span className="text-sm font-black text-primary">{skill.endorsementCount}</span>
                                                    <span className="text-xs text-slate-400 font-medium">endorsements</span>
                                                </div>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                                                    style={{ width: `${(skill.endorsementCount / maxEndorsements) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Badge Cabinet */}
                        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-8 anim-fadeUp-d1">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-500 !text-xl">emoji_events</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Badge Cabinet</h2>
                                    <p className="text-sm text-slate-400 font-medium">Achievements from your journey</p>
                                </div>
                            </div>

                            {cv.earnedBadges.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <span className="material-symbols-outlined !text-4xl block mb-2 opacity-30">emoji_events</span>
                                    <p className="font-medium text-sm">No badges yet. Keep working hard!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cv.earnedBadges.map((badge) => {
                                        const style = getBadgeStyle(badge.badgeName);
                                        return (
                                            <div key={badge.badgeId} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50/60 border border-slate-100 hover:border-slate-200 transition-colors">
                                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${style.bg} flex items-center justify-center shadow-lg ${style.shadow} flex-shrink-0`}>
                                                    <span className="material-symbols-outlined filled text-white !text-2xl">{badge.iconClass || 'workspace_premium'}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-black text-sm ${style.text} truncate`}>{badge.badgeName}</div>
                                                    <div className="text-xs text-slate-400 font-medium mt-0.5 line-clamp-1">{badge.description}</div>
                                                    <div className="text-[10px] text-slate-300 font-bold mt-1">
                                                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Work Experience */}
                    {cv.experiences.length > 0 && (
                        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-8 mb-8 anim-fadeUp">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-emerald-500 !text-xl">business_center</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Work History</h2>
                                    <p className="text-sm text-slate-400 font-medium">Real, verified experience logged on WorkBridge</p>
                                </div>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {cv.experiences.map((exp, i) => (
                                    <div key={i} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-primary/[0.02] hover:border-primary/20 transition-all">
                                        <div className="font-black text-slate-800 mb-1">{exp.jobTitle}</div>
                                        <div className="text-sm font-bold text-slate-500 mb-3">{exp.companyName}</div>
                                        <div className="flex items-center gap-2 text-emerald-600">
                                            <span className="material-symbols-outlined !text-base">schedule</span>
                                            <span className="text-sm font-black">{exp.totalHours} hours logged</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>

                {/* ============ PRINTABLE CV SECTION ============ */}
                <div id="cv-printable" ref={cvRef} className="hidden print:block mx-auto max-w-4xl p-0 bg-white">
                    <div className="p-12">
                        {/* CV Header */}
                        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-8 mb-8">
                            <div>
                                <div className="text-4xl font-black text-slate-900 tracking-tight">{cv.fullName}</div>
                                <div className="text-slate-500 font-medium mt-1">{cv.major} · {cv.university}</div>
                                <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-400">
                                    <span>Verified WorkBridge Profile</span>
                                    <span className="text-primary">✓</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-slate-800 uppercase tracking-widest">Practical CV</div>
                                <div className="text-xs text-slate-400 font-medium mt-1">Generated by WorkBridge</div>
                                <div className="text-xs text-slate-400 font-medium">{new Date().toLocaleDateString()}</div>
                            </div>
                        </div>

                        {/* Stats Row in CV */}
                        <div className="grid grid-cols-3 gap-6 mb-10">
                            <div className="text-center p-4 border border-slate-200 rounded-xl">
                                <div className="text-3xl font-black text-slate-800">{cv.totalJobsCompleted}</div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Jobs Completed</div>
                            </div>
                            <div className="text-center p-4 border border-slate-200 rounded-xl">
                                <div className="text-3xl font-black text-slate-800">{cv.totalHoursWorked}h</div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Hours Worked</div>
                            </div>
                            <div className="text-center p-4 border border-slate-200 rounded-xl">
                                <div className="text-3xl font-black text-slate-800">{cv.averageRating > 0 ? cv.averageRating : '—'}</div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Avg. Star Rating</div>
                            </div>
                        </div>

                        {/* CV Skills */}
                        {cv.topSkills.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Endorsed Skills</h2>
                                <div className="flex flex-wrap gap-3">
                                    {cv.topSkills.map((skill, i) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-bold">
                                            {skill.skillName}
                                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-black">{skill.endorsementCount}x</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CV Badges */}
                        {cv.earnedBadges.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Achievement Badges</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {cv.earnedBadges.map((badge) => (
                                        <div key={badge.badgeId} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
                                            <span className="material-symbols-outlined filled text-amber-500">workspace_premium</span>
                                            <div>
                                                <div className="font-black text-slate-800 text-sm">{badge.badgeName}</div>
                                                <div className="text-xs text-slate-400">{badge.description}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CV Work History */}
                        {cv.experiences.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Work History (WorkBridge Verified)</h2>
                                <div className="space-y-3">
                                    {cv.experiences.map((exp, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl">
                                            <div>
                                                <div className="font-black text-slate-800">{exp.jobTitle}</div>
                                                <div className="text-sm text-slate-500 font-medium">{exp.companyName}</div>
                                            </div>
                                            <div className="text-sm font-black text-slate-700">{exp.totalHours} hours ✓</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-center text-xs text-slate-300 font-bold border-t border-slate-100 pt-6">
                            This CV was generated from verified work history on WorkBridge · workbridge.io
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SkillWallet;
