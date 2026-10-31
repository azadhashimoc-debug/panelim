export type Membership = {
  id: string;
  company_id: string;
  user_id: string;
  display_name: string;
  role: "owner" | "manager" | "employee" | "accountant";
  archived_at: string | null;
};
export type Branch = {
  id: string;
  company_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
};
export type Attendance = {
  id: string;
  membership_id: string;
  branch_id: string;
  check_in: string;
  check_out: string | null;
  work_date: string;
  source: string;
};
export type Shift = {
  id: string;
  branch_id: string;
  starts_at: string;
  ends_at: string;
};
export type Correction = {
  id: string;
  membership_id: string;
  branch_id: string;
  attendance_id: string | null;
  requested_in: string;
  requested_out: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  decision_reason: string | null;
  created_at: string;
};
export type EmploymentTerms = {
  started_on: string;
  pay_type: "monthly" | "hourly";
  base_pay_qepik: number;
  payday_day: number;
};
export type LeaveRequest = {
  id: string;
  request_type: "leave" | "permission";
  starts_on: string;
  ends_on: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};
export type SalaryAdvance = {
  id: string;
  company_id: string;
  membership_id: string;
  amount_qepik: number;
  issued_on: string;
  recorded_by: string;
  note: string | null;
  created_at: string;
};
export type PayrollPeriod = {
  id: string;
  company_id: string;
  membership_id: string;
  period_month: string;
  base_pay_qepik: number;
  overtime_pay_qepik: number;
  advances_qepik: number;
  net_pay_qepik: number;
  status: "draft" | "closed";
  closed_at: string | null;
  created_at: string;
};
export type SubscriptionStatus = {
  plan_tier: "free" | "start" | "business" | "growth";
  effective_plan: "free" | "start" | "business" | "growth";
  status: "trialing" | "active" | "past_due" | "canceled";
  days_left: number;
  extra_branches: number;
  active_employees: number;
  max_employees: number;
  active_branches: number;
  max_branches: number;
  is_limit_exceeded: boolean;
};

export type PaymentTransaction = {
  id: string;
  company_id: string;
  amount_qepik: number;
  provider: string;
  provider_tx_id: string;
  idempotency_key: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
};

export type Workspace = {
  member: Membership;
  branches: Branch[];
  attendance: Attendance[];
  shifts: Shift[];
  corrections: Correction[];
  employmentTerms: EmploymentTerms | null;
  leaveRequests: LeaveRequest[];
  advances?: SalaryAdvance[];
  subscription?: SubscriptionStatus;
  companyName: string;
};

