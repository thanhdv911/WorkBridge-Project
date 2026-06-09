import axios from 'axios';

const getFallbackBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https://localhost:7238';
  }
  return 'http://localhost:5029';
};

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || getFallbackBaseUrl()).replace(/\/$/, '');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const exactMessageMap = new Map([
  ['User not found.', 'Không tìm thấy người dùng.'],
  ['User not found', 'Không tìm thấy người dùng.'],
  ['User profile not found.', 'Không tìm thấy hồ sơ người dùng.'],
  ['Job not found.', 'Không tìm thấy tin tuyển dụng.'],
  ['Job not found or access denied.', 'Không tìm thấy tin tuyển dụng hoặc bạn không có quyền truy cập.'],
  ['Job post not found or access denied.', 'Không tìm thấy tin tuyển dụng hoặc bạn không có quyền chỉnh sửa.'],
  ['Category not found.', 'Không tìm thấy danh mục.'],
  ['Category not found or still has associated jobs.', 'Không thể xóa danh mục vì vẫn còn tin tuyển dụng liên quan.'],
  ['Report not found.', 'Không tìm thấy báo cáo.'],
  ['Application not found.', 'Không tìm thấy hồ sơ ứng tuyển.'],
  ['Application not found for this chat.', 'Không tìm thấy hồ sơ ứng tuyển trong cuộc trò chuyện này.'],
  ['Application not found or you do not have permission to update it.', 'Không tìm thấy hồ sơ ứng tuyển hoặc bạn không có quyền cập nhật.'],
  ['Invalid application status.', 'Trạng thái ứng tuyển không hợp lệ.'],
  ['Interview not found.', 'Không tìm thấy lịch phỏng vấn.'],
  ['Status is required.', 'Vui lòng chọn trạng thái.'],
  ['Completed interviews cannot be updated.', 'Không thể cập nhật phỏng vấn đã hoàn tất.'],
  ['Invalid employer interview status.', 'Trạng thái phỏng vấn không hợp lệ với nhà tuyển dụng.'],
  ['Invalid applicant interview status.', 'Trạng thái phỏng vấn không hợp lệ với ứng viên.'],
  ['Only scheduled interviews can be answered.', 'Chỉ lịch phỏng vấn đang chờ mới có thể phản hồi.'],
  ['Invalid role.', 'Vai trò tài khoản không hợp lệ.'],
  ['Result must be Passed or Failed.', 'Kết quả phỏng vấn phải là Đạt hoặc Không đạt.'],
  ['Interview already has a result.', 'Lịch phỏng vấn này đã có kết quả.'],
  ['Applicant is already an active employee for this employer.', 'Ứng viên đã là nhân viên đang hoạt động của doanh nghiệp này.'],
  ['Applicant must accept the interview before you can mark a result.', 'Ứng viên cần xác nhận lịch phỏng vấn trước khi chấm kết quả.'],
  ['Interview result is available after the scheduled time.', 'Chỉ được cập nhật kết quả sau thời gian phỏng vấn.'],
  ['Branch not found or inactive.', 'Không tìm thấy chi nhánh hoặc chi nhánh đã ngừng hoạt động.'],
  ['Interview time must be scheduled at least 2 hours in advance.', 'Lịch phỏng vấn phải được hẹn trước ít nhất 2 giờ.'],
  ['Offline interview location is required.', 'Vui lòng nhập địa điểm phỏng vấn.'],
  ['Only accepted or under-review applications can be scheduled.', 'Chỉ hồ sơ đã duyệt hoặc đang xem xét mới được hẹn phỏng vấn.'],
  ['Branch is required when passing an applicant.', 'Vui lòng chọn chi nhánh làm việc.'],
  ['Position is required when passing an applicant.', 'Vui lòng nhập vị trí làm việc.'],
  ['Hourly rate must be greater than 0.', 'Mức lương theo giờ phải lớn hơn 0.'],
  ['Start date is required when passing an applicant.', 'Vui lòng chọn ngày bắt đầu làm việc.'],
  ['Payday must be between day 1 and 28.', 'Ngày trả lương phải nằm trong khoảng 1 - 28.'],
  ['Position is required.', 'Vui lòng nhập vị trí làm việc.'],
  ['Offer not found.', 'Không tìm thấy lời mời nhận việc.'],
  ['Only sent offers can be accepted.', 'Chỉ lời mời đang chờ phản hồi mới có thể chấp nhận.'],
  ['Only sent offers can be declined.', 'Chỉ lời mời đang chờ phản hồi mới có thể từ chối.'],
  ['Only sent offers can be cancelled.', 'Chỉ lời mời đang chờ phản hồi mới có thể hủy.'],
  ['Only offers awaiting applicant response can be edited.', 'Chỉ lời mời đang chờ ứng viên phản hồi mới có thể chỉnh sửa.'],
  ['Offer has expired.', 'Lời mời nhận việc đã hết hạn.'],
  ['This application cannot receive an offer at this stage.', 'Hồ sơ này chưa đủ điều kiện để gửi lời mời nhận việc.'],
  ['You are already an active employee for this employer.', 'Bạn đã là nhân viên đang hoạt động của doanh nghiệp này.'],
  ['Shift assignment not found.', 'Không tìm thấy phân công ca làm.'],
  ['Shift assignment not found or does not belong to you.', 'Không tìm thấy ca làm của bạn.'],
  ['Attendance record not found.', 'Không tìm thấy bản ghi chấm công.'],
  ['Cannot approve before check-out.', 'Chưa thể duyệt vì nhân viên chưa ra ca.'],
  ['Cannot reject before check-out.', 'Chưa thể từ chối vì nhân viên chưa ra ca.'],
  ['Check-out must be after check-in.', 'Giờ ra ca phải sau giờ vào ca.'],
  ['Month must be between 1 and 12.', 'Tháng phải nằm trong khoảng 1 - 12.'],
  ['Payroll is locked or paid and cannot be regenerated.', 'Bảng lương đã chốt hoặc đã thanh toán nên không thể tạo lại.'],
  ['Payroll period not found.', 'Không tìm thấy kỳ lương.'],
  ['Paid payroll cannot be changed.', 'Bảng lương đã thanh toán nên không thể chỉnh sửa.'],
  ['Payroll must be locked before marking it paid.', 'Cần chốt bảng lương trước khi đánh dấu đã thanh toán.'],
  ['Bonus, penalty and deduction cannot be negative.', 'Tiền thưởng, tiền phạt và khấu trừ không được âm.'],
  ['Payroll item not found.', 'Không tìm thấy mục lương.'],
  ['Only draft payroll can be adjusted.', 'Chỉ bảng lương nháp mới có thể điều chỉnh.'],
  ['Only assigned shifts can be passed.', 'Chỉ ca đã được phân công mới có thể nhường.'],
  ['Shift pass requests must be created at least 2 hours before the shift starts.', 'Yêu cầu nhường ca phải tạo trước giờ bắt đầu ít nhất 2 giờ.'],
  ['You cannot pass a shift to yourself.', 'Bạn không thể nhường ca cho chính mình.'],
  ['This shift already has a pending pass request.', 'Ca này đã có yêu cầu nhường ca đang chờ xử lý.'],
  ['Selected employee is not eligible for this shift.', 'Nhân viên được chọn không phù hợp với ca này.'],
  ['Shift pass request not found.', 'Không tìm thấy yêu cầu nhường ca.'],
  ['Only pending requests can be accepted.', 'Chỉ yêu cầu đang chờ mới có thể chấp nhận.'],
  ['Only pending requests can be rejected.', 'Chỉ yêu cầu đang chờ mới có thể từ chối.'],
  ['This request expired because the shift starts in less than 2 hours.', 'Yêu cầu đã hết hạn vì ca sắp bắt đầu trong dưới 2 giờ.'],
  ['The original shift owner changed, so this request cannot be accepted.', 'Người phụ trách ca đã thay đổi nên không thể nhận yêu cầu này.'],
  ['You are not an active employee in this branch.', 'Bạn không phải nhân viên đang hoạt động tại chi nhánh này.'],
  ['You already have another shift in this time range.', 'Bạn đã có ca khác trong khung giờ này.'],
  ['No active employees found for this employer.', 'Doanh nghiệp chưa có nhân viên đang hoạt động.'],
  ['Shift not found or does not belong to you.', 'Không tìm thấy ca làm hoặc bạn không có quyền thao tác.'],
  ['Registration failed. Email might already exist or role is invalid.', 'Email đã tồn tại hoặc vai trò không hợp lệ.'],
  ['Đăng ký thất bại. Email có thể đã tồn tại hoặc vai trò không hợp lệ.', 'Email đã tồn tại hoặc vai trò đăng ký không hợp lệ.'],
  ['Password reset failed.', 'Đặt lại mật khẩu thất bại.'],
  ['Đăng nhập Google thất bại.', 'Không thể xác thực Google. Vui lòng thử lại.'],
  ['AI danh gia CV chi danh cho Ca nhan VIP. Vui long nang cap VIP de su dung chuc nang nay.', 'AI đánh giá CV chỉ dành cho Cá nhân VIP. Vui lòng nâng cấp VIP để sử dụng chức năng này.'],
  ['Da tao ma thanh toan VIP.', 'Đã tạo mã thanh toán VIP.'],
  ['Dang dung lai giao dich thanh toan VIP con hieu luc.', 'Đang dùng lại giao dịch thanh toán VIP còn hiệu lực.'],
  ['Giao dich da bi huy.', 'Giao dịch đã bị hủy.'],
  ['Giao dich VIP da duoc huy.', 'Giao dịch VIP đã được hủy.'],
  ['PayOS chua tra trang thai thanh toan thanh cong. He thong se tiep tuc kiem tra.', 'PayOS chưa trả trạng thái thanh toán thành công. Hệ thống sẽ tiếp tục kiểm tra.'],
]);

const regexMessageMap = [
  [/^Reputation score must be between 0 and 100\.?$/i, 'Điểm uy tín phải nằm trong khoảng 0 - 100.'],
  [/^Employer profile is required before posting a job\.?$/i, 'Vui lòng cập nhật hồ sơ doanh nghiệp trước khi đăng tin.'],
  [/^Employer profile is required before updating a job\.?$/i, 'Vui lòng cập nhật hồ sơ doanh nghiệp trước khi sửa tin.'],
  [/^Network Error$/i, 'Không kết nối được máy chủ. Vui lòng thử lại.'],
  [/^Request failed with status code 401$/i, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'],
  [/^Request failed with status code 403$/i, 'Bạn không có quyền thực hiện thao tác này.'],
  [/^Request failed with status code 404$/i, 'Không tìm thấy dữ liệu cần thao tác.'],
  [/^Request failed with status code 503$/i, 'WorkBridge đang bảo trì. Vui lòng quay lại sau ít phút.'],
  [/^Request failed with status code 500$/i, 'Máy chủ đang lỗi. Vui lòng thử lại sau.'],
  [/^(No Gemini API keys configured|All Gemini API keys failed|Failed to parse Gemini response|OpenAI API key is not configured|OpenAI API request failed|Failed to parse OpenAI response)/i, 'Dịch vụ AI đang gián đoạn. Vui lòng thử lại sau.'],
];

export const normalizeApiMessage = (message, fallback = 'Không nhận được phản hồi hợp lệ từ máy chủ.') => {
  if (!message) return fallback;

  const text = String(message).trim();
  if (!text) return fallback;

  if (exactMessageMap.has(text)) {
    return exactMessageMap.get(text);
  }

  for (const [pattern, replacement] of regexMessageMap) {
    if (pattern.test(text)) {
      return replacement;
    }
  }

  return text;
};

export const getApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;

  if (typeof data === 'string') {
    return normalizeApiMessage(data, fallback);
  }

  const validationErrors = data?.errors;
  if (validationErrors && typeof validationErrors === 'object') {
    const firstError = Object.values(validationErrors).flat().find(Boolean);
    if (firstError) return normalizeApiMessage(firstError, fallback);
  }

  return normalizeApiMessage(
    data?.message || data?.Message || data?.title || data?.error || error?.message,
    fallback
  );
};

const authEndpoints = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/facebook',
  '/auth/forgot-password',
  '/auth/reset-password'
];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = authEndpoints.some((endpoint) => requestUrl.includes(endpoint));
    const hadSession = Boolean(localStorage.getItem('token'));

    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        error.response.data = normalizeApiMessage(error.response.data);
      } else if (typeof error.response.data === 'object') {
        const rawMessage = error.response.data.message || error.response.data.Message || error.response.data.title || error.response.data.error;
        const normalizedMessage = normalizeApiMessage(rawMessage, rawMessage);
        if (normalizedMessage) {
          error.response.data.message = normalizedMessage;
          error.response.data.Message = normalizedMessage;
        }
      }
    }

    if (status === 503) {
      const maintenance = error.response?.data?.maintenance;
      if (maintenance) {
        sessionStorage.setItem('workbridge_maintenance', JSON.stringify(maintenance));
      }

      const isAdmin = localStorage.getItem('role') === 'Admin';
      if (!isAdmin && window.location.pathname !== '/maintenance') {
        window.location.assign('/maintenance');
      }
    }

    if (status === 401 && hadSession && !isAuthEndpoint) {
      localStorage.clear();
      if (!['/login', '/signup'].includes(window.location.pathname)) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
