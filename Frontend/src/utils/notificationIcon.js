export const getNotificationIcon = (title = '', message = '') => {
  const t = title.toLowerCase();
  const m = message.toLowerCase();

  if (t.includes('ca') || t.includes('shift') || m.includes('ca làm') || m.includes('shift')) return 'calendar_month';
  if (t.includes('ứng viên') || t.includes('applicant') || t.includes('ứng tuyển') || m.includes('ứng tuyển')) return 'person_add';
  if (t.includes('phỏng vấn') || t.includes('interview')) return 'record_voice_over';
  if (t.includes('nhận vào') || t.includes('offer') || t.includes('thành công') || t.includes('success') || t.includes('accepted') || t.includes('paid')) return 'check_circle';
  if (t.includes('từ chối') || t.includes('reject') || t.includes('cancel') || t.includes('fired') || t.includes('ended') || m.includes('từ chối')) return 'cancel';
  if (t.includes('nghỉ phép') || t.includes('leave')) return 'event_busy';
  if (t.includes('đánh giá') || t.includes('review') || t.includes('rate')) return 'star';
  if (t.includes('vip') || t.includes('nâng cấp') || m.includes('vip')) return 'workspace_premium';
  if (t.includes('chấm công') || t.includes('time') || m.includes('chấm công')) return 'alarm';
  if (t.includes('tin nhắn') || t.includes('message')) return 'chat';
  if (t.includes('việc làm') || t.includes('job') || m.includes('việc làm')) return 'work';
  
  return 'info';
};
