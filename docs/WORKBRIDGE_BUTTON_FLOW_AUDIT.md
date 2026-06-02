# WorkBridge Button And Flow Audit

Tai lieu nay dung de check toan bo nut bam, route va luong nghiep vu tu login den workforce/payroll. Moi issue chi duoc xem la xong khi da co fix, build pass va retest tren UI/API.

## Audit Format

| Field | Meaning |
| --- | --- |
| ID | Ma loi de track khi fix |
| Role | Public, Applicant, Employer, Admin |
| Page | Route hoac tab |
| Button/Action | Nut bam/hanh dong can test |
| Expected | Ket qua dung |
| Actual | Ket qua dang thay |
| Severity | P0/P1/P2/P3 |
| API involved | Endpoint lien quan |
| Fix status | Open/In progress/Fixed/Deferred |
| Retest status | Not retested/Pass/Fail |

## Severity Rule

- `P0`: Trang trang, route chet, nut khong click duoc, API 500 trong luong chinh.
- `P1`: Sai nghiep vu/data: offer, employment, dang ky ca, payroll, apply trung, role sai quyen.
- `P2`: UI kho dung: keo ngang, button tran, modal bi cat, loading khong tat.
- `P3`: Text/toast/empty state chua ro.

## Confirmed Issues

| ID | Role | Page | Button/Action | Expected | Actual | Severity | API involved | Fix status | Retest status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WB-AUD-001 | All | Frontend | `npm.cmd run lint` | Lint khong co error | Lint fail 10 errors o `EmployerJobForm`, `HeroSearch`, `Header`, `Home`, `Messages` | P0 | N/A | Fixed in current working tree | Pass: lint 0 errors, warnings remain |
| WB-AUD-002 | Applicant/Employee | `/my-work` | Dang ky ca tuan sau | Nhan vien thay form dang ky, chon toi thieu 3 ca fixed, submit thanh cong | Backend da co API nhung UI chua render form dang ky | P1 | `GET /api/workforce/registration-windows/my-next-week`, `POST /api/workforce/registration-windows/{id}/submit` | Fixed in current working tree | Build pass, manual UI pending |
| WB-AUD-003 | Applicant/Employee | `/my-work` | Dang ky slot cuoi cung | Neu slot vua bi nguoi khac lay thi hien conflict va reload lich | Chua co UI xu ly `409 Conflict` | P1 | `POST /api/workforce/registration-windows/{id}/submit` | Fixed in current working tree | Build pass, race test pending |
| WB-AUD-004 | Applicant/Employee | `/my-work` | Luong cu `available-shifts`/`toggle-fixed` | Frontend dung registration window moi, khong dung luong cu | Can audit de dam bao frontend khong goi luong cu | P1 | Old: `available-shifts`, `toggle-fixed` | Fixed in current working tree for `/my-work` | Pass: no frontend references |
| WB-AUD-005 | Employer | `/employer-dashboard?tab=shifts` | Publish/Finalize week | Employer publish 7 ngay x 3 ca va finalize auto assign nguoi thieu ca | Can retest voi DB co migration moi | P1 | `publish-next-week`, `finalize` | Open for retest | Pending |
| WB-AUD-006 | All | Main pages | Responsive/no horizontal scroll | 375px/768px/1366px khong keo ngang | Can manual visual pass sau khi build | P2 | N/A | Open for retest | Pending |

## Route And Button Checklist

### Public

| Route | Button/Action | Expected | Status |
| --- | --- | --- | --- |
| `/` | Search job by keyword/location | Navigate to `/jobs` with query | Pending |
| `/` | Category cards | Navigate/filter jobs by category | Pending |
| `/login` | Login email/password | Redirect by role, save token | Pending |
| `/login` | Google/Facebook optional login | SDK error does not hide email form | Pending |
| `/signup` | Register Applicant/Employer | Create account and redirect | Pending |
| `/jobs` | Search/filter/save job | Query updates, saved status persists | Pending |
| `/jobs/:id` | Apply, save, report | Correct modal/toast/API behavior | Pending |
| Unknown route | Back Home/Login buttons | No white page | Pending |

### Applicant

| Route | Button/Action | Expected | Status |
| --- | --- | --- | --- |
| `/profile` | Edit profile, save, upload CV | Data persists after reload | Pending |
| `/my-applications` | Open chat/review/offers/work/job detail | Navigate correctly by status | Pending |
| `/saved-jobs` | Unsave job | Card removed and DB updated | Pending |
| `/notifications` | Open, mark read, delete, clear read | State and count update | Pending |
| `/messages` | Send message | Message persists, no page jump | Pending |
| `/messages` | Accept/reject interview card | Interview status updates | Pending |
| `/interviews` | Accept/reject interview | Same rule as chat | Pending |
| `/offers` | Accept/decline offer | Accept creates employment; decline does not | Pending |
| `/my-work` | Register fixed/extra shifts | Minimum 3 fixed, conflict reload | Pending |
| `/my-work` | Check-in/check-out | Attendance status updates | Pending |
| `/my-work` | Pass shift request accept/reject | Assignment transfers only on accept | Pending |
| `/payslips` | View locked/paid payroll | Payslip details visible | Pending |

### Employer

| Route/Tab | Button/Action | Expected | Status |
| --- | --- | --- | --- |
| `/employer-dashboard?tab=profile` | Save company profile | Data persists | Pending |
| `branches` | Create/edit branch | Branch available for offer/shifts | Pending |
| `post-job` | Create job | Published/draft job shown in manage posts | Pending |
| `manage-posts` | Edit/close/reopen job | Status changes and list refreshes | Pending |
| `review-applicants` | Accept/reject/open profile/open chat | Correct status, profile data and chat | Pending |
| `interviews` | Create/cancel/result | Pass only after accepted and time passed | Pending |
| `offers` | Send/edit/cancel offer | Applicant sees current offer card | Pending |
| `employees` | Message/update status/rate/position | Employment data updates | Pending |
| `shifts` | Configure templates | 3 default shifts saved | Pending |
| `shifts` | Publish next week | Creates 21 shifts for branch | Pending |
| `shifts` | Assign employee manually | Same branch, no overlap, no full slot | Pending |
| `shifts` | Approve/reject/adjust attendance | Payroll minutes update | Pending |
| `shifts` | Finalize week | Auto assigns missing fixed shifts | Pending |
| `payroll` | Generate/adjust/lock/mark paid | Payslip visible to employee | Pending |
| `/messages` | Schedule interview, send message | Chat card and notifications work | Pending |
| `/notifications` | Open/delete/mark read | Navigate to target tabs | Pending |

### Admin

| Route/Tab | Button/Action | Expected | Status |
| --- | --- | --- | --- |
| `/admin-dashboard` overview | View stats | Dashboard loads without white page | Pending |
| users | Suspend/activate user | User status updates | Pending |
| jobs | Approve/reject/inspect job | Job status updates | Pending |
| categories | Create/edit/delete category | Category list updates | Pending |
| reports | Resolve/dismiss report | Report status updates | Pending |

## Retest Commands

```powershell
cd D:\workbridge\WorkBridge-Project\Frontend
npm.cmd run lint
npm.cmd run build

cd D:\workbridge\WorkBridge-Project\Backend
dotnet build WorkBridge.API\WorkBridge.API.csproj
dotnet ef database update --project WorkBridge.Infrastructure\WorkBridge.Infrastructure.csproj --startup-project WorkBridge.API\WorkBridge.API.csproj --context WorkBridgeContext
```

## Verification Log

- 2026-05-22: `npm.cmd run lint` pass with 0 errors and existing hook dependency warnings.
- 2026-05-22: `npm.cmd run build` pass. Vite still reports existing SignalR PURE comment/chunk-size warnings.
- 2026-05-22: `dotnet build WorkBridge.API\WorkBridge.API.csproj` pass with 0 warnings/errors after stopping the running API process that locked DLLs.
- 2026-05-22: `dotnet ef database update` pass; local DB was already up to date.
- 2026-05-22: `rg "available-shifts|toggle-fixed" Frontend/src` found no frontend usage.

## Manual Acceptance

- Login duoc bang 3 role.
- Khong co route trang trang.
- Khong co trang chinh bi keo ngang o 375px, 768px, 1366px.
- Recruit flow chuan chay du: Apply -> Accept -> Chat -> Interview -> Pass -> Offer -> Applicant accept -> Employment.
- Workforce flow chay du: Publish week -> Employee register 3 fixed shifts -> Finalize -> Check-in/out -> Approve attendance -> Payroll -> Payslip.
