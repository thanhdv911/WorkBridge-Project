import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function EmployerJobForm({ onSuccess }) {
  const [jobForm, setJobForm] = useState({
    title: '',
    categoryId: 1, // Defaulting to F&B for now
    jobType: 'Part-time',
    payRate: '',
    payUnit: 'Hourly',
    city: 'Hồ Chí Minh',
    district: '',
    address: '',
    applicationDeadline: '',
    description: '',
    requirements: '',
    benefits: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { id: 1, name: 'Food & Beverage' },
    { id: 2, name: 'Retail & Sales' },
    { id: 3, name: 'Tutoring & Education' },
    { id: 4, name: 'Delivery & Logistics' },
    { id: 5, name: 'Events & Promotion' },
    { id: 6, name: 'Others' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setJobForm(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Formatting the payload to match the CreateJobRequest DTO
    const payload = {
      ...jobForm,
      categoryId: parseInt(jobForm.categoryId),
      payRate: jobForm.payRate ? parseFloat(jobForm.payRate) : null,
      applicationDeadline: jobForm.applicationDeadline ? new Date(jobForm.applicationDeadline).toISOString() : null
    };

    try {
      await axios.post('http://localhost:5029/api/employer/jobs', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Job posted successfully!');
      if (onSuccess) onSuccess();
      // Optional: reset form
      setJobForm({
        ...jobForm,
        title: '',
        payRate: '',
        description: '',
        requirements: '',
        benefits: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post job. Please ensure you saved your profile first.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden anim-fadeUp-d1">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">add_circle</span>
            Post a New Job
          </h2>
          <p className="text-sm text-slate-500 mt-1">Fill in the details below to publish a new part-time position.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Basic Information</h3>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Job Title *</label>
              <input 
                type="text" 
                name="title"
                value={jobForm.title}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="e.g. Weekend Barista Needed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Category *</label>
              <select
                name="categoryId"
                value={jobForm.categoryId}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Job Type *</label>
              <select
                name="jobType"
                value={jobForm.jobType}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="Part-time">Part-time</option>
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salary & Location */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Compensation & Location</h3>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-sm font-semibold text-slate-700">Pay Rate (₫)</label>
              <input 
                type="number" 
                name="payRate"
                value={jobForm.payRate}
                onChange={handleNumberChange}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="e.g. 25000"
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-sm font-semibold text-slate-700">Pay Unit</label>
              <select
                name="payUnit"
                value={jobForm.payUnit}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="Hourly">per Hour</option>
                <option value="Daily">per Day</option>
                <option value="Monthly">per Month</option>
                <option value="Fixed">Fixed/Project</option>
              </select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-sm font-semibold text-slate-700">City / Province</label>
              <select
                name="city"
                value={jobForm.city}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="Cần Thơ">Cần Thơ</option>
                <option value="Other">Other...</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">District *</label>
              <input 
                type="text" 
                name="district"
                value={jobForm.district}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="e.g. Quận 1"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Specific Address *</label>
              <input 
                type="text" 
                name="address"
                value={jobForm.address}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="e.g. 123 Nguyen Hue St"
              />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Job Details</h3>

          <div className="space-y-1.5 h-full">
              <label className="text-sm font-semibold text-slate-700">Application Deadline</label>
              <input 
                type="date" 
                name="applicationDeadline"
                value={jobForm.applicationDeadline}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Job Description *</label>
            <textarea 
              name="description"
              value={jobForm.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y"
              placeholder="Describe the overall responsibilities and tasks..."
            ></textarea>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Requirements</label>
              <textarea 
                name="requirements"
                value={jobForm.requirements}
                onChange={handleChange}
                rows={3}
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y"
                placeholder="- 18+ years old&#10;- Communicative English&#10;..."
              ></textarea>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Benefits</label>
              <textarea 
                name="benefits"
                value={jobForm.benefits}
                onChange={handleChange}
                rows={3}
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y"
                placeholder="- Free parking&#10;- Staff meal included&#10;..."
              ></textarea>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="h-12 px-8 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined !text-xl">publish</span>
            )}
            {isSubmitting ? 'Publishing...' : 'Publish Job Now'}
          </button>
        </div>
      </form>
    </div>
  );
}
