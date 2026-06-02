import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { API_BASE_URL } from '../../services/api';
import toast from 'react-hot-toast';
import GoongAddressPicker from '../shared/GoongAddressPicker';
import { parseStoredGoongAddress } from '../../services/goongAddressService';

const asList = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const clampScore = (value) => {
  const score = Number(value);
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(10, score));
};
const getFileNameFromUrl = (url) => {
  const rawName = String(url || '').split('/').pop() || 'CV.pdf';
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
};
const toAbsoluteFileUrl = (url) => {
  if (!url) return '';
  const value = String(url).trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};
export default function ProfileContent({ user, setUser, isEditing, editForm, setEditForm, onSave, onCancel, isOwnProfile = true, activeTab = 'overview' }) {
  const [cvLoading, setCvLoading] = useState(false);
  const [employments, setEmployments] = useState([]);
  const [employmentsLoading, setEmploymentsLoading] = useState(true);

  // AI CV Review States
  const [isAnalyzingCv, setIsAnalyzingCv] = useState(false);
  const [showCvAnalysisModal, setShowCvAnalysisModal] = useState(false);
  const [cvAnalysisData, setCvAnalysisData] = useState(null);
  const [isVip, setIsVip] = useState(false);
  const [checkingVip, setCheckingVip] = useState(false);
  const cvPreviewUrl = toAbsoluteFileUrl(user?.cvUrl);
  const cvFileName = user?.cvUrl ? getFileNameFromUrl(user.cvUrl) : '';
  const cvScore = clampScore(cvAnalysisData?.score);
  const cvScorePercent = `${cvScore * 10}%`;
  const cvStrengths = asList(cvAnalysisData?.strengths);
  const cvIssues = asList(cvAnalysisData?.issues);
  const cvSuggestions = asList(cvAnalysisData?.suggestions);
  const cvDetectedContent = asList(cvAnalysisData?.detectedContent);
  const cvMissingInformation = asList(cvAnalysisData?.missingInformation);

  useEffect(() => {
    if (user?.userId) {
      fetchEmployments();
    }
  }, [user?.userId]);

  useEffect(() => {
    if (!isOwnProfile) return;

    setCheckingVip(true);
    api.get('/subscriptions/status')
      .then(res => setIsVip(Boolean(res.data?.isVip)))
      .catch(() => setIsVip(false))
      .finally(() => setCheckingVip(false));
  }, [isOwnProfile]);


  const fetchEmployments = async () => {
    setEmploymentsLoading(true);
    try {
      const res = await api.get(`/workforce/applicant/${user.userId}/employments`);
      setEmployments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching employments:', err);
      setEmployments([]);
    } finally {
      setEmploymentsLoading(false);
    }
  };

  const handleAiAnalyzeCv = async () => {
    if (!user) return;
    if (!isVip) {
      toast.error('AI đánh giá CV chỉ dành cho Cá nhân VIP.');
      return;
    }
    if (!user?.cvUrl) {
      toast.error('Vui lòng upload CV PDF trước khi dùng AI đánh giá.');
      return;
    }

    setIsAnalyzingCv(true);
    const loadToast = toast.loading('AI đang đọc CV PDF và phân tích...');
    try {
      const res = await api.post('/cv/analyze', {});

      toast.dismiss(loadToast);
      if (res.data) {
        setCvAnalysisData(res.data);
        setShowCvAnalysisModal(true);
      }
    } catch (error) {
      toast.dismiss(loadToast);
      console.error('Error analyzing CV:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi phân tích CV.');
    } finally {
      setIsAnalyzingCv(false);
    }
  };


  const calculateDuration = (startDateStr, endDateStr) => {
    if (!startDateStr) return 'Không rõ';
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return 'Không rõ';
    const end = endDateStr ? new Date(endDateStr) : new Date();
    if (isNaN(end.getTime())) return 'Không rõ';

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} năm`);
    if (months > 0) parts.push(`${months} tháng`);
    if (days > 0 || parts.length === 0) parts.push(`${days} ngày`);

    return parts.join(' ');
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
       toast.error('Vui lòng tải lên tệp tin định dạng PDF.');
       return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setCvLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/profile/applicant/upload-cv', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUser({ ...user, cvUrl: res.data.cvUrl });
      toast.success('Đã tải lên CV thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải lên CV.');
    } finally {
      setCvLoading(false);
    }
  };

  const handleDeleteCv = async () => {
    if (!user?.cvUrl || cvLoading) return;
    if (!window.confirm('Xóa CV PDF hiện tại khỏi hồ sơ?')) return;

    setCvLoading(true);
    try {
      await api.delete('/profile/applicant/cv');
      setUser({ ...user, cvUrl: null });
      setCvAnalysisData(null);
      setShowCvAnalysisModal(false);
      toast.success('Đã xóa CV hiện tại.');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể xóa CV hiện tại.');
    } finally {
      setCvLoading(false);
    }
  };

  const renderEmploymentHistory = () => {
    return (
      <div className="anim-fadeUp bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8">
        <h2 className="text-base font-bold flex items-center gap-2 mb-6 text-slate-800">
          <span className="material-symbols-outlined text-primary !text-lg">work_history</span>Lịch sử làm việc
        </h2>

        {employmentsLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-semibold">Đang tải lịch sử làm việc...</p>
          </div>
        ) : !employments || employments.length === 0 ? (
          <div className="space-y-3 text-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <span className="material-symbols-outlined !text-3xl text-slate-350">work_off</span>
            <p className="text-xs font-semibold">Không tìm thấy lịch sử làm việc chính thức.</p>
          </div>
        ) : (
          <div className="relative pl-5 border-l border-slate-100 space-y-6">
            {Array.isArray(employments) && employments.map((emp) => {
              if (!emp) return null;
              const isActive = !emp.endDate || emp.status === 'Active';
              const duration = calculateDuration(emp.startDate, emp.endDate);

              const formatMyDate = (dateStr) => {
                if (!dateStr) return 'N/A';
                const d = new Date(dateStr);
                return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
              };

              const startDateFormatted = formatMyDate(emp.startDate);
              const endDateFormatted = emp.endDate ? formatMyDate(emp.endDate) : 'Hiện tại';

              return (
                <div key={emp.employmentId} className="relative group">
                  {/* Timeline dot */}
                  <div className={`absolute -left-[28px] top-1.5 w-3 h-3 rounded-full border-2 bg-white transition-all group-hover:scale-125 ${
                    isActive
                      ? 'border-emerald-500 ring-4 ring-emerald-50'
                      : 'border-slate-300 ring-4 ring-slate-50'
                  }`} />

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 rounded-xl bg-slate-50/60 border border-slate-100 hover:border-primary/25 hover:bg-white transition-all duration-300 shadow-sm hover:shadow">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 text-sm">{emp.position}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {isActive ? 'Đang làm việc' : 'Đã kết thúc'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-bold mt-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined !text-[14px] text-slate-400">domain</span>
                        {emp.companyName} <span className="text-slate-300 font-normal">|</span> <span className="font-medium text-slate-400">{emp.branchName}</span>
                      </p>

                      <div className="mt-2.5 flex items-center gap-3 text-[10px] font-bold text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                          <span className="material-symbols-outlined !text-[12px]">calendar_month</span>
                          {startDateFormatted} – {endDateFormatted}
                        </span>
                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                          <span className="material-symbols-outlined !text-[12px]">history</span>
                          {duration}
                        </span>
                      </div>
                    </div>

                     <div className="sm:text-right shrink-0 mt-1 sm:mt-0 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lương theo giờ</div>
                      <div className="text-sm font-black text-primary mt-0.5">
                        {(emp.currentHourlyRate || 0).toLocaleString('vi-VN')} ₫/giờ
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCvPdfSection = () => (
    <section className="anim-fadeUp overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-black text-slate-950">CV PDF</h2>
            {user?.cvUrl && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
                Đã có file
              </span>
            )}
            {isVip && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-[#1687d9]">
                AI VIP
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {user?.cvUrl ? cvFileName : 'Upload file PDF có text để AI đọc, chấm điểm và gợi ý cải thiện.'}
          </p>
        </div>

        {isOwnProfile && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-[#1687d9]/40 hover:text-[#1687d9]">
              <input
                type="file"
                accept=".pdf"
                onChange={handleCvUpload}
                className="hidden"
                disabled={cvLoading}
              />
              <span className="material-symbols-outlined !text-[16px]">{cvLoading ? 'progress_activity' : 'upload_file'}</span>
              {user?.cvUrl ? 'Thay CV' : 'Upload CV'}
            </label>
            <button
              type="button"
              onClick={handleAiAnalyzeCv}
              disabled={!user?.cvUrl || isAnalyzingCv || checkingVip}
              className="ai-cv-cta inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-950 via-[#1687d9] to-emerald-500 px-4 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined !text-[16px]">{isVip ? 'psychology' : 'lock'}</span>
              {isAnalyzingCv ? 'AI đang đọc...' : 'AI đọc & chấm CV'}
            </button>
            {user?.cvUrl && (
              <button
                type="button"
                onClick={handleDeleteCv}
                disabled={cvLoading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 text-xs font-black text-rose-600 transition hover:border-rose-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined !text-[16px]">delete</span>
                Xóa CV
              </button>
            )}
            {user?.cvUrl && (
              <a
                href={cvPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-[#1687d9]/40 hover:text-[#1687d9]"
              >
                <span className="material-symbols-outlined !text-[16px]">open_in_new</span>
                Mở PDF
              </a>
            )}
          </div>
        )}
      </div>

      {user?.cvUrl ? (
        <div className={`grid min-h-0 ${isOwnProfile ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : ''}`}>
          <div className="bg-slate-100">
            <iframe
              key={cvPreviewUrl}
              src={`${cvPreviewUrl}#toolbar=0&navpanes=0&view=FitH`}
              width="100%"
              height="100%"
              title="CV PDF"
              className="h-[72vh] min-h-[620px] w-full border-0 bg-white"
            />
          </div>

          {isOwnProfile && (
            <aside className="border-t border-slate-200 bg-white p-4 xl:border-l xl:border-t-0">
              <div className="ai-cv-panel overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl shadow-blue-950/10">
                <div className="vip-scanline absolute inset-0 opacity-20" />
                <div className="relative z-10 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">WorkBridge AI</p>
                      <h3 className="mt-1 text-lg font-black">CV Coach</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-blue-100">
                      <span className="material-symbols-outlined !text-[28px]">auto_awesome</span>
                    </div>
                  </div>

                  {cvAnalysisData ? (
                    <div className="mt-5">
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-black leading-none">{cvScore}</span>
                        <span className="pb-2 text-sm font-black text-blue-100/70">/10</span>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-sky-300 to-fuchsia-300" style={{ width: cvScorePercent }} />
                      </div>
                      <p className="mt-4 text-xs font-semibold leading-relaxed text-blue-50/85">
                        {cvAnalysisData.summary || cvAnalysisData.pdfNote || 'AI đã đọc CV PDF.'}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
                      <p className="text-sm font-black">Chấm điểm CV PDF bằng AI</p>
                      <p className="mt-2 text-xs font-semibold leading-relaxed text-blue-50/75">
                        AI đọc nội dung trong PDF, tìm lỗi yếu, phần còn thiếu và đưa ra gợi ý cải thiện.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAiAnalyzeCv}
                    disabled={!user?.cvUrl || isAnalyzingCv || checkingVip}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined !text-[17px]">{isVip ? 'psychology' : 'lock'}</span>
                    {isAnalyzingCv ? 'AI đang phân tích...' : cvAnalysisData ? 'Đọc lại bằng AI' : 'AI đọc & chấm CV'}
                  </button>
                </div>
              </div>

              {cvAnalysisData && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Lỗi', cvIssues.length, 'text-rose-600'],
                    ['Thiếu', cvMissingInformation.length, 'text-amber-600'],
                    ['Gợi ý', cvSuggestions.length, 'text-[#1687d9]']
                  ].map(([label, value, colorClass]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-white px-2 py-3 shadow-sm">
                      <p className={`text-xl font-black ${colorClass}`}>{value}</p>
                      <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {cvAnalysisData?.readable === false && (
                <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold leading-relaxed text-amber-800">
                  {cvAnalysisData.pdfNote || 'PDF này chưa trích xuất được text.'}
                </p>
              )}

              <div className="mt-3 grid gap-2">
                {cvAnalysisData && (
                  <button
                    type="button"
                    onClick={() => setShowCvAnalysisModal(true)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800"
                  >
                    <span className="material-symbols-outlined !text-[16px]">forum</span>
                    Mở bản tư vấn AI
                  </button>
                )}
              </div>
            </aside>
          )}
        </div>
      ) : (
        <label className="flex min-h-[420px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-[#1687d9]/50 hover:bg-blue-50/40">
          <input
            type="file"
            accept=".pdf"
            onChange={handleCvUpload}
            className="hidden"
            disabled={cvLoading}
          />
          <span className="material-symbols-outlined !text-5xl text-slate-300">{cvLoading ? 'progress_activity' : 'upload_file'}</span>
          <p className="mt-3 text-sm font-black text-slate-700">{cvLoading ? 'Đang upload CV...' : 'Upload CV PDF'}</p>
          <p className="mt-1 max-w-sm text-xs font-semibold leading-relaxed text-slate-400">
            Dùng file PDF dưới 5MB. File có text sẽ giúp AI đọc nội dung và chấm CV chính xác.
          </p>
        </label>
      )}
    </section>
  );

  if (isEditing) {
    const parsedEditAddress = parseStoredGoongAddress(editForm.address || '');

    return (
      <div className="space-y-6">
        <div className="anim-fadeUp bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-primary">
            <span className="material-symbols-outlined !text-xl">edit_document</span>Chỉnh sửa hồ sơ
          </h2>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={editForm.fullName || ''}
                  onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Trường Đại học/Cao đẳng</label>
                <input
                  type="text"
                  value={editForm.university || ''}
                  onChange={(e) => setEditForm({...editForm, university: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Chuyên ngành</label>
                <input
                  type="text"
                  value={editForm.major || ''}
                  onChange={(e) => setEditForm({...editForm, major: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Năm học</label>
                <select
                  value={editForm.studyYear || ''}
                  onChange={(e) => setEditForm({...editForm, studyYear: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm bg-white"
                >
                  <option value="">Chọn năm học</option>
                  <option value="1st Year Student">Sinh viên năm 1</option>
                  <option value="2nd Year Student">Sinh viên năm 2</option>
                  <option value="3rd Year Student">Sinh viên năm 3</option>
                  <option value="4th Year Student">Sinh viên năm 4</option>
                  <option value="Graduated">Đã tốt nghiệp</option>
                </select>
              </div>
            </div>

            <div>
              <GoongAddressPicker
                value={{
                  address: parsedEditAddress.address,
                  ward: parsedEditAddress.ward,
                  district: parsedEditAddress.district,
                  city: parsedEditAddress.city || parsedEditAddress.province
                }}
                onChange={(next, meta) => setEditForm({ ...editForm, address: meta.fullAddress || next.address })}
                label="Địa chỉ"
                placeholder="Gõ địa chỉ và chọn gợi ý từ Goong..."
                showMapLink={false}
                compact
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Giới thiệu bản thân</label>
              <textarea
                rows="4"
                value={editForm.aboutMe || ''}
                onChange={(e) => setEditForm({...editForm, aboutMe: e.target.value})}
                className="w-full p-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm resize-none"
                placeholder="Viết một đoạn giới thiệu ngắn về bản thân bạn..."
              ></textarea>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={onSave}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-primary-dk text-white font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              >
                Lưu thay đổi
              </button>
              <button
                onClick={onCancel}
                className="h-11 px-6 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. OVERVIEW TAB: About Me + CV Upload */}
      {activeTab === 'overview' && (
        <>
          {/* About Me */}
          <div className="anim-fadeUp bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8">
            <h2 className="text-base font-bold flex items-center gap-2 mb-4 text-slate-800">
              <span className="material-symbols-outlined text-primary !text-lg">person</span>Giới thiệu bản thân
            </h2>
            {user?.aboutMe ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{user.aboutMe}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Chưa có phần giới thiệu bản thân.</p>
            )}
          </div>

          {renderCvPdfSection()}

        </>
      )}

      {/* 2. EXPERIENCE TAB: Employment History + Availability Grid */}
      {activeTab === 'experience' && (
        <>
          {renderEmploymentHistory()}

          {/* Availability Grid */}
          <div className="anim-fadeUp bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8">
            <h2 className="text-base font-bold flex items-center gap-2 mb-4 text-slate-800">
              <span className="material-symbols-outlined text-primary !text-lg">event_available</span>Thời gian rảnh hàng tuần
            </h2>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              <div className="text-[10px] font-bold text-slate-400 pb-1">T2</div>
              <div className="text-[10px] font-bold text-slate-400 pb-1">T3</div>
              <div className="text-[10px] font-bold text-slate-400 pb-1">T4</div>
              <div className="text-[10px] font-bold text-slate-400 pb-1">T5</div>
              <div className="text-[10px] font-bold text-slate-400 pb-1">T6</div>
              <div className="text-[10px] font-bold text-slate-400 pb-1">T7</div>
              <div className="text-[10px] font-bold text-slate-400 pb-1">CN</div>

              <div className="py-2.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black">Sáng</div>
              <div className="py-2.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black">Sáng</div>
              <div className="py-2.5 rounded-lg bg-slate-50 text-slate-300 text-[10px] font-semibold">—</div>
              <div className="py-2.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black">Sáng</div>
              <div className="py-2.5 rounded-lg bg-slate-50 text-slate-300 text-[10px] font-semibold">—</div>
              <div className="py-2.5 rounded-lg bg-green-50 text-green-600 text-[10px] font-black">Cả ngày</div>
              <div className="py-2.5 rounded-lg bg-green-50 text-green-600 text-[10px] font-black">Cả ngày</div>
            </div>
          </div>
        </>
      )}
      {/* AI CV Analysis Modal */}
      {showCvAnalysisModal && cvAnalysisData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="flex max-h-[88vh] w-full max-w-5xl animate-in zoom-in-95 flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
            <div className="shrink-0 bg-slate-950 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                    <span className="material-symbols-outlined !text-[22px]">auto_awesome</span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black">WorkBridge AI CV Review</h3>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-100">
                        Đọc PDF + hồ sơ
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-300">
                      Đánh giá nội dung PDF, chỉ ra điểm mạnh, vấn đề và hướng nâng điểm CV.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCvAnalysisModal(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80 transition-all hover:bg-white/15 hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto bg-[#f5f8fb] p-5 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Điểm CV</div>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-5xl font-black leading-none text-slate-950">{cvScore || cvAnalysisData.score}</span>
                    <span className="pb-1 text-sm font-black text-slate-400">/10</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#1687d9] to-emerald-400" style={{ width: cvScorePercent }} />
                  </div>
                  <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">
                    AI chấm theo độ rõ ràng, bố cục, nội dung PDF và mức phù hợp với việc bán thời gian.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#1687d9]">
                      Tổng quan
                    </span>
                    {cvAnalysisData.readable === false && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                        PDF khó đọc text
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-700">
                    {cvAnalysisData.summary || 'AI đã phân tích CV và đưa ra các gợi ý cải thiện bên dưới.'}
                  </p>
                  {cvAnalysisData.recruiterNote && (
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#1687d9]">
                        <span className="material-symbols-outlined !text-[16px]">visibility</span>
                        Góc nhìn nhà tuyển dụng
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{cvAnalysisData.recruiterNote}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#1687d9]">
                    <span className="material-symbols-outlined !text-[17px]">fact_check</span>
                    CV đang có
                  </h4>
                  <div className="mt-3 space-y-2.5">
                    {cvDetectedContent.length > 0 ? cvDetectedContent.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-slate-600">
                        <span className="material-symbols-outlined !text-[15px] text-[#1687d9]">check</span>
                        <span>{item}</span>
                      </div>
                    )) : (
                      <p className="text-xs font-medium italic text-slate-400">AI chưa tách riêng nội dung đã có.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-700">
                    <span className="material-symbols-outlined !text-[17px]">add_task</span>
                    Nên bổ sung
                  </h4>
                  <div className="mt-3 space-y-2.5">
                    {cvMissingInformation.length > 0 ? cvMissingInformation.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-slate-600">
                        <span className="material-symbols-outlined !text-[15px] text-amber-500">add_circle</span>
                        <span>{item}</span>
                      </div>
                    )) : (
                      <p className="text-xs font-medium italic text-slate-400">CV chưa thiếu thông tin lớn theo AI.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                    <span className="material-symbols-outlined !text-[17px]">verified</span>
                    Điểm mạnh
                  </h4>
                  <div className="mt-3 space-y-2.5">
                    {cvStrengths.length > 0 ? cvStrengths.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-slate-600">
                        <span className="material-symbols-outlined !text-[15px] text-emerald-500">check_circle</span>
                        <span>{item}</span>
                      </div>
                    )) : (
                      <p className="text-xs font-medium italic text-slate-400">AI chưa tách riêng điểm mạnh.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-rose-700">
                    <span className="material-symbols-outlined !text-[17px]">priority_high</span>
                    Vấn đề nên sửa
                  </h4>
                  <div className="mt-3 space-y-2.5">
                    {cvIssues.length > 0 ? cvIssues.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-slate-600">
                        <span className="material-symbols-outlined !text-[15px] text-rose-500">error</span>
                        <span>{item}</span>
                      </div>
                    )) : (
                      <p className="text-xs font-medium italic text-slate-400">AI không thấy lỗi lớn cần cảnh báo.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  <span className="material-symbols-outlined !text-[17px] text-[#1687d9]">tips_and_updates</span>
                  Gợi ý cải thiện nhanh
                </h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {cvSuggestions.length > 0 ? cvSuggestions.map((sug, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-600">
                      <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#1687d9] text-[11px] font-black text-white">{idx + 1}</span>
                      <p>{sug}</p>
                    </div>
                  )) : (
                    <p className="text-xs font-medium italic text-slate-400">Chưa có gợi ý cụ thể.</p>
                  )}
                </div>
              </div>

            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-medium text-slate-400">
                AI chỉ đánh giá và gợi ý nội dung. Bạn cập nhật CV trong file gốc rồi upload lại bản PDF mới khi cần.
              </span>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowCvAnalysisModal(false)}
                  className="h-10 rounded-xl bg-slate-100 px-5 text-xs font-black text-slate-600 transition-all hover:bg-slate-200"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
