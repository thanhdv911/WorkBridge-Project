import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const EmployerBranches = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', address: '', phone: '' });
    const [saving, setSaving] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const response = await api.get('/branches', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(response.data);
        } catch (error) {
            console.error('Error loading branches:', error);
            toast.error('Could not load branches.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.address.trim()) {
            toast.error('Branch name and address are required.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/branches', form, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Branch created.');
            setForm({ name: '', address: '', phone: '' });
            fetchBranches();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not create branch.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6 min-w-0">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Branches</h2>
                    <p className="text-sm text-slate-500 mt-1">Create stores/locations before sending offers.</p>
                </div>
                <input
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Branch name"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <input
                    value={form.address}
                    onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Address"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <input
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <button
                    disabled={saving}
                    className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60"
                >
                    {saving ? 'Saving...' : 'Create Branch'}
                </button>
            </form>

            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
                <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Your Locations</h3>
                </div>
                {loading ? (
                    <div className="p-10 text-center text-slate-400">Loading branches...</div>
                ) : branches.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No branches yet.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {branches.map(branch => (
                            <div key={branch.branchId} className="px-5 sm:px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-800 truncate">{branch.name}</p>
                                    <p className="text-sm text-slate-500 truncate">{branch.address}</p>
                                    {branch.phone && <p className="text-xs text-slate-400">{branch.phone}</p>}
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-100 self-start md:self-center">
                                    {branch.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default EmployerBranches;
