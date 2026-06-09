import toast from 'react-hot-toast';
import api from '../services/api';

export const WORKBRIDGE_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61590592532967';
export const WORKBRIDGE_SUPPORT_EMAIL = 'support@workbridge.com';

export async function openAdminChat(navigate) {
  const token = localStorage.getItem('token');
  if (!token) {
    toast.error('Vui lòng đăng nhập để nhắn với admin.');
    navigate('/login');
    return;
  }

  try {
    const res = await api.get('/platform/admin-contact');
    navigate('/messages', {
      state: {
        contactId: res.data.userId,
        contactName: res.data.fullName || 'Quản trị viên WorkBridge'
      }
    });
  } catch (error) {
    toast.error('Chưa mở được chat admin. Mình sẽ mở fanpage hỗ trợ.');
    window.open(WORKBRIDGE_FACEBOOK_URL, '_blank', 'noopener,noreferrer');
  }
}
