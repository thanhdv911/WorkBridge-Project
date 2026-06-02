import React, { useState } from 'react';

export default function JobFilterSidebar({ onFilterChange }) {
  const [salary, setSalary] = useState(20000);

  return (
    <aside className="anim-fadeUp space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined !text-lg text-primary">tune</span>Bộ lọc
        </h3>

        {/* Category */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Danh mục</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/30" defaultChecked />
              Đồ ăn & Đồ uống <span className="ml-auto text-xs text-slate-400">48</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/30" />
              Gia sư <span className="ml-auto text-xs text-slate-400">32</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/30" />
              Giao hàng <span className="ml-auto text-xs text-slate-400">27</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/30" />
              Bán lẻ <span className="ml-auto text-xs text-slate-400">21</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/30" />
              Marketing <span className="ml-auto text-xs text-slate-400">14</span>
            </label>
          </div>
        </div>

        {/* Salary */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Mức lương</label>
          <div className="space-y-2">
            <input
              type="range"
              min="20000" max="200000" step="5000"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              className="w-full h-1.5 rounded-full bg-slate-200 appearance-none outline-none focus:ring-2 focus:ring-primary/20 accent-primary"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>20.000đ/giờ</span>
              <span className="font-semibold text-primary">{salary.toLocaleString()}đ/giờ</span>
            </div>
          </div>
        </div>

        {/* Distance */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Khoảng cách</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="dist" className="text-primary focus:ring-primary/30" defaultChecked />
              Trong vòng 5 km
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="dist" className="text-primary focus:ring-primary/30" />
              Trong vòng 10 km
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="dist" className="text-primary focus:ring-primary/30" />
              Trong vòng 20 km
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="dist" className="text-primary focus:ring-primary/30" />
              Bất kỳ khoảng cách
            </label>
          </div>
        </div>

        {/* Shift */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Ca làm việc</label>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">Sáng</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors">Chiều</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors">Tối</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors">Cuối tuần</button>
          </div>
        </div>
      </div>

      <button
        onClick={() => onFilterChange(salary)}
        className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined !text-lg">filter_list</span>Áp dụng bộ lọc
      </button>
    </aside>
  );
}
