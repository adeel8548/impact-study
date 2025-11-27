"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleCreateUsers = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/setup/create-users", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create users");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>School Management Portal - Setup</CardTitle>
            <CardDescription>Create test users for the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Test Users to Create:
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>
                  ✓ <strong>Admin:</strong> admin@school.com / Admin@12345
                </li>
                <li>
                  ✓ <strong>Teacher:</strong> teacher@school.com / Teacher@12345
                </li>
                <li>
                  ✓ <strong>Student:</strong> student@school.com / Student@12345
                </li>
              </ul>
            </div>

            <Button
              onClick={handleCreateUsers}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? "Creating Users..." : "Create Test Users"}
            </Button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                <p className="font-semibold mb-1">Error:</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-green-900 mb-3">
                  {result.message}
                </p>
                <div className="space-y-2">
                  {result.users.map((user: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded border border-green-100 text-sm"
                    >
                      <p className="font-mono font-semibold text-green-700">
                        {user.email}
                      </p>
                      {user.status === "created" ? (
                        <>
                          <p className="text-green-600">
                            Password:{" "}
                            <span className="font-mono">{user.password}</span>
                          </p>
                          <p className="text-green-600">
                            Role: <span className="font-mono">{user.role}</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-red-600">{user.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-semibold mb-2">Next Steps:</p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Click "Create Test Users" to generate the accounts</li>
                <li>Use the credentials provided to login</li>
                <li>The admin dashboard will have full access</li>
                <li>Teachers will see only their assigned classes</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
