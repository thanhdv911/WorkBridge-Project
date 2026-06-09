import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { openAdminChat, WORKBRIDGE_FACEBOOK_URL, WORKBRIDGE_SUPPORT_EMAIL } from '../utils/contactAdmin';

const contactItems = [
  ['chat', 'Chat với admin', 'Kênh nhanh nhất cho lỗi tài khoản, báo cáo nội dung, xác thực email và hỗ trợ sử dụng.'],
  ['mail', 'Email hỗ trợ', 'Phù hợp cho phản hồi dài, góp ý về chính sách hoặc yêu cầu kiểm tra dữ liệu.'],
  ['public', 'Fanpage WorkBridge', 'Theo dõi thông báo sản phẩm, bảo trì, nâng cấp và các cập nhật mới.']
];

export default function Contact() {
  const navigate = useNavigate();

  return (
    <div className="static-page-shell">
      <section className="static-hero static-hero-compact">
        <div className="static-hero-inner">
          <div className="static-hero-copy">
            <span className="static-kicker">
              <span className="material-symbols-outlined">support_agent</span>
              Liên hệ WorkBridge
            </span>
            <h1>Đội ngũ WorkBridge sẵn sàng hỗ trợ khi bạn cần.</h1>
            <p>
              Chọn kênh liên hệ phù hợp. Nếu bạn đã đăng nhập, nút nhắn admin sẽ mở trực tiếp cuộc trò chuyện trong WorkBridge.
            </p>
          </div>
        </div>
      </section>

      <main className="static-content">
        <section className="static-card-grid">
          {contactItems.map(([icon, title, text]) => (
            <article key={title} className="static-info-card">
              <span className="material-symbols-outlined">{icon}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="static-contact-band">
          <div>
            <span className="static-section-label">Kênh chính thức</span>
            <h2>Liên hệ trực tiếp với quản trị viên.</h2>
            <p>Admin có thể hỗ trợ kiểm tra báo cáo, hồ sơ, điểm uy tín, trạng thái ứng tuyển và các vấn đề trong không gian làm việc.</p>
          </div>
          <div className="static-contact-actions">
            <button type="button" onClick={() => openAdminChat(navigate)} className="static-primary-button">
              <span className="material-symbols-outlined">chat</span>
              Nhắn admin ngay
            </button>
            <a href={`mailto:${WORKBRIDGE_SUPPORT_EMAIL}`} className="static-secondary-button">
              <span className="material-symbols-outlined">mail</span>
              Gửi email
            </a>
            <a href={WORKBRIDGE_FACEBOOK_URL} target="_blank" rel="noreferrer" className="static-text-link">
              Mở fanpage WorkBridge
            </a>
          </div>
        </section>

        <section className="static-section static-two-col">
          <div>
            <span className="static-section-label">Trước khi gửi yêu cầu</span>
            <h2>Thông tin nên chuẩn bị.</h2>
          </div>
          <div className="static-check-list">
            <p><span className="material-symbols-outlined">check_circle</span>Email tài khoản hoặc tên hồ sơ trên WorkBridge.</p>
            <p><span className="material-symbols-outlined">check_circle</span>Đường dẫn tin tuyển dụng, hồ sơ hoặc mã giao dịch nếu có.</p>
            <p><span className="material-symbols-outlined">check_circle</span>Ảnh chụp màn hình lỗi và thời điểm xảy ra lỗi.</p>
          </div>
        </section>

        <div className="static-back-row">
          <Link to="/about" className="static-secondary-button">
            <span className="material-symbols-outlined">arrow_back</span>
            Xem giới thiệu WorkBridge
          </Link>
        </div>
      </main>
    </div>
  );
}
