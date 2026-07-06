const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://boaaorlpevnfmpbvezyh.supabase.co";
const supabaseServiceKey = "sb_secret_27CX3cmJ-SVxjsi_SKuHrA_lXobX13L";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  try {
    const category = "auth";
    let q = supabaseAdmin
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("category", category);

    const { count, error } = await q;
    console.log("Using select(*, {count: 'exact', head: true}):");
    console.log("Count:", count);
    console.log("Error:", error);

    let q2 = supabaseAdmin
      .from("activity_logs")
      .select("id", { count: "exact" })
      .eq("category", category);
    const res2 = await q2;
    console.log("\nUsing select(id, {count: 'exact'}):");
    console.log("Count:", res2.count);
    console.log("Error:", res2.error);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
