import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (err) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (userId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'Active' ? 'Locked' : 'Active';
            await api.patch(`/admin/users/${userId}/status`, { newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`User access ${newStatus === 'Active' ? 'restored' : 'restricted'}`);
            fetchUsers();
        } catch (err) {
            toast.error('Failed to update user status');
        }
    };

    if (loading) return <div className="animate-pulse space-y-4">
        {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl w-full"></div>)}
    </div>;

    return (
        <div className="space-y-6 animate-fadeInUp">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">System Users</h2>
                <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-widest">
                    Total: {users.length}
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Info</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                        {users.map((user) => (
                            <tr key={user.userId} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-8 py-5">
                                    <div className="font-bold text-slate-800">{user.fullName}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                        user.roleName === 'Admin' ? 'bg-purple-50 text-purple-600' :
                                        user.roleName === 'Employer' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                    }`}>
                                        {user.roleName}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                        user.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                    }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    {user.roleName !== 'Admin' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(user.userId, user.status)}
                                            className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                                                user.status === 'Active' 
                                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white' 
                                                : 'bg-green-50 text-green-600 hover:bg-green-500 hover:text-white'
                                            }`}
                                        >
                                            {user.status === 'Active' ? 'Lock Account' : 'Unlock Account'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUsers;
