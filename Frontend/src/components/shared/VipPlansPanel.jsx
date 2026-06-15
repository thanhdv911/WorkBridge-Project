import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../../services/api';
import Pagination from './Pagination';

const AUDIENCE_COPY = {
  Applicant: {
    badge: 'Cá nhân VIP',
    title: 'Nâng cấp VIP để mở khóa WorkBridge AI',
    subtitle: 'Biến WorkBridge thành trợ lý tìm việc riêng: gợi ý việc làm thật, chỉnh CV, luyện phỏng vấn và nhắc các bước quan trọng.',
    activeTitle: 'Bạn đang là Cá nhân VIP',
    activeSubtitle: 'Các tính năng AI tìm việc, đánh giá CV và gợi ý việc làm đang được mở khóa.',
    success: 'Thanh toán thành công! Gói VIP Cá nhân đã được kích hoạt.',
    paymentTitle: 'Thanh toán gói VIP Cá nhân',
    campaign: ['AI gợi ý việc hợp hồ sơ', 'CV được soi lỗi nhanh', 'Luyện phỏng vấn tự tin', 'Ưu tiên trải nghiệm VIP'],
    spotlights: [],
    features: [
      ['smart_toy', 'Chat với WorkBridge AI'],
      ['description', 'AI đánh giá và gợi ý sửa CV'],
      ['work', 'Gợi ý việc đang tuyển từ dữ liệu thật'],
      ['record_voice_over', 'Chuẩn bị phỏng vấn và nhắn nhà tuyển dụng']
    ]
  },
  Employer: {
    badge: 'Doanh nghiệp VIP',
    title: 'Nâng cấp VIP Doanh nghiệp',
    subtitle: 'Mở khóa AI tuyển dụng, xếp ca, chấm công, tính lương và ưu tiên hiển thị tin tuyển dụng.',
    activeTitle: 'Doanh nghiệp đang dùng VIP',
    activeSubtitle: 'Các tính năng AI vận hành, xếp ca và tính lương đang được mở khóa.',
    success: 'Thanh toán thành công! Gói VIP Doanh nghiệp đã được kích hoạt.',
    paymentTitle: 'Thanh toán gói VIP Doanh nghiệp',
    campaign: ['Tin tuyển dụng nổi bật hơn', 'AI hỗ trợ tuyển nhanh', 'Gói 1 năm tự xuất bản tin', 'Xếp ca thông minh', 'Vận hành gọn hơn'],
    spotlights: [],
    features: [
      ['auto_awesome', 'AI tối ưu tin tuyển dụng'],
      ['calendar_month', 'AI tư vấn và tự động xếp ca'],
      ['payments', 'Tính lương và duyệt bảng lương'],
      ['local_fire_department', 'Ưu tiên hiển thị tin tuyển dụng'],
      ['verified', 'Gói 1 năm tự xuất bản tin tuyển dụng']
    ]
  }
};

const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN');
const TRANSACTION_PAGE_SIZE = 5;

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatCountdown = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const transactionStatusLabel = (status) => {
  if (status === 'Active') return 'Thành công';
  if (status === 'Pending') return 'Đang chờ';
  if (status === 'Cancelled' || status === 'Expired') return 'Đã hủy';
  return status || '--';
};

const transactionStatusClass = (status) => {
  if (status === 'Active') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (status === 'Pending') return 'bg-amber-50 text-amber-700 ring-amber-100';
  if (status === 'Cancelled' || status === 'Expired') return 'bg-rose-50 text-rose-700 ring-rose-100';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
};

const formatDuration = (days) => {
  if (days === 7) return '7 ngày';
  if (days === 30) return '1 tháng';
  if (days === 365) return '1 năm';
  return `${days} ngày`;
};

const getPlanBadge = (days) => {
  if (days === 7) return 'Dùng thử nhanh';
  if (days === 30) return 'Được chọn nhiều';
  if (days === 365) return 'Quyền lực nhất';
  return 'Linh hoạt';
};

const getPlanTheme = (days) => {
  if (days === 7) {
    return {
      border: 'border-sky-300',
      ring: 'hover:shadow-sky-200/80',
      icon: 'school',
      iconBg: 'bg-sky-500',
      accentText: 'text-sky-600',
      badgeBg: 'bg-sky-500',
      priceBox: 'border-sky-200 bg-sky-50/80 text-sky-600',
      button: 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/25',
      glow: 'bg-sky-300/25'
    };
  }

  if (days === 365) {
    return {
      border: 'border-fuchsia-400',
      ring: 'hover:shadow-fuchsia-200/80',
      icon: 'diamond',
      iconBg: 'bg-fuchsia-600',
      accentText: 'text-fuchsia-600',
      badgeBg: 'bg-fuchsia-600',
      priceBox: 'border-fuchsia-200 bg-fuchsia-50/80 text-fuchsia-600',
      button: 'bg-fuchsia-600 hover:bg-fuchsia-700 shadow-fuchsia-500/25',
      glow: 'bg-fuchsia-300/25'
    };
  }

  return {
    border: 'border-teal-400',
    ring: 'hover:shadow-teal-200/80',
    icon: 'workspace_premium',
    iconBg: 'bg-teal-500',
    accentText: 'text-teal-600',
    badgeBg: 'bg-teal-500',
    priceBox: 'border-teal-200 bg-teal-50/80 text-teal-600',
    button: 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/25',
    glow: 'bg-teal-300/25'
  };
};

const getPlanHighlights = (days, audience) => {
  const applicant = {
    7: ['Mở WorkBridge AI trong 7 ngày', 'Gợi ý sửa CV và luyện phỏng vấn', 'Chat AI tìm việc mọi lúc', 'Gợi ý job đang tuyển từ dữ liệu thật', 'Phù hợp để thử trước khi dùng lâu dài'],
    30: ['Truy cập AI xuyên suốt 1 tháng', 'Gợi ý việc đang tuyển theo hồ sơ', 'Soi CV và đề xuất chỉnh nhanh', 'Chuẩn bị câu trả lời phỏng vấn', 'Cân bằng tốt giữa chi phí và hiệu quả'],
    365: ['Dùng AI dài hạn cả năm', 'Theo sát hành trình tìm việc và đi làm', 'Nhắc bước quan trọng trong hồ sơ', 'Tối ưu CV nhiều lần trong năm', 'Tiết kiệm nhất cho ứng viên dùng thường xuyên']
  };
  const employer = {
    7: ['Mở nhanh bộ công cụ VIP', 'Thử AI tối ưu tin và quy trình tuyển', 'Tin có nhãn VIP nổi bật', 'Đăng tuyển vượt giới hạn thường', 'Phù hợp cho chiến dịch ngắn'],
    30: ['Dùng VIP cho một chu kỳ tuyển dụng', 'Tối ưu tin, ca làm và vận hành', 'Ưu tiên hiển thị trong danh sách việc', 'AI hỗ trợ quản lý ca và lương', 'Gói dễ triển khai cho đội nhỏ'],
    365: ['Đăng tin tuyển dụng không cần admin duyệt', 'Tự xuất bản ngay sau khi lưu tin', 'Kích hoạt VIP dài hạn cho doanh nghiệp', 'Duy trì ưu tiên hiển thị và AI vận hành', 'Tối ưu chi phí cho nhu cầu liên tục']
  };

  const source = audience === 'Employer' ? employer : applicant;
  return source[days] || ['Mở khóa quyền VIP WorkBridge', 'Dùng AI theo loại tài khoản', 'Thanh toán và kích hoạt tự động', 'Ưu tiên trải nghiệm WorkBridge', 'Theo dõi quyền lợi trong tài khoản'];
};

export default function VipPlansPanel({ audience = 'Applicant' }) {
  const copy = AUDIENCE_COPY[audience] || AUDIENCE_COPY.Applicant;
  const [searchParams, setSearchParams] = useSearchParams();
  const [vipInfo, setVipInfo] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [buyingPlanId, setBuyingPlanId] = useState(null);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [payingSubscriptionId, setPayingSubscriptionId] = useState(null);
  const [payingOrderCode, setPayingOrderCode] = useState(null);
  const [paymentExpiresAt, setPaymentExpiresAt] = useState(null);
  const [paymentCountdown, setPaymentCountdown] = useState(0);
  const [cancelingPayment, setCancelingPayment] = useState(false);
  const [transactionSummary, setTransactionSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionMeta, setTransactionMeta] = useState({
    page: 1,
    pageSize: TRANSACTION_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1
  });
  const [returnConfirming, setReturnConfirming] = useState(false);
  const [paymentCheckLoading, setPaymentCheckLoading] = useState(false);
  const [paymentCheckNote, setPaymentCheckNote] = useState('Đang tự động kiểm tra thanh toán...');
  const [paymentSuccessView, setPaymentSuccessView] = useState(null);
  const buyInFlightRef = useRef(false);
  const activePaymentRef = useRef({ paymentRequest: null, subscriptionId: null, orderCode: null, expiresAt: null });
  const cancelInFlightRef = useRef(false);
  const paymentSuccessHandledRef = useRef(false);
  const successTimerRef = useRef(null);

  const confirmId = searchParams.get('confirmId');
  const returnOrderCode = searchParams.get('orderCode');
  const returnStatus = searchParams.get('status');
  const returnCancel = searchParams.get('cancel');
  const paymentCancelled = searchParams.get('payment') === 'cancelled' || returnCancel === 'true' || returnCancel === '1';

  const activePlanId = vipInfo?.planId;
  const paymentStorageKey = useMemo(() => `workbridge.pendingVipPayment.${audience}`, [audience]);
  const returnedPaidOrderCode = returnOrderCode && String(returnStatus || '').toUpperCase() === 'PAID'
    ? returnOrderCode
    : '';

  const bestPlanId = useMemo(() => {
    if (!plans.length) return null;
    const monthly = plans.find(plan => Number(plan.durationDays) === 30);
    return monthly?.subscriptionPlanId || plans[Math.min(1, plans.length - 1)]?.subscriptionPlanId;
  }, [plans]);

  const getOrderCodeFromPayment = (payment, fallback = null) => {
    const value = payment?.orderCode || payment?.paymentOrderCode || payment?.data?.orderCode || fallback;
    return value ? String(value) : null;
  };

  const clearStoredPayment = () => {
    try {
      localStorage.removeItem(paymentStorageKey);
    } catch {
      // localStorage can fail in private or restricted browser contexts.
    }
  };

  const readStoredPayment = () => {
    try {
      const raw = localStorage.getItem(paymentStorageKey);
      if (!raw) return null;

      return JSON.parse(raw);
    } catch {
      clearStoredPayment();
      return null;
    }
  };

  const getActivePaymentIds = () => {
    const active = activePaymentRef.current || {};
    const saved = readStoredPayment();
    const savedOrderCode = saved?.payment
      ? getOrderCodeFromPayment(saved.payment, saved.orderCode)
      : saved?.orderCode;

    return {
      subscriptionId: payingSubscriptionId || active.subscriptionId || saved?.subscriptionId || null,
      orderCode: payingOrderCode ||
        active.orderCode ||
        getOrderCodeFromPayment(active.paymentRequest, savedOrderCode) ||
        savedOrderCode ||
        null
    };
  };

  const resetPaymentState = () => {
    paymentSuccessHandledRef.current = false;
    setPaymentRequest(null);
    setPayingSubscriptionId(null);
    setPayingOrderCode(null);
    setPaymentExpiresAt(null);
    setPaymentCountdown(0);
    clearStoredPayment();
  };

  const cancelPaymentWithFetch = (ids, reason) => {
    if (!ids?.subscriptionId && !ids?.orderCode) return false;

    const token = localStorage.getItem('token');
    if (!token) return false;

    fetch(`${API_BASE_URL}/api/subscriptions/cancel`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        subscriptionId: ids.subscriptionId,
        orderCode: ids.orderCode,
        audience,
        reason
      })
    }).catch(() => {});

    return true;
  };

  const persistPendingPayment = (payment, subscriptionId, orderCode, expiresAt) => {
    if (!payment || (!subscriptionId && !orderCode)) return;

    const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 5 * 60 * 1000;

    try {
      localStorage.setItem(paymentStorageKey, JSON.stringify({
        payment,
        subscriptionId: subscriptionId || null,
        orderCode: getOrderCodeFromPayment(payment, orderCode),
        createdAt: Date.now(),
        expiresAt: Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + 5 * 60 * 1000
      }));
    } catch {
      // The in-memory state still keeps the current QR flow usable.
    }
  };

  const isPaidStatus = (data) => {
    const state = String(data?.state || '').toLowerCase();
    const payOSStatus = String(data?.payOSStatus || '').toUpperCase();
    return Boolean(data?.paid || data?.isVip || state === 'active' || payOSStatus === 'PAID');
  };

  const readPaymentStatus = (subscriptionId = payingSubscriptionId, orderCode = payingOrderCode) => {
    const params = new URLSearchParams({ audience });
    if (subscriptionId) params.set('subscriptionId', subscriptionId);
    if (orderCode) params.set('orderCode', orderCode);
    return api.get(`/subscriptions/payment-status?${params.toString()}`);
  };

  const fetchAll = async ({ showLoading = true, pageOverride = null } = {}) => {
    if (showLoading) setLoading(true);
    const historyPage = Math.max(1, Number(pageOverride || transactionPage) || 1);
    try {
      const [statusRes, plansRes, historyRes] = await Promise.all([
        api.get('/subscriptions/status'),
        api.get(`/subscriptions/plans?audience=${audience}`),
        api.get(`/subscriptions/history?audience=${audience}&page=${historyPage}&pageSize=${TRANSACTION_PAGE_SIZE}`)
      ]);
      const nextVipInfo = statusRes.data || null;
      const history = historyRes.data || {};
      const nextPage = Number(history.page || historyPage) || 1;
      setVipInfo(nextVipInfo);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setTransactionSummary(history.summary || null);
      setTransactions(Array.isArray(history.transactions) ? history.transactions : []);
      setTransactionMeta({
        page: nextPage,
        pageSize: Number(history.pageSize || TRANSACTION_PAGE_SIZE) || TRANSACTION_PAGE_SIZE,
        totalItems: Number(history.totalItems || 0) || 0,
        totalPages: Number(history.totalPages || 1) || 1
      });
      if (nextPage !== transactionPage) {
        setTransactionPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading VIP data:', error);
      toast.error('Không thể tải thông tin gói VIP.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const clearPaymentQuery = () => {
    const nextParams = new URLSearchParams(window.location.search);
    const tab = nextParams.get('tab') || 'vip';

    ['confirmId', 'payment', 'code', 'id', 'cancel', 'status', 'orderCode'].forEach((key) => {
      nextParams.delete(key);
    });
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  };

  const finishPaymentSuccess = async (message = copy.success) => {
    if (paymentSuccessHandledRef.current) return;
    paymentSuccessHandledRef.current = true;
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }
    setPaymentSuccessView({ message, timestamp: Date.now() });
    setPaymentRequest(null);
    setPayingSubscriptionId(null);
    setPayingOrderCode(null);
    setPaymentCheckLoading(false);
    setPaymentCheckNote('Thanh toán đã được xác nhận.');
    clearStoredPayment();
    toast.success(message);
    setTransactionPage(1);
    await fetchAll({ showLoading: false, pageOverride: 1 });
    successTimerRef.current = window.setTimeout(() => {
      setPaymentSuccessView(null);
    }, 4200);
  };

  const cancelCurrentPayment = async ({ silent = false, reason = 'Người dùng rời khỏi trang thanh toán QR.' } = {}) => {
    if (cancelInFlightRef.current) return false;
    const ids = getActivePaymentIds();

    if (!ids.subscriptionId && !ids.orderCode) {
      resetPaymentState();
      if (!silent) {
        toast.error('Không tìm thấy mã giao dịch VIP để hủy.');
      }
      return false;
    }

    cancelInFlightRef.current = true;
    setCancelingPayment(true);
    try {
      await api.post('/subscriptions/cancel', {
        subscriptionId: ids.subscriptionId,
        orderCode: ids.orderCode,
        audience,
        reason
      });

      resetPaymentState();
      setTransactionPage(1);
      await fetchAll({ showLoading: false, pageOverride: 1 });

      if (!silent) {
        toast.success('Đã hủy giao dịch VIP.');
      }

      return true;
    } catch (error) {
      if ([404, 409].includes(error.response?.status)) {
        resetPaymentState();
        setTransactionPage(1);
        await fetchAll({ showLoading: false, pageOverride: 1 });
        if (!silent) {
          toast.success('Đã đóng giao dịch VIP đang chờ.');
        }
        return true;
      }

      if (!silent) {
        toast.error(error.response?.data?.message || 'Không thể hủy giao dịch VIP.');
      }
      return false;
    } finally {
      cancelInFlightRef.current = false;
      setCancelingPayment(false);
    }
  };

  const checkCurrentPayment = async ({ silent = false } = {}) => {
    if (paymentCheckLoading && !silent) return false;
    if (!payingSubscriptionId && !payingOrderCode) return false;

    let lastError = null;
    if (!silent) {
      setPaymentCheckLoading(true);
      setPaymentCheckNote('Đang hỏi lại PayOS và kiểm tra quyền VIP...');
    }

    try {
      if (payingSubscriptionId || payingOrderCode) {
        const response = await readPaymentStatus();
        if (isPaidStatus(response.data)) {
          await finishPaymentSuccess(response.data?.message || copy.success);
          return true;
        }

        if (response.data?.expiresAt) {
          setPaymentExpiresAt(response.data.expiresAt);
        }

        const statusText = String(response.data?.payOSStatus || response.data?.state || '').toUpperCase();
        if (['CANCELLED', 'CANCELED', 'EXPIRED'].includes(statusText)) {
          paymentSuccessHandledRef.current = false;
          setPaymentRequest(null);
          setPayingSubscriptionId(null);
          setPayingOrderCode(null);
          setPaymentExpiresAt(null);
          setPaymentCountdown(0);
          clearStoredPayment();
          setTransactionPage(1);
          await fetchAll({ showLoading: false, pageOverride: 1 });
          if (!silent) {
            toast.error(response.data?.message || 'Giao dịch đã hủy hoặc hết hạn. Vui lòng tạo thanh toán mới.');
          }
          return false;
        }

        if (!silent) {
          setPaymentCheckNote(`PayOS hiện trả trạng thái: ${statusText || 'PENDING'}. WorkBridge sẽ tiếp tục kiểm tra.`);
        }
      }
    } catch (error) {
      lastError = error;
      const payOSStatus = error.response?.data?.payOSStatus;
      if (payOSStatus && !silent) {
        setPaymentCheckNote(`PayOS hiện trả trạng thái: ${payOSStatus}. WorkBridge sẽ tiếp tục kiểm tra.`);
      }
    }

    try {
      if (payingSubscriptionId) {
        const response = await api.get(`/subscriptions/confirm/${payingSubscriptionId}`);
        await finishPaymentSuccess(response.data?.message || copy.success);
        return true;
      }
    } catch (error) {
      lastError = error;
      const payOSStatus = error.response?.data?.payOSStatus;
      if (payOSStatus && !silent) {
        setPaymentCheckNote(`PayOS hiện trả trạng thái: ${payOSStatus}. WorkBridge sẽ tiếp tục kiểm tra.`);
      }
    }

    if (payingSubscriptionId) {
      try {
        const response = await api.get(`/subscriptions/confirm-latest?audience=${audience}&subscriptionId=${payingSubscriptionId}`);
        await finishPaymentSuccess(response.data?.message || copy.success);
        return true;
      } catch (error) {
        lastError = error;
        const payOSStatus = error.response?.data?.payOSStatus;
        if (payOSStatus && !silent) {
          setPaymentCheckNote(`PayOS hiện trả trạng thái: ${payOSStatus}. WorkBridge sẽ tiếp tục kiểm tra.`);
        }
      }
    }

    if (!silent) {
      setPaymentCheckLoading(false);
    }

    if (!silent) {
      toast.error(lastError?.response?.data?.message || 'Chưa xác nhận được thanh toán. WorkBridge sẽ tiếp tục tự đồng bộ.');
    }

    return false;
  };

  useEffect(() => {
    fetchAll();
  }, [audience, transactionPage]);

  useEffect(() => () => {
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(paymentStorageKey);
      if (!raw) return;

      const saved = JSON.parse(raw);
      if (!saved?.payment) {
        clearStoredPayment();
        return;
      }

      if (saved.expiresAt && saved.expiresAt < Date.now()) {
        clearStoredPayment();
        api.post('/subscriptions/cancel', {
          subscriptionId: saved.subscriptionId || null,
          orderCode: saved.orderCode || null,
          audience,
          reason: 'Tự động hủy do quá 5 phút chưa thanh toán.'
        }).catch(() => {});
        return;
      }

      setPaymentRequest(saved.payment);
      setPayingSubscriptionId(saved.subscriptionId || null);
      setPayingOrderCode(getOrderCodeFromPayment(saved.payment, saved.orderCode));
      setPaymentExpiresAt(saved.expiresAt ? new Date(saved.expiresAt).toISOString() : null);
      setPaymentCheckNote('Đang tiếp tục kiểm tra giao dịch VIP đang chờ...');
    } catch {
      clearStoredPayment();
    }
  }, [paymentStorageKey]);

  useEffect(() => {
    if (!paymentCancelled) return;
    paymentSuccessHandledRef.current = false;
    setPaymentRequest(null);
    setPayingSubscriptionId(null);
    setPayingOrderCode(null);
    setPaymentExpiresAt(null);
    setPaymentCountdown(0);
    clearStoredPayment();
    toast.error('Thanh toán đã bị hủy.');
    clearPaymentQuery();
  }, [paymentCancelled]);

  useEffect(() => {
    if (!confirmId) return;
    let isActive = true;
    const toastId = `payos-confirm-${confirmId}`;
    const wait = (ms) => new Promise(resolve => window.setTimeout(resolve, ms));

    const confirmPayment = async () => {
      setReturnConfirming(true);
      toast.loading('Đang xác nhận thanh toán PayOS...', { id: toastId });

      for (let attempt = 1; attempt <= 12; attempt += 1) {
        try {
          const response = await api.get(`/subscriptions/confirm/${confirmId}`);
          if (!isActive) return;

          toast.dismiss(toastId);
          await finishPaymentSuccess(response.data?.message || copy.success);
          clearPaymentQuery();
          return;
        } catch (error) {
          const status = error.response?.status;
          const canRetry = !status || [400, 409, 425, 502, 503].includes(status);

          if (!canRetry || attempt === 12) {
            if (!isActive) return;
            toast.dismiss(toastId);
            toast.error(error.response?.data?.message || 'Thanh toán chưa hoàn tất. Nếu bạn đã chuyển khoản, hãy chờ vài giây rồi tải lại trang VIP.');
            clearPaymentQuery();
            return;
          }

          await wait(attempt < 4 ? 2000 : 4000);
        }
      }
    };

    confirmPayment().finally(() => {
      if (isActive) setReturnConfirming(false);
    });

    return () => {
      isActive = false;
      toast.dismiss(toastId);
    };
  }, [confirmId, copy.success]);

  useEffect(() => {
    if (!returnedPaidOrderCode || confirmId) return;

    let isActive = true;
    const toastId = `payos-return-${returnedPaidOrderCode}`;

    const confirmReturnedOrder = async () => {
      setReturnConfirming(true);
      toast.loading('Đang xác nhận thanh toán PayOS...', { id: toastId });

      for (let attempt = 1; attempt <= 12; attempt += 1) {
        try {
          const response = await readPaymentStatus(null, returnedPaidOrderCode);
          if (!isActive) return;

          if (isPaidStatus(response.data)) {
            toast.dismiss(toastId);
            await finishPaymentSuccess(response.data?.message || copy.success);
            clearPaymentQuery();
            return;
          }
        } catch (error) {
          if (attempt === 12) {
            if (!isActive) return;
            toast.dismiss(toastId);
            toast.error(error.response?.data?.message || 'Chưa xác nhận được thanh toán PayOS. Vui lòng thử lại sau vài giây.');
            clearPaymentQuery();
            return;
          }
        }

        await new Promise(resolve => window.setTimeout(resolve, attempt < 4 ? 2000 : 4000));
      }
    };

    confirmReturnedOrder().finally(() => {
      if (isActive) setReturnConfirming(false);
    });

    return () => {
      isActive = false;
      toast.dismiss(toastId);
    };
  }, [returnedPaidOrderCode, confirmId, copy.success]);

  useEffect(() => {
    if (!payingSubscriptionId && !payingOrderCode) return undefined;

    let stopped = false;
    const pollPayment = async () => {
      if (stopped) return;
      const confirmed = await checkCurrentPayment({ silent: true });
      if (confirmed) {
        window.clearInterval(intervalId);
      }
    };

    pollPayment();
    const intervalId = window.setInterval(pollPayment, 2000);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [payingSubscriptionId, payingOrderCode, copy.success, audience]);

  useEffect(() => {
    activePaymentRef.current = {
      paymentRequest,
      subscriptionId: payingSubscriptionId,
      orderCode: payingOrderCode,
      expiresAt: paymentExpiresAt
    };
  }, [paymentRequest, payingSubscriptionId, payingOrderCode, paymentExpiresAt]);

  useEffect(() => {
    if (!paymentRequest || !paymentExpiresAt) {
      setPaymentCountdown(0);
      return undefined;
    }

    const updateCountdown = () => {
      const expiresAtMs = new Date(paymentExpiresAt).getTime();
      if (!Number.isFinite(expiresAtMs)) {
        setPaymentCountdown(0);
        return;
      }

      const nextSeconds = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
      setPaymentCountdown(nextSeconds);
      if (nextSeconds <= 0) {
        cancelCurrentPayment({
          reason: 'Tự động hủy do quá 5 phút chưa thanh toán.'
        });
      }
    };

    updateCountdown();
    const timerId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timerId);
  }, [paymentRequest, paymentExpiresAt]);

  useEffect(() => {
    const cancelPendingOnLeave = () => {
      if (paymentSuccessHandledRef.current) return;

      const ids = getActivePaymentIds();
      const hasVisiblePayment = Boolean(activePaymentRef.current?.paymentRequest);
      const hasStoredPayment = Boolean(readStoredPayment()?.payment);
      if (!hasVisiblePayment && !hasStoredPayment && !ids.subscriptionId && !ids.orderCode) {
        return;
      }

      clearStoredPayment();
      cancelPaymentWithFetch(ids, 'Người dùng rời khỏi trang thanh toán QR.');
    };

    window.addEventListener('pagehide', cancelPendingOnLeave);

    return () => {
      window.removeEventListener('pagehide', cancelPendingOnLeave);
      cancelPendingOnLeave();
    };
  }, [audience, paymentStorageKey]);

  const handleBuyPlan = async (planId) => {
    if (buyInFlightRef.current || actionLoading || paymentRequest) return;

    buyInFlightRef.current = true;
    paymentSuccessHandledRef.current = false;
    setPaymentSuccessView(null);
    setActionLoading(true);
    setBuyingPlanId(planId);
    try {
      const response = await api.post('/subscriptions/buy', { planId });
      if (response.data?.paid || response.data?.isVip || String(response.data?.state || '').toLowerCase() === 'active') {
        await finishPaymentSuccess(response.data?.message || copy.success);
        return;
      }

      const payment = response.data?.payment || null;
      const subscriptionId = response.data?.subscriptionId || null;
      const orderCode = getOrderCodeFromPayment(payment, response.data?.orderCode);
      const expiresAt = response.data?.expiresAt || null;
      setPaymentRequest(payment);
      setPayingSubscriptionId(subscriptionId);
      setPayingOrderCode(orderCode);
      setPaymentExpiresAt(expiresAt);
      persistPendingPayment(payment, subscriptionId, orderCode, expiresAt);
      setPaymentCheckNote('Đang tự động kiểm tra thanh toán...');
      toast.success('Đã tạo mã thanh toán VIP.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tạo giao dịch thanh toán.');
    } finally {
      buyInFlightRef.current = false;
      setActionLoading(false);
      setBuyingPlanId(null);
    }
  };

  const handleCopy = async (value, label) => {
    if (!value) return;
    await navigator.clipboard.writeText(String(value));
    toast.success(`Đã sao chép ${label}.`);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-[#1687d9]" />
        <p className="text-sm font-bold text-slate-500">Đang tải gói VIP...</p>
      </div>
    );
  }

  if (paymentSuccessView) {
    const confettiColors = ['#22c55e', '#1687d9', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

    return (
      <section className="payment-success-panel relative min-h-[440px] overflow-hidden rounded-2xl border border-emerald-100 bg-slate-950 px-6 py-10 text-center text-white shadow-xl shadow-emerald-900/10">
        <div className="absolute inset-0 opacity-70">
          {Array.from({ length: 48 }).map((_, index) => (
            <span
              key={index}
              className="payment-confetti-piece"
              style={{
                left: `${(index * 17) % 100}%`,
                backgroundColor: confettiColors[index % confettiColors.length],
                animationDelay: `${(index % 12) * 0.12}s`,
                animationDuration: `${2.6 + (index % 5) * 0.22}s`,
                transform: `rotate(${index * 23}deg)`
              }}
            />
          ))}
        </div>
        <div className="vip-scanline absolute inset-0 opacity-30" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center">
          <div className="payment-success-burst flex h-24 w-24 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-2xl shadow-emerald-400/30">
            <span className="material-symbols-outlined filled !text-[54px]">verified</span>
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-emerald-200">PayOS đã xác nhận</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Thanh toán thành công</h2>
          <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-emerald-50/85">
            {paymentSuccessView.message || copy.success}
          </p>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-emerald-50">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
            Đang cập nhật quyền VIP và đưa bạn về trang gói
          </div>
        </div>
      </section>
    );
  }

  if (paymentRequest) {
    const qrData = paymentRequest.qrCode || paymentRequest.checkoutUrl || '';
    const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrData)}`;

    return (
      <div className="anim-fadeUp overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#1687d9]">PayOS VietQR</p>
            <h2 className="text-lg font-black text-slate-900">{copy.paymentTitle}</h2>
          </div>
          <button
            type="button"
            onClick={() => cancelCurrentPayment({ reason: 'Người dùng bấm hủy trên màn hình QR.' })}
            disabled={cancelingPayment}
            className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <span className="material-symbols-outlined !text-base">{cancelingPayment ? 'progress_activity' : 'close'}</span>
            {cancelingPayment ? 'Đang hủy' : 'Hủy'}
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[300px_1fr]">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 text-center">
            <img src={qrCodeImageUrl} alt="VietQR PayOS" className="mx-auto h-[230px] w-[230px] rounded-xl bg-white p-2 shadow-sm" />
            <p className="mt-3 text-xs font-bold text-slate-500">Quét mã bằng ứng dụng ngân hàng</p>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              <p className="text-[11px] font-black uppercase tracking-wide">Tự hủy sau</p>
              <p className="mt-0.5 text-2xl font-black tabular-nums">{formatCountdown(paymentCountdown)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              ['Chủ tài khoản', paymentRequest.accountName],
              ['Số tài khoản', paymentRequest.accountNumber],
              ['Số tiền', `${formatCurrency(paymentRequest.amount)} VND`],
              ['Nội dung', paymentRequest.description]
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase text-slate-400">{label}</p>
                  <p className="truncate text-sm font-black text-slate-800">{value || '-'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(value, label.toLowerCase())}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition hover:text-[#1687d9]"
                >
                  <span className="material-symbols-outlined !text-base">content_copy</span>
                </button>
              </div>
            ))}

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="flex items-start gap-2 text-xs font-bold text-blue-800">
                <div className="mt-0.5 h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-[#1687d9]" />
                <div>
                  <p>{paymentCheckNote}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-blue-700/80">
                    WorkBridge chỉ xác nhận giao dịch QR hiện tại. Nếu rời khỏi trang quét mã hoặc quá 5 phút chưa thanh toán, giao dịch sẽ tự hủy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-fadeUp space-y-7">
      {returnConfirming && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-5 py-4 text-emerald-900 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
            <div>
              <p className="text-sm font-black">Đang xác nhận thanh toán từ PayOS</p>
              <p className="mt-0.5 text-xs font-semibold text-emerald-700">Nếu bạn đã thanh toán xong, WorkBridge sẽ tự kích hoạt VIP ngay khi PayOS trả trạng thái.</p>
            </div>
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
            Tự động kiểm tra
          </span>
        </div>
      )}

      <section className="vip-sheen relative min-h-[250px] overflow-hidden rounded-2xl border border-blue-100 bg-[linear-gradient(135deg,#082033_0%,#0d6fb8_52%,#14866d_100%)] px-6 pb-16 pt-7 text-white shadow-xl shadow-blue-900/10 sm:px-8">
        <div className="vip-scanline absolute inset-0 opacity-60" />
        <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-blue-50 shadow-sm backdrop-blur">
              <span className="material-symbols-outlined !text-sm">workspace_premium</span>
              {copy.badge}
            </span>
            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              {vipInfo?.isVip ? copy.activeTitle : copy.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-blue-50/90 sm:text-base">
              {vipInfo?.isVip ? copy.activeSubtitle : copy.subtitle}
            </p>
          </div>

          {vipInfo?.isVip ? (
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-sm shadow-2xl shadow-blue-950/15 backdrop-blur">
              <p className="text-xs font-black uppercase text-blue-100">Còn lại</p>
              <p className="mt-1 text-4xl font-black">{vipInfo.daysRemaining} ngày</p>
              <p className="mt-1 text-xs font-semibold text-blue-100">Hết hạn: {new Date(vipInfo.endDate).toLocaleDateString('vi-VN')}</p>
            </div>
          ) : (
            <div className="hidden w-[260px] shrink-0 rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-blue-950/15 backdrop-blur lg:block">
              <div className="vip-lock-pulse mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                <span className="material-symbols-outlined filled !text-[34px] text-amber-100">lock_open</span>
              </div>
              <p className="mt-4 text-center text-sm font-black">Mở VIP là mở cả bộ công cụ AI</p>
              <p className="mt-1 text-center text-xs font-semibold leading-relaxed text-blue-50/75">Thanh toán xong, quyền VIP tự kích hoạt.</p>
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 overflow-hidden border-t border-white/10 bg-white/10">
          <div className="vip-marquee flex w-max items-center gap-3 py-3">
            {[...copy.campaign, ...copy.campaign].map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black text-white"
              >
                <span className="material-symbols-outlined !text-[15px] text-amber-100">auto_awesome</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {copy.spotlights.map(([icon, title, detail], index) => (
          <div
            key={title}
            className="anim-fadeUp rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/70"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1687d9]">
              <span className="material-symbols-outlined !text-[23px]">{icon}</span>
            </div>
            <h3 className="mt-4 text-base font-black text-slate-900">{title}</h3>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto grid max-w-[1180px] gap-5 xl:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = vipInfo?.isVip && activePlanId === plan.subscriptionPlanId;
          const days = Number(plan.durationDays);
          const isBest = plan.subscriptionPlanId === bestPlanId;
          const isAnnualEmployer = audience === 'Employer' && days >= 365;
          const highlights = getPlanHighlights(days, audience);
          const theme = getPlanTheme(days);

          return (
            <article
              key={plan.subscriptionPlanId}
              className={`vip-sheen vip-card-grid relative flex min-h-[490px] flex-col overflow-hidden rounded-2xl border-2 bg-white px-6 pb-6 pt-7 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl ${theme.border} ${theme.ring}`}
            >
              <div className={`absolute -right-20 -top-24 h-44 w-44 rounded-full blur-3xl ${theme.glow}`} />
              <div className={`absolute -bottom-24 left-8 h-36 w-36 rounded-full blur-3xl ${theme.glow}`} />
              {isBest && (
                <div className={`absolute right-4 top-4 z-20 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-lg ${theme.badgeBg}`}>
                  Featured
                </div>
              )}
              {isCurrent && (
                <div className="absolute left-4 top-4 z-20 rounded-full bg-emerald-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-lg">
                  Đang dùng
                </div>
              )}

              <div className="relative z-10 flex flex-1 flex-col">
                <div className="mx-auto flex flex-col items-center text-center">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg ${theme.iconBg}`}>
                    <span className="material-symbols-outlined !text-[29px]">{theme.icon}</span>
                  </div>
                  <p className={`mt-4 text-[11px] font-black uppercase tracking-[0.16em] ${theme.accentText}`}>
                    {getPlanBadge(days)}
                  </p>
                  <h3 className="mt-1.5 text-lg font-black uppercase tracking-wide text-slate-900">
                    {plan.name}
                  </h3>
                </div>

                <div className={`mt-5 rounded-2xl border px-4 py-3 text-center shadow-sm ${theme.priceBox}`}>
                  <div className="flex items-end justify-center gap-1">
                    <span className="text-3xl font-black tracking-tight">{formatCurrency(plan.price)}</span>
                    <span className="pb-1 text-xs font-black uppercase opacity-70">{plan.currency || 'VND'}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-black uppercase tracking-wide opacity-80">
                    cho {formatDuration(days)}
                  </p>
                </div>

                <p className="mt-4 min-h-[44px] text-center text-xs font-semibold leading-relaxed text-slate-500">
                  {plan.description || 'Gói VIP WorkBridge với đầy đủ quyền AI theo loại tài khoản.'}
                </p>

                {isAnnualEmployer && (
                  <div className="mt-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2.5 text-center text-[11px] font-black uppercase tracking-wide text-fuchsia-700 shadow-sm">
                    <span className="material-symbols-outlined !text-[15px] align-[-3px]">verified</span>
                    Tự xuất bản tin tuyển dụng
                  </div>
                )}

                <div className="mt-4 flex-1 divide-y divide-slate-100">
                  {highlights.map(item => (
                    <div key={item} className="flex items-start gap-2.5 py-2.5 text-xs font-semibold leading-relaxed text-slate-600">
                      <span className={`material-symbols-outlined !text-[16px] ${theme.accentText}`}>check_circle</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={actionLoading || Boolean(paymentRequest)}
                  onClick={() => handleBuyPlan(plan.subscriptionPlanId)}
                  className={`mt-5 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${theme.button}`}
                >
                  <span className="material-symbols-outlined !text-[18px]">{vipInfo?.isVip ? 'add_card' : 'auto_fix_high'}</span>
                  {buyingPlanId === plan.subscriptionPlanId
                    ? 'Đang tạo thanh toán...'
                    : vipInfo?.isVip
                      ? isCurrent ? 'Gia hạn gói này' : 'Đổi sang gói này'
                      : isAnnualEmployer ? 'Mở quyền tự duyệt' : 'Nâng cấp VIP ngay'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1687d9]">Lịch sử giao dịch</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Thanh toán VIP của bạn</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Theo dõi giao dịch PayOS, giao dịch đã hủy và VIP được admin cấp.</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ['Đã trả', `${formatCurrency(transactionSummary?.totalRevenue)} VND`],
              ['Thành công', transactionSummary?.paidTransactions ?? 0],
              ['Đang chờ', transactionSummary?.pendingTransactions ?? 0],
              ['Đã hủy', transactionSummary?.cancelledTransactions ?? 0]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          {transactions.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <span className="material-symbols-outlined !text-[38px] text-slate-300">receipt_long</span>
              <p className="mt-2 text-sm font-black text-slate-700">Chưa có giao dịch VIP</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Khi mua VIP hoặc được admin nâng VIP, giao dịch sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-black text-slate-500">Gói</th>
                    <th className="px-4 py-3 text-[11px] font-black text-slate-500">Nguồn</th>
                    <th className="px-4 py-3 text-[11px] font-black text-slate-500">Số tiền</th>
                    <th className="px-4 py-3 text-[11px] font-black text-slate-500">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-[11px] font-black text-slate-500">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((transaction) => (
                    <tr key={transaction.subscriptionId} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <p className="text-sm font-black text-slate-900">{transaction.planName}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-400">
                          {formatDuration(transaction.durationDays)} {transaction.orderCode ? `• #${transaction.orderCode}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                          {transaction.isAdminGrant ? 'Admin cấp' : 'PayOS'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-slate-800">
                        {formatCurrency(transaction.price)} {transaction.currency || 'VND'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${transactionStatusClass(transaction.status)}`}>
                          {transactionStatusLabel(transaction.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-xs font-bold text-slate-500">
                        {formatDateTime(transaction.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination
          currentPage={transactionMeta.page}
          totalItems={transactionMeta.totalItems}
          itemsPerPage={transactionMeta.pageSize || TRANSACTION_PAGE_SIZE}
          onPageChange={setTransactionPage}
          label="giao dịch"
          className="rounded-b-2xl"
        />
      </section>
    </div>
  );
}
