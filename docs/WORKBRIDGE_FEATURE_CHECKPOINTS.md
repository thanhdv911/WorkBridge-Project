# WorkBridge Feature Checkpoints

Tai lieu nay dung de theo doi viec nang cap WorkBridge thanh he thong:

`Apply job -> Duyet ung vien -> Chat -> Hen phong van -> Nhan vao lam -> Quan ly ca -> Pass ca -> Cham cong -> Tinh luong`

Muc tieu san pham: WorkBridge khong chi la web tim viec. WorkBridge phai giu duoc ca hai ben:

- Ung vien/nhan vien quay lai de xem ca, pass ca, chat, cham cong, xem luong.
- Doanh nghiep quay lai de tuyen nguoi, sap ca, duyet cong, tinh luong, quan ly nhan su part-time.

## Cach Dung Checklist

Trang thai checkbox:

- `[ ]` Chua lam.
- `[~]` Dang lam hoac lam chua du.
- `[x]` Da hoan thanh va da test.

Moi chuc nang chi duoc xem la xong khi dat du ca 4 muc:

- Backend/API chay dung.
- Frontend hien dung va khong trang trang.
- Data duoc luu dung vao database.
- Co test case thanh cong va test case loi.

## Actor Va Role

### Applicant

Nguoi dung dang tim viec.

Quyen chinh:

- Xem job.
- Apply job.
- Theo doi don ung tuyen.
- Chat voi doanh nghiep sau khi duoc accept.
- Xem lich phong van.
- Accept offer de tro thanh employee.

### Employee

Nguoi dung da duoc doanh nghiep nhan vao lam.

Quyen chinh:

- Xem lich ca cua minh.
- Nhan thong bao ca moi.
- Gui yeu cau pass ca.
- Chap nhan hoac tu choi yeu cau pass ca tu nhan vien khac.
- Check-in/check-out.
- Xem cong va luong tam tinh.
- Xem phieu luong.

### Employer

Doanh nghiep/quan/cua hang.

Quyen chinh:

- Dang job.
- Duyet application.
- Chat voi ung vien da duoc accept.
- Tao lich phong van.
- Gui offer.
- Quan ly chi nhanh/quan.
- Quan ly nhan vien.
- Tao va gan ca.
- Xem log pass ca.
- Duyet cong.
- Xem va chot bang luong.

### Admin

Nguoi quan tri he thong.

Quyen chinh:

- Quan ly user.
- Quan ly category.
- Quan ly job bi report.
- Xem thong ke tong quan.
- Xu ly doanh nghiep/user vi pham.

## Milestone Tong Quan

## Implementation Log

### 2026-05-19 - Phase 1 Slice: Apply -> Accept -> Chat

- [x] Backend build pass sau khi sua application/chat flow.
- [x] Frontend build pass sau khi sua employer review, my applications, job detail.
- [x] Application moi tao status `Applied`.
- [x] Employer update status bang API object `{ status }`.
- [x] Employer accept application thi backend tu tao message mo dau.
- [x] Applicant thay conversation sau khi application duoc accept.
- [x] Chat API chan user khong co accepted application/thread hop le.
- [x] Job detail chan apply trung o UI sau khi da apply.
- [ ] Chua co bang Conversations rieng, MVP dang dung Messages lam thread theo cap user.
- [x] Ghi chu lich su: tai thoi diem phase nay chua co Interview/Offer/Employee. Hien da co Offer/Employment, Interview van chua co.

### 2026-05-19 - Employer Review UX And MVP Employee Slice

- [x] Sua Review Applicants khong con dung table rong gay keo ngang.
- [x] Them `min-w-0` va layout co gian cho Employer Dashboard.
- [x] Accept xong khong hien lai nut Accept/Reject.
- [x] Accept co nut `Open Chat`, va `Accept & Chat` dua employer sang chat.
- [x] Employer xem duoc profile ung vien trong panel: university, major, phone, availability, about, skills, experience, review summary, CV.
- [x] Them status `Hired` bang nut `Add as Employee` trong MVP.
- [x] Them tab Employees de hien applicants da `Hired`.
- [x] Tao file test plan tong the: `docs/WORKBRIDGE_TEST_PLAN.md`.
- [x] MVP `Add as Employee` da duoc thay bang flow chuan `Offer -> Applicant accept -> Employment`.
- [x] Employee tab hien tai dung bang `Employments` that, khong con dua vao moi application status `Hired`.
- [x] Da build `Offer -> Employment -> EmployeeRate` de quan ly nhan vien dung nghiep vu.

### 2026-05-20 - Standard Workforce Slice: Offer -> Employment -> Shift -> Payroll

- [x] Them bang/module `Branches` de employer quan ly chi nhanh/quan.
- [x] Them bang/module `Offers`: employer gui offer co branch, position, hourly rate, start date, payday.
- [x] Applicant co trang `/offers` de accept/decline official offer.
- [x] Accept offer tao `Employment` that va `EmployeeRate` current.
- [x] Application sau khi accept offer chuyen sang `Hired`.
- [x] Employer Employees tab doc tu `Employments`, khong doc tu status `Hired` tam.
- [x] Them `WorkShifts` va `ShiftAssignments` de employer tao/gan ca cho employee cung branch.
- [x] Them trang `/my-work` cho employee xem employment, ca lam, check-in/check-out.
- [x] Employer Shifts tab thay attendance theo tung assignment va approve cong.
- [x] Payroll generate theo thang tu attendance status `Approved`.
- [x] Test API demo: employee 20,000 VND/h, 240 phut approved, payroll thang 05/2026 = 80,000 VND.
- [ ] Chua co module Interview offline chuan.
- [ ] Chua co pass ca 2 tieng truoc gio lam.
- [ ] Chua co payslip cho employee xem chi tiet luong tu payroll.

### 2026-05-20 - Completion Slice: Interview, Pass Shift, Payslip, Payroll Close

- [x] Them bang/module `Interviews`.
- [x] Employer tao lich phong van offline cho application hop le.
- [x] Applicant confirm/decline/request change interview.
- [x] Employer mark interview result `Passed`/`Failed`.
- [x] Interview `Passed` chuyen application sang `Interview Passed`; `Failed` chuyen sang `Rejected`.
- [x] Them bang/module `ShiftPassRequests`.
- [x] Employee gui pass ca cho coworker cung branch.
- [x] Rule pass ca truoc gio lam it nhat 2 tieng.
- [x] Coworker accept thi assignment cu sang `Transferred`, assignment moi duoc tao cho coworker.
- [x] Coworker reject/expired thi ca van cua nguoi gui.
- [x] Employer xem duoc transfer qua Shifts tab.
- [x] Attendance co `approve`, `reject`, `adjust`.
- [x] Employer update employee status `Active`/`Inactive`/`Ended`.
- [x] Employer update hourly rate va giu rate history bang `EmployeeRates`.
- [x] Payroll co `lock` va `mark-paid`.
- [x] Employee co trang `/payslips` xem payroll da lock/paid.
- [x] Frontend them `/interviews`, `/payslips`, pass shift trong `/my-work`, Employer Interviews tab.
- [x] Test API demo:
  - Interview application 4: `Completed` + `Passed`.
  - Shift pass request 1: `Accepted`, ca 5 chuyen sang coworker user 9.
  - Attendance record 2: reject -> adjust approved, `240` phut.
  - Payroll period 1: `Paid`, payslip hien cho Demo Applicant.
- [x] Background hosted service tu expire shift pass pending moi 1 phut.
- [x] Payroll draft cho phep adjust bonus/penalty/deduction tung item.
- [x] Test payroll adjustment: payroll 06/2026 draft, bonus 10,000 VND, total = 10,000 VND.
- [ ] Chua co UI calendar grid; Employer Interviews hien dang list.

### 2026-05-20 - Completion Slice: Chat Interview Invite -> Direct Hire

- [x] Messages co `MessageType` va `InterviewId` de render interview card trong chat.
- [x] Employer tao lich phong van offline ngay trong `/messages`.
- [x] Applicant accept/reject interview ngay trong chat.
- [x] Employer chi thay Pass/Not Pass sau khi applicant da accept va gio hen da qua.
- [x] `Pass` tao offer noi bo status `Accepted`, tao `Employment`, tao `EmployeeRate`, va chuyen application sang `Hired`.
- [x] `Not Pass` chuyen interview sang `Completed/Failed`, application sang `Rejected`, khong tao employee.
- [x] Da apply DB compatibility columns cho local `WorkBridgeDB`: `Messages.MessageType`, `Messages.InterviewId`.
- [x] Smoke test API demo: interview `2` cua application `4` da `Completed/Passed`, user `10` thanh employee active 20,000 VND/h.
- [x] Smoke test API demo: interview `3` da `Completed/Failed`, khong tao employee.
- [x] Tao account test moi `chat.interview.demo@workbridge.test` / `Password123!`, application `5` dang `Accepted` de test lai luong chat interview tu dau.

### 2026-05-20 - Database Migration Portability

- [x] Them EF Core initial migration trong `WorkBridge.Infrastructure/Migrations`.
- [x] Migration tao day du schema WorkBridge: auth, jobs, applications, messages, interviews, offers, employments, shifts, pass shift, attendance, payroll.
- [x] Migration seed du lieu nen bat buoc: `Roles`, `JobCategories`, `JobShifts`.
- [x] `Messages` trong migration co `MessageType`, `InterviewId` va FK toi `Interviews`.
- [x] Them FK cho workforce tables de DB moi tao ra dung rule: `Branches`, `Offers`, `Employments`, `EmployeeRates`, `WorkShifts`, `ShiftAssignments`, `ShiftPassRequests`, `AttendanceRecords`, `PayrollPeriods`, `PayrollItems`.
- [x] Test migration tren DB sach `WorkBridgeDB_MigrationSmoke`: tao DB thanh cong, seed OK, column chat interview OK, FK workforce/chat interview OK.
- [x] Test runtime tren DB moi: API `register` va `login` thanh cong voi user moi.
- [x] Cap nhat `README.md` de may khac clone ve chay `dotnet ef database update` thay vi phu thuoc DB local.

### Phase 1 - Tuyen Dung Co Ban

- [x] Apply job.
- [x] Employer duyet application.
- [x] Accept application thi mo chat.
- [x] Dat lich phong van offline.
- [x] Gui offer.
- [x] Applicant accept offer va tro thanh employee.

### Phase 2 - Quan Ly Nhan Vien Va Ca Lam

- [x] Tao chi nhanh/quan.
- [x] Tao employee record that qua `Employment`.
- [x] Tao ca lam.
- [x] Gan ca cho nhan vien.
- [x] Employee xem lich ca.
- [x] Employee pass ca cho nhau trong cung quan.

### Phase 3 - Cham Cong Va Tinh Luong

- [x] Check-in/check-out.
- [x] Employer duyet cong.
- [x] Tinh luong theo gio.
- [x] Tao bang luong theo thang.
- [x] Phieu luong cho nhan vien.
- [ ] Trang thai tra luong ngay 5 hang thang.

### Phase 4 - Giu Chan User Va Bao Cao

- [ ] Notification realtime hoac gan realtime.
- [ ] Luong tam tinh trong thang.
- [ ] Bao cao chi phi nhan su.
- [ ] Bao cao vang/tre/pass ca.
- [ ] Danh gia nhan vien.
- [ ] Goi y nhan vien phu hop cho ca trong.

## Luong Nghiep Vu Chuan

### Luong 1: Tu Apply Den Duoc Nhan Vao Lam

1. Applicant xem job.
2. Applicant bam apply.
3. He thong tao application voi status `Applied`.
4. Employer xem application trong dashboard.
5. Employer chon `Accept` hoac `Reject`.
6. Neu `Reject`, application ket thuc.
7. Neu `Accept`, he thong tao conversation.
8. Hai ben chat de trao doi.
9. Employer tao lich phong van offline.
10. Applicant xac nhan lich phong van.
11. Employer cap nhat ket qua phong van.
12. Neu dat, employer gui offer.
13. Applicant accept offer.
14. He thong tao employee record.
15. User co them quyen employee voi doanh nghiep do.

Checkpoint:

- [ ] Moi buoc deu co status ro rang.
- [ ] Reload page khong mat trang thai.
- [ ] User chi thay du lieu lien quan den minh.
- [ ] Employer chi thay du lieu cua doanh nghiep minh.

### Luong 2: Tu Employee Den Tinh Luong

1. Employer tao ca lam.
2. Employer gan ca cho employee.
3. Employee nhan notification.
4. Employee xem lich ca.
5. Truoc khi lam, employee co the pass ca cho nhan vien cung quan.
6. Den gio lam, employee check-in.
7. Het gio, employee check-out.
8. Employer duyet cong.
9. He thong cong don so gio hop le.
10. Cuoi thang tao payroll.
11. Ngay 5 chuyen trang thai sang da tra hoac cho tra.
12. Employee xem payslip.

Checkpoint:

- [ ] Ca nao chua duyet cong thi chua tinh luong chinh thuc.
- [ ] Luong theo gio lay theo lich su tai thoi diem lam ca.
- [ ] Pass ca thanh cong thi nguoi moi la nguoi duoc cham cong.
- [ ] Bang luong thang cu khong bi thay doi khi luong gio hien tai thay doi.

## State Machine Can Co

### Application Status

```text
Applied
Reviewed
Shortlisted
Accepted
Rejected
InterviewScheduled
InterviewPassed
InterviewFailed
Offered
Hired
Cancelled
```

Rule:

- [ ] `Applied` la status mac dinh sau khi apply.
- [ ] `Rejected` la trang thai ket thuc.
- [ ] `Hired` la trang thai ket thuc thanh cong.
- [ ] Chi employer so huu job moi duoc doi status.
- [ ] Applicant khong duoc tu doi status application.

### Conversation Status

```text
Open
Closed
Archived
```

Rule:

- [ ] Conversation chi tao sau khi application duoc employer accept.
- [ ] Mot application chi co toi da mot conversation chinh.
- [ ] Chi applicant va employer lien quan moi duoc doc/gui tin.
- [ ] Khi application rejected truoc luc accept thi khong tao conversation.

### Interview Status

```text
Pending
Confirmed
RescheduleRequested
Completed
Cancelled
NoShow
```

Rule:

- [ ] Employer tao lich phong van.
- [ ] Applicant xac nhan hoac yeu cau doi lich.
- [ ] Khong cho tao lich trong qua khu.
- [ ] Interview phai gan voi application.

### Offer Status

```text
Draft
Sent
Accepted
Declined
Expired
Cancelled
```

Rule:

- [ ] Chi gui offer khi ung vien da qua phong van hoac employer quyet dinh nhan.
- [ ] Offer can co hourly rate, branch, start date, position.
- [ ] Applicant accept offer thi tao employment.
- [ ] Mot application khong duoc tao nhieu employment active.

### Employment Status

```text
Active
Paused
Resigned
Terminated
```

Rule:

- [ ] Employee active moi duoc gan ca.
- [ ] Employee nghi viec khong duoc gan ca moi.
- [ ] Van giu lich su ca, cong, luong cua employee da nghi.

### Shift Assignment Status

```text
Assigned
Accepted
InProgress
Completed
Missed
Cancelled
Transferred
```

Rule:

- [ ] Ca duoc gan cho employee active.
- [ ] Khong gan trung gio cho cung mot employee.
- [ ] Ca da pass thanh cong thi assignment cu thanh `Transferred`.
- [ ] Assignment moi thuoc ve employee nhan ca.

### Shift Pass Request Status

```text
Pending
Accepted
Rejected
Expired
Cancelled
```

Rule chot:

- [ ] Chi pass ca giua nhan vien trong cung quan/cung chi nhanh.
- [ ] Chi duoc gui yeu cau khi con it nhat 2 tieng truoc gio bat dau ca.
- [ ] Nguoi nhan accept thi ca chuyen sang nguoi nhan.
- [ ] Nguoi nhan reject thi ca giu nguyen nguoi cu.
- [ ] Het han ma chua accept thi ca giu nguyen nguoi cu.
- [ ] Moi ca chi co mot request pass dang `Pending`.
- [ ] Khong can manager duyet trong MVP.
- [ ] He thong van ghi log de employer xem.

### Attendance Status

```text
NotStarted
CheckedIn
CheckedOut
Approved
Rejected
Adjusted
```

Rule:

- [ ] Chi employee duoc gan ca moi check-in duoc.
- [ ] Khong check-in hai lan cho cung mot ca.
- [ ] Khong check-out khi chua check-in.
- [ ] Attendance can duoc employer duyet truoc khi tinh luong chinh thuc.

### Payroll Status

```text
Draft
PendingReview
Locked
Payable
Paid
Cancelled
```

Rule:

- [ ] Payroll tao theo thang va theo doanh nghiep.
- [ ] Chi tinh ca da duyet cong.
- [ ] Ngay 5 hang thang la ngay tra luong mac dinh.
- [ ] Payroll da `Locked` thi khong tu dong thay doi.
- [ ] Neu can sua sau khi locked, phai tao adjustment.

## Data Model Checklist

### Applications

Can co:

- [ ] `Id`
- [ ] `JobId`
- [ ] `ApplicantId`
- [ ] `EmployerId`
- [ ] `Status`
- [ ] `CoverLetter`
- [ ] `CvUrl`
- [ ] `CreatedAt`
- [ ] `UpdatedAt`
- [ ] `ReviewedAt`
- [ ] `RejectedReason`

Validation:

- [ ] Unique theo `JobId + ApplicantId`.
- [ ] Job phai dang active moi apply duoc.
- [ ] Applicant khong apply job cua chinh employer account neu user do la employer.

### Conversations

Can co:

- [ ] `Id`
- [ ] `ApplicationId`
- [ ] `JobId`
- [ ] `EmployerId`
- [ ] `ApplicantId`
- [ ] `Status`
- [ ] `CreatedAt`
- [ ] `LastMessageAt`

Validation:

- [ ] Unique theo `ApplicationId`.
- [ ] Chi tao khi application status duoc accept.

### Messages

Can co:

- [ ] `Id`
- [ ] `ConversationId`
- [ ] `SenderId`
- [ ] `Content`
- [ ] `MessageType`
- [ ] `IsRead`
- [ ] `CreatedAt`

Validation:

- [ ] Sender phai thuoc conversation.
- [ ] Content khong duoc rong.
- [ ] Gioi han do dai content.

### Interviews

Can co:

- [ ] `Id`
- [ ] `ApplicationId`
- [ ] `EmployerId`
- [ ] `ApplicantId`
- [ ] `ScheduledAt`
- [ ] `Location`
- [ ] `Note`
- [ ] `Status`
- [ ] `Result`
- [ ] `CreatedAt`
- [ ] `UpdatedAt`

Validation:

- [ ] `ScheduledAt` phai lon hon hien tai.
- [ ] Location bat buoc voi offline interview.
- [ ] Chi employer tao/sua lich.
- [ ] Applicant chi confirm/request change/decline.

### Offers

Can co:

- [x] `Id`
- [x] `ApplicationId`
- [x] `EmployerId`
- [x] `ApplicantId`
- [x] `BranchId`
- [x] `Position`
- [x] `HourlyRate`
- [x] `StartDate`
- [x] `PaydayOfMonth`
- [x] `Status`
- [x] `ExpiredAt`
- [x] `CreatedAt`
- [x] `AcceptedAt`

Validation:

- [x] `HourlyRate` > 0.
- [x] `PaydayOfMonth` mac dinh la 5.
- [x] Offer sent moi duoc applicant accept.
- [x] Offer expired thi khong accept duoc.

### Employments

Can co:

- [x] `Id`
- [x] `EmployerId`
- [x] `EmployeeUserId`
- [x] `BranchId`
- [x] `OfferId`
- [x] `Position`
- [x] `Status`
- [x] `StartDate`
- [x] `EndDate`
- [x] `CreatedAt`

Validation:

- [x] Mot employee co the lam cho nhieu employer neu he thong cho phep.
- [x] Trong mot employer, can tranh tao trung employment active cho cung user.

### EmployeeRates

Can co:

- [x] `Id`
- [x] `EmploymentId`
- [x] `HourlyRate`
- [x] `EffectiveFrom`
- [x] `EffectiveTo`
- [x] `CreatedAt`

Validation:

- [~] Khong overlap thoi gian rate cua cung employment. Hien tai moi tao initial rate, chua co API doi rate.
- [x] Khi tinh luong ca nao thi lay rate co hieu luc tai ngay ca do.

### Branches

Can co:

- [x] `Id`
- [x] `EmployerId`
- [x] `Name`
- [x] `Address`
- [x] `Phone`
- [x] `IsActive`
- [x] `CreatedAt`

Validation:

- [ ] Employee chi pass ca cho employee trong cung `BranchId`.
- [x] Employer chi quan ly branch cua minh.

### Shifts

Can co:

- [x] `Id`
- [x] `EmployerId`
- [x] `BranchId`
- [x] `Title`
- [x] `StartTime`
- [x] `EndTime`
- [x] `RequiredRole`
- [x] `RequiredPeople`
- [x] `Status`
- [x] `CreatedAt`

Validation:

- [x] `EndTime` phai lon hon `StartTime`.
- [x] Shift phai thuoc branch active.
- [ ] Khong tao ca trong qua khu neu khong co quyen admin/employer override.

### ShiftAssignments

Can co:

- [x] `Id`
- [x] `ShiftId`
- [x] `EmployeeUserId`
- [x] `EmploymentId`
- [x] `Status`
- [x] `AssignedAt`
- [x] `TransferredFromAssignmentId`

Validation:

- [x] Employee phai active trong employer va branch cua shift.
- [x] Khong trung lich voi assignment active khac.
- [ ] Assignment transferred van duoc giu de audit. Se lam trong module pass ca.

### ShiftPassRequests

Can co:

- [ ] `Id`
- [ ] `ShiftAssignmentId`
- [ ] `ShiftId`
- [ ] `FromEmployeeUserId`
- [ ] `ToEmployeeUserId`
- [ ] `BranchId`
- [ ] `Status`
- [ ] `RequestedAt`
- [ ] `RespondedAt`
- [ ] `ExpiresAt`
- [ ] `Reason`

Validation:

- [ ] `FromEmployeeUserId` phai la chu ca hien tai.
- [ ] `ToEmployeeUserId` phai cung branch.
- [ ] Thoi diem request phai truoc gio bat dau ca it nhat 2 tieng.
- [ ] `ToEmployeeUserId` khong bi trung lich.
- [ ] Moi assignment chi co mot pass request pending.

### AttendanceRecords

Can co:

- [x] `Id`
- [x] `ShiftAssignmentId`
- [x] `EmployeeUserId`
- [x] `CheckInAt`
- [x] `CheckOutAt`
- [x] `WorkedMinutes`
- [x] `Status`
- [x] `ApprovedByEmployerId`
- [x] `ApprovedAt`
- [x] `Note`

Validation:

- [x] `CheckOutAt` phai lon hon `CheckInAt`.
- [x] WorkedMinutes tinh tu check-in/check-out.
- [x] Chi attendance approved moi vao payroll chinh thuc.

### PayrollPeriods

Can co:

- [x] `Id`
- [x] `EmployerId`
- [x] `Month`
- [x] `Year`
- [x] `Status`
- [x] `Payday`
- [x] `CreatedAt`
- [x] `LockedAt`
- [x] `PaidAt`

Validation:

- [x] Unique theo `EmployerId + Month + Year`.
- [x] `Payday` mac dinh la ngay 5 cua thang sau hoac theo policy doanh nghiep.

### PayrollItems

Can co:

- [x] `Id`
- [x] `PayrollPeriodId`
- [x] `EmploymentId`
- [x] `EmployeeUserId`
- [x] `TotalApprovedMinutes`
- [x] `HourlyRateSnapshot`
- [x] `BaseSalary`
- [x] `Bonus`
- [x] `Penalty`
- [x] `Deduction`
- [x] `FinalSalary`
- [x] `Status`

Validation:

- [ ] Salary snapshot khong doi khi rate moi duoc cap nhat.
- [ ] Final salary = base + bonus - penalty - deduction.

### Notifications

Can co:

- [ ] `Id`
- [ ] `UserId`
- [ ] `Type`
- [ ] `Title`
- [ ] `Message`
- [ ] `TargetUrl`
- [ ] `IsRead`
- [ ] `CreatedAt`

Validation:

- [ ] TargetUrl phai dua user ve dung man hinh lien quan.
- [ ] User chi doc notification cua minh.

### AuditLogs

Can co:

- [ ] `Id`
- [ ] `ActorUserId`
- [ ] `Action`
- [ ] `EntityType`
- [ ] `EntityId`
- [ ] `OldValue`
- [ ] `NewValue`
- [ ] `CreatedAt`

Validation:

- [ ] Cac hanh dong quan trong phai co log: accept application, accept offer, pass ca, duyet cong, lock payroll.

## Feature 1 - Apply Job

### Muc Tieu

Ung vien co the nop don vao job va theo doi trang thai don.

### Business Rule

- [x] Chi user da login moi apply duoc.
- [x] Chi role Applicant moi apply truc tiep.
- [x] Mot applicant khong duoc apply trung cung mot job.
- [x] Job het han, bi an, hoac da dong thi khong apply duoc.
- [x] Apply thanh cong tao application status `Applied`.

### Backend/API

- [x] `POST /api/application`
- [x] `GET /api/application/my`
- [x] `GET /api/application/employer`
- [x] Check duplicate application.
- [x] Check job active.
- [x] Return message loi ro rang.

### Frontend

- [x] Nut Apply tren job detail.
- [x] Neu chua login, redirect ve `/login`.
- [x] Neu apply roi, doi nut thanh `Applied`.
- [x] Trang My Applications hien status.
- [x] Loading, empty state, error state khong trang trang.

### Test Case

- [x] Applicant apply thanh cong.
- [x] Applicant apply trung bi chan.
- [x] Guest apply thi ve login.
- [x] Job dong thi khong apply duoc.
- [x] Employer khong duoc apply job nhu applicant.

### Done Khi

- [x] DB co application moi.
- [x] Applicant thay don cua minh.
- [x] Employer thay don cua job minh.
- [x] Khong co trang trang khi API loi.

## Feature 2 - Employer Review Application

### Muc Tieu

Doanh nghiep duyet ho so ung vien va quyet dinh buoc tiep theo.

### Business Rule

- [x] Employer chi xem application cua job minh dang.
- [~] Employer co the `Accept`, `Reject`, `Shortlist`. MVP hien co `Accept`, `Reject`, `Under Review`.
- [~] Reject can co ly do hoac co the optional trong MVP. MVP chua bat buoc ly do.
- [x] Accept application se mo chat.
- [x] Moi lan doi status phai cap nhat `RespondedAt`.

### Backend/API

- [x] `GET /api/application/employer`
- [x] `PATCH /api/application/{id}/status`
- [x] Validate ownership theo employer.
- [x] Tao chat thread khi status chuyen sang `Accepted`.
- [x] Tao notification cho applicant.

### Frontend

- [x] Dashboard danh sach applications.
- [ ] Filter theo job/status.
- [~] Nut Accept/Reject/Shortlist. MVP hien co Accept/Reject/Under Review.
- [ ] Confirm truoc khi Reject.
- [x] Status badge ro rang.

### Test Case

- [x] Employer accept application thanh cong.
- [x] Accept xong applicant nhan notification.
- [x] Employer khac khong sua duoc application.
- [ ] Reject xong khong tao chat.

### Done Khi

- [x] Status trong DB dung.
- [x] Chat thread duoc tao khi accept.
- [x] Applicant va employer thay status moi.

## Feature 3 - Chat Sau Khi Accept

### Muc Tieu

Chi cho chat khi doanh nghiep da accept application, giup hai ben trao doi phong van.

### Business Rule

- [x] Chat chi mo sau khi application status `Accepted` hoac buoc sau do.
- [~] Conversation gan voi application. MVP hien tai gan thread bang user pair va `JobPostId` tren message mo dau.
- [x] Chi applicant va employer lien quan duoc xem.
- [x] Message khong duoc rong.
- [x] Luu lich su chat.

### Backend/API

- [x] `GET /api/messages/conversations`
- [x] `GET /api/messages/{contactId}`
- [x] `POST /api/messages`
- [x] Mark message as read.
- [x] Validate sender thuoc conversation/thread.

### Frontend

- [x] Man hinh Messages.
- [x] Danh sach conversation.
- [x] Khung chat.
- [x] Loading skeleton.
- [x] Empty state khi chua co chat.
- [x] Loi API van hien man hinh loi than thien.

### Test Case

- [x] Accept application xong co conversation.
- [x] Applicant gui message duoc.
- [x] Employer gui message duoc.
- [x] User khac khong doc duoc conversation.
- [x] Refresh van con message.

### Done Khi

- [x] Tin nhan duoc luu DB.
- [x] Hai ben doc/gui duoc.
- [x] Khong ai ngoai conversation truy cap duoc.

## Feature 4 - Lich Phong Van Offline

### Muc Tieu

Doanh nghiep hen lich phong van offline va ung vien xac nhan tren web.

### Business Rule

- [x] Chi employer tao lich.
- [x] Lich phong van phai gan voi application.
- [x] Application phai da duoc accept hoac shortlisted.
- [x] Thoi gian phong van khong duoc nam trong qua khu.
- [x] Location bat buoc vi la offline.
- [x] Applicant co the confirm, request change, decline.

### Backend/API

- [x] `POST /api/interviews`
- [x] `GET /api/interviews/my`
- [x] `GET /api/interviews/employer`
- [x] `PATCH /api/interviews/{id}/status`
- [x] `PATCH /api/interviews/{id}/result`
- [x] Tao notification cho applicant khi co lich moi.
- [x] Tao notification cho employer khi applicant phan hoi.

### Frontend

- [x] Employer tao lich trong application detail.
- [x] Applicant xem lich trong Interview Schedule.
- [x] Nut Confirm/Request Change/Decline.
- [x] Employer cap nhat ket qua sau phong van.
- [~] Calendar/list view ro rang. Hien la list view, chua co calendar grid.

### Test Case

- [x] Tao lich thanh cong.
- [x] Tao lich qua khu bi chan.
- [x] Applicant confirm thanh cong.
- [x] Applicant request change thanh cong.
- [x] Employer cap nhat result thanh cong.

### Done Khi

- [x] Lich hien o ca hai ben.
- [x] Trang thai lich thay doi dung.
- [x] Result phong van duoc luu.

## Feature 5 - Offer Va Hire

### Muc Tieu

Sau phong van, doanh nghiep gui offer va applicant chap nhan de tro thanh employee.

### Business Rule

- [x] Offer phai co hourly rate.
- [x] Offer phai co branch/quan.
- [x] Offer phai co start date.
- [x] Payday mac dinh ngay 5.
- [x] Applicant accept offer thi tao employment.
- [x] Application chuyen sang `Hired`.
- [x] Tao employee rate dau tien.

### Backend/API

- [x] `POST /api/offers`
- [x] `GET /api/offers/my`
- [x] `GET /api/offers/employer`
- [x] `PATCH /api/offers/{id}/accept`
- [x] `PATCH /api/offers/{id}/decline`
- [x] Tao employment khi accept.
- [x] Tao employee rate khi accept.
- [x] Tao notification cho employer khi applicant accept/decline.

### Frontend

- [x] Employer form gui offer.
- [x] Applicant xem offer detail.
- [x] Applicant accept/decline.
- [x] Employer xem status offer.
- [x] Sau khi accept, applicant co menu `My Work`.

### Test Case

- [x] Gui offer thanh cong.
- [x] Applicant accept offer thanh cong.
- [x] Accept offer tao employment.
- [x] Accept offer tao employee rate.
- [x] Offer expired khong accept duoc.

### Done Khi

- [x] User duoc gan vao doanh nghiep/branch.
- [x] Employer thay user trong employee list.
- [x] Application status la `Hired`.

## Feature 6 - Branch Va Employee Management

### Muc Tieu

Doanh nghiep quan ly cac quan/chi nhanh va danh sach nhan vien.

### Business Rule

- [x] Employer co the co nhieu branch.
- [x] Employee thuoc mot branch chinh trong MVP.
- [x] Chi employee active moi duoc gan ca.
- [ ] Employee nghi viec van giu lich su cong/luong.

### Backend/API

- [x] `POST /api/branches`
- [x] `GET /api/branches`
- [ ] `PATCH /api/branches/{id}`
- [x] `GET /api/workforce/employees`
- [ ] `PATCH /api/employees/{id}/status`
- [x] Validate employer ownership.

### Frontend

- [x] Man hinh Branches.
- [x] Man hinh Employee List.
- [ ] Filter employee theo branch/status.
- [ ] Detail employee: thong tin, rate, lich ca, cong.

### Test Case

- [x] Tao branch thanh cong.
- [x] Employee duoc gan branch khi accept offer.
- [x] Employer khac khong xem employee cua nhau.
- [ ] Employee inactive khong xuat hien khi gan ca moi.

### Done Khi

- [x] Employer quan ly duoc branch va employee.
- [x] Du lieu dung theo doanh nghiep.

## Feature 7 - Quan Ly Ca Lam

### Muc Tieu

Doanh nghiep tao ca lam va gan cho nhan vien trong cung quan.

### Business Rule

- [x] Shift thuoc employer va branch.
- [x] Shift co start time va end time.
- [x] End time phai sau start time.
- [x] Employee duoc gan ca phai active.
- [x] Employee phai thuoc cung branch.
- [x] Khong duoc gan trung lich cho cung employee.

### Backend/API

- [x] `POST /api/workforce/shifts`
- [x] `GET /api/workforce/shifts`
- [x] `GET /api/workforce/my-shifts`
- [ ] `PATCH /api/shifts/{id}`
- [ ] `DELETE /api/shifts/{id}` hoac cancel.
- [x] `POST /api/workforce/shifts/{id}/assign`
- [ ] `PATCH /api/shift-assignments/{id}/cancel`
- [x] Check overlap schedule.

### Frontend

- [~] Employer calendar theo tuan/thang. Hien tai la list scheduler, chua phai calendar grid.
- [x] Tao ca nhanh.
- [x] Gan employee vao ca.
- [x] Employee xem My Shifts trong `/my-work`.
- [x] Badge status ca.
- [x] Empty state khi chua co ca.

### Test Case

- [x] Tao ca thanh cong.
- [x] Gan ca thanh cong.
- [x] Gan employee khac branch bi chan.
- [x] Gan trung gio bi chan.
- [x] Employee chi thay ca cua minh.

### Done Khi

- [x] Employer tao/giao ca duoc.
- [x] Employee thay ca dung.
- [x] Khong co duplicate/trung lich sai.

## Feature 8 - Pass Ca Giua Nhan Vien Cung Quan

### Muc Tieu

Nhan vien co the doi/pass ca cho nhau trong cung quan, khong can quan ly duyet trong MVP.

### Rule Nghiep Vu Chot

- [ ] Nhan vien A chi pass ca ma A dang so huu.
- [ ] Nhan vien B phai cung branch/quan voi A.
- [ ] Chi duoc gui request neu con it nhat 2 tieng truoc gio bat dau ca.
- [ ] Neu B accept, ca chuyen sang B.
- [ ] Neu B reject, ca van thuoc A.
- [ ] Neu B khong tra loi den het han, ca van thuoc A.
- [ ] Moi ca chi co mot request pending tai mot thoi diem.
- [ ] B khong duoc accept neu bi trung lich voi ca khac.
- [ ] Sau khi accept, he thong thong bao cho A, B va employer.
- [ ] Employer xem duoc log nhung khong can duyet.

### De Xuat Han Phan Hoi

Co 2 cach, nen chon cach 1 cho MVP:

1. Request het han tai moc `ShiftStartTime - 2 hours`.
2. Request het han sau 30 phut ke tu luc gui, nhung van phai truoc ca 2 tieng.

Khuyen nghi: dung cach 1 de dung voi rule "doi truoc 2 tieng".

Vi du:

- Ca bat dau 18:00.
- A chi duoc gui request truoc 16:00.
- Neu B accept luc 15:50, ca chuyen sang B.
- Neu den 16:00 B chua accept, request expired va ca van cua A.

### Backend/API

- [x] `GET /api/workforce/shift-pass/{assignmentId}/candidates`
- [x] `POST /api/workforce/shift-pass`
- [x] `GET /api/workforce/shift-pass/incoming`
- [x] `GET /api/workforce/shift-pass/outgoing`
- [x] `PATCH /api/workforce/shift-pass/{id}/accept`
- [x] `PATCH /api/workforce/shift-pass/{id}/reject`
- [x] Job/background task expire request qua han.
- [~] Transaction khi accept de tranh 2 request doi cung luc. Hien da validate lai truoc accept, chua co database transaction rieng.

### Logic Accept Can Transaction

Khi B accept:

1. Kiem tra request con `Pending`.
2. Kiem tra hien tai van truoc `ShiftStartTime - 2 hours`.
3. Kiem tra A van la chu assignment.
4. Kiem tra B cung branch.
5. Kiem tra B khong trung lich.
6. Doi request sang `Accepted`.
7. Doi assignment cu sang `Transferred`.
8. Tao assignment moi cho B hoac update assignment employee sang B.
9. Ghi audit log.
10. Gui notification.

Khuyen nghi ky thuat:

- MVP co the update `ShiftAssignment.EmployeeUserId = B`.
- Neu muon audit tot hon, nen tao assignment moi va giu assignment cu `Transferred`.

### Frontend

- [x] Trong My Shifts co nut `Pass shift`.
- [ ] Chi hien nut neu con tren 2 tieng truoc ca.
- [ ] Modal chon nhan vien cung quan.
- [ ] Hien canh bao: "Neu ban kia khong nhan, ca van thuoc ve ban".
- [ ] Tab Incoming Requests.
- [ ] Tab Outgoing Requests.
- [ ] Nut Accept/Reject cho nguoi nhan.
- [ ] Sau accept, lich cua A mat ca va lich cua B co ca.

### Notification

- [ ] B nhan thong bao: A muon pass ca.
- [ ] A nhan thong bao khi B accept/reject.
- [ ] Employer nhan thong bao/log khi pass ca thanh cong.
- [ ] Neu expired, A nhan thong bao ca van thuoc A.

### Test Case

- [ ] A gui request cho B cung branch thanh cong.
- [ ] A khong gui duoc cho B khac branch.
- [ ] A khong gui duoc neu con duoi 2 tieng.
- [ ] B accept thi ca chuyen sang B.
- [ ] B reject thi ca van cua A.
- [ ] Request expired thi ca van cua A.
- [ ] B co ca trung gio thi khong accept duoc.
- [ ] A khong tao duoc 2 request pending cho cung ca.
- [ ] User C khong lien quan khong xem/accept request duoc.

### Done Khi

- [ ] Rule 2 tieng hoat dong dung.
- [ ] Rule cung quan hoat dong dung.
- [ ] Accept doi chu ca dung.
- [ ] Reject/Expired khong doi chu ca.
- [ ] Co audit log de employer xem.

## Feature 9 - Check-in / Check-out

### Muc Tieu

Ghi nhan gio lam thuc te cua nhan vien.

### Business Rule

- [x] Chi employee duoc gan ca moi check-in.
- [ ] Check-in chi cho phep gan gio bat dau ca, vi du som hon toi da 15 phut.
- [x] Check-out chi khi da check-in.
- [x] Worked minutes tinh theo thoi gian thuc te.
- [~] Employer co the duyet hoac dieu chinh cong. Hien co approve, chua co adjust.
- [x] Cong chua approved thi chua tinh luong chinh thuc.

### Backend/API

- [x] `POST /api/workforce/attendance/{shiftAssignmentId}/check-in`
- [x] `POST /api/workforce/attendance/{shiftAssignmentId}/check-out`
- [x] `GET /api/workforce/my-shifts` gom attendance cua employee.
- [x] `GET /api/workforce/shifts` gom attendance cua employer.
- [x] `PATCH /api/workforce/attendance/{id}/approve`
- [ ] `PATCH /api/attendance/{id}/adjust`
- [x] Check assignment ownership.

### Frontend

- [x] Employee thay nut check-in/check-out trong `/my-work`.
- [x] Employer thay attendance trong Shifts tab.
- [~] Employer duyet cong theo ngay/tuan/thang. Hien duyet theo assignment trong shift list.
- [ ] Hien tre/vang/du gio.

### Test Case

- [x] Check-in thanh cong.
- [x] Check-in trung bi chan.
- [x] Check-out khi chua check-in bi chan.
- [x] Employee khong duoc gan ca khong check-in duoc.
- [x] Employer approve attendance thanh cong.

### Done Khi

- [x] Attendance luu dung gio.
- [x] Worked minutes tinh dung.
- [x] Approved attendance vao payroll duoc.

## Feature 10 - Tinh Luong Tu Dong

### Muc Tieu

He thong tinh luong thang theo gio lam da duyet va muc luong doanh nghiep dat ra.

### Cong Thuc

```text
BaseSalary = TotalApprovedHours * HourlyRateSnapshot
FinalSalary = BaseSalary + Bonus - Penalty - Deduction
```

Vi du:

```text
Hourly rate: 20,000 VND/hour
Approved hours: 96
Base salary: 96 * 20,000 = 1,920,000 VND
Bonus: 100,000
Penalty: 50,000
Final salary: 1,920,000 + 100,000 - 50,000 = 1,970,000 VND
```

### Business Rule

- [x] Chi tinh attendance da approved.
- [x] Lay hourly rate theo ngay lam ca, khong lay rate hien tai mot cach may moc.
- [x] Payroll tao theo employer va thang.
- [x] Ngay 5 hang thang la ngay tra luong mac dinh.
- [x] Payroll draft cho employer kiem tra.
- [x] Khi locked thi khong tu dong thay doi.
- [ ] Sua sau locked phai qua adjustment.

### Backend/API

- [x] `POST /api/workforce/payroll/generate?month=&year=`
- [x] `GET /api/workforce/payroll`
- [ ] `GET /api/payroll/periods/{id}`
- [x] `PATCH /api/workforce/payroll/{id}/lock`
- [x] `PATCH /api/workforce/payroll/{id}/mark-paid`
- [x] `GET /api/workforce/my-payslips`
- [x] Payroll calculation service.

### Frontend

- [x] Employer Payroll page.
- [x] Generate payroll button.
- [x] Payroll detail theo nhan vien.
- [x] Employer add bonus/penalty/deduction.
- [x] Lock payroll.
- [x] Mark as paid.
- [x] Employee Payslip page.
- [x] Employee xem payslip sau khi payroll locked/paid.

### Test Case

- [x] Attendance approved duoc tinh luong.
- [x] Attendance chua approved khong tinh.
- [x] Doi hourly rate thang sau khong lam sai luong thang truoc.
- [x] Payroll locked khong tu dong thay doi.
- [ ] Mark paid thanh cong.

### Done Khi

- [ ] Salary tinh dung.
- [ ] Employer xem tong chi phi.
- [ ] Employee xem payslip.
- [ ] Ngay tra luong ro rang.

## Feature 11 - Notification

### Muc Tieu

Thong bao giup user quay lai web dung luc.

### Event Can Co Notification

- [ ] Application duoc accept.
- [ ] Application bi reject.
- [ ] Co message moi.
- [ ] Co lich phong van moi.
- [ ] Applicant confirm/request change interview.
- [ ] Offer duoc gui.
- [ ] Offer duoc accept/decline.
- [ ] Employee duoc gan ca.
- [ ] Co request pass ca den employee.
- [ ] Pass ca accepted/rejected/expired.
- [ ] Attendance duoc approve/reject.
- [ ] Payroll duoc tao.
- [ ] Payroll da paid.

### Backend/API

- [ ] `GET /api/notifications`
- [ ] `PATCH /api/notifications/{id}/read`
- [ ] `PATCH /api/notifications/read-all`
- [ ] Notification service dung chung.

### Frontend

- [ ] Bell icon tren header.
- [ ] Badge so notification chua doc.
- [ ] Dropdown notification.
- [ ] Bam notification di dung target page.
- [ ] Mark as read.

### Test Case

- [ ] Event tao notification dung user.
- [ ] User khac khong thay notification.
- [ ] Mark read mat badge.
- [ ] Target URL dung.

### Done Khi

- [ ] Cac event quan trong deu co notification.
- [ ] Notification giup user quay lai dung man hinh.

## Feature 12 - Dashboard Va Report

### Muc Tieu

Cho employer thay tinh hinh tuyen dung, nhan su, ca lam va chi phi.

### Employer Dashboard

- [ ] So application moi.
- [ ] So interview sap toi.
- [ ] So employee active.
- [ ] So ca hom nay.
- [ ] So request pass ca.
- [ ] So attendance cho duyet.
- [ ] Tong luong tam tinh thang nay.

### Employee Dashboard

- [ ] Ca sap toi.
- [ ] Request pass ca incoming.
- [ ] Gio da lam thang nay.
- [ ] Luong tam tinh.
- [ ] Notification moi.

### Report Nen Co

- [ ] Report tong gio lam theo nhan vien.
- [ ] Report chi phi luong theo thang.
- [ ] Report vang/tre.
- [ ] Report pass ca.
- [ ] Report ty le application -> hired.

### Done Khi

- [ ] Dashboard khong trang khi khong co data.
- [ ] Co empty state ro rang.
- [ ] So lieu khong bi undefined/null.

## Feature 13 - Security Va Permission

### Rule Chung

- [ ] Moi protected API phai can token.
- [ ] API tra 401 thi frontend clear session va ve login.
- [ ] Role Applicant khong truy cap employer dashboard.
- [ ] Role Employer khong sua du lieu employer khac.
- [ ] Employee chi xem ca/cong/luong cua minh.
- [ ] Admin moi xem du lieu toan he thong.

### Ownership Check Bat Buoc

- [ ] Application ownership.
- [ ] Conversation participant.
- [ ] Interview ownership.
- [ ] Offer ownership.
- [ ] Branch ownership.
- [ ] Employee ownership theo employer.
- [ ] Shift ownership.
- [ ] Attendance ownership.
- [ ] Payroll ownership.

### Done Khi

- [ ] Dung Postman goi API cua nguoi khac bi 403/404.
- [ ] Frontend route sai role khong bi trang trang.
- [ ] Token het han ve login ro rang.

## Feature 14 - UI Stability Va Khong Trang Trang

### Rule Chung

- [ ] Moi page co loading state.
- [ ] Moi page co error state.
- [ ] Moi page co empty state.
- [ ] Moi API call quan trong co `finally setLoading(false)`.
- [ ] Routes khong ton tai vao Not Found.
- [ ] ErrorBoundary boc routes.
- [ ] Login/signup responsive mobile, tablet, desktop.

### Page Can Kiem Tra

- [ ] `/`
- [ ] `/login`
- [ ] `/signup`
- [ ] `/jobs`
- [ ] `/jobs?category=1`
- [ ] `/profile`
- [ ] `/messages`
- [ ] `/my-applications`
- [ ] `/employer-dashboard`
- [ ] `/admin-dashboard`
- [ ] `/post-job`
- [ ] Route bat ky khong ton tai.

### Done Khi

- [ ] Khong route nao trang trang.
- [ ] API loi van hien thong bao.
- [ ] Man mobile khong bi cat form.
- [ ] Zoom 125-150% van dung duoc login/signup.

## Feature 15 - Retention Logic

### Giu Applicant/Employee

Tinh nang giu user:

- [ ] Theo doi application status.
- [ ] Chat voi employer.
- [ ] Lich phong van.
- [ ] Offer online.
- [ ] Lich ca lam.
- [ ] Pass ca.
- [ ] Check-in/check-out.
- [ ] Luong tam tinh.
- [ ] Payslip.
- [ ] Notification.

Thong diep san pham:

```text
Nhan viec nhanh, xem ca ro rang, doi ca de dang, biet luong moi luc.
```

### Giu Employer

Tinh nang giu doanh nghiep:

- [ ] Quan ly pipeline ung vien.
- [ ] Chat va hen phong van.
- [ ] Gui offer.
- [ ] Quan ly employee.
- [ ] Sap ca.
- [ ] Theo doi pass ca.
- [ ] Duyet cong.
- [ ] Tinh luong.
- [ ] Bao cao chi phi nhan su.

Thong diep san pham:

```text
Tu tuyen dung den van hanh nhan vien part-time trong mot he thong.
```

### KPI Nen Trinh Bay EXE201

- [ ] So job posted.
- [ ] So applications.
- [ ] Ty le application duoc accept.
- [ ] Ty le interview confirmed.
- [ ] Ty le hired.
- [ ] So shift duoc tao moi tuan.
- [ ] Ty le pass ca thanh cong.
- [ ] So attendance approved.
- [ ] Tong payroll xu ly qua he thong.
- [ ] So user quay lai moi tuan.

## API Endpoint Tong Hop

### Applications

- [x] `POST /api/application`
- [x] `GET /api/application/my`
- [x] `GET /api/application/employer`
- [x] `PATCH /api/application/{id}/status`

### Conversations

- [x] `GET /api/messages/conversations`
- [x] `GET /api/messages/{contactId}`
- [x] `POST /api/messages`

### Interviews

- [x] `POST /api/interviews`
- [x] `GET /api/interviews/chat-context/{contactId}`
- [x] `POST /api/interviews/chat-invite`
- [x] `GET /api/interviews/my`
- [x] `GET /api/interviews/employer`
- [x] `PATCH /api/interviews/{id}/status`
- [x] `PATCH /api/interviews/{id}/result`

### Offers

- [x] `POST /api/offers`
- [x] `GET /api/offers/my`
- [x] `GET /api/offers/employer`
- [x] `PATCH /api/offers/{id}/accept`
- [x] `PATCH /api/offers/{id}/decline`

### Branches And Employees

- [x] `POST /api/branches`
- [x] `GET /api/branches`
- [ ] `PATCH /api/branches/{id}`
- [x] `GET /api/workforce/employees`
- [x] `GET /api/workforce/my-employments`
- [ ] `GET /api/employees/{id}`
- [x] `PATCH /api/workforce/employees/{id}/status`
- [x] `PATCH /api/workforce/employees/{id}/rate`

### Shifts

- [x] `POST /api/workforce/shifts`
- [x] `GET /api/workforce/shifts`
- [x] `GET /api/workforce/my-shifts`
- [ ] `PATCH /api/shifts/{id}`
- [ ] `PATCH /api/shifts/{id}/cancel`
- [x] `POST /api/workforce/shifts/{id}/assign`
- [ ] `PATCH /api/shift-assignments/{id}/cancel`

### Shift Pass

- [x] `GET /api/workforce/shift-pass/{assignmentId}/candidates`
- [x] `POST /api/workforce/shift-pass`
- [x] `GET /api/workforce/shift-pass/incoming`
- [x] `GET /api/workforce/shift-pass/outgoing`
- [x] `PATCH /api/workforce/shift-pass/{id}/accept`
- [x] `PATCH /api/workforce/shift-pass/{id}/reject`

### Attendance

- [x] `POST /api/workforce/attendance/{shiftAssignmentId}/check-in`
- [x] `POST /api/workforce/attendance/{shiftAssignmentId}/check-out`
- [x] `GET /api/workforce/my-shifts` gom attendance cua employee.
- [x] `GET /api/workforce/shifts` gom attendance cua employer.
- [x] `PATCH /api/workforce/attendance/{id}/approve`
- [x] `PATCH /api/workforce/attendance/{id}/reject`
- [x] `PATCH /api/workforce/attendance/{id}/adjust`

### Payroll

- [x] `POST /api/workforce/payroll/generate`
- [x] `GET /api/workforce/payroll`
- [ ] `GET /api/payroll/periods/{id}`
- [x] `PATCH /api/workforce/payroll/{id}/lock`
- [x] `PATCH /api/workforce/payroll/{id}/mark-paid`
- [x] `GET /api/workforce/my-payslips`

### Notifications

- [ ] `GET /api/notifications`
- [ ] `PATCH /api/notifications/{id}/read`
- [ ] `PATCH /api/notifications/read-all`

## Frontend Pages Tong Hop

### Applicant/Employee

- [x] Home.
- [x] Jobs.
- [x] Job Detail.
- [x] My Applications.
- [x] Messages.
- [ ] Interviews.
- [x] Offers.
- [x] My Work / My Shifts.
- [ ] Shift Pass Requests.
- [x] Attendance check-in/check-out trong My Work.
- [ ] My Salary.
- [ ] Payslips.
- [x] Profile.

### Employer

- [x] Employer Dashboard.
- [x] Job Management.
- [x] Application Pipeline.
- [x] Chat.
- [ ] Interview Calendar.
- [x] Offer Management.
- [x] Branch Management.
- [x] Employee Management.
- [x] Shift Scheduler.
- [ ] Shift Pass Logs.
- [x] Attendance Approval.
- [x] Payroll.
- [ ] Reports.

### Admin

- [ ] Admin Dashboard.
- [ ] User Management.
- [ ] Job Management.
- [ ] Category Management.
- [ ] Reports/Moderation.

## QA Checklist Theo Luong

### Flow A - Apply To Chat

- [ ] Applicant login.
- [ ] Applicant apply job.
- [ ] Employer thay application.
- [ ] Employer accept.
- [ ] Conversation duoc tao.
- [ ] Applicant thay conversation.
- [ ] Hai ben gui message duoc.

### Flow B - Chat To Interview

- [x] Employer tao interview offline ngay trong chat.
- [x] Interview invite render thanh message card trong chat.
- [x] Applicant nhan notification.
- [x] Applicant accept/reject lich trong chat.
- [x] Employer thay status confirmed/declined trong chat.
- [x] Employer cap nhat result sau khi gio hen da qua.

### Flow C - Interview To Hire

- [x] Employer gui offer.
- [x] Applicant xem offer.
- [x] Applicant accept.
- [x] Employment duoc tao.
- [x] Employee rate duoc tao.
- [x] Application status `Hired`.
- [x] Luong moi: Employer bam `Pass` sau interview thi tao employee truc tiep.
- [x] `Pass` tao offer noi bo `Accepted` de giu khoa ngoai `Employments.OfferId`.
- [x] `Not Pass` khong tao employee.

### Flow D - Hire To Shift

- [x] Employer tao branch.
- [x] Employee thuoc branch.
- [x] Employer tao shift.
- [x] Employer gan shift cho employee.
- [x] Employee thay shift trong My Work.

### Flow E - Pass Shift

- [ ] Employee A co ca luc 18:00.
- [ ] Luc 15:30 A gui request cho B cung branch.
- [ ] B accept truoc 16:00.
- [ ] Ca chuyen sang B.
- [ ] A khong con thay ca do trong ca cua minh.
- [ ] B thay ca do trong ca cua minh.
- [ ] Employer thay log pass ca.

### Flow F - Reject/Expired Pass Shift

- [ ] A gui request cho B.
- [ ] B reject.
- [ ] Ca van cua A.
- [ ] A gui request cho B.
- [ ] B khong phan hoi den han.
- [ ] Request expired.
- [ ] Ca van cua A.

### Flow G - Attendance To Payroll

- [x] Employee check-in.
- [x] Employee check-out.
- [x] Employer approve attendance.
- [x] Generate payroll.
- [x] Payroll item tinh dung gio va rate.
- [ ] Employer lock payroll.
- [ ] Employer mark paid.
- [ ] Employee xem payslip.

## Edge Cases Bat Buoc Nho

### Application

- [ ] Apply job da dong.
- [ ] Apply trung.
- [ ] Employer khac truy cap application.
- [ ] Applicant xoa account hoac bi khoa.

### Chat

- [ ] User khong thuoc conversation.
- [ ] Message rong.
- [ ] API mat ket noi.
- [ ] Conversation bi archived.

### Interview

- [ ] Tao lich qua khu.
- [ ] Applicant decline.
- [ ] Applicant request reschedule.
- [ ] Employer cancel.

### Offer

- [ ] Offer expired.
- [ ] Applicant decline.
- [ ] Applicant accept 2 lan.
- [ ] Branch bi inactive truoc khi accept.

### Shift

- [ ] Shift qua khu.
- [ ] End time truoc start time.
- [ ] Employee inactive.
- [ ] Employee trung lich.
- [ ] Branch khong active.

### Pass Ca

- [ ] Gui request duoi 2 tieng truoc ca.
- [ ] Gui cho nhan vien khac branch.
- [ ] Gui khi da co request pending.
- [ ] Nguoi nhan bi trung lich.
- [ ] Nguoi nhan inactive.
- [ ] Request expired nhung user van bam accept.
- [ ] Ca bi cancel trong luc request pending.

### Attendance

- [ ] Check-in qua som.
- [ ] Check-in khi khong co assignment.
- [ ] Check-out khi chua check-in.
- [ ] Employer sua cong.
- [ ] Attendance rejected.

### Payroll

- [ ] Chua co attendance approved.
- [ ] Doi hourly rate giua thang.
- [ ] Payroll da locked.
- [ ] Mark paid 2 lan.
- [ ] Bonus/penalty am sai logic.

## Definition Of Done Toan Project

Mot module chi duoc tick done khi:

- [ ] Co database table/field can thiet.
- [ ] Co API dung rule va permission.
- [ ] Co frontend page/component.
- [ ] Co loading/error/empty state.
- [ ] Co validation o backend.
- [ ] Co validation co ban o frontend.
- [ ] Co notification neu la event quan trong.
- [ ] Co audit log neu la hanh dong quan trong.
- [ ] Test thanh cong flow happy path.
- [ ] Test toi thieu 2 edge cases.
- [ ] Khong lam trang trang khi API loi.

## Thu Tu Lam Khuyen Nghi

Lam theo thu tu nay de khong bi vo logic:

1. On dinh auth, role, route guard, error boundary.
2. Hoan thien application status.
3. Employer accept/reject application.
4. Tao conversation sau khi accept.
5. Chat co ban.
6. Interview offline.
7. Offer.
8. Employment va employee rate.
9. Branch management.
10. Shift management.
11. Pass ca.
12. Attendance.
13. Payroll.
14. Notification.
15. Dashboard/report.

## Cau Chuyen Trinh Bay EXE201

Van de:

```text
Quan/cua hang tuyen nhan vien part-time xong van phai dung chat rieng, excel, ghi tay de xep ca va tinh luong. Nhan vien cung kho theo doi ca, doi ca va biet luong cua minh.
```

Giai phap:

```text
WorkBridge ket noi tuyen dung voi van hanh nhan su part-time: tu apply, phong van, nhan viec den xep ca, pass ca, cham cong va tinh luong.
```

Diem khac biet:

- [ ] Khong chi dang tin viec lam.
- [ ] Co pipeline tuyen dung.
- [ ] Co chat sau khi accept.
- [ ] Co lich phong van offline.
- [ ] Co quan ly ca lam.
- [ ] Co pass ca giua nhan vien cung quan.
- [ ] Co tinh luong tu dong theo gio.

Gia tri cho nhan vien:

- [ ] De tim viec.
- [ ] Biet minh dang o buoc nao.
- [ ] Co lich lam ro rang.
- [ ] Doi ca de hon.
- [ ] Biet luong tam tinh.

Gia tri cho doanh nghiep:

- [ ] Tuyen nhanh hon.
- [ ] Quan ly ung vien gon hon.
- [ ] Sap ca ro hon.
- [ ] Giam vang/tre bi dong.
- [ ] Tinh luong nhanh hon.

## Ghi Chu MVP

Nen lam don gian nhung chac:

- [ ] Pass ca khong can employer duyet trong MVP.
- [ ] Chat co ban truoc, realtime co the lam sau.
- [ ] Payroll tinh theo approved attendance truoc.
- [ ] Bonus/penalty co the nhap tay trong MVP.
- [ ] Geolocation check-in co the de phase sau.
- [ ] Export Excel payroll co the de phase sau.

Nhung khong duoc thieu:

- [ ] Permission.
- [ ] Status ro rang.
- [ ] Khong trang trang.
- [ ] Rule 2 tieng khi pass ca.
- [ ] Rule cung branch khi pass ca.
- [ ] Lich su hourly rate khi tinh luong.
- [ ] Audit log cho thao tac quan trong.
