import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PRESET_SKILLS = [
    'Giao tiếp', 'Customer Service', 'Teamwork', 'Time Management',
    'English (Basic)', 'English (Fluent)', 'Pha chế', 'POS Operation',
    'Cash Handling', 'Food Safety', 'Sales', 'Problem Solving',
    'Leadership', 'Adaptability', 'Work Ethic',
];

const EndorseSkillsModal = ({ isOpen, onClose, applicantId, applicantName }) => {
    const [selected, setSelected] = useState([]);
    const [customSkill, setCustomSkill] = useState('');
    const token = localStorage.getItem('token');

    const toggle = (skill) => {
        setSelected(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    const addCustom = () => {
        const s = customSkill.trim();
        if (s && !selected.includes(s)) {
            setSelected(prev => [...prev, s]);
        }
        setCustomSkill('');
    };

    const handleSubmit = async () => {
        if (selected.length === 0) {
            toast.error('Please select at least one skill to endorse.');
            return;
        }
        try {
            await api.post('/gamification/endorse', {
                applicantId,
                skills: selected,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Successfully endorsed ${selected.length} skill(s) for ${applicantName}!`);
            setSelected([]);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to endorse skills.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-br from-primary/[0.06] to-violet-500/[0.04]">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider mb-2 border border-primary/10">
                                <span className="material-symbols-outlined !text-sm">verified</span>
                                Skill Endorsement
                            </div>
                            <h2 className="text-2xl font-black text-slate-800">Endorse Skills</h2>
                            <p className="text-sm text-slate-500 font-medium mt-1">
                                For <span className="font-bold text-slate-700">{applicantName}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors shadow-sm">
                            <span className="material-symbols-outlined !text-base">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1">
                    <p className="text-sm font-medium text-slate-500 mb-6">
                        Select skills this student demonstrated during their time working with you. Your endorsement will show on their WorkBridge profile and help them get hired faster.
                    </p>

                    {/* Preset Skill Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {PRESET_SKILLS.map(skill => (
                            <button
                                key={skill}
                                onClick={() => toggle(skill)}
                                className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                                    selected.includes(skill)
                                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary'
                                }`}
                            >
                                {selected.includes(skill) && <span className="material-symbols-outlined !text-xs mr-1">check</span>}
                                {skill}
                            </button>
                        ))}
                    </div>

                    {/* Custom skill input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customSkill}
                            onChange={e => setCustomSkill(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addCustom()}
                            placeholder="Add a custom skill..."
                            className="flex-1 h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                        />
                        <button
                            onClick={addCustom}
                            className="h-11 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                        >
                            Add
                        </button>
                    </div>

                    {/* Selected Summary */}
                    {selected.length > 0 && (
                        <div className="mt-5 p-4 bg-primary/[0.04] rounded-2xl border border-primary/10">
                            <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">
                                Endorsing {selected.length} skill(s):
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {selected.map(s => (
                                    <div key={s} className="flex items-center gap-1 px-2.5 py-1 bg-primary text-white rounded-lg text-xs font-bold">
                                        {s}
                                        <button onClick={() => toggle(s)} className="ml-0.5 opacity-60 hover:opacity-100">
                                            <span className="material-symbols-outlined !text-xs">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="h-12 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={selected.length === 0}
                        className={`h-12 px-8 rounded-xl font-black text-white flex items-center gap-2 transition-all shadow-lg ${
                            selected.length > 0
                            ? 'bg-slate-900 hover:bg-primary shadow-black/10 active:scale-95'
                            : 'bg-slate-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        <span className="material-symbols-outlined !text-xl">thumb_up</span>
                        Endorse {selected.length > 0 ? `(${selected.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EndorseSkillsModal;
