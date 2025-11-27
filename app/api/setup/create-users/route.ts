import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // Create admin Supabase client with service role key
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    // Test users to create
    const testUsers = [
      {
        email: "admin@school.com",
        password: "Admin@12345",
        role: "admin",
        name: "John Doe",
      },
      {
        email: "teacher@school.com",
        password: "Teacher@12345",
        role: "teacher",
        name: "Jane Smith",
      },
      {
        email: "student@school.com",
        password: "Student@12345",
        role: "student",
        name: "Mike Johnson",
      },
    ];

    const results = [];

    for (const user of testUsers) {
      try {
        // Create auth user
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
          });

        if (authError) {
          results.push({
            email: user.email,
            error: authError.message,
          });
          continue;
        }

        // Create profile
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });

        if (profileError) {
          results.push({
            email: user.email,
            error: profileError.message,
          });
        } else {
          results.push({
            email: user.email,
            password: user.password,
            role: user.role,
            status: "created",
          });
        }
      } catch (error) {
        results.push({
          email: user.email,
          error: String(error),
        });
      }
    }

    return Response.json({
      success: true,
      message: "Test users created successfully",
      users: results,
    });
  } catch (error) {
    console.error("Error creating users:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
