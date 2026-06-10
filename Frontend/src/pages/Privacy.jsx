import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { openAdminChat, WORKBRIDGE_FACEBOOK_URL, WORKBRIDGE_SUPPORT_EMAIL } from '../utils/contactAdmin';

const sections = [
  {
    title: '1. Dữ liệu WorkBridge thu thập',
    body: [
      'Thông tin tài khoản như họ tên, email, vai trò, trạng thái đăng nhập và thời điểm tạo tài khoản.',
      'Thông tin hồ sơ ứng viên như số điện thoại, địa chỉ, kỹ năng, kinh nghiệm, CV, vị trí mong muốn và điểm uy tín.',
      'Thông tin doanh nghiệp như tên công ty, email liên hệ, số điện thoại, địa chỉ, mô tả, logo, chi nhánh và tin tuyển dụng.',
      'Dữ liệu vận hành gồm đơn ứng tuyển, lời mời nhận việc, lịch phỏng vấn, tin nhắn, ca làm, đăng ký ca, chấm công, nhường ca, phiếu lương và báo cáo vi phạm.',
      'Dữ liệu thanh toán VIP như gói đăng ký, trạng thái giao dịch, mã giao dịch và kết quả trả về từ cổng thanh toán.'
    ]
  },
  {
    title: '2. Cách chúng tôi sử dụng dữ liệu',
    body: [
      'Xác thực tài khoản, gửi mã xác thực email, đặt lại mật khẩu và bảo vệ phiên đăng nhập.',
      'Ghép nối ứng viên với việc làm phù hợp, gửi hồ sơ ứng tuyển cho doanh nghiệp và hỗ trợ trao đổi giữa hai bên.',
      'Tính điểm uy tín dựa trên mức độ hoàn thiện hồ sơ, báo cáo vi phạm, lịch sử hoạt động và các tiêu chí vận hành của hệ thống.',
      'Quản lý ca làm, chấm công, lịch sử công, phiếu lương và các yêu cầu nhường ca giữa nhân viên.',
      'Gửi thông báo hệ thống, email bảo trì, email nâng cấp và các thông tin quan trọng liên quan đến tài khoản.'
    ]
  },
  {
    title: '3. Chia sẻ dữ liệu',
    body: [
      'Ứng viên chủ động ứng tuyển thì doanh nghiệp nhận được thông tin hồ sơ cần thiết để xét tuyển.',
      'Doanh nghiệp gửi lời mời hoặc phân ca thì ứng viên liên quan sẽ thấy thông tin công việc, chi nhánh, ca làm và trạng thái xử lý.',
      'Dữ liệu thanh toán được xử lý qua nhà cung cấp cổng thanh toán. WorkBridge không lưu thông tin thẻ ngân hàng đầy đủ.',
      'Quản trị viên có thể xem dữ liệu báo cáo, trạng thái tài khoản và thông tin vận hành để xử lý hỗ trợ, gian lận hoặc bảo trì.'
    ]
  },
  {
    title: '4. Lưu trữ và bảo vệ',
    body: [
      'Dữ liệu được lưu trong hệ thống máy chủ và cơ sở dữ liệu của WorkBridge, kèm cơ chế phân quyền theo vai trò ứng viên, doanh nghiệp và admin.',
      'Mật khẩu được xử lý bằng cơ chế băm an toàn. Mã xác thực email và mã đặt lại mật khẩu có thời hạn sử dụng.',
      'Chúng tôi giữ dữ liệu trong thời gian cần thiết để vận hành tài khoản, xử lý tranh chấp, báo cáo, nghĩa vụ pháp lý và cải thiện dịch vụ.',
      'Không có hệ thống nào an toàn tuyệt đối. Nếu phát hiện rủi ro bảo mật, WorkBridge sẽ ưu tiên cô lập lỗi, thông báo khi cần thiết và triển khai bản vá.'
    ]
  },
  {
    title: '5. Quyền của người dùng',
    body: [
      'Bạn có thể cập nhật hồ sơ, số điện thoại, CV, kỹ năng, thông tin doanh nghiệp và các trường cần thiết trong trang hồ sơ.',
      'Bạn có thể yêu cầu admin hỗ trợ kiểm tra dữ liệu, báo cáo nội dung sai, xử lý tài khoản bị khóa hoặc phản hồi về điểm uy tín.',
      'Bạn có thể yêu cầu ngừng nhận một số email thông báo không bắt buộc. Email xác thực, bảo mật, bảo trì và giao dịch quan trọng vẫn có thể được gửi.'
    ]
  },
  {
    title: '6. Cookie, localStorage và dữ liệu kỹ thuật',
    body: [
      'WorkBridge dùng token đăng nhập, thông tin vai trò, trạng thái VIP và một số dữ liệu giao diện trong trình duyệt để giữ phiên làm việc ổn định.',
      'Hệ thống có thể ghi nhận lỗi, thời điểm truy cập, trạng thái online và dữ liệu kỹ thuật cần thiết để vận hành tính năng thời gian thực.',
      'Bạn có thể xóa dữ liệu trình duyệt, nhưng một số chức năng như đăng nhập, chat, thông báo và chấm công có thể yêu cầu đăng nhập lại.'
    ]
  }
];

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="static-page-shell">
      <section className="static-hero static-hero-compact">
        <div className="static-hero-inner">
          <div className="static-hero-copy">
            <div className="static-page-topline">
              <a href={WORKBRIDGE_FACEBOOK_URL} target="_blank" rel="noreferrer" className="static-facebook-link">
                <span className="static-facebook-logo" aria-hidden="true">f</span>
                Fanpage WorkBridge
              </a>
            </div>
            <span className="static-kicker">
              <span className="material-symbols-outlined">policy</span>
              Chính sách bảo mật
            </span>
            <h1>Cách WorkBridge thu thập, sử dụng và bảo vệ dữ liệu.</h1>
            <p>
              Chính sách này áp dụng cho người tìm việc, doanh nghiệp và quản trị viên sử dụng WorkBridge. Cập nhật ngày 09/06/2026.
            </p>
          </div>
        </div>
      </section>

      <main className="static-content static-legal-layout">
        <aside className="static-legal-aside">
          <h2>Tóm tắt nhanh</h2>
          <p>WorkBridge dùng dữ liệu để vận hành tuyển dụng, hồ sơ, chat, ca làm, thanh toán VIP và bảo mật tài khoản.</p>
          <button type="button" onClick={() => openAdminChat(navigate)} className="static-primary-button">
            <span className="material-symbols-outlined">contact_support</span>
            Hỏi admin
          </button>
          <a href={`mailto:${WORKBRIDGE_SUPPORT_EMAIL}`} className="static-text-link">{WORKBRIDGE_SUPPORT_EMAIL}</a>
        </aside>

        <section className="static-legal-card">
          {sections.map((section) => (
            <article key={section.title}>
              <h2>{section.title}</h2>
              <ul>
                {section.body.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}

          <article>
            <h2>7. Thay đổi chính sách</h2>
            <p>
              WorkBridge có thể cập nhật chính sách này khi tính năng, yêu cầu pháp lý hoặc cách vận hành thay đổi. Phiên bản mới sẽ được đăng tại trang này và có hiệu lực từ thời điểm công bố, trừ khi thông báo khác được nêu rõ.
            </p>
          </article>

          <div className="static-legal-footer">
            <Link to="/about" className="static-secondary-button">
              <span className="material-symbols-outlined">info</span>
              Về WorkBridge
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
