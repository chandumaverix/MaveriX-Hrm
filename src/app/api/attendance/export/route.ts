import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const searchParams = request.nextUrl.searchParams;
		const employeeId = searchParams.get("employeeId");

		if (!employeeId) {
			return NextResponse.json(
				{ error: "Employee ID is required" },
				{ status: 400 }
			);
		}

		// Fetch employee details
		const { data: employee, error: employeeError } = await supabase
			.from("employees")
			.select("*")
			.eq("id", employeeId)
			.single();

		if (employeeError || !employee) {
			return NextResponse.json(
				{ error: "Employee not found" },
				{ status: 404 }
			);
		}

		// Fetch all attendance records for the employee
		const { data: attendanceRecords, error: attendanceError } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employeeId)
			.order("date", { ascending: false });

		if (attendanceError) {
			return NextResponse.json(
				{ error: "Failed to fetch attendance records" },
				{ status: 500 }
			);
		}

		if (!attendanceRecords || attendanceRecords.length === 0) {
			return NextResponse.json(
				{ error: "No attendance records found" },
				{ status: 404 }
			);
		}

		// Generate CSV content
		const csvContent = generateCSV(employee, attendanceRecords);

		// Create response with CSV file
		const fileName = `${employee.first_name}_${employee.last_name}_attendance.csv`;
		
		return new NextResponse(csvContent, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="${fileName}"`,
			},
		});
	} catch (error) {
		console.error("Error exporting attendance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

function generateCSV(employee: any, records: any[]): string {
	const headers = [
		"Date",
		"Employee ID",
		"Employee Name",
		"Designation",
		"Clock In",
		"Clock Out",
		"Total Hours",
		"Status",
		"Notes",
	];

	const rows = records.map((record) => {
		const clockIn = record.clock_in
			? new Date(record.clock_in).toLocaleString("en-US", {
					hour: "2-digit",
					minute: "2-digit",
					month: "2-digit",
					day: "2-digit",
					year: "numeric",
			  })
			: "-";

		const clockOut = record.clock_out
			? new Date(record.clock_out).toLocaleString("en-US", {
					hour: "2-digit",
					minute: "2-digit",
					month: "2-digit",
					day: "2-digit",
					year: "numeric",
			  })
			: "-";

		return [
			record.date,
			employee.employee_id || employee.id,
			`${employee.first_name} ${employee.last_name}`,
			employee.designation || "-",
			clockIn,
			clockOut,
			record.total_hours ? `${record.total_hours}h` : "-",
			record.status,
			record.notes || "-",
		]
			.map((field) => {
				// Escape quotes and wrap in quotes if contains comma
				const fieldStr = String(field);
				if (fieldStr.includes(",") || fieldStr.includes('"')) {
					return `"${fieldStr.replace(/"/g, '""')}"`;
				}
				return fieldStr;
			})
			.join(",");
	});

	return [headers.join(","), ...rows].join("\n");
}
