import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import WorkBridgeLogo from '../components/shared/WorkBridgeLogo';
import { openAdminChat, WORKBRIDGE_FACEBOOK_URL, WORKBRIDGE_SUPPORT_EMAIL } from '../utils/contactAdmin';

const impactStats = [
  ['60 giây', 'Tạo hồ sơ nhanh'],
  ['Theo ca', 'Tìm việc đúng lịch cá nhân'],
  ['Uy tín', 'Điểm hồ sơ và báo cáo rõ ràng'],
  ['Trực tiếp', 'Chat với doanh nghiệp và admin']
];

const principles = [
  ['verified_user', 'Hồ sơ có độ tin cậy', 'Ứng viên và doanh nghiệp được ghi nhận điểm uy tín, trạng thái hồ sơ, lịch sử báo cáo và các tín hiệu cần thiết để giảm rủi ro khi hợp tác.'],
  ['event_available', 'Công việc vận hành theo ca', 'Tin tuyển dụng, lịch phỏng vấn, ca làm, chấm công, nhường ca và phiếu lương được gom vào một không gian làm việc dễ kiểm tra.'],
  ['forum', 'Trao đổi không bị đứt đoạn', 'Tin nhắn, lời mời nhận việc, phản hồi phỏng vấn và liên hệ admin nằm trong cùng hệ thống để hai bên xử lý nhanh hơn.']
];

const audienceHighlights = [
  {
    icon: 'school',
    title: 'Ứng viên bán thời gian',
    text: 'Tạo hồ sơ rõ ràng, tìm việc theo khu vực, theo dõi ứng tuyển và quản lý ca làm sau khi được nhận.',
    items: ['CV và thông tin liên hệ', 'Ứng tuyển và phỏng vấn', 'Chấm công, lịch sử ca, phiếu lương']
  },
  {
    icon: 'storefront',
    title: 'Doanh nghiệp tuyển dụng',
    text: 'Đăng tin, đánh giá ứng viên, gửi offer, phân ca và theo dõi nhân sự trong một luồng vận hành thống nhất.',
    items: ['Tin tuyển dụng và chi nhánh', 'Lời mời nhận việc, nhân viên', 'Đăng ký ca, chấm công, bảng lương']
  },
  {
    icon: 'admin_panel_settings',
    title: 'Quản trị hệ thống',
    text: 'Theo dõi báo cáo, thông báo bảo trì, hỗ trợ người dùng và giữ trải nghiệm WorkBridge ổn định hơn mỗi ngày.',
    items: ['Báo cáo nội dung', 'Thông báo email hệ thống', 'Kênh hỗ trợ trực tiếp']
  }
];

const workflow = [
  ['01', 'Tạo hồ sơ đáng tin', 'Ứng viên hoàn thiện thông tin, CV, vị trí mong muốn và số điện thoại để tăng dần điểm uy tín cá nhân.'],
  ['02', 'Tìm và ứng tuyển', 'Lọc công việc theo khu vực, mức lương, loại việc và gửi hồ sơ khi lịch làm phù hợp với nhu cầu của mình.'],
  ['03', 'Nhận việc và làm theo ca', 'Doanh nghiệp gửi offer, phân ca, mở đăng ký lịch tuần và nhân viên theo dõi mọi thay đổi trong không gian làm việc.'],
  ['04', 'Ghi nhận minh bạch', 'Chấm công, lịch sử ca, phiếu lương và báo cáo được lưu lại để hai bên đối chiếu khi cần.']
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="static-page-shell static-about-shell">
      <section className="static-hero static-about-hero">
        <div className="static-hero-canvas" aria-hidden="true">
          <span className="static-hero-beam static-hero-beam-a" />
          <span className="static-hero-beam static-hero-beam-b" />
          <span className="static-hero-line static-hero-line-a" />
          <span className="static-hero-line static-hero-line-b" />
        </div>

        <div className="static-hero-inner static-about-hero-inner">
          <div className="static-hero-copy">
            <div className="static-page-topline">
              <a href={WORKBRIDGE_FACEBOOK_URL} target="_blank" rel="noreferrer" className="static-facebook-link">
                <span className="static-facebook-logo" aria-hidden="true">f</span>
                Fanpage WorkBridge
              </a>
            </div>
            <span className="static-kicker">
              <span className="material-symbols-outlined">handshake</span>
              Giới thiệu WorkBridge
            </span>
            <h1>WorkBridge kết nối việc làm bán thời gian trong một hệ sinh thái đáng tin cậy.</h1>
            <p>
              Chúng tôi xây dựng nền tảng để ứng viên tìm được ca phù hợp nhanh hơn, doanh nghiệp tuyển và quản lý nhân sự rõ ràng hơn, còn mọi trao đổi quan trọng đều nằm trong một luồng minh bạch.
            </p>
            <div className="static-hero-actions">
              <button type="button" onClick={() => openAdminChat(navigate)} className="static-primary-button">
                <span className="material-symbols-outlined">chat</span>
                Nhắn admin
              </button>
              <Link to="/jobs" className="static-secondary-button">
                <span className="material-symbols-outlined">work</span>
                Khám phá việc đang mở
              </Link>
            </div>

            <div className="static-impact-row" aria-label="Điểm nổi bật của WorkBridge">
              {impactStats.map(([value, label]) => (
                <div key={value} className="static-impact-card">
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="static-about-visual" aria-label="Mô phỏng hệ sinh thái WorkBridge">
            <div className="static-visual-top">
              <WorkBridgeLogo imageClassName="h-12 w-auto max-w-[210px]" />
              <span className="static-live-pill">
                <i />
                Đang đồng bộ
              </span>
            </div>

            <div className="static-system-board">
              <div className="static-system-row">
                <span className="material-symbols-outlined">badge</span>
                <div>
                  <strong>Ứng viên hoàn thiện hồ sơ</strong>
                  <small>CV, số điện thoại, khu vực mong muốn</small>
                  <div className="static-progress-track"><i style={{ width: '92%' }} /></div>
                </div>
                <b>92%</b>
              </div>

              <div className="static-system-row">
                <span className="material-symbols-outlined">business_center</span>
                <div>
                  <strong>Doanh nghiệp mở ca tuần sau</strong>
                  <small>Kiểm tra trùng lịch trước khi gửi</small>
                  <div className="static-progress-track"><i style={{ width: '76%' }} /></div>
                </div>
                <b>Live</b>
              </div>

              <div className="static-system-row">
                <span className="material-symbols-outlined">shield</span>
                <div>
                  <strong>Admin theo dõi an toàn</strong>
                  <small>Lọc báo cáo, hỗ trợ người dùng, gửi thông báo</small>
                  <div className="static-progress-track"><i style={{ width: '84%' }} /></div>
                </div>
                <b>OK</b>
              </div>
            </div>

            <div className="static-workflow-rail" aria-hidden="true">
              {['Hồ sơ', 'Ứng tuyển', 'Phỏng vấn', 'Ca làm', 'Lương'].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="static-content">
        <section className="static-section static-two-col">
          <div>
            <span className="static-section-label">Sứ mệnh</span>
            <h2>Làm cho việc bán thời gian bớt rời rạc và dễ tin nhau hơn.</h2>
          </div>
          <p>
            Một công việc bán thời gian không chỉ là tin tuyển dụng. Người lao động cần biết công việc nào phù hợp, doanh nghiệp cần theo dõi lịch, điểm danh, phản hồi và lương. WorkBridge gom các bước đó vào một hệ thống rõ ràng để mỗi bên ra quyết định nhanh hơn, giảm hiểu nhầm và có dữ liệu đối chiếu khi cần.
          </p>
        </section>

        <section className="static-card-grid">
          {principles.map(([icon, title, text]) => (
            <article key={title} className="static-info-card">
              <span className="material-symbols-outlined">{icon}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="static-section">
          <div className="static-section-heading">
            <span className="static-section-label">Dành cho ai</span>
            <h2>Một nền tảng, ba góc nhìn được thiết kế để làm việc cùng nhau.</h2>
          </div>
          <div className="static-audience-grid">
            {audienceHighlights.map((item) => (
              <article key={item.title} className="static-audience-card">
                <span className="material-symbols-outlined">{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <ul>
                  {item.items.map((line) => (
                    <li key={line}>
                      <span className="material-symbols-outlined">check_circle</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="static-section">
          <div className="static-section-heading">
            <span className="static-section-label">Cách WorkBridge vận hành</span>
            <h2>Từ hồ sơ đến ca làm trong một đường đi rõ ràng, có ghi nhận và có người hỗ trợ.</h2>
          </div>
          <div className="static-timeline static-timeline-wide">
            {workflow.map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="static-contact-band">
          <div>
            <span className="static-section-label">Liên hệ</span>
            <h2>Cần hỗ trợ tài khoản, báo cáo nội dung hoặc trao đổi hợp tác?</h2>
            <p>Đội ngũ WorkBridge ưu tiên xử lý trực tiếp trong hệ thống để có đủ ngữ cảnh. Bạn cũng có thể theo dõi fanpage để nhận thông báo cập nhật mới.</p>
          </div>
          <div className="static-contact-actions">
            <button type="button" onClick={() => openAdminChat(navigate)} className="static-primary-button">
              <span className="material-symbols-outlined">forum</span>
              Nhắn với admin
            </button>
            <a href={WORKBRIDGE_FACEBOOK_URL} target="_blank" rel="noreferrer" className="static-secondary-button">
              <span className="material-symbols-outlined">public</span>
              Fanpage WorkBridge
            </a>
            <a href={`mailto:${WORKBRIDGE_SUPPORT_EMAIL}`} className="static-text-link">
              {WORKBRIDGE_SUPPORT_EMAIL}
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
