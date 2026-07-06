const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://boaaorlpevnfmpbvezyh.supabase.co";
const supabaseServiceKey = "sb_secret_27CX3cmJ-SVxjsi_SKuHrA_lXobX13L";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  try {
    const { data: logs } = await supabaseAdmin.from("activity_logs").select("*").limit(5);
    console.log("Activity logs user_id and names:");
    console.log(logs.map(l => ({ id: l.id, user_id: l.user_id, user_name: l.user_name, category: l.category })));

    const { data: emps } = await supabaseAdmin.from("employees").select("id, first_name, last_name, avatar_url");
    console.log("\nEmployees in DB:");
    console.log(emps.map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}`, avatar: e.avatar_url })));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
