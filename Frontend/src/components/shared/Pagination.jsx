import React from 'react';

const DOTS = 'dots';

const buildPageRange = (currentPage, totalPages, siblingCount = 1) => {
    const totalPageNumbers = siblingCount * 2 + 5;

    if (totalPages <= totalPageNumbers) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
        const leftItemCount = 3 + siblingCount * 2;
        return [
            ...Array.from({ length: leftItemCount }, (_, index) => index + 1),
            DOTS,
            totalPages
        ];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
        const rightItemCount = 3 + siblingCount * 2;
        return [
            1,
            DOTS,
            ...Array.from({ length: rightItemCount }, (_, index) => totalPages - rightItemCount + index + 1)
        ];
    }

    return [
        1,
        DOTS,
        ...Array.from(
            { length: rightSiblingIndex - leftSiblingIndex + 1 },
            (_, index) => leftSiblingIndex + index
        ),
        DOTS,
        totalPages
    ];
};

const Pagination = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    label = 'mục',
    className = ''
}) => {
    const safeTotalItems = Math.max(Number(totalItems) || 0, 0);
    const safeItemsPerPage = Math.max(Number(itemsPerPage) || 1, 1);
    const totalPages = Math.max(1, Math.ceil(safeTotalItems / safeItemsPerPage));

    if (safeTotalItems <= safeItemsPerPage) return null;

    const page = Math.min(Math.max(Number(currentPage) || 1, 1), totalPages);
    const startItem = (page - 1) * safeItemsPerPage + 1;
    const endItem = Math.min(page * safeItemsPerPage, safeTotalItems);
    const pages = buildPageRange(page, totalPages);

    const goToPage = (nextPage) => {
        const clampedPage = Math.min(Math.max(nextPage, 1), totalPages);
        if (clampedPage !== page) onPageChange(clampedPage);
    };

    return (
        <nav
            className={`flex flex-col gap-3 border-t border-slate-100 bg-white/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${className}`}
            aria-label="Phân trang"
        >
            <p className="text-center text-xs font-bold text-slate-400 sm:text-left">
                Hiển thị <span className="text-slate-700">{startItem}-{endItem}</span> trên{' '}
                <span className="text-slate-700">{safeTotalItems}</span> {label}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Trang trước"
                >
                    <span className="material-symbols-outlined !text-[16px]">chevron_left</span>
                    Trước
                </button>

                <div className="flex items-center gap-1 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-1 shadow-inner">
                    {pages.map((item, index) => (
                        item === DOTS ? (
                            <span
                                key={`${item}-${index}`}
                                className="flex h-8 w-8 items-center justify-center text-xs font-black text-slate-300"
                            >
                                ...
                            </span>
                        ) : (
                            <button
                                type="button"
                                key={item}
                                onClick={() => goToPage(item)}
                                aria-current={item === page ? 'page' : undefined}
                                className={`h-8 min-w-[2rem] rounded-xl px-2 text-xs font-black transition-all ${
                                    item === page
                                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                                        : 'text-slate-500 hover:bg-white hover:text-primary hover:shadow-sm'
                                }`}
                            >
                                {item}
                            </button>
                        )
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Trang sau"
                >
                    Sau
                    <span className="material-symbols-outlined !text-[16px]">chevron_right</span>
                </button>
            </div>
        </nav>
    );
};

export default Pagination;
