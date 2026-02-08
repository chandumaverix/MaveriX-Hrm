export type UserRole = "admin" | "hr" | "employee";

export interface Employee {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	phone: string | null;
	designation: string | null;
	department: string | null;
	role: UserRole;
	avatar_url: string | null;
	date_of_birth: string | null;
	joining_date: string | null;
	employee_id?: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	/** Optional: add columns adhar_url, pan_url to employees table if using uploads */
	adhar_url?: string | null;
	pan_url?: string | null;
	/** Bank and ID details (employees table: bank_*, pan_number, aadhar_number) */
	bank_name?: string | null;
	bank_account_number?: string | null;
	bank_ifsc?: string | null;
	bank_location?: string | null;
	pan_number?: string | null;
	aadhar_number?: string | null;
	/** Week off day: 0 = Sunday, 1 = Monday, ... 6 = Saturday. Set by admin/HR. */
	week_off_day?: number | null;
	/** Employee residential/postal address (for salary slip, etc.) */
	address?: string | null;
}

export interface Team {
	id: string;
	name: string;
	description: string | null;
	leader_id: string | null;
	created_at: string;
	updated_at: string;
	leader?: Employee;
	members?: TeamMember[];
}

export interface TeamMember {
	id: string;
	team_id: string;
	employee_id: string;
	joined_at: string;
	employee?: Employee;
}

export interface Attendance {
	id: string;
	employee_id: string;
	date: string;
	clock_in: string | null;
	clock_out: string | null;
	total_hours: number | null;
	status: "present" | "absent" | "late" | "leave" | "week_off";
	notes: string | null;
	created_at: string;
	updated_at: string;
	employee?: Employee;
}

export interface LeaveType {
	id: string;
	name: string;
	description: string | null;
	default_days: number;
	is_active: boolean;
	created_at: string;
}

export interface LeaveBalance {
	id: string;
	employee_id: string;
	leave_type_id: string;
	total_days: number;
	used_days: number;
	year: number;
	created_at: string;
	updated_at: string;
	leave_type?: LeaveType;
}

export interface LeaveRequest {
	id: string;
	employee_id: string;
	leave_type_id: string;
	start_date: string;
	end_date: string;
	reason: string | null;
	status: "pending" | "approved" | "rejected";
	reviewed_by: string | null;
	reviewed_at: string | null;
	created_at: string;
	updated_at: string;
	/** Half-day leave: first_half (9am-1pm) or second_half (1pm-7pm) */
	half_day?: boolean | null;
	half_day_period?: "first_half" | "second_half" | null;
	/** URL of uploaded medical document (for medical/sick leave) */
	document_url?: string | null;
	employee?: Employee;
	leave_type?: LeaveType;
	reviewer?: Employee;
}

export interface FinanceRecord {
	id: string;
	employee_id: string;
	amount: number;
	type: "salary" | "bonus" | "deduction" | "reimbursement";
	description: string | null;
	month: number | null;
	year: number | null;
	status: "pending" | "paid" | "cancelled";
	paid_at: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
	salary_slip_allocated?: boolean;
	employee?: Employee;
}

export interface Resignation {
	id: string;
	employee_id: string;
	reason: string;
	last_working_day: string;
	status: "pending" | "processing" | "accepted" | "rejected";
	notes: string | null;
	reviewed_by: string | null;
	reviewed_at: string | null;
	created_at: string;
	updated_at: string;
	employee?: Employee;
	reviewer?: Employee;
}

export interface Post {
	id: string;
	author_id: string;
	content: string;
	created_at: string;
	updated_at: string;
	author?: Employee;
}

export interface Announcement {
	id: string;
	title: string | null;
	content: string;
	date: string; // YYYY-MM-DD
	created_by: string | null;
	created_at: string;
	author?: Employee;
}

export interface Settings {
	id: string;
	max_clocking_time: string;
	max_late_days: number;
	auto_clock_out_time: string;
	late_policy_leave_type_id: string | null;
	late_policy_deduction_per_day: number;
	company_name: string;
	company_logo_url: string;
	company_address: string[];
	updated_at: string;
}

export interface LateDeductionLog {
	id: string;
	employee_id: string;
	year: number;
	month: number;
	last_deducted_late_count: number;
	total_deducted: number;
	leave_type_id: string | null;
	updated_at: string;
}
