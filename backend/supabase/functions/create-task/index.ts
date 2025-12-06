// LearnLynk Tech Test - Task 3: Edge Function create-task

// Deno + Supabase Edge Functions style
// Docs reference: https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// 1. Setup Supabase Client
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Use Service Role to bypass RLS for the lookup and insertion [cite: 64]
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type CreateTaskPayload = {
  application_id: string;
  task_type: string;
  due_at: string;
};

const VALID_TYPES = ["call", "email", "review"];

serve(async (req: Request) => {
  // 2. CORS / Method Check
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Partial<CreateTaskPayload>;
    const { application_id, task_type, due_at } = body;

    // 3.TODO: validate application_id, task_type, due_at
    // - check task_type in VALID_TYPES
    // - parse due_at and ensure it's in the future

    //validate input exist.
    if (!application_id || !task_type || !due_at) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Validate Task Type 
    if (!VALID_TYPES.includes(task_type)) {
      return new Response(JSON.stringify({ error: `Invalid task_type. Must be one of: ${VALID_TYPES.join(", ")}` }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Validate Due Date (Must be in future) [cite: 53]
    const dueDate = new Date(due_at);
    const now = new Date();
    if (isNaN(dueDate.getTime()) || dueDate <= now) {
      return new Response(JSON.stringify({ error: "due_at must be a valid date in the future" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // 4. Fetch Tenant ID from Application
    const { data: appData, error: appError } = await supabase
      .from("applications")
      .select("tenant_id")
      .eq("id", application_id)
      .single();

    if (appError || !appData) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    const tenantId = appData.tenant_id;

    // 5.TODO: insert into tasks table using supabase client

    // Example:
    // const { data, error } = await supabase
    //   .from("tasks")
    //   .insert({ ... })
    //   .select()
    //   .single();

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .insert({
        tenant_id: tenantId,        // The missing link!
        related_id: application_id, // Mapped to 'related_id' as per schema
        type: task_type,
        due_at: due_at,
        title: `${task_type} task for application`, // Basic default title
        status: 'open'
      })
      .select()
      .single();

    if (taskError) {
      console.error("Insert Error:", taskError);
      return new Response(JSON.stringify({ error: "Failed to create task", details: taskError.message }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // 6.TODO: handle error and return appropriate status code

    // Example successful response:
    // return new Response(JSON.stringify({ success: true, task_id: data.id }), {
    //   status: 200,
    //   headers: { "Content-Type": "application/json" },
    // });

    // Note: 'task.created' broadcast happens automatically via Supabase Realtime 
    // if Realtime is enabled on the table. We don't manually emit it here 
    // unless using a specific broadcast channel, but standard Realtime listens to DB changes.

    return new Response(JSON.stringify({ success: true, task_id: taskData.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
