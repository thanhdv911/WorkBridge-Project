import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined !text-3xl">explore</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800">Page not found</h1>
        <p className="text-sm text-slate-500 mt-2">
          This page does not exist yet. You can go back to the main job flow.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-7">
          <Link
            to="/"
            className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-bold flex items-center justify-center hover:bg-primary-dk transition-colors"
          >
            Home
          </Link>
          <Link
            to="/login"
            className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
