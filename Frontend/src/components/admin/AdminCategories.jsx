import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { translateCategory } from '../../utils/translate';

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [query, setQuery] = useState('');
    const token = localStorage.getItem('token');

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/categories', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error('Không thể tải danh sách danh mục');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const filteredCategories = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return categories;

        return categories.filter((category) => [
            category.name,
            translateCategory(category.name),
            category.description
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword)));
    }, [categories, query]);

    const handleOpenModal = (category = null) => {
        setEditingCategory(category);
        setName(category?.name || '');
        setDescription(category?.description || '');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCategory(null);
        setName('');
        setDescription('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            if (editingCategory) {
                await api.put(`/admin/categories/${editingCategory.categoryId}`, { name, description }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Đã cập nhật danh mục');
            } else {
                await api.post('/admin/categories', { name, description }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Đã tạo danh mục mới');
            }
            handleCloseModal();
            fetchCategories();
        } catch {
            toast.error(editingCategory ? 'Không thể cập nhật danh mục' : 'Không thể tạo danh mục');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này? Thao tác sẽ thất bại nếu vẫn còn công việc đang sử dụng danh mục.')) return;
        try {
            await api.delete(`/admin/categories/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Đã xóa danh mục');
            fetchCategories();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Không thể xóa danh mục vì vẫn còn tin tuyển dụng liên quan.'));
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => (
                    <div key={item} className="h-36 w-full animate-pulse rounded-[24px] border border-white/80 bg-white/80 shadow-sm" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5 anim-fadeUp">
            <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-950">Danh mục công việc</h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            Quản lý nhóm ngành để người tìm việc lọc tin nhanh và chính xác hơn.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,300px)_auto]">
                        <label className="relative block">
                            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 !text-[19px] -translate-y-1/2 text-slate-400">search</span>
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-800 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
                                placeholder="Tìm danh mục"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => handleOpenModal()}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary-dk active:translate-y-0"
                        >
                            <span className="material-symbols-outlined !text-[20px]">add</span>
                            Danh mục mới
                        </button>
                    </div>
                </div>
            </section>

            {filteredCategories.length === 0 ? (
                <div className="rounded-[28px] border border-white/80 bg-white px-6 py-16 text-center shadow-sm">
                    <span className="material-symbols-outlined !text-[42px] text-slate-300">category</span>
                    <h3 className="mt-3 text-sm font-black text-slate-700">Chưa có danh mục phù hợp</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Tạo danh mục mới hoặc đổi từ khóa tìm kiếm.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredCategories.map((category) => (
                        <article key={category.categoryId} className="group rounded-[24px] border border-white/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                                    <span className="material-symbols-outlined !text-[24px]">category</span>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenModal(category)}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-100 transition hover:bg-primary/10 hover:text-primary"
                                        aria-label="Chỉnh sửa danh mục"
                                    >
                                        <span className="material-symbols-outlined !text-[18px]">edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(category.categoryId)}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-600 hover:text-white"
                                        aria-label="Xóa danh mục"
                                    >
                                        <span className="material-symbols-outlined !text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>

                            <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950">
                                {translateCategory(category.name)}
                            </h3>
                            <p className="mt-2 line-clamp-3 min-h-[3.9rem] text-sm font-medium leading-relaxed text-slate-500">
                                {category.description || 'Chưa có mô tả.'}
                            </p>
                        </article>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm anim-fadeIn"
                        onClick={handleCloseModal}
                        aria-label="Đóng biểu mẫu danh mục"
                    />
                    <form onSubmit={handleSubmit} className="relative w-full max-w-md rounded-[28px] border border-white/80 bg-white p-6 shadow-2xl anim-scaleUp">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black text-primary">Danh mục</p>
                                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                                    {editingCategory ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-100 transition hover:bg-slate-100"
                            >
                                <span className="material-symbols-outlined !text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-xs font-black text-slate-500">Tên danh mục</span>
                                <input
                                    className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
                                    placeholder="Ví dụ: Công nghệ thông tin"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    required
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-black text-slate-500">Mô tả</span>
                                <textarea
                                    className="mt-1.5 min-h-[110px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
                                    placeholder="Mô tả danh mục"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                />
                            </label>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="h-12 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-500 transition hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="h-12 rounded-xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dk"
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
