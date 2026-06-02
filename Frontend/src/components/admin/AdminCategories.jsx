import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { translateCategory } from '../../utils/translate';

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/admin/categories', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(res.data);
        } catch {
            toast.error('Không thể tải danh sách danh mục');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (category = null) => {
        setEditingCategory(category);
        setName(category?.name || '');
        setDescription(category?.description || '');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await api.put(`/admin/categories/${editingCategory.categoryId}`, { name, description }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Đã cập nhật danh mục thành công');
            } else {
                await api.post('/admin/categories', { name, description }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Đã tạo danh mục thành công');
            }
            setShowModal(false);
            fetchCategories();
        } catch {
            toast.error(editingCategory ? 'Không thể cập nhật danh mục' : 'Không thể tạo danh mục');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa? Thao tác này sẽ thất bại nếu vẫn còn công việc đang sử dụng danh mục này.')) return;
        try {
            await api.delete(`/admin/categories/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Đã xóa danh mục thành công');
            fetchCategories();
        } catch (err) {
            toast.error(err.response?.data || 'Không thể xóa danh mục');
        }
    };

    if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl w-full animate-pulse"></div>)}
    </div>;

    return (
        <div className="space-y-6 animate-fadeInUp">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Danh mục công việc</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined !text-[20px]">add</span>
                    Danh mục mới
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => (
                    <div key={cat.categoryId} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-slate-800 text-lg">{translateCategory(cat.name)}</h3>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(cat)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-all">
                                        <span className="material-symbols-outlined !text-[18px]">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(cat.categoryId)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all">
                                        <span className="material-symbols-outlined !text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 line-clamp-2">{cat.description || 'Chưa có mô tả.'}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm anim-fadeIn" onClick={() => setShowModal(false)}></div>
                    <form onSubmit={handleSubmit} className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 anim-scaleUp border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">{editingCategory ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}</h3>

                        <div className="space-y-4 mb-8">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tên danh mục</label>
                                <input
                                    className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-semibold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                                    placeholder="Ví dụ: Công nghệ thông tin"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mô tả</label>
                                <textarea
                                    className="w-full rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm font-semibold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all min-h-[100px]"
                                    placeholder="Mô tả danh mục..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="flex-1 h-12 rounded-xl border border-slate-200 font-bold text-slate-400 hover:bg-slate-50 transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="flex-1 h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
                            >
                                {editingCategory ? 'Cập nhật' : 'Tạo mới'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminCategories;
