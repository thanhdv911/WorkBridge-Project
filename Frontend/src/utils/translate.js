const CATEGORY_TRANSLATIONS = {
  'food & beverage': 'Ẩm thực & Đồ uống',
  'f&b': 'Ẩm thực & Đồ uống',
  tutoring: 'Gia sư & Dạy kèm',
  delivery: 'Giao hàng & Vận chuyển',
  retail: 'Bán lẻ & Cửa hàng',
  marketing: 'Tiếp thị & Quảng cáo',
  creative: 'Sáng tạo & Thiết kế',
  office: 'Văn phòng & Hành chính',
};

export const translateCategory = (name) => {
  if (!name) return name;
  const lower = name.toLowerCase().trim();
  return CATEGORY_TRANSLATIONS[lower] || name;
};

export const translateJobType = (type) => {
  if (!type) return type;
  const lower = type.toLowerCase().trim();
  const map = {
    'part-time': 'Bán thời gian',
    'full-time': 'Toàn thời gian',
    freelance: 'Tự do',
    internship: 'Thực tập',
    flexible: 'Linh hoạt',
  };
  return map[lower] || type;
};

export const translateShift = (shift) => {
  if (!shift) return shift;
  const lower = shift.toLowerCase().trim();
  const map = {
    morning: 'Sáng',
    afternoon: 'Chiều',
    evening: 'Tối',
    weekend: 'Cuối tuần',
    remote: 'Từ xa',
    flexible: 'Linh hoạt',
  };
  return map[lower] || shift;
};

export const translatePayUnit = (unit) => {
  if (!unit) return '';
  const lower = unit.toLowerCase().trim();
  if (lower === 'perhour' || lower === 'hourly') return 'đ/giờ';
  if (lower === 'permonth' || lower === 'monthly') return 'đ/tháng';
  if (lower === 'perday' || lower === 'daily') return 'đ/ngày';
  if (lower === 'fixed') return 'trọn gói';
  return unit;
};
