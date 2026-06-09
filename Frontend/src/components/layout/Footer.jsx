import { Link } from 'react-router-dom';
import WorkBridgeLogo from '../shared/WorkBridgeLogo';
import { WORKBRIDGE_FACEBOOK_URL, WORKBRIDGE_SUPPORT_EMAIL } from '../../utils/contactAdmin';

export default function Footer() {
  return (
    <footer className="bg-[#faf8f4] border-t border-[#e5e1d8]/60">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center mb-4" aria-label="WorkBridge">
              <WorkBridgeLogo imageClassName="h-12 w-auto max-w-[198px] drop-shadow-[0_6px_14px_rgba(37,99,235,0.12)]" />
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">Kết nối sinh viên với cơ hội việc làm linh hoạt.</p>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wider">Dành cho sinh viên</h4>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link to="/jobs" className="hover:text-primary transition-colors">Tìm việc</Link></li>
              <li><Link to="/profile" className="hover:text-primary transition-colors">Hồ sơ của tôi</Link></li>
              <li><Link to="/my-applications" className="hover:text-primary transition-colors">Đơn ứng tuyển</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wider">Dành cho nhà tuyển dụng</h4>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link to="/post-job" className="hover:text-primary transition-colors">Đăng tin tuyển dụng</Link></li>
              <li><Link to="/review-applicants" className="hover:text-primary transition-colors">Duyệt ứng viên</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary transition-colors">Bảng điều khiển</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wider">Về chúng tôi</h4>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link to="/about" className="hover:text-primary transition-colors">Giới thiệu</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Liên hệ</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Chính sách bảo mật</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Điều khoản dịch vụ</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#e5e1d8]/60 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">&copy; 2026 WorkBridge. Bản quyền thuộc về WorkBridge.</p>
          <div className="flex gap-3">
            <a href={WORKBRIDGE_FACEBOOK_URL} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Fanpage WorkBridge">
              <span className="material-symbols-outlined !text-lg">language</span>
            </a>
            <a href={`mailto:${WORKBRIDGE_SUPPORT_EMAIL}`} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Email WorkBridge">
              <span className="material-symbols-outlined !text-lg">mail</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
