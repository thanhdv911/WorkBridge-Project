# WorkBridge Test Plan

Tai lieu nay dung de test lai toan bo flow hien co va tach ro:

- Da chay that.
- Dang la foundation da implement.
- Chua implement.

## Test Accounts

### Employer

- Email: `employer.demo@workbridge.test`
- Password: `Password123!`
- Role: `Employer`

### Applicant

- Email: `applicant.demo@workbridge.test`
- Password: `Password123!`
- Role: `Applicant`

### Chat Interview Applicant

- Email: `chat.interview.demo@workbridge.test`
- Password: `Password123!`
- Role: `Applicant`
- Current use: fresh accepted application for testing chat interview invite flow.

### Not Pass Interview Applicant

- Email: `notpass.interview.demo@workbridge.test`
- Password: `Password123!`
- Role: `Applicant`
- Current use: already used to verify Not Pass does not create an employee.

### Demo Job

- URL: `http://127.0.0.1:5173/jobs/2`
- Title: `Part-time Barista Demo - WorkBridge Test`
- Status: `Published`
- Pay: `20,000 VND/hour`

## Test Environment

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://localhost:5029`
- Database: `WorkBridgeDB`

## Build Checklist

- [x] Run backend build: `dotnet build Backend/WorkBridge.API/WorkBridge.API.csproj`
- [x] Run frontend build: `npm.cmd run build` inside `Frontend`
- [x] Backend has no build errors.
- [x] Frontend has no build errors.
- [x] API is listening on `http://localhost:5029`.
- [x] Vite is listening on `http://127.0.0.1:5173`.

## Route Smoke Test

Open these URLs and verify no white page:

- [ ] `/`
- [ ] `/login`
- [ ] `/signup`
- [ ] `/jobs`
- [ ] `/jobs/2`
- [ ] `/profile`
- [ ] `/my-applications`
- [ ] `/offers`
- [ ] `/my-work`
- [ ] `/messages`
- [ ] `/employer-dashboard`
- [ ] Unknown route, for example `/abc-not-found`

Pass criteria:

- [ ] Page renders.
- [ ] No horizontal page scroll.
- [ ] Loading state stops.
- [ ] Empty/error state is visible when data is missing.

## Responsive UI Test

Test these widths:

- [ ] 375px mobile.
- [ ] 768px tablet.
- [ ] 1366px laptop.
- [ ] Browser zoom 125%.
- [ ] Browser zoom 150%.

Critical pages:

- [ ] Login.
- [ ] Signup.
- [ ] Jobs.
- [ ] Job detail.
- [ ] Employer Dashboard.
- [ ] Review Applicants.
- [ ] Messages.

Pass criteria:

- [ ] No content is cut off.
- [ ] No forced horizontal scroll.
- [ ] Buttons fit inside cards.
- [ ] Long email/job title wraps or truncates cleanly.

## Flow 1 - Applicant Applies To Job

Steps:

1. Login as applicant.
2. Open `/jobs/2`.
3. Click Apply.
4. Enter cover message.
5. Submit application.
6. Open `/my-applications`.

Expected:

- [ ] Application is created.
- [ ] Job detail button changes to applied state.
- [ ] My Applications shows the application.
- [ ] Initial status is `Applied`.
- [ ] Applying again is blocked.

Known status:

- [x] Backend duplicate check exists.
- [x] UI checks current application status.
- [x] Applicant can see application list.

## Flow 2 - Employer Reviews Applicant

Steps:

1. Login as employer.
2. Open `/employer-dashboard`.
3. Click `Review Applicants`.
4. Select an applicant.
5. Review applicant profile panel.

Expected:

- [ ] Applicant list is visible without horizontal scroll.
- [ ] Employer can see name, email, major, university, class, phone, availability.
- [ ] Employer can see cover message.
- [ ] Employer can see skills.
- [ ] Employer can see experience.
- [ ] Employer can see review count and recent reviews.
- [ ] Employer can open CV if the applicant uploaded one.

Known status:

- [x] List no longer uses wide table.
- [x] Profile data is returned with employer application response.
- [x] CV link is visible when `CvUrl` exists.
- [ ] Full public applicant profile page is not implemented yet.

## Flow 3 - Employer Accepts Applicant

Steps:

1. In Review Applicants, select an `Applied` applicant.
2. Click `Accept & Chat`.

Expected:

- [ ] Application status becomes `Accepted`.
- [ ] Accept/Reject buttons disappear for that applicant.
- [ ] Chat thread is created automatically.
- [ ] Employer is taken to Messages or can open chat clearly.
- [ ] Applicant receives notification.
- [ ] Applicant can see chat in Messages.

Known status:

- [x] Backend creates opening message after accept.
- [x] Message API allows chat after accepted status.
- [x] UI now hides decision buttons after accept.
- [x] UI has `Open Chat` after accept.

## Flow 4 - Chat

Steps:

1. Employer sends a message to applicant.
2. Applicant logs in.
3. Applicant opens Messages.
4. Applicant replies.
5. Employer opens Messages again.

Expected:

- [ ] Both sides see same history.
- [ ] Messages persist after reload.
- [ ] Unrelated user cannot send into the thread.
- [ ] Empty message cannot be sent.

Known status:

- [x] Chat history works.
- [x] Message send works.
- [x] Unauthorized direct message is blocked.
- [ ] Realtime is not implemented; current UI polls.

## Flow 5 - Official Offer To Employment

Current standard behavior:

- Employer accepts applicant first.
- Employer sends official offer with branch, position, hourly rate, start date and payday.
- Applicant opens `/offers` and accepts/declines.
- Accepting creates real `Employment` and first `EmployeeRate`.
- Application status becomes `Hired`.
- Employee appears in the Employees tab from `Employments`, not from application status only.

Steps:

1. Login as employer.
2. Open Review Applicants.
3. Select an `Accepted` applicant.
4. Click `Send Official Offer`.
5. Select branch, position, hourly rate, start date.
6. Login as applicant.
7. Open `/offers`.
8. Accept offer.
9. Login as employer and open Employees tab.

Expected:

- [x] Offer is created with status `Sent`.
- [x] Applicant can accept/decline offer.
- [x] Accept creates real `Employment`.
- [x] Accept creates first `EmployeeRate`.
- [x] Applicant status becomes `Hired`.
- [x] Applicant appears in Employees tab.
- [x] Employer can still chat with hired employee.

Known status:

- [x] Interview offline module is implemented and can be driven from chat.
- [x] Employee status/rate update screens exist in Employer Employees.
- [x] Payslip page exists for employee.

## Flow 6 - Employer Rejects Applicant

Steps:

1. Select an `Applied` or `Under Review` applicant.
2. Click Reject.

Expected:

- [ ] Status becomes `Rejected`.
- [ ] Chat is not created if applicant was never accepted.
- [ ] Decision buttons disappear or change to a clear rejected state.
- [ ] Applicant sees rejected status.

Known gap:

- [ ] Reject reason is not implemented yet.
- [ ] Confirm modal before reject is not implemented yet.

## Flow 7 - Applicant Profile Completeness

Applicant should update profile before applying:

- [ ] Full name.
- [ ] Phone.
- [ ] Address.
- [ ] University.
- [ ] Major.
- [ ] Study year.
- [ ] About me.
- [ ] Availability.
- [ ] CV PDF.
- [ ] Skills.
- [ ] Experience.

Known status:

- [x] Basic applicant profile exists.
- [x] CV upload exists.
- [ ] UI for skills and experience management needs review.
- [ ] Employer public profile page is not implemented yet.

## Flow 8 - Reviews

Steps:

1. Employer opens an accepted/hired applicant.
2. Click Rate Applicant.
3. Submit rating and comment.
4. Reopen Review Applicants.

Expected:

- [ ] Rating is saved.
- [ ] Applicant receives notification.
- [ ] Applicant review count increases.
- [ ] Recent reviews show in applicant detail panel.

Known status:

- [x] Review API exists.
- [x] Review modal exists.
- [x] Review stats are shown in employer applicant panel.
- [ ] Review permission is still too loose and should be tightened to accepted/hired applications.

## Flow 9 - Interview And Workforce Modules

Current status by module:

### Interview Offline

- [ ] Employer creates interview schedule.
- [ ] Applicant confirms.
- [ ] Applicant requests reschedule.
- [ ] Employer marks completed.
- [ ] Employer records result.

### Offer

- [x] Employer sends offer with branch, position, hourly rate, start date.
- [x] Applicant accepts/declines.
- [x] Accepted offer creates real employment.

### Employment

- [x] Employment table.
- [x] Employee rate history base table.
- [x] Branch assignment.
- [x] Employee list based on employment, not just application status.
- [ ] Employee rate edit/history UI.

## Flow 10 - Shift/Attendance/Payroll

Current implemented foundation:

- [x] Branch management.
- [x] Shift creation.
- [x] Shift assignment.
- [x] Pass shift within same branch before 2 hours.
- [x] Attendance check-in/check-out.
- [x] Attendance approval.
- [x] Attendance reject/adjust.
- [x] Payroll generation.
- [x] Payroll lock/mark-paid.
- [x] Payslip.

Tested demo result:

- [x] Demo employee rate: `20,000 VND/hour`.
- [x] Approved attendance: `240 minutes`.
- [x] Generated payroll total: `80,000 VND` for `05/2026`.
- [x] Payroll period `05/2026` locked/paid and visible in applicant payslips.
- [x] Payroll draft adjustment tested on `06/2026`: bonus `10,000 VND`, total `10,000 VND`.

## Flow 11 - Interview Offline

Steps:

1. Employer accepts or reviews an application.
2. Employer opens `/messages` with the applicant.
3. Employer schedules offline interview from the chat.
4. Applicant opens `/messages` or `/interviews`.
5. Applicant accepts or rejects the invite.
6. Employer waits until the scheduled time has passed.
7. Employer marks result `Pass` or `Not Pass`.

Expected:

- [x] Interview is stored in `Interviews`.
- [x] Interview invite is stored as `Messages.MessageType = InterviewInvite`.
- [x] Applicant sees interview card in chat.
- [x] Applicant can accept/reject.
- [x] Employer can mark result only after accept and scheduled time has passed.
- [x] `Pass` creates internal accepted offer, employment, and employee rate.
- [x] `Pass` changes application to `Hired`.
- [x] `Failed` changes application to `Rejected`.

Tested result:

- [x] Demo interview application `4`: `Completed` and `Passed`.
- [x] Chat interview `2`: `Completed/Passed`, applicant user `10` became active employee at `20,000 VND/h`.
- [x] Chat interview `3`: `Completed/Failed`, no employee was created.

## Flow 12 - Pass Shift

Steps:

1. Employee A opens `/my-work`.
2. Employee A clicks `Pass Shift`.
3. Employee A selects coworker in same branch.
4. Employee B accepts from incoming requests.
5. Both users refresh `/my-work`.

Expected:

- [x] Candidate list only shows active employees in same branch.
- [x] Request is blocked inside 2 hours before shift.
- [x] Accept creates a new assignment for Employee B.
- [x] Old assignment is marked `Transferred`.
- [x] Reject/expired keeps shift with Employee A.

Tested result:

- [x] Shift pass request `1` accepted.
- [x] Shift `5` is visible for coworker user `9`.

## Security Test

Use API or browser to verify:

- [ ] Applicant cannot open employer dashboard.
- [ ] Employer cannot apply to job.
- [ ] Employer cannot update another employer's application.
- [ ] User cannot send message without accepted/hired application thread.
- [ ] Expired/invalid token redirects to login.

Known status:

- [x] Basic role checks exist.
- [x] Employer ownership check exists for application status update.
- [x] Message access is restricted to valid thread/application relation.

## Current Biggest Gaps

Priority order:

1. [ ] Full public applicant profile page.
2. [ ] Stronger review permissions.
3. [ ] Better calendar grid UI for shifts/interviews.
4. [ ] Export payslip/payroll.

## Definition Of Passed For Demo

For a reliable EXE201 demo, these must pass end-to-end:

- [ ] Applicant registers/logs in.
- [ ] Employer registers/logs in.
- [ ] Employer posts published job.
- [ ] Applicant applies.
- [ ] Employer reviews full applicant info.
- [ ] Employer accepts applicant.
- [ ] Chat opens automatically.
- [ ] Both sides exchange messages.
- [x] Employer sends official offer.
- [x] Applicant accepts official offer.
- [x] Employment and EmployeeRate are created.
- [x] Hired applicant appears in Employees tab.
- [x] Employer creates branch/shift and assigns employee.
- [x] Employee opens `/my-work`, check-in/check-out.
- [x] Employer approves attendance.
- [x] Employer generates payroll.
- [x] Employee can pass shift to coworker in same branch before 2 hours.
- [x] Employer can schedule and complete offline interview.
- [x] Employer can lock and mark payroll paid.
- [x] Employee can view payslip.
- [ ] No page has horizontal scroll or white page.

After that, continue with public profile polish, review permission hardening, calendar UX, automatic expiry job, payroll adjustments/export.
