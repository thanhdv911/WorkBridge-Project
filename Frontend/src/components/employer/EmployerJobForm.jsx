import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { translateCategory } from '../../utils/translate';
import GoongAddressPicker from '../shared/GoongAddressPicker';
import { composeStreetAddress, parseStoredGoongAddress } from '../../services/goongAddressService';

const STANDARD_JOB_LIMIT = 2;

const formatVND = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const clean = String(value).replace(/\D/g, '');
  if (!clean) return '';
  return parseInt(clean, 10).toLocaleString('de-DE');
};

const parseVND = (formattedValue) => {
  if (!formattedValue) return 0;
  return Number(String(formattedValue).replace(/\D/g, ''));
};

const parseAddressComponents = (addressStr) => {
  const parsed = parseStoredGoongAddress(addressStr);
  return {
    city: parsed.city || parsed.province || '',
    district: parsed.district || '',
    ward: parsed.ward || '',
    address: parsed.detailAddress || parsed.address || addressStr || ''
  };
};

export default function EmployerJobForm({ onSuccess, editingJobId }) {
  const [jobForm, setJobForm] = useState({
    title: '',
    categoryId: '',
    branchId: '',
    jobType: 'Part-time',
    payRate: '',
    payUnit: 'Hourly',
    city: '',
    district: '',
    ward: '',
    address: '',
    applicationDeadline: '',
    description: '',
    requirements: '',
    benefits: '',
    shiftIds: [],
    position: '',
    vacancies: ''
  });
  const [availableShifts, setAvailableShifts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // VIP Limits States
  const [isVip, setIsVip] = useState(false);
  const [autoApproveJobPosts, setAutoApproveJobPosts] = useState(false);
  const [jobCount, setJobCount] = useState(0);
  const [checkingLimits, setCheckingLimits] = useState(true);

  // AI Optimization States
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizedData, setOptimizedData] = useState(null);

  React.useEffect(() => {
    fetchShifts();
    fetchCategories();
    fetchBranches();
  }, []);

  React.useEffect(() => {
    const checkUserLimits = async () => {
      try {
        const vipRes = await api.get('/subscriptions/status');
        setIsVip(vipRes.data.isVip);
        setAutoApproveJobPosts(Boolean(vipRes.data.autoApproveJobPosts));

        if (editingJobId) return;
        const jobsRes = await api.get('/employer/jobs');

        const activeJobs = (jobsRes.data || []).filter(j => j.status !== 'Deleted' && !j.isDeleted);
        setJobCount(activeJobs.length);
      } catch (err) {
        console.error('Error checking user limits in form:', err);
      } finally {
        setCheckingLimits(false);
      }
    };

    checkUserLimits();
  }, [editingJobId]);

  const handleAiOptimize = async () => {
    if (!isVip) {
      toast.error('Chức năng tối ưu bài đăng bằng AI chỉ dành riêng cho tài khoản VIP Doanh nghiệp.');
      return;
    }
    if (!jobForm.title || !jobForm.description) {
      toast.error('Vui lòng điền Tiêu đề và Mô tả công việc trước khi tối ưu.');
      return;
    }

    setIsOptimizing(true);
    const loadToast = toast.loading('🤖 AI đang tối ưu bài tuyển dụng...');
    try {
      const res = await api.post('/gemini/optimize-job', {
        title: jobForm.title,
        description: jobForm.description,
        requirements: jobForm.requirements || ''
      });
      toast.dismiss(loadToast);

      if (res.data) {
        setOptimizedData({
          title: res.data.optimizedTitle || jobForm.title,
          description: res.data.optimizedDescription || jobForm.description,
          requirements: res.data.optimizedRequirements || jobForm.requirements
        });
        setShowOptimizeModal(true);
      }
    } catch (error) {
      toast.dismiss(loadToast);
      console.error('Error optimizing job:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tối ưu bài viết.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const applyOptimization = () => {
    if (optimizedData) {
      setJobForm(prev => ({
        ...prev,
        title: optimizedData.title,
        description: optimizedData.description,
        requirements: optimizedData.requirements
      }));
      toast.success('Đã áp dụng nội dung tối ưu từ AI!');
    }
    setShowOptimizeModal(false);
  };

  React.useEffect(() => {
    if (editingJobId) {
      fetchJobDetails();
    } else {
      const params = new URLSearchParams(window.location.search);
      if (params.get('prefill') === 'true') {
        setJobForm({
          title: params.get('title') || '',
          categoryId: params.get('categoryId') || '',
          branchId: params.get('branchId') || '',
          jobType: params.get('jobType') || 'Part-time',
          payRate: params.get('payRate') || '',
          payUnit: params.get('payUnit') || 'Hourly',
          city: params.get('city') || '',
          district: params.get('district') || '',
          ward: params.get('ward') || '',
          address: params.get('address') || '',
          applicationDeadline: params.get('applicationDeadline') || '',
          description: params.get('description') || '',
          requirements: params.get('requirements') || '',
          benefits: params.get('benefits') || '',
          shiftIds: params.get('shiftIds') ? params.get('shiftIds').split(',').map(Number) : [],
          position: params.get('position') || '',
          vacancies: params.get('vacancies') || ''
        });
        toast.success('Đã tự động điền tin tuyển dụng bằng AI!');
      } else {
        setJobForm({
          title: '',
          categoryId: '',
          branchId: '',
          jobType: 'Part-time',
          payRate: '',
          payUnit: 'Hourly',
          city: '',
          district: '',
          ward: '',
          address: '',
          applicationDeadline: '',
          description: '',
          requirements: '',
          benefits: '',
          shiftIds: [],
          position: '',
          vacancies: ''
        });
      }
    }
  }, [editingJobId]);

  React.useEffect(() => {
    if (!editingJobId && branches.length > 0) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('prefill') === 'true') {
        const bId = params.get('branchId');
        if (bId) {
          const selectedBranch = branches.find(b => String(b.branchId) === bId);
          if (selectedBranch) {
            const parsed = parseAddressComponents(selectedBranch.address);
            setJobForm(prev => ({
              ...prev,
              branchId: bId,
              address: parsed.address,
              district: parsed.district,
              ward: parsed.ward,
              city: parsed.city
            }));
          }
        }
      }
    }
  }, [branches, editingJobId]);

  const fetchJobDetails = async () => {
    try {
      const res = await api.get(`/jobs/${editingJobId}`);
      const job = res.data;
      if (job) {
        const parsedAddress = parseStoredGoongAddress([job.address, job.district, job.city].filter(Boolean).join(', '));
        setJobForm({
          title: job.title || '',
          categoryId: job.categoryId ? String(job.categoryId) : '',
          branchId: job.branchId ? String(job.branchId) : '',
          jobType: job.jobType || 'Part-time',
          payRate: job.payRate !== undefined && job.payRate !== null ? formatVND(job.payRate) : '',
          payUnit: job.payUnit || 'Hourly',
          city: job.city || parsedAddress.city || '',
          district: job.district || parsedAddress.district || '',
          ward: parsedAddress.ward || '',
          address: parsedAddress.address || job.address || '',
          applicationDeadline: job.applicationDeadline ? job.applicationDeadline.split('T')[0] : '',
          description: job.description || '',
          requirements: job.requirements || '',
          benefits: job.benefits || '',
          shiftIds: job.shifts ? job.shifts.map(s => s.shiftId) : [],
          position: job.position || '',
          vacancies: job.vacancies ? String(job.vacancies) : ''
        });
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      toast.error('Không thể tải thông tin bài tuyển dụng cần chỉnh sửa.');
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await api.get('/shifts');
      setAvailableShifts(res.data);
    } catch (err) {
      console.error('Error fetching shifts:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/home/categories');
      setCategories(res.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobForm(prev => ({ ...prev, [name]: value }));
  };

  const handleShiftToggle = (shiftId) => {
    setJobForm(prev => {
      const currentShifts = [...prev.shiftIds];
      const index = currentShifts.indexOf(shiftId);
      if (index > -1) {
        currentShifts.splice(index, 1);
      } else {
        currentShifts.push(shiftId);
      }
      return { ...prev, shiftIds: currentShifts };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingJobId && !isVip && jobCount >= STANDARD_JOB_LIMIT) {
      toast.error(`Doanh nghiệp thường chỉ được đăng tối đa ${STANDARD_JOB_LIMIT} tin. Nâng cấp VIP để đăng không giới hạn và được ưu tiên hiển thị.`);
      return;
    }

    if (!jobForm.categoryId) {
      toast.error('Vui lòng chọn danh mục công việc.');
      return;
    }
    if (!jobForm.city || !jobForm.district || !jobForm.ward || !jobForm.address.trim()) {
      toast.error('Vui lòng chọn địa chỉ từ Goong để đồng bộ tỉnh/thành, quận/huyện và phường/xã.');
      return;
    }
    setIsSubmitting(true);

    const { ward, ...jobPayload } = jobForm;
    const payload = {
      ...jobPayload,
      address: composeStreetAddress(jobForm.address, ward),
      categoryId: parseInt(jobForm.categoryId),
      branchId: jobForm.branchId ? parseInt(jobForm.branchId) : null,
      payRate: jobForm.payRate ? parseVND(jobForm.payRate) : null,
      applicationDeadline: jobForm.applicationDeadline ? new Date(jobForm.applicationDeadline).toISOString() : null,
      shiftIds: jobForm.shiftIds,
      position: jobForm.position || null,
      vacancies: jobForm.vacancies ? parseInt(jobForm.vacancies, 10) : null
    };

    try {
      if (editingJobId) {
        const res = await api.put(`/employer/jobs/${editingJobId}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success(res.data?.status === 'Published'
          ? 'Đã cập nhật và xuất bản tin tuyển dụng ngay!'
          : 'Đã cập nhật bài tuyển dụng, đang chờ admin duyệt lại.');
      } else {
        const res = await api.post('/employer/jobs', payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success(res.data?.status === 'Published'
          ? 'Đã đăng tin và hiển thị ngay, không cần admin duyệt!'
          : 'Đã gửi tin tuyển dụng, đang chờ admin duyệt.');
      }
      if (onSuccess) onSuccess();

      if (!editingJobId) {
        // Reset form
        setJobForm({
          ...jobForm,
          title: '',
          categoryId: '',
          branchId: '',
          payRate: '',
          description: '',
          requirements: '',
          benefits: '',
          shiftIds: [],
          position: '',
          vacancies: ''
        });
      }
    } catch (error) {
      let errorMsg = editingJobId ? 'Không thể cập nhật tin tuyển dụng.' : 'Không thể đăng tin tuyển dụng.';
      if (error.response?.data) {
        const data = error.response.data;
        let rawMsg = '';
        if (data.detail) {
          rawMsg = data.detail;
        } else if (data.Detail) {
          rawMsg = data.Detail;
        } else if (data.message) {
          rawMsg = data.message;
        } else if (data.Message) {
          rawMsg = data.Message;
        } else if (data.errors && typeof data.errors === 'object') {
          const errorList = [];
          for (const key in data.errors) {
            if (Array.isArray(data.errors[key])) {
              errorList.push(...data.errors[key]);
            } else if (typeof data.errors[key] === 'string') {
              errorList.push(data.errors[key]);
            }
          }
          if (errorList.length > 0) {
            rawMsg = errorList.join('\n');
          }
        } else if (typeof data === 'string' && data.trim()) {
          rawMsg = data;
        }

        if (rawMsg) {
          // Translate known exception messages to clean Vietnamese
          if (rawMsg.includes("Employer profile is required before posting a job")) {
            errorMsg = "Bạn cần cập nhật đầy đủ Hồ sơ Nhà tuyển dụng trước khi đăng tuyển.";
          } else {
            errorMsg = rawMsg;
          }
        }
      }
      toast.error(errorMsg);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingLimits) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/70 p-12 text-center shadow-sm">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-bold text-sm">Đang kiểm tra giới hạn tin đăng của doanh nghiệp...</p>
      </div>
    );
  }

  if (!isVip && jobCount >= STANDARD_JOB_LIMIT && !editingJobId) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/70 p-8 shadow-xl max-w-3xl mx-auto text-center relative overflow-hidden my-6">
        <div className="absolute w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(245,158,11,.06),transparent_70%)] -top-10 -right-10 rounded-full pointer-events-none blur-[40px]"></div>

        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined !text-4xl text-amber-500 animate-pulse">lock</span>
        </div>

        <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Đã Đạt Giới Hạn Đăng Tin Tuyển Dụng</h3>
        <p className="text-sm text-slate-500 max-w-xl mx-auto mb-8">
          Tài khoản doanh nghiệp thường của bạn hiện đã đăng {jobCount}/{STANDARD_JOB_LIMIT} tin. Bạn cần nâng cấp lên gói VIP Doanh nghiệp để đăng tin tuyển dụng không giới hạn, có huy hiệu lửa VIP và luôn được ưu tiên hiển thị trước tin thường.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto text-left mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <div className="flex gap-2">
            <span className="material-symbols-outlined text-amber-500 !text-lg">check_circle</span>
            <span className="text-xs text-slate-600 font-bold">Đăng tin tuyển dụng KHÔNG giới hạn</span>
          </div>
          <div className="flex gap-2">
            <span className="material-symbols-outlined text-amber-500 !text-lg">check_circle</span>
            <span className="text-xs text-slate-600 font-bold">Tin đăng luôn tự động ghim lên top 1</span>
          </div>
          <div className="flex gap-2">
            <span className="material-symbols-outlined text-amber-500 !text-lg">check_circle</span>
            <span className="text-xs text-slate-600 font-bold">Tự động xếp ca trực thông minh AI</span>
          </div>
          <div className="flex gap-2">
            <span className="material-symbols-outlined text-amber-500 !text-lg">check_circle</span>
            <span className="text-xs text-slate-600 font-bold">Tính lương & quản lý bảng công tự động</span>
          </div>
        </div>

        <button
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set('tab', 'vip');
            window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="inline-flex items-center h-12 px-8 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2"
        >
          <span className="material-symbols-outlined !text-lg">workspace_premium</span>
          Nâng cấp VIP để mở khóa ngay
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden anim-fadeUp-d1">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              {editingJobId ? 'edit_note' : 'add_circle'}
            </span>
            {editingJobId ? 'Chỉnh sửa bài tuyển dụng' : 'Đăng tin tuyển dụng mới'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {editingJobId
              ? 'Thay đổi thông tin chi tiết của bài tuyển dụng và lưu lại.'
              : 'Điền đầy đủ thông tin bên dưới để công bố một vị trí làm việc bán thời gian mới.'}
          </p>
        </div>
      </div>

      {autoApproveJobPosts && (
        <div className="mx-6 mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined !text-[20px]">verified</span>
            VIP Doanh nghiệp 1 năm: tin tuyển dụng sẽ được xuất bản ngay sau khi lưu, không cần admin duyệt.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Thông tin cơ bản</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Tiêu đề công việc *</label>
              <input
                type="text"
                name="title"
                value={jobForm.title}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Ví dụ: Tuyển nhân viên pha chế cuối tuần"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Danh mục *</label>
              <select
                name="categoryId"
                value={jobForm.categoryId}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="">-- Chọn danh mục công việc --</option>
                {categories.map(cat => (
                  <option key={cat.categoryId} value={cat.categoryId}>{translateCategory(cat.name)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Hình thức làm việc *</label>
              <select
                name="jobType"
                value={jobForm.jobType}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="Part-time">Bán thời gian</option>
                <option value="Freelance">Làm tự do (Freelance)</option>
                <option value="Internship">Thực tập (Internship)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Vị trí tuyển dụng *</label>
              <input
                type="text"
                name="position"
                value={jobForm.position}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Ví dụ: Nhân viên pha chế, Thu ngân"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Số lượng tuyển *</label>
              <input
                type="number"
                name="vacancies"
                value={jobForm.vacancies}
                onChange={handleChange}
                required
                min="1"
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Ví dụ: 3"
              />
            </div>
          </div>
        </div>

        {/* Salary & Location */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Mức lương & Địa điểm</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Chi nhánh công ty</label>
              <select
                name="branchId"
                value={jobForm.branchId}
                onChange={(e) => {
                  const bId = e.target.value;
                  setJobForm(prev => {
                    const next = { ...prev, branchId: bId };
                    if (bId) {
                      const selectedBranch = branches.find(b => String(b.branchId) === bId);
                      if (selectedBranch) {
                        const parsed = parseAddressComponents(selectedBranch.address);
                        next.address = parsed.address;
                        next.district = parsed.district;
                        next.ward = parsed.ward;
                        next.city = parsed.city;
                      }
                    }
                    return next;
                  });
                }}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="">-- Chọn chi nhánh công ty (Không bắt buộc) --</option>
                {branches.map(b => (
                  <option key={b.branchId} value={b.branchId}>{b.name} ({b.address})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Mức lương (₫)</label>
              <input
                type="text"
                name="payRate"
                value={formatVND(jobForm.payRate)}
                onChange={(e) => setJobForm(prev => ({ ...prev, payRate: formatVND(e.target.value) }))}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Ví dụ: 25.000"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Đơn vị tính lương</label>
              <select
                name="payUnit"
                value={jobForm.payUnit}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="Hourly">Mỗi giờ</option>
                <option value="Daily">Mỗi ngày</option>
                <option value="Monthly">Mỗi tháng</option>
                <option value="Fixed">Trọn gói / Dự án</option>
              </select>
            </div>
          </div>

          <GoongAddressPicker
            value={{
              address: jobForm.address,
              ward: jobForm.ward,
              district: jobForm.district,
              city: jobForm.city
            }}
            onChange={(next) => setJobForm(prev => ({
              ...prev,
              address: next.address,
              ward: next.ward,
              district: next.district,
              city: next.city
            }))}
            label="Địa chỉ làm việc"
            placeholder="Gõ địa chỉ và chọn gợi ý từ Goong..."
            required
          />
        </div>

        {/* Working Shifts */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Ca làm việc</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableShifts.map(shift => (
              <label
                key={shift.shiftId}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  jobForm.shiftIds.includes(shift.shiftId)
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  jobForm.shiftIds.includes(shift.shiftId)
                    ? 'bg-primary border-primary'
                    : 'bg-white border-slate-300'
                }`}>
                  {jobForm.shiftIds.includes(shift.shiftId) && (
                    <span className="material-symbols-outlined !text-sm text-white">check</span>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={jobForm.shiftIds.includes(shift.shiftId)}
                  onChange={() => handleShiftToggle(shift.shiftId)}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{shift.shiftName}</p>
                  {shift.startTime && (
                    <p className="text-xs text-slate-500">{shift.startTime} - {shift.endTime}</p>
                  )}
                </div>
              </label>
            ))}
            {availableShifts.length === 0 && (
              <p className="text-sm text-slate-400 italic">Đang tải các ca làm việc...</p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800">Chi tiết công việc</h3>
            <button
              type="button"
              onClick={handleAiOptimize}
              disabled={isOptimizing || !isVip}
              title={!isVip ? 'AI tối ưu bài đăng chỉ dành cho Doanh nghiệp VIP' : 'Tối ưu bài đăng bằng AI'}
              className={`text-xs flex items-center gap-1.5 font-bold border rounded-lg px-3 py-1.5 transition-all shadow-sm ${
                isVip
                  ? 'text-indigo-600 hover:text-indigo-500 bg-indigo-50 hover:bg-indigo-100 border-indigo-200/50'
                  : 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined !text-sm">{isVip ? 'auto_awesome' : 'lock'}</span>
              {isVip ? 'AI Tối ưu bài đăng' : 'AI VIP'}
            </button>
          </div>

          <div className="space-y-1.5 h-full">
              <label className="text-sm font-semibold text-slate-700">Hạn chót ứng tuyển</label>
              <input
                type="date"
                name="applicationDeadline"
                value={jobForm.applicationDeadline}
                onChange={handleChange}
                onClick={(e) => {
                  try { e.target.showPicker(); } catch (err) { console.warn('showPicker not supported:', err); }
                }}
                onFocus={(e) => {
                  try { e.target.showPicker(); } catch { return; }
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Mô tả công việc *</label>
            <textarea
              name="description"
              value={jobForm.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y"
              placeholder="Mô tả chi tiết các trách nhiệm và công việc cần làm..."
            ></textarea>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Yêu cầu tuyển dụng</label>
              <textarea
                name="requirements"
                value={jobForm.requirements}
                onChange={handleChange}
                rows={3}
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y"
                placeholder="- Từ 18 tuổi trở lên&#10;- Tiếng Anh giao tiếp tốt&#10;..."
              ></textarea>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Quyền lợi được hưởng</label>
              <textarea
                name="benefits"
                value={jobForm.benefits}
                onChange={handleChange}
                rows={3}
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y"
                placeholder="- Hỗ trợ gửi xe miễn phí&#10;- Hỗ trợ cơm ca&#10;..."
              ></textarea>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
          {editingJobId && (
            <button
              type="button"
              onClick={onSuccess}
              className="h-12 px-6 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 px-8 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined !text-xl">
                {editingJobId ? 'save' : 'publish'}
              </span>
            )}
            {isSubmitting
              ? (editingJobId ? 'Đang lưu...' : 'Đang đăng bài...')
              : (editingJobId ? 'Lưu thay đổi' : 'Đăng tuyển ngay')}
          </button>
        </div>
      </form>

      {/* AI Optimize Modal */}
      {showOptimizeModal && optimizedData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">auto_awesome</span>
                <span className="font-bold text-sm uppercase tracking-wide">
                  Đề xuất tối ưu tin tuyển dụng bằng WorkBridge AI
                </span>
              </div>
              <button
                onClick={() => setShowOptimizeModal(false)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {/* Compare Title */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wide">Tiêu đề công việc</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-500">
                    <span className="text-[10px] font-bold uppercase block mb-1 text-slate-400">Bản gốc</span>
                    {jobForm.title}
                  </div>
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 text-sm text-indigo-900 font-medium">
                    <span className="text-[10px] font-bold uppercase block mb-1 text-indigo-400">AI tối ưu</span>
                    {optimizedData.title}
                  </div>
                </div>
              </div>

              {/* Compare Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wide">Mô tả công việc</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-500 whitespace-pre-wrap">
                    <span className="text-[10px] font-bold uppercase block mb-1 text-slate-400">Bản gốc</span>
                    {jobForm.description}
                  </div>
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed">
                    <span className="text-[10px] font-bold uppercase block mb-1 text-indigo-400">AI tối ưu</span>
                    {optimizedData.description}
                  </div>
                </div>
              </div>

              {/* Compare Requirements */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wide">Yêu cầu tuyển dụng</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-500 whitespace-pre-wrap">
                    <span className="text-[10px] font-bold uppercase block mb-1 text-slate-400">Bản gốc</span>
                    {jobForm.requirements || 'Chưa nhập'}
                  </div>
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed">
                    <span className="text-[10px] font-bold uppercase block mb-1 text-indigo-400">AI tối ưu</span>
                    {optimizedData.requirements || 'Không thay đổi'}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white p-5 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 italic">
                * Bạn có thể tiếp tục chỉnh sửa nội dung sau khi áp dụng.
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowOptimizeModal(false)}
                  className="h-10 px-5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Giữ nguyên bản gốc
                </button>
                <button
                  type="button"
                  onClick={applyOptimization}
                  className="h-10 px-6 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all"
                >
                  Áp dụng đề xuất AI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
