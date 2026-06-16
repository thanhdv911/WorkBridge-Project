import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { translateCategory } from '../../utils/translate';

export default function JobFilterSidebar({ 
  selectedCategoryId, 
  minSalary, 
  onFilterApply 
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSalary, setLocalSalary] = useState(minSalary ? Number(minSalary) : 20000);
  const [localCategoryId, setLocalCategoryId] = useState(selectedCategoryId ? Number(selectedCategoryId) : '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalSalary(minSalary ? Number(minSalary) : 20000);
  }, [minSalary]);

  useEffect(() => {
    setLocalCategoryId(selectedCategoryId ? Number(selectedCategoryId) : '');
  }, [selectedCategoryId]);

  useEffect(() => {
    api.get('/home/categories')
      .then(res => {
        setCategories(res.data || []);
      })
      .catch(err => {
        console.error('Error fetching categories for filters:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentSalaryProp = minSalary ? Number(minSalary) : 20000;
      const currentCategoryProp = selectedCategoryId ? Number(selectedCategoryId) : '';
      
      // Only apply if the local state actually differs from the props to prevent loops
      if (localSalary !== currentSalaryProp || localCategoryId !== currentCategoryProp) {
        onFilterApply?.({
          minSalary: localSalary,
          categoryId: localCategoryId
        });
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [localSalary, localCategoryId, minSalary, selectedCategoryId, onFilterApply]);

  return (
    <aside className={`jobs-filter anim-fadeUp ${isOpen ? 'is-open' : ''}`}>
      <div className={`jobs-filter-card ${isOpen ? 'is-open' : ''}`}>
        <div className="jobs-filter-head">
          <div>
            <p>Bộ lọc</p>
            <h3>Tinh chỉnh kết quả</h3>
          </div>
          <span className="material-symbols-outlined">tune</span>
          <button
            type="button"
            className="jobs-filter-toggle"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
          >
            <span className="material-symbols-outlined">
              {isOpen ? 'expand_less' : 'tune'}
            </span>
            <span className="jobs-filter-toggle-label">
              {isOpen ? 'Đóng' : 'Mở lọc'}
            </span>
          </button>
        </div>

        <div className="jobs-filter-section">
          <label>Danh mục công việc</label>
          {loading ? (
            <div className="py-3 text-xs text-slate-800 animate-pulse text-left">Đang tải danh mục...</div>
          ) : (
            <div className="jobs-filter-list">
              <label className="jobs-filter-option">
                <input 
                  type="radio" 
                  name="categoryFilter" 
                  checked={localCategoryId === ''} 
                  onChange={() => setLocalCategoryId('')} 
                />
                <span>Tất cả ngành nghề</span>
              </label>
              {categories.map((cat) => {
                const categoryIdVal = cat.categoryId;
                const isChecked = String(localCategoryId) === String(categoryIdVal);
                return (
                  <label key={cat.categoryId} className="jobs-filter-option">
                    <input 
                      type="radio" 
                      name="categoryFilter" 
                      checked={isChecked} 
                      onChange={() => setLocalCategoryId(categoryIdVal)} 
                    />
                    <span>{translateCategory(cat.categoryName || cat.name)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="jobs-filter-section">
          <label>Mức lương tối thiểu</label>
          <div className="jobs-salary-box">
            <input
              type="range"
              min="20000"
              max="200000"
              step="5000"
              value={localSalary}
              onChange={(e) => setLocalSalary(Number(e.target.value))}
            />
            <div className="jobs-salary-row">
              <span>20.000đ/giờ</span>
              <strong>{localSalary.toLocaleString()}đ/giờ</strong>
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
}
