async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/activity_logger/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "counts",
        role: "all",
        focusedUserId: null,
        search: "",
        dateRange: "all"
      })
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Counts data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
