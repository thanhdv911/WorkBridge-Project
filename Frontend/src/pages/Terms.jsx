import React from 'react';
import { Link } from 'react-router-dom';

const terms = [
  ['Tài khoản', 'Bạn chịu trách nhiệm giữ an toàn thông tin đăng nhập, sử dụng email thật và cập nhật hồ sơ đúng thực tế.'],
  ['Tin tuyển dụng', 'Doanh nghiệp cần đăng thông tin công việc, mức lương, địa điểm, ca làm và yêu cầu tuyển dụng rõ ràng.'],
  ['Ứng tuyển và làm việc', 'Ứng viên cần đọc kỹ thông tin trước khi ứng tuyển, phản hồi lịch phỏng vấn và tuân thủ ca làm đã xác nhận.'],
  ['Báo cáo vi phạm', 'Báo cáo phải dựa trên sự việc có thật. Hệ thống có cơ chế hạn chế spam và admin có quyền xem xét trước khi xử lý.'],
  ['Dịch vụ VIP', 'Gói VIP mở thêm quyền lợi theo thời hạn và trạng thái thanh toán. Các giao dịch lỗi sẽ được kiểm tra theo dữ liệu từ cổng thanh toán.'],
  ['Bảo trì hệ thống', 'WorkBridge có thể tạm dừng một số chức năng để bảo trì, nâng cấp hoặc xử lý sự cố bảo mật.']
];

export default function Terms() {
  return (
    <div className="static-page-shell">
      <section className="static-hero static-hero-compact">
        <div className="static-hero-inner">
          <div className="static-hero-copy">
            <span className="static-kicker">
              <span className="material-symbols-outlined">gavel</span>
              Điều khoản dịch vụ
            </span>
            <h1>Quy định sử dụng WorkBridge.</h1>
            <p>Các điều khoản này giúp ứng viên, doanh nghiệp và admin cùng vận hành hệ thống minh bạch, an toàn và công bằng hơn.</p>
          </div>
        </div>
      </section>

      <main className="static-content">
        <section className="static-legal-card">
          {terms.map(([title, text]) => (
            <article key={title}>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}

          <div className="static-legal-footer">
            <Link to="/privacy" className="static-primary-button">
              <span className="material-symbols-outlined">policy</span>
              Xem chính sách bảo mật
            </Link>
            <Link to="/contact" className="static-secondary-button">
              <span className="material-symbols-outlined">support_agent</span>
              Liên hệ hỗ trợ
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
