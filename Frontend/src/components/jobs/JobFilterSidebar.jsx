import React, { useState } from 'react';

const categories = [
  ['Đồ ăn & Đồ uống', 48, true],
  ['Gia sư', 32],
  ['Giao hàng', 27],
  ['Bán lẻ', 21],
  ['Marketing', 14]
];

const distances = ['Trong vòng 5 km', 'Trong vòng 10 km', 'Trong vòng 20 km', 'Bất kỳ khoảng cách'];
const shifts = ['Sáng', 'Chiều', 'Tối', 'Cuối tuần'];

export default function JobFilterSidebar({ onFilterChange }) {
  const [salary, setSalary] = useState(20000);
  const [isOpen, setIsOpen] = useState(false);

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
          <label>Danh mục</label>
          <div className="jobs-filter-list">
            {categories.map(([name, count, checked]) => (
              <label key={name} className="jobs-filter-option">
                <input type="checkbox" defaultChecked={checked} />
                <span>{name}</span>
                <small>{count}</small>
              </label>
            ))}
          </div>
        </div>

        <div className="jobs-filter-section">
          <label>Mức lương</label>
          <div className="jobs-salary-box">
            <input
              type="range"
              min="20000"
              max="200000"
              step="5000"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
            />
            <div className="jobs-salary-row">
              <span>20.000đ/giờ</span>
              <strong>{salary.toLocaleString()}đ/giờ</strong>
            </div>
          </div>
        </div>

        <div className="jobs-filter-section">
          <label>Khoảng cách</label>
          <div className="jobs-filter-list">
            {distances.map((distance, index) => (
              <label key={distance} className="jobs-filter-option">
                <input type="radio" name="dist" defaultChecked={index === 0} />
                <span>{distance}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="jobs-filter-section">
          <label>Ca làm việc</label>
          <div className="jobs-shift-pills">
            {shifts.map((shift, index) => (
              <button key={shift} type="button" className={index === 0 ? 'is-active' : ''}>
                {shift}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onFilterChange(salary)}
        className="jobs-filter-submit"
      >
        <span className="material-symbols-outlined !text-lg">filter_list</span>
        Áp dụng bộ lọc
      </button>
    </aside>
  );
}
