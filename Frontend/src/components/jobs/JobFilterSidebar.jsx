import React, { useState } from 'react';

export default function JobFilterSidebar() {
  const [salary, setSalary] = useState(80000);

  return (
    <aside className="anim-fadeUp space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined !text-lg text-primary">tune</span>Filters
        </h3>

        {/* Category */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Category</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/30" defaultChecked />
              Food & Beverage <span className="ml-auto text-xs text-slate-400">48</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/30" />
              Tutoring <span className="ml-auto text-xs text-slate-400">32</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/30" />
              Delivery <span className="ml-auto text-xs text-slate-400">27</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/30" />
              Retail <span className="ml-auto text-xs text-slate-400">21</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/30" />
              Marketing <span className="ml-auto text-xs text-slate-400">14</span>
            </label>
          </div>
        </div>

        {/* Salary */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Salary Range</label>
          <div className="space-y-2">
            {/* Custom slider styles mapped via inline/tailwind for WebKit are somewhat complex, but standard range input is okay */}
            <input 
              type="range" 
              min="20000" max="200000" step="5000"
              value={salary} 
              onChange={(e) => setSalary(Number(e.target.value))}
              className="w-full h-1.5 rounded-full bg-slate-200 appearance-none outline-none focus:ring-2 focus:ring-primary/20 accent-primary" 
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>20,000₫/hr</span>
              <span className="font-semibold text-primary">{salary.toLocaleString()}₫/hr</span>
            </div>
          </div>
        </div>

        {/* Distance */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Distance</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="dist" className="text-primary focus:ring-primary/30" defaultChecked />
              Within 5 km
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="dist" className="text-primary focus:ring-primary/30" />
              Within 10 km
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="dist" className="text-primary focus:ring-primary/30" />
              Within 20 km
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="dist" className="text-primary focus:ring-primary/30" />
              Any distance
            </label>
          </div>
        </div>

        {/* Shift */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Shift</label>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">Morning</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors">Afternoon</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors">Evening</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors">Weekend</button>
          </div>
        </div>
      </div>

      <button className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2">
        <span className="material-symbols-outlined !text-lg">filter_list</span>Apply Filters
      </button>
    </aside>
  );
}
